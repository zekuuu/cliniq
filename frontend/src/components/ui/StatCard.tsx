import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from '../icons/Icon'
import { CARD_SURFACE } from './Card'
import { Skeleton } from './Skeleton'

export interface StatTrend {
  direction: 'up' | 'down' | 'flat'
  /** e.g. "12% vs prior 30 days". The direction word is added for screen readers automatically. */
  text: string
  /** Read by screen readers after `text`, e.g. the two counts behind a percentage. */
  detail?: string
}

export type StatTone = 'brand' | 'error' | 'warning' | 'neutral'

export interface StatCardProps {
  icon: IconName
  label: string
  value: number
  /** Says what the number covers when there's no trend line, e.g. "Current". */
  scope?: string
  trend?: StatTrend
  /** Extra note below the value (e.g. "3 still at Stage 1"). */
  footnote?: ReactNode
  /**
   * Accent for the label + figure (reference mockup: green visits, red incidents, orange expiring).
   * Colors are contrast-safe at their sizes: brand-green-dark 9.19:1, error 4.98:1, warning 4.88:1.
   * The label always names the meaning, so color is emphasis, never the only signal.
  */
  tone?: StatTone
  /** Link wrapping the label and its open-link icon (`TitleLink`), never the icon-chip header. */
  labelAction?: ReactNode
  className?: string
}

const trendIcon: Record<StatTrend['direction'], IconName> = {
  up: 'arrowUp',
  down: 'arrowDown',
  flat: 'minus',
}

const trendWord: Record<StatTrend['direction'], string> = {
  up: 'Up',
  down: 'Down',
  flat: '',
}

const labelTone: Record<StatTone, string> = {
  brand: 'text-brand-green-dark',
  error: 'text-error',
  warning: 'text-warning',
  neutral: 'text-text-secondary',
}
const figureTone: Record<StatTone, string> = {
  brand: 'text-brand-green-dark',
  error: 'text-error',
  warning: 'text-warning',
  neutral: 'text-text-primary',
}
const chipTone: Record<StatTone, string> = {
  brand: 'bg-brand-green-light/30 text-brand-green-dark',
  error: 'bg-error/10 text-error',
  warning: 'bg-warning/10 text-warning',
  neutral: 'bg-surface text-text-secondary',
}

const CARD = cn(CARD_SURFACE, 'flex w-full flex-col gap-2 p-5')

function Head({
  icon,
  label,
  tone,
  labelAction,
}: {
  icon: IconName
  label: string
  tone: StatTone
  labelAction?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <p className={cn('text-sm font-semibold', labelTone[tone])}>{labelAction ?? label}</p>
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', chipTone[tone])}>
        <Icon name={icon} size={16} />
      </span>
    </div>
  )
}

/**
 * StatCard, reference-mockup style: accent label → large bold figure → one caption line, with the
 * icon (required by Reference 1) as a soft chip in the corner. Trend captions stay neutral
 * (text-secondary): more clinic visits isn't "good" or "bad".
 */
export function StatCard({
  icon,
  label,
  value,
  scope,
  trend,
  footnote,
  tone = 'neutral',
  labelAction,
  className,
}: StatCardProps) {
  return (
    <div className={cn(CARD, 'print:break-inside-avoid', className)}>
      <Head icon={icon} label={label} tone={tone} labelAction={labelAction} />
      <p className={cn('-mt-1 text-3xl font-bold tracking-tight', figureTone[tone])}>
        {value.toLocaleString('en-PH')}
      </p>
      <div className="flex flex-col gap-0.5">
        {trend ? (
          <p className="flex items-center gap-1 text-xs text-text-secondary">
            <Icon name={trendIcon[trend.direction]} size={12} />
            {/* The arrow is visual only; its direction is spelled out for screen readers. */}
            <span className="sr-only">{trendWord[trend.direction]} </span>
            {trend.text}
            {trend.detail && <span className="sr-only"> ({trend.detail})</span>}
          </p>
        ) : (
          scope && <p className="text-xs text-text-secondary">{scope}</p>
        )}
        {footnote && <p className="text-xs text-text-secondary">{footnote}</p>}
      </div>
    </div>
  )
}

/**
 * Loading placeholder with StatCard's exact shape: the real label + icon chip (static), then bars
 * where the figure and caption will be.
 */
export function StatCardSkeleton({
  icon,
  label,
  tone = 'neutral',
  className,
}: {
  icon: IconName
  label: string
  tone?: StatTone
  className?: string
}) {
  return (
    <div aria-hidden="true" data-skeleton="stat-card" className={cn(CARD, className)}>
      <Head icon={icon} label={label} tone={tone} />
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-36 max-w-full" />
    </div>
  )
}
