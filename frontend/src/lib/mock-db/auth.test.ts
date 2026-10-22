import { describe, expect, it, beforeEach } from 'vitest'
import {
  authenticateMockUser,
  changeMockPassword,
  getRecordedAuditEntries,
  resetMockAuth,
  resetMockDb,
  MockAuthError,
} from './index'

beforeEach(() => {
  resetMockAuth()
  resetMockDb()
})

describe('frontend-first authentication boundary', () => {
  it('authenticates a synthetic account and records a login without returning a password', async () => {
    const result = await authenticateMockUser('demo.nurse', 'demo-nurse')

    expect(result).toEqual({
      user: { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' },
      mustChangePassword: false,
    })
    expect(getRecordedAuditEntries()).toEqual([
      expect.objectContaining({ actionType: 'login', userId: 'user-staff-01' }),
    ])
    expect(JSON.stringify(result)).not.toContain('password')
  })

  it('returns a generic failure and locks the account on the fifth failed attempt', async () => {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await expect(authenticateMockUser('demo.nurse', 'wrong-password')).rejects.toMatchObject({ reason: 'invalid_credentials' })
    }
    await expect(authenticateMockUser('demo.nurse', 'wrong-password')).rejects.toMatchObject({ reason: 'locked' })
    await expect(authenticateMockUser('demo.nurse', 'demo-nurse')).rejects.toMatchObject({ reason: 'locked' })
  })

  it('requires the first-login account to choose a new password', async () => {
    const result = await authenticateMockUser('demo.new', 'demo-change')
    expect(result.mustChangePassword).toBe(true)

    await expect(changeMockPassword(result.user.id, 'short')).rejects.toThrow('at least 8')
    await expect(changeMockPassword(result.user.id, 'demo-change')).rejects.toThrow('not used recently')
    await changeMockPassword(result.user.id, 'new-demo-password-4')

    const nextLogin = await authenticateMockUser('demo.new', 'new-demo-password-4')
    expect(nextLogin.mustChangePassword).toBe(false)
  })

  it('uses a generic error type for invalid credentials', async () => {
    await expect(authenticateMockUser('unknown-user', 'anything')).rejects.toBeInstanceOf(MockAuthError)
  })
})
