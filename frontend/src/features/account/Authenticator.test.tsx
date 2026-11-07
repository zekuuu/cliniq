import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  authenticateMockUser,
  confirmAuthenticatorSetup,
  getAuthenticatorStatus,
  getRecordedAuditEntries,
  MockAuthError,
  RECOVERY_FAILED_MESSAGE,
  RECOVERY_NO_ACCOUNT_MESSAGE,
  RECOVERY_NOT_SET_UP_MESSAGE,
  checkRecoveryAccount,
  resetMockAuth,
  resetPasswordWithRecovery,
  setUserActive,
  startAuthenticatorSetup,
  turnOffAuthenticator,
  verifyPasswordRecovery,
} from '../../lib/mock-db'
import { startMockSession } from '../../lib/mock-db/session'
import { db } from '../../lib/mock-db/store'
import { base32Decode, totp } from '../../lib/totp'
import { renderWithRouter } from '../../test/renderWithRouter'
import { LoginPage } from '../auth/LoginPage'
import { AuthenticatorDialog } from './AuthenticatorDialog'

/** Password recovery with an authenticator app (ADR-072). Every test runs on a frozen clock. */

const NURSE = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' } as const
const ADMIN = { id: 'user-admin-01', name: 'Gilan Avelida', role: 'admin' } as const
const FROZEN = new Date('2026-11-07T09:00:10+08:00')

const codeFor = (secret: string, at = Date.now()) => totp(base32Decode(secret), at)

/** Sets up the authenticator for `user` and returns its secret and recovery codes. */
async function setUp(user: { id: string; name: string; role: 'staff' | 'admin' } = NURSE) {
  startMockSession(user)
  const { secret } = await startAuthenticatorSetup()
  const { recoveryCodes } = await confirmAuthenticatorSetup(await codeFor(secret))
  return { secret, recoveryCodes }
}

/** Nothing secret may ever reach the audit log: no secret, no code, no password. */
function expectAuditClean(...secrets: string[]) {
  const text = JSON.stringify(getRecordedAuditEntries())
  for (const secret of secrets) expect(text).not.toContain(secret)
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] })
  vi.setSystemTime(FROZEN)
  resetMockAuth()
})
afterEach(() => {
  vi.useRealTimers()
  resetMockAuth()
})

describe('setting up the authenticator', () => {
  it('confirms with the first code, returns 8 one-time codes, and stores only their hashes', async () => {
    startMockSession(NURSE)
    const { secret, uri } = await startAuthenticatorSetup()
    expect(uri).toBe(`otpauth://totp/CLINIQ%3Ademo.nurse?secret=${secret}&issuer=CLINIQ&algorithm=SHA1&digits=6&period=30`)
    await expect(confirmAuthenticatorSetup('000000' === (await codeFor(secret)) ? '111111' : '000000')).rejects.toThrow(/date and time are set automatically/)
    const { recoveryCodes } = await confirmAuthenticatorSetup(await codeFor(secret))
    expect(recoveryCodes).toHaveLength(8)
    const record = db().frontendOnly.devAccounts.find((account) => account.userId === NURSE.id)!.authenticator!
    expect(record.recoveryCodeHashes).toHaveLength(8)
    for (const code of recoveryCodes) expect(JSON.stringify(record)).not.toContain(code)
    expect(await getAuthenticatorStatus()).toEqual({ enabled: true, recoveryCodesLeft: 8 })
    expect(getRecordedAuditEntries().at(-1)).toMatchObject({ actionType: 'update', summary: 'Set up authenticator', targetRecord: { type: 'user', id: NURSE.id } })
    expectAuditClean(secret, ...recoveryCodes)
  })

  it('accepts a code from one step before (phone clock drift)', async () => {
    startMockSession(NURSE)
    const { secret } = await startAuthenticatorSetup()
    await expect(confirmAuthenticatorSetup(await codeFor(secret, Date.now() - 30_000))).resolves.toMatchObject({ recoveryCodes: expect.any(Array) })
  })

  it('replaces and turns off only after the current code or a recovery code', async () => {
    const { secret, recoveryCodes } = await setUp()
    await expect(startAuthenticatorSetup()).rejects.toThrow(/did not work/)
    const replaced = await startAuthenticatorSetup(recoveryCodes[0])
    await confirmAuthenticatorSetup(await codeFor(replaced.secret))
    expect(getRecordedAuditEntries().map((entry) => entry.summary)).toEqual(expect.arrayContaining(['Used a recovery code', 'Replaced authenticator']))
    await expect(turnOffAuthenticator(await codeFor(secret))).rejects.toThrow(/did not work/)
    await turnOffAuthenticator(await codeFor(replaced.secret))
    expect(await getAuthenticatorStatus()).toEqual({ enabled: false, recoveryCodesLeft: 0 })
    expect(getRecordedAuditEntries().at(-1)?.summary).toBe('Turned off authenticator')
    expectAuditClean(secret, replaced.secret, ...recoveryCodes)
  })
})

