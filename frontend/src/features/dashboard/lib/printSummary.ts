import { formatDate, formatDateRange, startOfWeek } from '../../../lib/dates'
import type { DateRange } from '../../../lib/dateRange'
import type { ComplaintTrends, DashboardSummary } from '../../../types/dashboard'
import type { ISODate } from '../../../types/entities'
import { bucketName, bucketTotals } from './trends'

/*
 * The Dashboard printout's written summary (ADR-026): fixed templates filled from the same summary the
 * screen shows, never generated at runtime by AI. A sentence appears only when the data supports it,
 * and every count reads correctly for 0 and 1.
 */

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** "from Oct 1 to Oct 15, 2026", "on Oct 15, 2026", or "since Sep 1, 2025" (All). */
export function periodPhrase(range: DateRange, oldestRecord: ISODate | null): string {
  if (range.preset === 'all') return oldestRecord ? `since ${formatDate(oldestRecord)}` : 'so far'
  if (range.from === range.to) return `on ${formatDate(range.from)}`
  const sameYear = range.from.slice(0, 4) === range.to.slice(0, 4)
  return `from ${formatDate(range.from, sameYear ? { month: 'short', day: 'numeric' } : undefined)} to ${formatDate(range.to)}`
}

export function overviewSentences(summary: DashboardSummary, period: string): string[] {
  const { visits, incidents, lowStockItems } = summary.counts
  const sentences = [
    visits + incidents === 0
      ? `No clinic visits or incidents were recorded ${period}.`
      : `The clinic recorded ${count(visits, 'visit')} and ${count(incidents, 'incident')} ${period}.`,
  ]

  const complaints = [...summary.complaintTrends.series, ...summary.complaintTrends.otherComplaints]
  const top = complaints[0]
  if (top) {
    const total = complaints.reduce((sum, c) => sum + c.total, 0)
    const tied = complaints.filter((c) => c.total === top.total)
    sentences.push(
      tied.length === 1
        ? `The most common complaint was ${top.complaint} (${top.total} of ${count(total, 'visit or incident', 'visits and incidents')}).`
        : tied.length === 2
          ? `The most common complaints were ${tied[0].complaint} and ${tied[1].complaint} (${top.total} each).`
          : `${tied.length} complaints tied as the most common, with ${count(top.total, 'case')} each.`,
    )
  }

  const overdue = summary.dueFollowUps.filter((row) => row.dueState === 'overdue').length
  const dueSoon = summary.dueFollowUps.length - overdue
  const followUps = [
    overdue > 0 && `${count(overdue, 'follow-up')} overdue`,
    dueSoon > 0 &&
      `${count(dueSoon, 'follow-up')} due today or in the next ${summary.upcomingWindowDays} days`,
  ].filter(Boolean)
  if (followUps.length) sentences.push(`Needing attention: ${followUps.join(' and ')}.`)

  const expiring = summary.inventoryAlerts.filter((row) =>
    row.flags.some((f) => f !== 'low_stock'),
  ).length
  const stock = [
    lowStockItems > 0 && `${count(lowStockItems, 'item')} below the low-stock threshold`,
    expiring > 0 && `${count(expiring, 'item')} expiring or expired`,
  ].filter(Boolean)
  if (stock.length) sentences.push(`Inventory: ${stock.join(' and ')}.`)

  return sentences
}

/**
 * Visits and incidents per period for paper: the trend's own buckets, except that a daily trend is
 * summed into Sunday-start weeks so a month fits in a few rows. Totals equal the screen's trend.
 */
export function activityRows(trends: ComplaintTrends): Array<{ label: string; total: number }> {
  const totals = bucketTotals(trends)
  if (trends.granularity !== 'day')
    return trends.buckets.map((bucket, i) => ({
      label: bucketName(bucket, trends.granularity),
      total: totals[i],
    }))
  const weeks = new Map<ISODate, { from: ISODate; to: ISODate; total: number }>()
  trends.buckets.forEach((bucket, i) => {
    const week = weeks.get(startOfWeek(bucket.from))
    if (week) {
      week.to = bucket.to
      week.total += totals[i]
    } else
      weeks.set(startOfWeek(bucket.from), { from: bucket.from, to: bucket.to, total: totals[i] })
  })
  return [...weeks.values()].map((week) => ({
    label: formatDateRange(week.from, week.to),
    total: week.total,
  }))
}
