import { symptom, symptoms } from '../../../lib/labels'
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

/** The one summary sentence for a period longer than a day. */
export function overviewSentence(summary: DashboardSummary): string {
  const { visits, incidents } = summary.counts
  const line = `${count(visits, 'visit')} and ${count(incidents, 'incident')} this period.`
  const complaints = [...summary.complaintTrends.series, ...summary.complaintTrends.otherComplaints]
  const top = complaints[0]
  if (!top) return line
  const total = complaints.reduce((sum, c) => sum + c.total, 0)
  const tied = complaints.filter((c) => c.total === top.total)
  if (tied.length === 1)
    return `${line} Most frequent ${symptom}: ${top.complaint} (${top.total} of ${total}).`
  if (tied.length === 2)
    return `${line} Most frequent ${symptoms}: ${tied[0].complaint} and ${tied[1].complaint} (${top.total} each).`
  return `${line} ${tied.length} ${symptoms} tied as the most frequent, with ${count(top.total, 'case')} each.`
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
