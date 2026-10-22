import { Link } from 'react-router'
import { useGoBack, useIsDrillThrough } from '../../hooks/useGoBack'
import { cn } from '../../lib/cn'
import { Icon } from '../icons/Icon'
import { buttonClassName } from './buttonClassName'

type BackTarget =
  /** History back, or `fallback` when this screen was the first one opened. Label: "Back". */
  | { fallback: string; onBack?: never; to?: never; label?: never }
  /** A form's shared Cancel (`useCancelNavigation`), so Back and Cancel behave identically. */
  | { onBack: () => void; fallback?: never; to?: never; label?: never }
  /** Always goes to one fixed screen, so the label may name it ("Back to Sign In"). */
  | { to: string; label: `Back to ${string}`; fallback?: never; onBack?: never }

/**
 * The one Back control (`cliniq-back-navigation-patterns`). It sits top-left of the page content,
 * before the `h1`, and never prints.
 * - `quiet` (default) is a text control that doesn't compete with the page's primary action. From `sm`
 *   up it is 28px tall and pulled into the page's top padding; phones keep the 44px touch target.
 * - `prominent` is for shell-free phone screens, where Back is the main way out.
 * - `drillThroughOnly` renders it only when a drill-through link opened the screen (top-level lists).
 *
 * The visible text is the accessible name, so it never names a student or an LRN.
 */
export function BackButton({
  variant = 'quiet',
  drillThroughOnly = false,
  className,
  ...target
}: BackTarget & {
  variant?: 'quiet' | 'prominent'
  drillThroughOnly?: boolean
  className?: string
}) {
  const goBack = useGoBack(target.fallback ?? '/')
  const drillThrough = useIsDrillThrough()
  if (drillThroughOnly && !drillThrough) return null

  const classes = cn(
    variant === 'prominent'
      ? buttonClassName({ variant: 'neutral', className: 'h-11 pl-3' })
      : 'group inline-flex min-h-11 items-center rounded-md pr-2 text-sm font-semibold text-text-secondary cursor-pointer transition-colors hover:text-brand-green-dark motion-reduce:transition-none sm:-mt-3 sm:min-h-7',
    // Sits 8px above the header card in a `gap-4` page column, so it reads as part of the header.
    '-mb-2 self-start print:hidden',
    className,
  )
  // A text underline skips the chevron (an SVG), so the quiet variant underlines with a border on one
  // span holding both, and the line runs under the icon and the label together.
  const content =
    variant === 'prominent' ? (
      <>
        <Icon name="chevronLeft" />
        {target.label ?? 'Back'}
      </>
    ) : (
      <span className="inline-flex items-center gap-1 border-b border-transparent group-hover:border-current">
        <Icon name="chevronLeft" />
        {target.label ?? 'Back'}
      </span>
    )

  if (target.to) {
    return (
      <Link to={target.to} className={classes}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" className={classes} onClick={target.onBack ?? goBack}>
      {content}
    </button>
  )
}