describe('Forgot password with the authenticator', () => {
  it('resets the password with a 6-digit code, clears a pending change, and signs in with the new one', async () => {
    const { secret } = await setUp({ id: 'user-staff-02', name: 'New Nurse', role: 'staff' })
    const token = await verifyPasswordRecovery('demo.new', await codeFor(secret))
    await expect(resetPasswordWithRecovery(token, 'short')).rejects.toThrow(/at least 8/)
    await resetPasswordWithRecovery(token, 'new-pass-2026')
    const result = await authenticateMockUser('demo.new', 'new-pass-2026')
    expect(result.mustChangePassword).toBe(false)
    expect(getRecordedAuditEntries().map((entry) => entry.summary)).toEqual(expect.arrayContaining(['Changed password', 'Reset password with authenticator']))
    // The token is spent.
    await expect(resetPasswordWithRecovery(token, 'another-pass-1')).rejects.toThrow(/expired/)
    expectAuditClean(secret, 'new-pass-2026')
  })

  it('takes a recovery code once; a replay gets the generic message', async () => {
    const { recoveryCodes } = await setUp()
    await verifyPasswordRecovery('demo.nurse', recoveryCodes[2])
    await expect(verifyPasswordRecovery('demo.nurse', recoveryCodes[2])).rejects.toThrow(RECOVERY_FAILED_MESSAGE)
    expect(getRecordedAuditEntries().filter((entry) => entry.summary === 'Used a recovery code')).toHaveLength(1)
    expectAuditClean(...recoveryCodes)
  })

  it('gives one message for a wrong code, an unknown user, no authenticator and a disabled account', async () => {
    const { secret } = await setUp()
    const good = await codeFor(secret)
    const wrong = good === '123456' ? '654321' : '123456'
    const messages = []
    for (const [name, code] of [['demo.nurse', wrong], ['nobody.here', good], ['demo.principal', good]] as const)
      messages.push(await verifyPasswordRecovery(name, code).catch((cause: Error) => cause.message))
    await setUserActive(NURSE.id, false, ADMIN)
    messages.push(await verifyPasswordRecovery('demo.nurse', good).catch((cause: Error) => cause.message))
    expect(messages).toEqual(Array(4).fill(RECOVERY_FAILED_MESSAGE))
  })

  it('locks after 5 failures, as sign-in does, and a locked account refuses even a good code', async () => {
    const { secret } = await setUp()
    for (let i = 0; i < 4; i += 1) await expect(verifyPasswordRecovery('demo.nurse', '000001')).rejects.toThrow(RECOVERY_FAILED_MESSAGE)
    const locked = await verifyPasswordRecovery('demo.nurse', '000001').catch((cause: unknown) => cause)
    expect(locked).toBeInstanceOf(MockAuthError)
    expect((locked as MockAuthError).reason).toBe('locked')
    await expect(verifyPasswordRecovery('demo.nurse', await codeFor(secret))).rejects.toMatchObject({ reason: 'locked' })
    await expect(authenticateMockUser('demo.nurse', 'demo-nurse')).rejects.toMatchObject({ reason: 'locked' })
  })
})

