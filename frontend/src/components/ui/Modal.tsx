import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from '../icons/Icon'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Dialog with keyboard support: focus moves into it on open (to a `data-autofocus` child if any), Tab and
 * Shift+Tab stay inside it, Escape or the backdrop closes it, and focus returns to the control that
 * opened it.
 */
export function Modal({ open, title, children, onClose, className }: { open: boolean; title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const titleId = useId()
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    // Mark the safest action with `data-autofocus` (React's autoFocus fires before the opener is known).
    const initial = dialog?.querySelector<HTMLElement>('[data-autofocus]') ?? dialog?.querySelector<HTMLElement>(FOCUSABLE)
    initial?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') return onCloseRef.current()
      if (event.key !== 'Tab' || !dialog) return
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (opener?.isConnected) opener.focus()
    }
  }, [open])

  if (!open) return null
  // The overlay scrolls, and the inner wrapper is at least viewport-tall, so a dialog taller than the screen
  // starts at its top (title and ✕ reachable) instead of being centred off both edges.
  return <div className="fixed inset-0 z-40 overflow-y-auto bg-text-primary/40" role="presentation"><div className="flex min-h-full items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className={cn('w-full max-w-lg rounded-md bg-background shadow-card', className)}><div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4"><h2 id={titleId} className="text-base font-semibold text-text-primary">{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose} className="cursor-pointer rounded-md p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"><Icon name="xCircle" /></button></div><div className="p-5">{children}</div></section></div></div>
}
