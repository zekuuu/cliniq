import type { StatTrend } from '../../../components'
import { rangeLengthDays, type DateRange } from '../../../lib/dateRange'

/**
 * The change against the equal prior period. Below `minPrior` records a percentage misleads (one
 * becoming four reads "300%"), so the card shows both counts instead (panel review DB-2, D4).
 */
export function trendFor(current: number, previous: number, range: DateRange, minPrior: number): StatTrend {
  const days = rangeLengthDays(range)
  const period = days === 1 ? 'prior day' : `prior ${days} days`
  const counts = `${current} vs ${previous} in the ${period}`
  const direction = current > previous ? 'up' : current < previous ? 'down' : 'flat'
  if (previous < minPrior) return { direction, text: current === previous ? `No change vs ${period}` : counts }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return { direction: 'flat', text: `No change vs ${period}`, detail: counts }
  return { direction: pct > 0 ? 'up' : 'down', text: `${Math.abs(pct)}% vs ${period}`, detail: counts }
}
