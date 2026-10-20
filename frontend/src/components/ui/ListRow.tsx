import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * The list-row pattern. Reference-Screens.md §5 names this as the template for every list view
 * (Visit Log, Incident Log, Follow-Up List, Inventory List, User List).
 *
 * Display-privacy rule (ADR-004): in a multi-student list, `primary` is the LRN,
 * never the student's name. See `.claude/skills/cliniq-display-privacy/`.
 */
export interface ListRowProps {
  /** The row's identifier (LRN, item name). */
  primary: ReactNode
  /** Supporting detail under the identifier. */
  secondary?: ReactNode
  /** A right-aligned fact before the badge, e.g. a due date or a count. */
  meta?: ReactNode
  /** Status badge(s). */
  trailing?: ReactNode
  /** True only for rows/cards that navigate or otherwise respond to click. Static rows stay static. */
  interactive?: boolean
  className?: string
}

export function ListRow({
  primary,
  secondary,
  meta,
  trailing,
  interactive = false,
  className,
}: ListRowProps) {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-text-primary">{primary}</div>
        {/* Wraps instead of truncating: a list must not hide part of an item's detail. */}
        {secondary && <div className="text-xs break-words text-text-secondary">{secondary}</div>}
      </div>
      {(meta || trailing) && (
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          {trailing && <div className="flex flex-wrap justify-end gap-1">{trailing}</div>}
          {meta && <span className="text-xs text-text-secondary tabular-nums">{meta}</span>}
        </div>
      )}
    </>
  )
  const rowClass = cn(
    // Centered so the text lines up with a taller trailing button or meta column.
    'flex items-center justify-between gap-3 px-5 py-3',
    interactive &&
      'cursor-pointer transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-green motion-reduce:transition-none',
  )

  return (
    <li className={cn(rowClass, className)}>{content}</li>
  )
}

export interface RowListProps {
  children: ReactNode
  /** Accessible name for the list (usually the id of the card heading). */
  labelledBy?: string
  className?: string
}

export function RowList({ children, labelledBy, className }: RowListProps) {
  return (
    <ul
      aria-labelledby={labelledBy}
      className={cn('divide-y divide-border border-t border-border', className)}
    >
      {children}
    </ul>
  )
}
