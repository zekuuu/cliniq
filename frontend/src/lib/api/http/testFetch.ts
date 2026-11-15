import { vi } from 'vitest'

/** One recorded request of a stubbed `fetch` (no network; ADR-080 tests). */
export interface StubCall {
  url: string
  method: string
  body: unknown
}

type Reply = { status: number; body?: unknown }

/**
 * Stubs `fetch` for API-mode tests: every module on the API, the XSRF cookie set, and replies
 * chosen by `route(url, method)` (default: 204). Returns the recorded calls.
 */
export function stubApi(
  route: (url: string, method: string) => Reply | undefined = () => undefined,
) {
  const calls: StubCall[] = []
  vi.stubEnv('VITE_API_MODE', 'api')
  vi.stubEnv('VITE_API_URL', 'http://localhost:8000/api')
  document.cookie = 'XSRF-TOKEN=t; path=/'
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const path = url.replace('http://localhost:8000', '')
      const method = init.method ?? 'GET'
      calls.push({
        url: path,
        method,
        body: init.body ? JSON.parse(init.body as string) : undefined,
      })
      const reply = route(path, method) ?? { status: 204 }
      return new Response(reply.status === 204 ? null : JSON.stringify(reply.body), {
        status: reply.status,
      })
    }),
  )
  return calls
}

export const ok = (data: unknown, meta?: unknown): Reply => ({ status: 200, body: { data, meta } })
