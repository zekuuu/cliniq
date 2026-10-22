import { beforeEach, describe, expect, it } from 'vitest'
import {
  AccountPermissionError,
  authenticateMockUser,
  getRecordedAuditEntries,
  getUser,
  LastAdminError,
  resetMockAuth,
  resetMockDb,
  resetUserPassword,
  saveUser,
  setUserActive,
} from '../../lib/mock-db'

/** Account management belongs to the Admin/Principal (ADR-033); these rules hold in the data layer. */
const ADMIN = { id: 'user-admin-01', name: 'Gilan Avelida', role: 'admin' } as const
const STAFF = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' } as const

describe('account management (ADR-033)', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockAuth()
  })

  it('refuses every account action from Staff', async () => {
    await expect(saveUser({ name: 'X', username: 'x.user', role: 'staff', temporaryPassword: 'temp-pass-1' }, { actor: STAFF })).rejects.toBeInstanceOf(AccountPermissionError)
    await expect(setUserActive('user-staff-02', false, STAFF)).rejects.toBeInstanceOf(AccountPermissionError)
    await expect(resetUserPassword('user-staff-02', 'temp-pass-1', STAFF)).rejects.toBeInstanceOf(AccountPermissionError)
    expect(getRecordedAuditEntries()).toEqual([])
  })

  it('never disables or demotes the last active Admin, its own account included', async () => {
    await expect(setUserActive('user-admin-01', false, ADMIN)).rejects.toBeInstanceOf(LastAdminError)
    const admin = await getUser('user-admin-01')
    await expect(saveUser({ name: admin.name, username: admin.username, role: 'staff' }, { userId: admin.id, actor: ADMIN })).rejects.toBeInstanceOf(LastAdminError)
    expect((await getUser('user-admin-01')).role).toBe('admin')
    expect(getRecordedAuditEntries()).toEqual([])
  })

  it('allows it once a second Admin is active', async () => {
    const second = await saveUser({ name: 'Second Admin', username: 'second.admin', role: 'admin', temporaryPassword: 'temp-pass-1' }, { actor: ADMIN })
    await setUserActive('user-admin-01', false, { id: second.id, name: second.name, role: 'admin' })
    expect((await getUser('user-admin-01')).deactivatedAt).toBeTruthy()
  })

  it('needs a temporary password for a new account, and the person must change it at first sign-in', async () => {
    await expect(saveUser({ name: 'New Nurse', username: 'new.nurse', role: 'staff' }, { actor: ADMIN })).rejects.toThrow('at least 8')
    await saveUser({ name: 'New Nurse', username: 'new.nurse', role: 'staff', temporaryPassword: 'temp-pass-1' }, { actor: ADMIN })
    expect((await authenticateMockUser('new.nurse', 'temp-pass-1')).mustChangePassword).toBe(true)
  })

  it('resets a password to a temporary one that must be changed', async () => {
    await resetUserPassword('user-staff-01', 'temp-pass-2', ADMIN)
    await expect(authenticateMockUser('demo.nurse', 'demo-nurse')).rejects.toMatchObject({ reason: 'invalid_credentials' })
    expect((await authenticateMockUser('demo.nurse', 'temp-pass-2')).mustChangePassword).toBe(true)
  })

  it('keeps a disabled account listed but refuses its sign-in until it is enabled', async () => {
    await setUserActive('user-staff-01', false, ADMIN)
    expect((await getUser('user-staff-01')).deactivatedAt).toBeTruthy()
    await expect(authenticateMockUser('demo.nurse', 'demo-nurse')).rejects.toMatchObject({ reason: 'invalid_credentials' })
    await setUserActive('user-staff-01', true, ADMIN)
    expect((await authenticateMockUser('demo.nurse', 'demo-nurse')).user.id).toBe('user-staff-01')
  })

  it('audits every account action under the Admin, naming the account and never a password', async () => {
    const created = await saveUser({ name: 'New Nurse', username: 'new.nurse', role: 'staff', temporaryPassword: 'temp-pass-1' }, { actor: ADMIN })
    await saveUser({ name: 'New Nurse', username: 'new.nurse', role: 'admin' }, { userId: created.id, actor: ADMIN })
    await setUserActive(created.id, false, ADMIN)
    await setUserActive(created.id, true, ADMIN)
    await resetUserPassword(created.id, 'temp-pass-2', ADMIN)
    const entries = getRecordedAuditEntries()
    expect(entries.map((e) => [e.userId, e.actionType, e.targetRecord?.id, e.summary])).toEqual([
      ['user-admin-01', 'create', created.id, undefined],
      ['user-admin-01', 'update', created.id, 'Updated role'],
      ['user-admin-01', 'update', created.id, 'Disabled account'],
      ['user-admin-01', 'update', created.id, 'Enabled account'],
      ['user-admin-01', 'update', created.id, 'Reset password'],
    ])
    expect(JSON.stringify(entries)).not.toMatch(/temp-pass/)
  })
})
