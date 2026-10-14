import { addDays, diffDays, eachDay, endOfMonth, endOfYear, formatDate, formatShortDate, isWithin, startOfMonth, startOfWeek, startOfYear } from '../dates'
import { previousPeriod, rangeLengthDays, type DateRange, type DateRangePreset } from '../dateRange'
import type { ISODate } from '../../types/entities'
import type {
  CalendarDay,
  ComplaintSeries,
  ComplaintTrends,
  DashboardQuery,
  DashboardSummary,
  DueFollowUpRow,
  InventoryAlertRow,
  TrendBucket,
  TrendGranularity,
} from '../../types/dashboard'
import {
  dateOf,
  dueFollowUps,
  followUpDueState,
  frequentVisitors,
  inventoryStatusFor,
  lowStockCount,
  pendingRecordCount,
  studentsById,
  toListRef,
} from './selectors'
import type { DbState, MockDbConfig } from './types'

/**
 * MOCK AGGREGATION: a stand-in for the Phase B9 dashboard endpoint (Development-Phases.md), which
 * will own these calculations server-side. The UI only renders what this returns. Every number is
 * computed from raw records via `selectors.ts`; thresholds come from `config` in `mock-db.json`
 * (open product decisions, ADR-014).
 */

export function buildDashboardSummary(
  state: DbState,
  query: DashboardQuery,
  generatedAt: string,
): DashboardSummary {
  const { today, config } = state
  const { from, to } = query.range
  const visitsInRange = state.visits.filter((v) => isWithin(dateOf(v.dateTime), from, to))
  const incidentsInRange = state.incidents.filter((i) => isWithin(dateOf(i.time), from, to))
  const prev = previousPeriod(query.range)
  // A previous period reaching back before the first record would compare against nothing.
  const firstRecord = [...state.visits.map((v) => dateOf(v.dateTime)), ...state.incidents.map((i) => dateOf(i.time))]
    .sort()[0]
  const comparable = query.range.preset !== 'all' && firstRecord !== undefined && prev.from >= firstRecord

  return {
    today,
    generatedAt,
    range: { from, to },
    counts: {
      visits: visitsInRange.length,
      incidents: incidentsInRange.length,
      incidentsAtStage1: incidentsInRange.filter((i) => i.stage === 1).length,
      pendingRecords: pendingRecordCount(state),
      lowStockItems: lowStockCount(state),
      activeStudents: state.students.filter((s) => !s.archived).length,
    },
    previousCounts: comparable
      ? {
          visits: state.visits.filter((v) => isWithin(dateOf(v.dateTime), prev.from, prev.to)).length,
          incidents: state.incidents.filter((i) => isWithin(dateOf(i.time), prev.from, prev.to)).length,
        }
      : null,
    dueFollowUps: buildDueFollowUps(state),
    upcomingWindowDays: config.upcomingFollowUpDays,
    frequentVisitors: frequentVisitors(state, { from, to }),
    frequentVisitorMinVisits: config.frequentVisitorMinVisits,
    inventoryAlerts: buildInventoryAlerts(state),
    complaintTrends: buildComplaintTrends(
      [
        ...visitsInRange.map((v) => ({ date: dateOf(v.dateTime), complaint: v.complaint })),
        ...incidentsInRange.map((i) => ({ date: dateOf(i.time), complaint: i.complaint })),
      ],
      query.range,
      config,
    ),
  }
}

/**
 * Due/upcoming follow-ups: status `pending` with a date on or before today + the upcoming window.
 * Overdue items stay listed (still `pending`) until Staff marks them Completed or Missed.
 * The date filter doesn't apply here. Module 9 says these are computed against *today*.
 */
export function buildDueFollowUps(state: DbState): DueFollowUpRow[] {
  const byId = studentsById(state)
  return dueFollowUps(state).flatMap((f) => {
    const student = byId.get(f.studentId)
    const dueState = followUpDueState(f, state.today)
    if (!student || !dueState) return []
    return [
      {
        followUp: {
          id: f.id,
          followUpDate: f.followUpDate,
          reason: f.reason,
          status: f.status,
          relatedRecord: f.relatedRecord,
        },
        student: toListRef(student),
        dueState,
        daysFromToday: diffDays(state.today, f.followUpDate),
      },
    ]
  })
}

export function buildInventoryAlerts(state: DbState): InventoryAlertRow[] {
  return state.inventoryItems
    .map((item) => {
      const { flags, daysUntilExpiry } = inventoryStatusFor(state, item)
      return { item, flags, daysUntilExpiry }
    })
    .filter((row) => row.flags.length > 0)
    .sort((a, b) => severity(b) - severity(a) || a.item.name.localeCompare(b.item.name))
}

function severity(row: InventoryAlertRow): number {
  return (row.flags.includes('expired') ? 4 : 0) + row.flags.length
}

export function buildBuckets(
  from: ISODate,
  to: ISODate,
  granularity: TrendGranularity,
): TrendBucket[] {
  const buckets: TrendBucket[] = []
  let cursor =
    granularity === 'day'
      ? from
      : granularity === 'week'
        ? startOfWeek(from)
        : granularity === 'month'
          ? startOfMonth(from)
          : startOfYear(from)
  while (cursor <= to) {
    const end =
      granularity === 'day'
        ? cursor
        : granularity === 'week'
          ? addDays(cursor, 6)
          : granularity === 'month'
            ? endOfMonth(cursor)
            : endOfYear(cursor)
    // Clip each bucket to the selected range so partial weeks/months never count outside it.
    const bFrom = cursor < from ? from : cursor
    const bTo = end > to ? to : end
    buckets.push({
      key: cursor,
      label:
        granularity === 'day'
          ? formatShortDate(bFrom)
          : granularity === 'week'
            ? formatShortDate(bFrom)
            : granularity === 'month'
              ? formatDate(cursor, { month: 'short', year: 'numeric' })
              : formatDate(cursor, { year: 'numeric' }),
      from: bFrom,
      to: bTo,
    })
    cursor = addDays(end, 1)
  }
  return buckets
}

