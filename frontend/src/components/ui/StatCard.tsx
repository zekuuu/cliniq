import type { ReactNode } from 'react'
import type { To } from 'react-router'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from '../icons/Icon'
import { CARD_SURFACE } from './Card'
import { Skeleton } from './Skeleton'
import { TitleLink } from './TitleLink'

export interface StatTrend {
  direction: 'up' | 'down' | 'flat'
  /** e.g. "12% vs prior 30 days". The direction word is added for screen readers automatically. */
  text: string
  /** Read by screen readers after `text`, e.g. the two counts behind a percentage. */
  detail?: string
}

export type StatTone = 'brand' | 'error' | 'warning' | 'neutral' | 'letter' | 'follow-up' | 'unfinished' | 'active'

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
   * The card's meaning (ADR-062): tinted fill, accent left bar, and the darker text shade for the
   * label, figure and icon, each 4.5:1 or better on the fill. The accents themselves are too pale
   * to carry an icon. The label always names the meaning, so color is never the only signal.
   */
  tone?: StatTone
  /** Makes the whole card one link named by its label; the card holds nothing else interactive. */
  to?: To
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

const textTone: Record<StatTone, string> = {
  brand: 'text-brand-green-dark',
  error: 'text-error-text',
  warning: 'text-warning-text',
  neutral: 'text-text-primary',
  letter: 'text-letter-text',
  'follow-up': 'text-follow-up-text',
  unfinished: 'text-unfinished-text',
  active: 'text-active-text',
}
const fillTone: Record<StatTone, string> = {
  brand: 'bg-brand-green-fill border-l-4 border-brand-green-dark',
  error: 'bg-error-fill border-l-4 border-error',
  warning: 'bg-warning-fill border-l-4 border-warning',
  neutral: 'bg-background',
  letter: 'bg-letter-fill border-l-4 border-letter',
  'follow-up': 'bg-follow-up-fill border-l-4 border-follow-up',
  unfinished: 'bg-unfinished-fill border-l-4 border-unfinished',
  active: 'bg-active-fill border-l-4 border-active',
}

// A drop shadow marks what can be clicked; a card that opens nothing sits flat.
const card = (tone: StatTone, clickable = false) =>
  cn(CARD_SURFACE.replace('bg-background', fillTone[tone]).replace('shadow-card', clickable ? 'shadow-clickable' : ''), 'flex w-full flex-col gap-2 p-5')

function Head({
  icon,
  label,
  tone,
  to,
}: {
  icon: IconName
  label: string
  tone: StatTone
  to?: To
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <p className={cn('text-sm font-semibold', textTone[tone])}>
        {to ? (
          // The link's ::after stretches over the card, so the whole card is the target and the
          // accessible name stays the label alone.
          <TitleLink to={to} className="after:absolute after:inset-0 after:rounded-md focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand-green-dark">
            {label}
          </TitleLink>
        ) : (
          label
        )}
      </p>
      <span className={cn('flex size-8 shrink-0 items-center justify-center', textTone[tone])}>
        <Icon name={icon} size={20} />
      </span>
    </div>
  )
}

/**
 * StatCard, reference-mockup style: accent label → large bold figure → one caption line, with the
 * icon (required by Reference 1) in the corner. Trend captions stay neutral
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
  to,
  className,
}: StatCardProps) {
  return (
    <div data-stat-card className={cn(card(tone, Boolean(to)), 'print:break-inside-avoid', to && 'relative transition-shadow hover:shadow-overlay motion-reduce:transition-none', className)}>
      <Head icon={icon} label={label} tone={tone} to={to} />
      <p className={cn('-mt-1 text-3xl font-bold tracking-tight', textTone[tone])}>
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
    <div aria-hidden="true" data-skeleton="stat-card" className={cn(card(tone), className)}>
      <Head icon={icon} label={label} tone={tone} />
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-36 max-w-full" />
    </div>
  )
}
