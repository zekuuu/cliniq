import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AccountPermissionError,
  DuplicateUsernameError,
  LastAdminError,
  NoBackupLocationError,
} from '../../mock-db'
import * as data from '../../data'
import { ok, stubApi } from './testFetch'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const admin = { id: '3', name: 'Principal', role: 'admin' as const }
const rule = (name: string, message = 'Refused.') => ({
  status: 409,
  body: { code: 'rule_violated', rule: name, message },
})

describe('USERS, BACKUP, ISSUE_REPORTS and REFERENCE in API mode (S7)', () => {
  it('keeps the account errors the form reads: duplicate username, last admin, Staff 403', async () => {
    stubApi((url, method) => {
      if (method === 'POST' && url === '/api/users') return rule('duplicate_username')
      if (url.endsWith('/active')) return rule('last_admin', 'This is the only active Admin.')
      return {
        status: 403,
        body: { code: 'forbidden', message: 'Only the Admin/Principal can manage accounts.' },
      }
    })
    await expect(
      data.saveUser({ name: 'A', username: 'a', role: 'staff' }, { actor: admin }),
    ).rejects.toBeInstanceOf(DuplicateUsernameError)
    const last = await data.setUserActive('3', false, admin).catch((e: unknown) => e)
    expect(last).toBeInstanceOf(LastAdminError)
    expect((last as Error).message).toBe('This is the only active Admin.')
    await expect(data.resetUserPassword('1', 'temp-pass-1', admin)).rejects.toBeInstanceOf(
      AccountPermissionError,
    )
  })

  it('runs a backup and reads no location as the mock error', async () => {
    const calls = stubApi(() =>
      rule('no_backup_location', 'Enable at least one backup location first.'),
    )
    await expect(data.recordBackupNow(admin)).rejects.toBeInstanceOf(NoBackupLocationError)
    expect(calls[0]).toMatchObject({ url: '/api/backups/run', method: 'POST' })
  })

  it('adds and enables backup locations, and browses folders', async () => {
    const calls = stubApi(() => ok({}))
    await data.saveBackupLocation({ label: 'USB', path: 'E:\\Backups' }, { actor: admin })
    await data.setBackupLocationEnabled('2', false, admin)
    await data.listBackupFolders('E:\\')
    expect(calls.map((c) => [c.method, decodeURIComponent(c.url), c.body])).toEqual([
      ['POST', '/api/backups/locations', { label: 'USB', path: 'E:\\Backups' }],
      ['PUT', '/api/backups/locations/2/enabled', { enabled: false }],
      ['GET', '/api/backups/folders?path=E:\\', undefined],
    ])
  })

  it('reads the reference lists from the server', async () => {
    const calls = stubApi(() => ok(25))
    await expect(data.getLargeWriteOffPercent()).resolves.toBe(25)
    await data.getGradeLevels()
    await data.createIssueReport({ description: 'Slow', route: '/', pageName: 'Dashboard' }, admin)
    expect(calls.map((c) => c.url)).toEqual([
      '/api/reference/large-write-off-percent',
      '/api/reference/grade-levels',
      '/api/issue-reports',
    ])
  })
})
