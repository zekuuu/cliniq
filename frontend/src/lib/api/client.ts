/**
 * The one HTTP client for the real API (API-Contract.md "Conventions", ADR-080).
 *
 * Sanctum SPA cookie mode: the session cookie goes with every request (`credentials: 'include'`), a
 * write first makes sure the XSRF cookie exists and echoes it as `X-XSRF-TOKEN`. A 419 fetches a
 * fresh cookie and retries that write once; nothing else is ever retried. Request and response bodies
 * are never logged.
 */
import { toMockError } from './errors'
import { API_ACTIVITY_EVENT } from '../sessionActivity'

/** `/api` beside the API on the clinic PC (ADR-079); `VITE_API_URL` for the two dev servers. */
export function apiBaseUrl(): string {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  return (configured || '/api').replace(/\/+$/, '')
}

/** `/sanctum/csrf-cookie` lives at the server root, not under `/api`. */
function csrfUrl(): string {
  return `${apiBaseUrl().replace(/\/api$/, '')}/sanctum/csrf-cookie`
}

const TIMEOUT_MS = 30_000

export interface ApiErrorBody {
  code?: string
  message?: string
  rule?: string
  errors?: Record<string, string[]>
  request_id?: string
  attempts_left?: number
  locked_until?: string
}

/** A refused or failed request, with the contract's error body. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly rule?: string
  readonly errors?: Record<string, string[]>
  readonly requestId?: string
  readonly attemptsLeft?: number
  readonly lockedUntil?: string

  constructor(status: number, body: ApiErrorBody) {
    super(body.message || friendlyMessage(status, body.request_id))
    this.name = 'ApiError'
    this.status = status
    this.code = body.code ?? (status === 0 ? 'network_error' : 'server_error')
    this.rule = body.rule
    this.errors = body.errors
    this.requestId = body.request_id
    this.attemptsLeft = body.attempts_left
    this.lockedUntil = body.locked_until
  }
}

function friendlyMessage(status: number, requestId?: string): string {
  const ref = requestId ? ` (Reference: ${requestId})` : ''
  if (status === 0)
    return 'The clinic server did not answer. Check that it is running, then try again.'
  if (status === 429) return `Too many requests. Wait a minute, then try again.${ref}`
  return `Something went wrong on the clinic server. Try again.${ref}`
}

/** 401 that ends the session, and 403 that needs a password change: the app listens for these. */
export const SESSION_ENDED_EVENT = 'cliniq:session-ended'
export const PASSWORD_CHANGE_REQUIRED_EVENT = 'cliniq:password-change-required'
const SESSION_END_CODES = new Set(['unauthenticated', 'session_idle', 'session_expired'])

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((part) => part.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

let csrfReady: Promise<void> | null = null

async function ensureCsrf(fresh = false): Promise<void> {
  if (!fresh && readCookie('XSRF-TOKEN')) return
  if (fresh || !csrfReady) {
    csrfReady = fetch(csrfUrl(), {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then((response) => {
        if (!response.ok) throw new ApiError(response.status, {})
      })
      .finally(() => {
        csrfReady = null
      })
  }
  await csrfReady
}

export interface RequestOptions {
  /** An array value repeats as `key[]=a&key[]=b`, as Laravel reads a list. */
  query?: Record<string, string | number | boolean | ReadonlyArray<string> | null | undefined>
  body?: unknown
  signal?: AbortSignal
  /** Sign-in and recovery handle their own 401 and 423; don't end the session on them. */
  quiet401?: boolean
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) value.forEach((item) => params.append(`${key}[]`, String(item)))
    else params.set(key, String(value))
  }
  const search = params.toString()
  return `${apiBaseUrl()}${path}${search ? `?${search}` : ''}`
}

async function send(method: string, path: string, options: RequestOptions): Promise<Response> {
  const write = method !== 'GET'
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (write) {
    const token = readCookie('XSRF-TOKEN')
    if (token) headers['X-XSRF-TOKEN'] = token
  }
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout
  try {
    return await fetch(buildUrl(path, options.query), {
      method,
      headers,
      credentials: 'include',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal,
    })
  } catch (error) {
    // The caller's own abort stays an AbortError; a timeout or a dead server becomes a message.
    if (options.signal?.aborted) throw error
    throw new ApiError(0, {})
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'
export interface PageMeta {
  page: number
  perPage: number
  total: number
  /** Added with the paged lists (ADR-082). */
  lastPage?: number
  /** The Incomplete Records Queue's Open and Resolved counts. */
  counts?: Record<string, number>
}

async function call<T>(
  method: Method,
  path: string,
  options: RequestOptions,
): Promise<{ data: T; meta?: PageMeta }> {
  const write = method !== 'GET'
  if (write) await ensureCsrf()
  let response = await send(method, path, options)
  if (write && response.status === 419) {
    await ensureCsrf(true)
    response = await send(method, path, options)
  }
  // Every answered request counts as activity on the server; the idle countdown follows (ADR-078).
  if (response.ok) window.dispatchEvent(new Event(API_ACTIVITY_EVENT))
  if (response.status === 204) return { data: undefined as T }
  const body = (await response.json().catch(() => ({}))) as {
    data?: T
    meta?: PageMeta
  } & ApiErrorBody
  if (response.ok) return { data: body.data as T, meta: body.meta }

  const error = new ApiError(response.status, body)
  if (response.status === 401 && SESSION_END_CODES.has(error.code) && !options.quiet401) {
    window.dispatchEvent(new CustomEvent(SESSION_ENDED_EVENT, { detail: error.code }))
  }
  if (response.status === 403 && error.code === 'password_change_required') {
    window.dispatchEvent(new CustomEvent(PASSWORD_CHANGE_REQUIRED_EVENT))
  }
  // 401 sign-in, 423 and 409 with a known rule become the mock's error class (errors.ts).
  throw toMockError(error)
}

/** One request; returns the `data` of the success body (or `undefined` for 204). */
export async function request<T>(method: Method, path: string, options: RequestOptions = {}) {
  return (await call<T>(method, path, options)).data
}

/** A paged list read: `data` with the contract's `meta` (Q19, ADR-082). The student search is a POST. */
export function requestPage<T>(
  path: string,
  options: RequestOptions & { method?: 'GET' | 'POST' } = {},
) {
  return call<T>(options.method ?? 'GET', path, options)
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, { ...options, body }),
  delete: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('DELETE', path, { ...options, body }),
}
