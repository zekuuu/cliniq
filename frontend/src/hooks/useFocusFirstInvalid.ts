import { useEffect, useState, type RefObject } from 'react'
import { notify } from '../lib/notify'

/**
 * Moves focus to the first invalid field inside `root`: the first element marked `aria-invalid`, or,
 * for a form that reports one message for the whole form, its `role="alert"` message. The field is
 * scrolled to the middle of the screen so the sticky top bar never covers it.
 */
export function focusFirstInvalid(root: HTMLElement | null): boolean {
  const target =
    root?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
    root?.querySelector<HTMLElement>('[role="alert"]')
  if (!target) return false
  if (!target.matches('input, select, textarea, button, [tabindex]')) target.tabIndex = -1
  // jsdom has no scrollIntoView.
  target.scrollIntoView?.({ block: 'center' })
  target.focus({ preventScroll: true })
  return true
}

/**
 * Failed-submit behaviour for every entry and edit form (`cliniq-input-patterns`). Pass the ref of the
 * form (or the element wrapping its fields) and call `report(errorCount)` on every submit.
 * Focus moves once React has rendered the messages. Render `announcement` in a polite live region
 * so screen-reader users hear how many fields need attention. A failed submit also shows one toast,
 * "Please check the highlighted fields" (ADR-083); the messages stay beside the fields.
 */
export function useFocusFirstInvalid(ref: RefObject<HTMLElement | null>) {
  const [attempt, setAttempt] = useState({ seq: 0, count: 0 })

  useEffect(() => {
    if (attempt.seq > 0 && attempt.count > 0) focusFirstInvalid(ref.current)
  }, [attempt, ref])

  const { count } = attempt
  return {
    /** `message`: a form-level reason with no field of its own, shown as the toast's text. */
    report: (errorCount: number, message?: string) => {
      if (errorCount > 0) notify.checkFields(message)
      setAttempt((current) => ({ seq: current.seq + 1, count: errorCount }))
    },
    announcement:
      count > 0 ? `${count} ${count === 1 ? 'field needs' : 'fields need'} attention.` : '',
  }
}