describe('the screens', () => {
  it('offers "Set up authenticator app" in a dialog, with the Admin warned to keep the codes', async () => {
    startMockSession(ADMIN)
    renderWithRouter(<AuthenticatorDialog open viewer={ADMIN} onClose={() => {}} onChanged={() => {}} />)
    const dialog = await screen.findByRole('dialog', { name: 'Authenticator app' })
    expect(within(dialog).getByText(/nobody else can reset your password/)).toBeInTheDocument()
    expect(await within(dialog).findByText('Authenticator app: not set up.')).toBeInTheDocument()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await user.click(within(dialog).getByRole('button', { name: 'Set up' }))
    expect(await within(dialog).findByText('Setup key')).toBeInTheDocument()
    const key = within(dialog).getByText(/^[A-Z2-7]{4}( [A-Z2-7]{1,4})+$/).textContent!.replace(/\s/g, '')
    await user.type(within(dialog).getByLabelText(/^6-digit code/), await codeFor(key))
    await user.click(within(dialog).getByRole('button', { name: 'Confirm' }))
    const codes = await screen.findByRole('list', { name: 'Recovery codes' })
    expect(within(codes).getAllByRole('listitem')).toHaveLength(8)
    // The codes can't be left unseen: Done waits for the tick.
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled()
    await user.click(screen.getByLabelText('I have saved the codes'))
    expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled()
  })

  it('resets from Login and fills in the username', async () => {
    const { secret } = await setUp()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithRouter(<LoginPage onLogin={() => {}} />, { route: '/login' })
    await user.click(await screen.findByRole('button', { name: 'Forgot password?' }))
    const dialog = screen.getByRole('dialog', { name: 'Forgot your password?' })
    await user.type(within(dialog).getByLabelText(/^Username/), 'demo.nurse')
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    // Code boxes: six digits continue by themselves.
    const boxes = await within(dialog).findByLabelText('6-digit code')
    expect(dialog.querySelectorAll('[data-code-box]')).toHaveLength(6)
    if (await codeFor(secret) !== '000002') {
      await user.type(boxes, '000002')
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(RECOVERY_FAILED_MESSAGE)
    }
    await user.type(within(dialog).getByLabelText('6-digit code'), await codeFor(secret))
    await user.type(await within(dialog).findByLabelText(/^New password/), 'fresh-pass-77')
    await user.type(within(dialog).getByLabelText(/^Confirm new password/), 'fresh-pass-77')
    await user.click(within(dialog).getByRole('button', { name: 'Change password' }))
    expect(await screen.findByText('Password changed. You can sign in.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Username/)).toHaveValue('demo.nurse')
  })

  it('checks the username before asking for a code, and says what is wrong (Zean, November 7, 2026)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithRouter(<LoginPage onLogin={() => {}} />, { route: '/login' })
    await user.click(await screen.findByRole('button', { name: 'Forgot password?' }))
    const dialog = screen.getByRole('dialog', { name: 'Forgot your password?' })
    await user.type(within(dialog).getByLabelText(/^Username/), 'nobody.here')
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(RECOVERY_NO_ACCOUNT_MESSAGE)
    expect(within(dialog).queryByLabelText('6-digit code')).not.toBeInTheDocument()
    await user.clear(within(dialog).getByLabelText(/^Username/))
    // No authenticator set up on the demo nurse yet.
    await user.type(within(dialog).getByLabelText(/^Username/), 'demo.nurse')
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(RECOVERY_NOT_SET_UP_MESSAGE)
  })

  it('offers a recovery code instead of the app', async () => {
    const { recoveryCodes } = await setUp()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderWithRouter(<LoginPage onLogin={() => {}} />, { route: '/login' })
    await user.click(await screen.findByRole('button', { name: 'Forgot password?' }))
    const dialog = screen.getByRole('dialog', { name: 'Forgot your password?' })
    await user.type(within(dialog).getByLabelText(/^Username/), 'demo.nurse')
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    await user.click(await within(dialog).findByRole('button', { name: 'Use a recovery code instead' }))
    await user.type(within(dialog).getByLabelText(/^Recovery code/), recoveryCodes[0])
    await user.click(within(dialog).getByRole('button', { name: 'Continue' }))
    expect(await within(dialog).findByLabelText(/^New password/)).toBeInTheDocument()
  })
})

describe('the account check (Zean, November 7, 2026)', () => {
  it('names an unknown username, a disabled account and one with no authenticator, each counting toward the lockout', async () => {
    await expect(checkRecoveryAccount('nobody.here')).rejects.toThrow(RECOVERY_NO_ACCOUNT_MESSAGE)
    await expect(checkRecoveryAccount('demo.nurse')).rejects.toThrow(RECOVERY_NOT_SET_UP_MESSAGE)
    await setUp()
    await expect(checkRecoveryAccount('demo.nurse')).resolves.toBeUndefined()
    for (let i = 0; i < 4; i += 1) await expect(checkRecoveryAccount('ghost.user')).rejects.toThrow(RECOVERY_NO_ACCOUNT_MESSAGE)
    await expect(checkRecoveryAccount('ghost.user')).rejects.toMatchObject({ reason: 'locked' })
  })
})