/**
 * The trend's bucket size, derived only from the selected range; there is no manual override.
 * Presets map directly: Today (a single bucket, more a total than a trend), Last 7 days, Last 30
 * days, and This month are daily; This year is monthly. All and Custom are sized by their actual
 * span so the chart stays readable: All is monthly unless its recorded history passes two years
 * (then yearly); Custom is daily up to a month, weekly up to about four months, monthly up to two
 * years, then yearly.
 */
export function trendGranularityFor(
  preset: DateRangePreset,
  window: { from: ISODate; to: ISODate },
): TrendGranularity {
  const days = rangeLengthDays(window)
  switch (preset) {
    case 'today':
    case 'last7':
    case 'last30':
    case 'thisMonth':
      return 'day'
    case 'thisYear':
      return 'month'
    case 'all':
      return days <= 2 * 366 ? 'month' : 'year'
    case 'custom':
      return days <= 31 ? 'day' : days <= 120 ? 'week' : days <= 2 * 366 ? 'month' : 'year'
  }
}

export function buildComplaintTrends(
  events: Array<{ date: ISODate; complaint: string }>,
  range: Pick<DateRange, 'preset' | 'from' | 'to'>,
  config: Pick<MockDbConfig, 'clusterMinCount' | 'clusterRatio' | 'topComplaints'>,
): ComplaintTrends {
  const { from, to } = range
  // Only All starts at the historical floor (1900), so only All skips its empty pre-history and
  // starts at the first recorded event (or today, when nothing is recorded yet). Bounded ranges keep
  // their selected start so zero-activity days, weeks, or months remain visible as zero buckets.
  const trendFrom =
    range.preset === 'all'
      ? events.reduce<ISODate>((earliest, event) => (event.date < earliest ? event.date : earliest), to)
      : from
  const granularity = trendGranularityFor(range.preset, { from: trendFrom, to })
  const buckets = buildBuckets(trendFrom, to, granularity)
  const byComplaint = new Map<string, number[]>()
  for (const e of events) {
    const index = buckets.findIndex((b) => isWithin(e.date, b.from, b.to))
    if (index < 0) continue
    const counts = byComplaint.get(e.complaint) ?? new Array<number>(buckets.length).fill(0)
    counts[index] += 1
    byComplaint.set(e.complaint, counts)
  }

  const all: ComplaintSeries[] = [...byComplaint.entries()]
    .map(([complaint, counts]) => ({
      complaint,
      counts,
      total: counts.reduce((a, b) => a + b, 0),
      clusterBuckets: detectClusters(counts, config),
    }))
    .sort((a, b) => b.total - a.total || a.complaint.localeCompare(b.complaint))

  return {
    granularity,
    buckets,
    series: all.slice(0, config.topComplaints),
    otherComplaints: all.slice(config.topComplaints),
  }
}

/** PLACEHOLDER cluster rule (config, ADR-014). Needs at least 2 buckets to compare against. */
export function detectClusters(
  counts: number[],
  config: Pick<MockDbConfig, 'clusterMinCount' | 'clusterRatio'>,
): number[] {
  if (counts.length < 2) return []
  const total = counts.reduce((a, b) => a + b, 0)
  return counts.flatMap((count, i) => {
    const othersAvg = (total - count) / (counts.length - 1)
    return count >= config.clusterMinCount && count >= othersAvg * config.clusterRatio
      ? [i]
      : []
  })
}

export function buildCalendarDays(state: DbState, from: ISODate, to: ISODate): CalendarDay[] {
  const days = new Map<ISODate, CalendarDay>(
    eachDay(from, to).map((date) => [date, { date, visits: 0, incidents: 0, events: [], eventTags: [] }]),
  )
  const addTag = (day: CalendarDay, tag: string | null) => {
    if (tag && !day.eventTags.includes(tag)) day.eventTags.push(tag)
  }
  for (const v of state.visits) {
    const day = days.get(dateOf(v.dateTime))
    if (!day) continue
    day.visits += 1
    addTag(day, v.eventTag)
  }
  for (const i of state.incidents) {
    const day = days.get(dateOf(i.time))
    if (!day) continue
    day.incidents += 1
    addTag(day, i.eventTag)
  }
  const events = [...state.frontendOnly.calendarEvents].sort(
    (a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title),
  )
  for (const { id, title, startDate, endDate } of events) {
    const last = endDate ?? startDate
    if (last < from || startDate > to) continue
    for (const date of eachDay(startDate < from ? from : startDate, last > to ? to : last)) {
      days.get(date)?.events.push({ id, title, startDate, endDate })
    }
  }
  for (const day of days.values()) {
    if (!day.events.length) continue
    const titles = new Set(day.events.map((e) => e.title.toLowerCase()))
    day.eventTags = day.eventTags.filter((tag) => !titles.has(tag.toLowerCase()))
  }
  return [...days.values()]
}
