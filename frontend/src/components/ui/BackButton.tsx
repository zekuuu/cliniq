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
 * - `quiet` (default) is a text control that doesn't compete with the page's primary action.
 * - `prominent` is for shell-free phone screens, where Back is the main way out.
 * - `drillThroughOnly` renders it only when a drill-through link opened the screen (top-level lists).
 *
 * The visible text is the accessible name, so it never names a student or a Student Number.
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
      : 'inline-flex min-h-11 items-center gap-1 rounded-md pr-2 text-sm font-semibold text-text-secondary underline-offset-4 cursor-pointer transition-colors hover:text-brand-green-dark hover:underline sm:min-h-9 motion-reduce:transition-none',
    'self-start print:hidden',
    className,
  )
  const content = (
    <>
      <Icon name="chevronLeft" />
      {target.label ?? 'Back'}
    </>
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
