import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MockAuthError, RecoveryError } from '../../mock-db'
import * as data from '../../data'
import { bootstrapApiSession, forgetApiSession, keepAlive, lastIdleMinutes } from './auth'

type Call = { url: string; method: string; body: unknown }
let calls: Call[]
let replies: Array<{ status: number; body?: unknown }>

beforeEach(() => {
  calls = []
  replies = []
  vi.stubEnv('VITE_API_MODE', 'api')
  vi.stubEnv('VITE_API_URL', 'http://localhost:8000/api')
  document.cookie = 'XSRF-TOKEN=t; path=/'
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({
        url: url.replace('http://localhost:8000', ''),
        method: init.method ?? 'GET',
        body: init.body ? JSON.parse(init.body as string) : undefined,
      })
      const next = replies.shift() ?? { status: 204 }
      return new Response(next.status === 204 ? null : JSON.stringify(next.body), {
        status: next.status,
      })
    }),
  )
  forgetApiSession()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const staff = { id: '7', name: 'Nurse Joy', role: 'staff' as const }

describe('AUTH in API mode (S1)', () => {
  it('signs in through the API and keeps the user for the screens', async () => {
    replies.push({ status: 200, body: { data: { user: staff, mustChangePassword: false } } })
    const result = await data.authenticateMockUser('nurse', 'secret-pass')
    expect(calls[0]).toEqual({
      url: '/api/auth/login',
      method: 'POST',
      body: { username: 'nurse', password: 'secret-pass' },
    })
    expect(result.user).toEqual(staff)
    data.startMockSession(result.user)
    expect(data.getAuthenticatedUser()).toEqual(staff)
    expect(data.getMockSessionUser()).toEqual(staff)
  })

  it('holds a forced password change as pending, not signed in', async () => {
    replies.push({ status: 200, body: { data: { user: staff, mustChangePassword: true } } })
    await data.authenticateMockUser('nurse', 'x')
    expect(data.getPendingPasswordChangeUser()).toEqual(staff)
    expect(data.getAuthenticatedUser()).toBeNull()
    await data.changeMockPassword(staff.id, 'new-password-1')
    expect(calls[1]).toMatchObject({
      url: '/api/auth/password',
      body: { nextPassword: 'new-password-1' },
    })
  })

  it('feeds the attempts left and the lockout to the existing sign-in messages', async () => {
    replies.push({
      status: 401,
      body: { code: 'invalid_credentials', message: 'x', attempts_left: 3 },
    })
    replies.push({
      status: 423,
      body: { code: 'account_locked', message: 'x', locked_until: '2026-11-15T10:05:00+08:00' },
    })
    const wrong = await data.authenticateMockUser('nurse', 'bad').catch((e: unknown) => e)
    expect(wrong).toBeInstanceOf(MockAuthError)
    expect(wrong).toMatchObject({ reason: 'invalid_credentials', remaining: 3 })
    const locked = await data.authenticateMockUser('nurse', 'bad').catch((e: unknown) => e)
    expect(locked).toMatchObject({ reason: 'locked' })
  })

  it('restores the session at start-up, and treats a 401 as signed out', async () => {
    replies.push({
      status: 200,
      body: {
        data: {
          user: staff,
          mustChangePassword: false,
          idleSignoutMinutes: 60,
          idleSecondsLeft: 3600,
        },
      },
    })
    await bootstrapApiSession()
    expect(data.getAuthenticatedUser()).toEqual(staff)
    expect(lastIdleMinutes()).toBe(60)
    replies.push({ status: 401, body: { code: 'unauthenticated', message: 'x' } })
    await bootstrapApiSession()
    expect(data.getAuthenticatedUser()).toBeNull()
  })

  it('signs out with the idle reason, and a 401 still ends it here', async () => {
    data.startMockSession(staff)
    replies.push({ status: 401, body: { code: 'session_idle', message: 'x' } })
    await data.logoutMockSession(staff, 'Signed out (idle)')
    expect(calls[0]).toMatchObject({
      url: '/api/auth/logout',
      body: { reason: 'Signed out (idle)' },
    })
    expect(data.getAuthenticatedUser()).toBeNull()
  })

  it('sends a keep-alive at most once a minute unless forced, and passes on the seconds left', async () => {
    const heard = vi.fn()
    window.addEventListener('cliniq:api-activity', heard)
    replies.push({ status: 200, body: { data: { idleSecondsLeft: 3540 } } })
    replies.push({ status: 200, body: { data: { idleSecondsLeft: 3600 } } })
    await expect(keepAlive(true)).resolves.toBe(3540)
    await expect(keepAlive()).resolves.toBeNull()
    await expect(keepAlive(true)).resolves.toBe(3600)
    expect(calls.filter((c) => c.url === '/api/session/keepalive')).toHaveLength(2)
    const detail = heard.mock.calls.map(([event]) => (event as CustomEvent).detail).filter(Boolean)
    expect(detail).toEqual([{ idleSecondsLeft: 3540 }, { idleSecondsLeft: 3600 }])
    window.removeEventListener('cliniq:api-activity', heard)
  })

  it('turns recovery refusals into RecoveryError with the attempts left', async () => {
    replies.push({
      status: 422,
      body: { code: 'validation_failed', message: 'The code did not work.', attempts_left: 2 },
    })
    const error = await data.verifyPasswordRecovery('nurse', '123456').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(RecoveryError)
    expect(error).toMatchObject({ message: 'The code did not work.', remaining: 2 })
    expect(calls[0]).toMatchObject({
      url: '/api/auth/recovery/verify',
      body: { username: 'nurse', code: '123456' },
    })
    replies.push({ status: 410, body: { code: 'bad_request', message: 'This reset has expired.' } })
    await expect(data.resetPasswordWithRecovery('tok', 'new-password-1')).rejects.toBeInstanceOf(
      RecoveryError,
    )
  })

  it('reshapes the authenticator setup to the mock type', async () => {
    replies.push({ status: 200, body: { data: { secret: 'ABC', otpauthUri: 'otpauth://x' } } })
    await expect(data.startAuthenticatorSetup()).resolves.toEqual({
      secret: 'ABC',
      uri: 'otpauth://x',
    })
    await data.turnOffAuthenticator('123456')
    expect(calls[1]).toMatchObject({
      url: '/api/auth/authenticator',
      method: 'DELETE',
      body: { proof: '123456' },
    })
  })

  it('reads the role idle limit from the settings', async () => {
    replies.push({
      status: 200,
      body: { data: { idleSignoutMinutesStaff: 60, idleSignoutMinutesAdmin: 30 } },
    })
    await expect(data.getIdleSignoutMinutes('admin')).resolves.toBe(30)
    expect(calls[0].url).toBe('/api/settings/idle-signout')
  })
})
