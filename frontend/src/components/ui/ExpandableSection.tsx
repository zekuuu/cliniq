import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from '../icons/Icon'
import { buttonClassName } from './buttonClassName'

/**
 * Optional fields kept out of the way under a "Show more fields" button (`cliniq-interactive-states`).
 * Controlled, so a form can open it when one of its fields has a value or an error. While closed the
 * content is `hidden`: out of the Tab order and the accessibility tree, yet its values stay in the
 * form's state. Opening never moves focus; the content just slides down (no clipping wrapper, so
 * focus rings are never cut), and the motion is off under `prefers-reduced-motion`.
 */
export function ExpandableSection({
  open,
  onOpenChange,
  filledCount = 0,
  closedLabel = 'Show more fields',
  openLabel = 'Show fewer fields',
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fields inside that hold a value; shown on the closed button so nothing is hidden silently. */
  filledCount?: number
  closedLabel?: string
  openLabel?: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onOpenChange(!open)}
        className={buttonClassName({ size: 'sm', className: 'self-start' })}
      >
        <Icon
          name="chevronDown"
          className={cn('transition-transform duration-150 motion-reduce:transition-none', open && 'rotate-180')}
        />
        {open ? openLabel : closedLabel}
        {!open && filledCount > 0 && ` (${filledCount} filled)`}
      </button>
      <div id={id} hidden={!open} className="animate-expand-down motion-reduce:animate-none">
        {children}
      </div>
    </div>
  )
}
