import { useEffect, useRef, type RefObject } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { Icon } from '../icons/Icon'
import { BULLET_LIST } from '../ui/listClassName'

/**
 * Brings a top-of-page message into view and focus: `scroll-mt-20` on the message keeps it clear of the
 * sticky 64px top bar, and reduced motion gets an instant jump, never a smooth scroll.
 */
export function focusTopMessage(element: HTMLElement | null, reducedMotion: boolean) {
  if (!element) return
  element.scrollIntoView?.({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' })
  element.focus({ preventScroll: true })
}

/** Focuses the field whose inline error reads `message`, inside `root`; else the message itself. */
function focusField(root: HTMLElement | null, message: string) {
  const error = [...(root?.querySelectorAll<HTMLElement>('[role="alert"]') ?? [])].find((node) => node.textContent?.trim() === message)
  if (!error) return
  const field = error.id ? root?.querySelector<HTMLElement>(`[aria-describedby~="${CSS.escape(error.id)}"]`) : null
  const target = field ?? error
  if (!field) target.tabIndex = -1
  target.scrollIntoView?.({ block: 'center' })
  target.focus({ preventScroll: true })
}

/**
 * The error summary at the top of a long form (professor's consultation, November 6, 2026: after
 * Complete the user should see what happened without scrolling). Lists each problem as a link to its
 * field. It takes focus each time `attempt` changes while it has messages.
 */
export function ErrorSummary({ messages, formRef, attempt }: { messages: string[]; formRef: RefObject<HTMLElement | null>; attempt: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const shown = messages.length > 0
  useEffect(() => {
    if (attempt > 0 && shown) focusTopMessage(ref.current, reducedMotion)
    // Only a new attempt moves focus; fixing a field must not pull focus back up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])
  if (!shown) return null
  return (
    <div ref={ref} role="alert" tabIndex={-1} aria-labelledby="error-summary-title" className="scroll-mt-20 rounded-md border border-error bg-error/10 px-4 py-3 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green">
      <p id="error-summary-title" className="flex items-center gap-2 font-semibold">
        <Icon name="alertTriangle" size={16} className="shrink-0 text-error" />
        {messages.length === 1 ? 'Fix 1 thing before saving:' : `Fix ${messages.length} things before saving:`}
      </p>
      <ul className={`mt-2 ${BULLET_LIST}`}>
        {messages.map((message) => (
          <li key={message}>
            <a
              href="#"
              className="cursor-pointer font-semibold text-text-primary underline underline-offset-2 hover:text-brand-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
              onClick={(event) => {
                event.preventDefault()
                focusField(formRef.current, message)
              }}
            >
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
