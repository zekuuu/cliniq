import { useId, type ReactNode } from 'react'
import type { To } from 'react-router'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from '../icons/Icon'
import { Badge } from './Badge'
import { Card, CARD_SURFACE, CardHeader } from './Card'
import { EmptyState } from './EmptyState'
import { RowList } from './ListRow'
import { Skeleton } from './Skeleton'
import { TitleLink } from './TitleLink'

export interface ListCardProps {
  title: string
  icon: IconName
  description?: ReactNode
  /** Row count, shown as a neutral badge next to the title. */
  count: number
  /** Drill-down target; turns the title itself into the link (the count badge stays outside it). */
  titleTo?: To
  /** Optional non-mutating header control. */
  actions?: ReactNode
  /** `ListRow` elements. */
  children: ReactNode
  empty: { title: string; description?: string }
  /** Caps the visible height on screen (rows scroll). Print always shows every row. */
  maxHeightClass?: string
  className?: string
  /** Below the rows, outside the scroll region (a pager). */
  footer?: ReactNode
}

/**
 * A titled card holding one compact list of rows. This is the alert-group pattern from Reference 1,
 * reused by any "short list inside a card" widget. The scroll region is keyboard-focusable so
 * people who don't use a mouse can scroll it too.
 */
export function ListCard({
  title,
  icon,
  description,
  count,
  titleTo,
  actions,
  children,
  empty,
  maxHeightClass = 'max-h-80',
  className,
  footer,
}: ListCardProps) {
  const headingId = useId()
  return (
    <Card aria-labelledby={headingId} className={cn('flex h-full min-h-0 flex-col', className)}>
      <CardHeader
        titleId={headingId}
        title={
          <span className="flex items-center gap-2">
            {titleTo ? (
              <TitleLink to={titleTo} hover="brand">
                {title}
              </TitleLink>
            ) : (
              title
            )}
            <Badge tone="neutral" variant="soft" icon={null}>
              <span className="sr-only">Count: </span>
              {count}
            </Badge>
          </span>
        }
        icon={<Icon name={icon} />}
        description={description}
        actions={actions}
      />
      {count === 0 ? (
        <EmptyState icon="checkCircle" title={empty.title} description={empty.description} />
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label={`${title} (scrollable list)`}
          className={cn(
            'relative min-h-0 flex-1 overflow-y-auto print:max-h-none print:overflow-visible',
            maxHeightClass,
          )}
        >
          <RowList labelledBy={headingId}>{children}</RowList>
        </div>
      )}
      {count > 0 && footer}
    </Card>
  )
}

/**
 * Loading placeholder with ListCard's exact shape: the real title + icon (static), a count pill,
 * description lines, and `rows` list rows (identifier + detail on the left, meta + badge on the right).
 * It uses the same max height as the loaded card, so nothing jumps when data arrives.
 */
export function ListCardSkeleton({
  title,
  icon,
  rows = 5,
  withSecondary = true,
  maxHeightClass = 'max-h-80',
  className,
}: {
  title: string
  icon: IconName
  rows?: number
  /** Whether rows have a second detail line (e.g. follow-up reason). */
  withSecondary?: boolean
  maxHeightClass?: string
  className?: string
}) {
  return (
    <div
      aria-hidden="true"
      data-skeleton="list-card"
      className={cn(CARD_SURFACE, 'flex h-full min-h-0 flex-col', className)}
    >
      <div className="flex items-start gap-2.5 px-5 pt-5 pb-3">
        <span className="mt-0.5 shrink-0 text-brand-green-dark">
          <Icon name={icon} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex items-center gap-2 text-base font-semibold text-text-primary">
            {title}
            <Skeleton className="h-4 w-6 rounded-sm" />
          </span>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <ul
        className={cn(
          'min-h-0 flex-1 divide-y divide-border overflow-hidden border-t border-border',
          maxHeightClass,
        )}
      >
        {Array.from({ length: rows }, (_, i) => (
          <li
            key={i}
            data-skeleton="list-row"
            className="flex items-start justify-between gap-3 px-5 py-3"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-24" />
              {withSecondary && <Skeleton className="h-3 w-40 max-w-full" />}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Skeleton className="h-5 w-20 rounded-sm" />
              <Skeleton className="h-3 w-16" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
