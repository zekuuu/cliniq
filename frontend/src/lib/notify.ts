import type { CSSProperties } from 'react'
import { toast } from 'sonner'
import { ApiError } from './api/client'

/**
 * The only module that imports `sonner` (ADR-083). Every action result in CLINIQ is a toast at the
 * bottom right, sent through `notify`; the one `<Toaster>` is `components/ui/Toaster.tsx`.
 *
 * Copy rules (ADR-083):
 * - Sentence case, one short sentence. Past tense for success, naming what and which:
 *   "Visit VR-2026-0412 recorded". No exclamation marks, no "successfully", no jargon, no emoji.
 * - An error says what failed and what to do next.
 * - Privacy: this is a health record of minors. Never put a diagnosis, symptom, vitals, medicine or
 *   any health detail in a toast. Name a record by its number (VR-, IR-, EL-) or the screen's own
 *   label. A person's name only where the same screen already shows it.
 * - Never a stack trace, a status code, SQL, a file path or server exception text: errors go
 *   through `notify.apiError`.
 */

export const SUCCESS_MS = 4000
export const ERROR_MS = 6000
/** A toast with an action (Open letter) stays longer, so there is time to press it. */
export const ACTION_MS = 8000

export interface NotifyOptions {
  /**
   * Turns the `loading` toast with this id into the result. Otherwise ignored: every action gets its
   * own toast, so results stack (ADR-084; ADR-083 merged toasts by id and text, which hid repeated
   * results and kept a merged toast on screen after its countdown line ran out).
   */
  id?: string
  description?: string
  action?: { label: string; onClick: () => void }
  duration?: number
}

type Kind = 'success' | 'error' | 'warning' | 'info'
const DEFAULT_MS: Record<Kind, number> = {
  success: SUCCESS_MS,
  info: SUCCESS_MS,
  error: ERROR_MS,
  warning: ERROR_MS,
}

/** Ids of `loading` toasts still waiting for their result. */
const pending = new Set<string>()

function show(kind: Kind, message: string, { id, ...options }: NotifyOptions = {}) {
  const duration = options.duration ?? (options.action ? ACTION_MS : DEFAULT_MS[kind])
  const result = id !== undefined && pending.delete(id)
  return toast[kind](message, {
    ...options,
    ...(result ? { id } : {}),
    duration,
    // The coloured line along the bottom runs for exactly this long (index.css, "Toasts").
    style: { '--toast-ms': `${duration}ms` } as CSSProperties,
  })
}

const GENERIC_SERVER = 'Something went wrong on our side. Please try again.'
const OFFLINE = 'Cannot reach the server. Check the connection and try again.'

/** Built-in errors carry developer text ("Failed to fetch", "x is undefined"), never shown. */
const BUILT_IN = [TypeError, RangeError, SyntaxError, ReferenceError]

/**
 * A failure as one plain sentence. The server's messages are written for people
 * (`ApiExceptionRenderer`), and so are the mock's (`lib/mock-db`), so those are used; anything
 * else gets the fixed sentence for its status, or `fallback`.
 */
export function errorMessage(error: unknown, fallback: string): string {
  const api =
    error instanceof ApiError
      ? error
      : error instanceof Error && error.cause instanceof ApiError
        ? error.cause
        : null
  if (api) {
    if (api.status === 0) return OFFLINE
    if (api.status === 401) return 'Your session ended. Please sign in again.'
    if (api.status === 429) return 'Too many requests. Please wait a moment and try again.'
    if (api.status >= 500) return GENERIC_SERVER
    if (api.status === 422 && api.errors && Object.keys(api.errors).length)
      return 'Some fields need attention.'
    // A mock error class mapped from the server keeps the server's text as its message.
    const text = error instanceof Error ? error.message : api.message
    if (text) return text
    if (api.status === 403) return 'You do not have permission to do that.'
    if (api.status === 404) return 'That record no longer exists.'
    if (api.status === 409) return 'Someone else changed this record. Reload and try again.'
    return fallback
  }
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) return OFFLINE
  // The mock's own errors: plain `Error`s and named classes, all written as user sentences.
  if (error instanceof Error && error.message && !BUILT_IN.some((type) => error instanceof type))
    return error.message
  return fallback
}

export const notify = {
  success: (message: string, options?: NotifyOptions) => show('success', message, options),
  error: (message: string, options?: NotifyOptions) => show('error', message, options),
  warning: (message: string, options?: NotifyOptions) => show('warning', message, options),
  info: (message: string, options?: NotifyOptions) => show('info', message, options),
  /** A failure from the data layer, mapped to a plain sentence (`errorMessage`). */
  apiError: (error: unknown, fallback: string, options?: NotifyOptions) =>
    show('error', errorMessage(error, fallback), options),
  /** Validation that stopped a submit; the field messages stay inline. */
  checkFields: (message = 'Please check the highlighted fields.') => show('error', message),
  /** A slow action. Pass the same `id` to `success`/`error` afterwards to turn it into the result. */
  loading: (message: string, options: { id: string }) => {
    pending.add(options.id)
    return toast.loading(message, options)
  },
  /** Loading, then the result, in one toast. */
  promise<T>(
    promise: Promise<T>,
    messages: {
      id: string
      loading: string
      success: string | ((value: T) => string)
      error: string
    },
  ): Promise<T> {
    notify.loading(messages.loading, { id: messages.id })
    return promise.then(
      (value) => {
        const text =
          typeof messages.success === 'function' ? messages.success(value) : messages.success
        show('success', text, { id: messages.id })
        return value
      },
      (cause: unknown) => {
        show('error', errorMessage(cause, messages.error), { id: messages.id })
        throw cause
      },
    )
  },
  dismiss: (id?: string) => {
    if (id === undefined) pending.clear()
    else pending.delete(id)
    return toast.dismiss(id)
  },
}
