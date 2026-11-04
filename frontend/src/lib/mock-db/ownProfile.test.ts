import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearMockSession, getOwnAccount, getRecordedAuditEntries, listAuditLog, resetMockDb, startMockSession, updateOwnProfile, USER_NAME_MAX } from '.'
import { db } from './store'

/** Account menu and Edit profile (ADR-066): a user changes only their own name and picture. */
describe('own profile', () => {
  beforeEach(() => resetMockDb())
  afterEach(() => clearMockSession())

  it('reads the signed-in account, never one named by the caller', async () => {
    const admin = db().users.find((u) => u.role === 'admin')!
    startMockSession({ id: admin.id, name: admin.name, role: admin.role })
    const account = await getOwnAccount()
    expect(account).toMatchObject({ name: admin.name, username: admin.username, role: 'admin' })
  })

  it('renames the signed-in user and audits the field name only', async () => {
    const staff = db().users.find((u) => u.role === 'staff')!
    startMockSession({ id: staff.id, name: staff.name, role: staff.role })
    const before = staff.name
    const updated = await updateOwnProfile({ name: '  Maria   Santos  ', profilePicture: staff.profilePicture ?? null })
    expect(updated.name).toBe('Maria Santos')
    expect(db().users.find((u) => u.id === staff.id)).toMatchObject({ name: 'Maria Santos', username: staff.username, role: 'staff' })
    const entries = getRecordedAuditEntries().filter((entry) => entry.targetRecord?.id === staff.id)
    expect(entries.map((entry) => entry.summary)).toEqual(['Changed own name'])
    expect(JSON.stringify(entries)).not.toContain(before)
    expect(JSON.stringify(entries)).not.toContain('Maria Santos')
  })

  it('changes and removes the picture, audited without image data', async () => {
    const staff = db().users.find((u) => u.role === 'staff')!
    startMockSession({ id: staff.id, name: staff.name, role: staff.role })
    await updateOwnProfile({ name: staff.name, profilePicture: 'data:image/webp;base64,AAAA' })
    expect(db().users.find((u) => u.id === staff.id)?.profilePicture).toBe('data:image/webp;base64,AAAA')
    await updateOwnProfile({ name: staff.name, profilePicture: null })
    expect(db().users.find((u) => u.id === staff.id)?.profilePicture).toBeNull()
    const summaries = getRecordedAuditEntries().map((entry) => entry.summary)
    expect(summaries).toEqual(['Changed own profile picture', 'Changed own profile picture'])
    expect(JSON.stringify(getRecordedAuditEntries())).not.toContain('base64')
  })

  it('writes nothing when nothing changed', async () => {
    const staff = db().users.find((u) => u.role === 'staff')!
    startMockSession({ id: staff.id, name: staff.name, role: staff.role })
    await updateOwnProfile({ name: staff.name, profilePicture: staff.profilePicture ?? null })
    expect(getRecordedAuditEntries()).toEqual([])
  })

  it('refuses a blank or over-long name and a file that is not an image', async () => {
    const staff = db().users.find((u) => u.role === 'staff')!
    startMockSession({ id: staff.id, name: staff.name, role: staff.role })
    await expect(updateOwnProfile({ name: '   ', profilePicture: null })).rejects.toThrow('Enter your full name.')
    await expect(updateOwnProfile({ name: 'a'.repeat(USER_NAME_MAX + 1), profilePicture: null })).rejects.toThrow(/characters or fewer/)
    await expect(updateOwnProfile({ name: staff.name, profilePicture: 'https://example.test/x.png' })).rejects.toThrow('Choose a JPEG, PNG, or WebP image.')
    expect(getRecordedAuditEntries()).toEqual([])
  })

  it('refuses a disabled account', async () => {
    const staff = db().users.find((u) => u.role === 'staff')!
    startMockSession({ id: staff.id, name: staff.name, role: staff.role })
    staff.deactivatedAt = '2026-11-01T08:00:00+08:00'
    await expect(updateOwnProfile({ name: 'Someone Else', profilePicture: null })).rejects.toThrow('This account is disabled.')
  })

  it('shows the live name on older audit rows, because entries keep only the user id', async () => {
    const staff = db().users.find((u) => u.role === 'staff')!
    startMockSession({ id: staff.id, name: staff.name, role: staff.role })
    await updateOwnProfile({ name: 'Renamed Nurse', profilePicture: staff.profilePicture ?? null })
    const admin = db().users.find((u) => u.role === 'admin')!
    startMockSession({ id: admin.id, name: admin.name, role: admin.role })
    const { rows } = await listAuditLog({ from: '2000-01-01', to: '2999-12-31', userId: '', actionTypes: [], targetTypes: [] })
    expect(rows.filter((row) => row.summary === 'Changed own name').map((row) => row.userName)).toEqual(['Renamed Nurse'])
  })
})
