import { useEffect, useRef, useState } from 'react'
import { errorMessage, notify } from '../lib/notify'

export type SaveResult = { kind: 'saved' | 'failed'; message: string } | null

/** How long a success message stays (a failure stays until the next try). */
export const SAVED_MESSAGE_MS = 5000

/** Shown when a save fails for a reason the screen doesn't explain itself. */
export const SAVE_FAILED_MESSAGE = 'Not saved. Nothing you typed was lost. Please try again.'

/**
 * One save behaviour for every Save, Add, Update, Complete, Confirm and Submit (professor's consultation,
 * November 6, 2026: never a silent save, never a double submit). `run` refuses a second call while the
 * first is working, exposes `saving` for the button's `loading`, and shows the result as a toast
 * (ADR-083). `result` stays for the button's `done` check: a success that clears itself after a few
 * seconds, or a failure. The form keeps its values on failure because `run` never resets them.
 */
export function useSaveFeedback() {
  const busy = useRef(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<SaveResult>(null)

  useEffect(() => {
    if (result?.kind !== 'saved') return
    const timer = setTimeout(() => setResult(null), SAVED_MESSAGE_MS)
    return () => clearTimeout(timer)
  }, [result])

  async function run<T>(
    action: () => Promise<T>,
    messages: {
      saved: string | ((value: T) => string)
      /** A message for this failure; `null` when the screen already shows it (a field error). */
      failed?: (cause: unknown) => string | null | undefined
    },
  ): Promise<{ ok: true; value: T } | { ok: false }> {
    if (busy.current) return { ok: false }
    busy.current = true
    setSaving(true)
    setResult(null)
    try {
      const value = await action()
      const message = typeof messages.saved === 'function' ? messages.saved(value) : messages.saved
      setResult({ kind: 'saved', message })
      notify.success(message)
      return { ok: true, value }
    } catch (cause) {
      const failed = messages.failed?.(cause)
      if (failed === null) {
        setResult(null)
        notify.checkFields()
      } else {
        const message = failed ?? errorMessage(cause, SAVE_FAILED_MESSAGE)
        setResult({ kind: 'failed', message })
        notify.error(message)
      }
      return { ok: false }
    } finally {
      busy.current = false
      setSaving(false)
    }
  }

  return { saving, result, run, clear: () => setResult(null) }
}
