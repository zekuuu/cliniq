import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DuplicateLrnError, MockAuthError, StockRuleError } from '../mock-db'
import { ApiError, http, SESSION_ENDED_EVENT } from './client'
import { mapped } from './errors'

type Call = { url: string; init: RequestInit }
let calls: Call[]
let replies: Array<() => Response>

function json(status: number, body: unknown) {
  return () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
}

function setCookie(value: string) {
  document.cookie = `XSRF-TOKEN=${value}; path=/`
}

beforeEach(() => {
  calls = []
  replies = []
  vi.stubEnv('VITE_API_URL', 'http://localhost:8000/api')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      const next = replies.shift()
      if (!next) throw new Error('unexpected request')
      return next()
    }),
  )
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('http client (ADR-080)', () => {
  it('reads data with the session cookie and no CSRF call', async () => {
    replies.push(json(200, { data: { status: 'ok' } }))
    await expect(http.get('/health')).resolves.toEqual({ status: 'ok' })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe('http://localhost:8000/api/health')
    expect(calls[0].init.credentials).toBe('include')
  })

  it('fetches the CSRF cookie at the server root before the first write and echoes it', async () => {
    replies.push(() => {
      setCookie('abc%3D%3D')
      return new Response(null, { status: 204 })
    })
    replies.push(json(200, { data: { ok: true } }))
    await http.post('/things', { name: 'x' })
    expect(calls[0].url).toBe('http://localhost:8000/sanctum/csrf-cookie')
    const headers = calls[1].init.headers as Record<string, string>
    expect(headers['X-XSRF-TOKEN']).toBe('abc==')
    expect(headers.Accept).toBe('application/json')
    expect(calls[1].init.body).toBe('{"name":"x"}')
  })

  it('retries a write once after a 419, with a fresh CSRF cookie', async () => {
    setCookie('old')
    replies.push(json(419, { code: 'csrf_mismatch', message: 'x' }))
    replies.push(() => {
      setCookie('new')
      return new Response(null, { status: 204 })
    })
    replies.push(json(419, { code: 'csrf_mismatch', message: 'Stale.' }))
    await expect(http.put('/things/1', {})).rejects.toMatchObject({ status: 419 })
    expect(calls.map((c) => c.url)).toEqual([
      'http://localhost:8000/api/things/1',
      'http://localhost:8000/sanctum/csrf-cookie',
      'http://localhost:8000/api/things/1',
    ])
    expect((calls[2].init.headers as Record<string, string>)['X-XSRF-TOKEN']).toBe('new')
  })

  it('carries the contract error body and never retries other write failures', async () => {
    setCookie('t')
    replies.push(json(500, { code: 'server_error', request_id: 'req-9' }))
    const error = await http.post('/things').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 500, code: 'server_error', requestId: 'req-9' })
    expect((error as Error).message).toContain('req-9')
    expect(calls).toHaveLength(1)
  })

  it('maps 409 rules, sign-in failures and lockouts to the mock errors', async () => {
    setCookie('t')
    replies.push(json(409, { code: 'rule_violated', rule: 'duplicate_lrn', message: 'Used.' }))
    replies.push(json(409, { code: 'rule_violated', rule: 'stock_rule', message: 'No stock.' }))
    replies.push(json(401, { code: 'invalid_credentials', message: 'x', attempts_left: 2 }))
    replies.push(
      json(423, {
        code: 'account_locked',
        message: 'x',
        locked_until: '2026-11-15T10:05:00+08:00',
      }),
    )
    const lrn = await http.post('/a').catch((e: unknown) => e)
    expect(lrn).toBeInstanceOf(DuplicateLrnError)
    expect((lrn as Error).message).toBe('Used.')
    const stock = await http.post('/b').catch((e: unknown) => e)
    expect(stock).toBeInstanceOf(StockRuleError)
    expect((stock as Error).message).toBe('No stock.')
    const wrong = await http.post('/c', {}, { quiet401: true }).catch((e: unknown) => e)
    expect(wrong).toMatchObject({ reason: 'invalid_credentials', remaining: 2 })
    const locked = await http.post('/d', {}, { quiet401: true }).catch((e: unknown) => e)
    expect(locked).toBeInstanceOf(MockAuthError)
    expect((locked as MockAuthError).lockedUntil).toBe(Date.parse('2026-11-15T10:05:00+08:00'))
  })

  it('maps a 422 to the class a call names, keeping the server message', async () => {
    setCookie('t')
    replies.push(json(422, { code: 'validation_failed', message: 'Whole numbers.', errors: {} }))
    const error = await mapped(http.post('/e'), {
      validation: (message) => new StockRuleError(message),
    }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(StockRuleError)
    expect((error as Error).message).toBe('Whole numbers.')
  })

  it('announces a session that ended, and logs nothing', async () => {
    const ended = vi.fn()
    window.addEventListener(SESSION_ENDED_EVENT, ended)
    const log = vi.spyOn(console, 'log')
    const err = vi.spyOn(console, 'error')
    replies.push(json(401, { code: 'session_idle', message: 'Signed out.' }))
    await expect(http.get('/x')).rejects.toMatchObject({ code: 'session_idle' })
    expect((ended.mock.calls[0][0] as CustomEvent).detail).toBe('session_idle')
    expect(log).not.toHaveBeenCalled()
    expect(err).not.toHaveBeenCalled()
    window.removeEventListener(SESSION_ENDED_EVENT, ended)
  })

  it('defaults to a relative /api beside the server, skipping empty query values', async () => {
    vi.stubEnv('VITE_API_URL', '')
    replies.push(json(200, { data: 1 }))
    await http.get('/health', { query: { a: 1, b: '', c: undefined } })
    expect(calls[0].url).toBe('/api/health?a=1')
  })

  it('turns a dead server into a plain message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    )
    await expect(http.get('/x')).rejects.toMatchObject({ status: 0, code: 'network_error' })
  })
})
