import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  getDashboardSummary,
  getMockToday,
  getRecordedAuditEntries,
  recordBackupNow,
  resetMockAuth,
  resetMockDb,
  type SessionUser,
} from '../../lib/mock-db'
import { db } from '../../lib/mock-db/store'
import { AppRoutes } from '../../routes/AppRoutes'
import { renderWithRouter } from '../../test/renderWithRouter'
import { UserFormPage } from '../user-management/UserFormPage'
import { UserListPage } from '../user-management/UserListPage'

/** Panel review part 6: Backup for both roles, Back up now, the stale alert, password re-entry, no default role. */

const STAFF: SessionUser = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }
const ADMIN: SessionUser = { id: 'user-admin-01', name: 'Gilan Avelida', role: 'admin' }
const today = () => getMockToday()
const summary = () => getDashboardSummary({ range: { preset: 'today', from: today(), to: today() } })

beforeEach(() => {
  resetMockDb()
  resetMockAuth()
})

describe('Backup for both roles (ADR-037, D12)', () => {
  it('opens the Backup page for the Admin, with Back up now', async () => {
    render(
      <MemoryRouter initialEntries={['/backup']}>
        <AppRoutes user={ADMIN} onLogout={() => {}} />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: 'Backup Verification' }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back up now' })).toBeInTheDocument()
  })

  it('records a successful run for either role, audit-logged', async () => {
    const before = db().backupLogs.length
    await recordBackupNow(ADMIN)
    await recordBackupNow(STAFF)
    expect(db().backupLogs.length).toBe(before + 2)
    expect(db().backupLogs.at(-1)).toMatchObject({ status: 'ok', verifiedByUserId: null })
    expect(getRecordedAuditEntries().map((e) => [e.userId, e.actionType, e.targetRecord?.type])).toEqual([
      ['user-admin-01', 'create', 'backup'],
      ['user-staff-01', 'create', 'backup'],
    ])
  })
})

describe('stale-backup alert (BK-2, D5)', () => {
  it('is quiet while the last success is recent, and warns when it is old, failed, or missing', async () => {
    expect((await summary()).backupAlert).toBeNull()
    // Only one successful run, 3 days ago: older than 48 hours.
    const ago = (ms: number) => new Date(Date.now() - ms).toISOString()
    db().backupLogs = [{ lastRun: ago(3 * 86_400_000), fileSizeBytes: 18_000_000, status: 'ok', verifiedByUserId: null }]
    // The warning reads the newest success on an enabled backup location (ADR-052).
    for (const location of db().frontendOnly.backupLocations) location.lastBackupAt = ago(3 * 86_400_000)
    expect((await summary()).backupAlert).toMatchObject({ kind: 'stale', staleAfterHours: 48 })
    db().backupLogs.push({ lastRun: ago(60_000), fileSizeBytes: 0, status: 'failed', verifiedByUserId: null })
    expect((await summary()).backupAlert?.kind).toBe('failed')
    db().backupLogs = []
    for (const location of db().frontendOnly.backupLocations) Object.assign(location, { lastBackupAt: null, lastResult: null })
    expect((await summary()).backupAlert?.kind).toBe('never')
  })
})

describe('no password re-entry (Zean, Sunday, October 25, 2026)', () => {
  it('disables an account at once, with no password dialog', async () => {
    const user = userEvent.setup()
    renderWithRouter(<UserListPage viewer={ADMIN} />)
    await user.click(await screen.findByRole('button', { name: 'Disable Jennesse Baas' }))
    expect(await screen.findByText("Jennesse Baas's account is disabled.")).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: "Confirm it's you" })).not.toBeInTheDocument()
    expect(getRecordedAuditEntries().map((e) => e.actionType)).toEqual(['update'])
  })
})

describe('no default role on Add User (AC-4)', () => {
  it('starts with no role and requires one', async () => {
    const user = userEvent.setup()
    renderWithRouter(<UserFormPage viewer={ADMIN} />)
    await screen.findByRole('heading', { level: 1, name: 'Add User' })
    expect(screen.getByLabelText(/^role/i)).toHaveTextContent('Select a role')
    await user.type(screen.getByLabelText(/full name/i), 'New Nurse')
    await user.type(screen.getByLabelText(/username/i), 'new.nurse')
    await user.type(screen.getByLabelText(/temporary password/i), 'temp-pass-123')
    await user.click(screen.getByRole('button', { name: 'Create User' }))
    expect(screen.getByText('Choose a role.')).toBeInTheDocument()
    expect(getRecordedAuditEntries()).toEqual([])
    // The picture hint no longer says "mock".
    expect(screen.queryByText(/mock/i)).not.toBeInTheDocument()
  })
})

describe('lockouts are audit-logged (Zean, Friday, October 23, 2026)', () => {
  it('logs the fifth wrong sign-in against the account, never a single miss or the password', async () => {
    const { authenticateMockUser } = await import('../../lib/mock-db')
    for (let i = 0; i < 4; i += 1) await expect(authenticateMockUser('demo.nurse', `wrong-${i}`)).rejects.toMatchObject({ reason: 'invalid_credentials' })
    expect(getRecordedAuditEntries()).toEqual([])
    await expect(authenticateMockUser('demo.nurse', 'wrong-4')).rejects.toMatchObject({ reason: 'locked' })
    expect(getRecordedAuditEntries()).toEqual([
      expect.objectContaining({ userId: STAFF.id, actionType: 'login', targetRecord: { type: 'user', id: STAFF.id }, summary: 'Account locked for 30 minutes after 5 wrong passwords (sign-in)' }),
    ])
    expect(JSON.stringify(getRecordedAuditEntries())).not.toContain('wrong-4')
  })
})
