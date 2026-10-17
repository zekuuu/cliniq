import { addDays, diffDays, eachDay, endOfMonth, endOfYear, formatDate, formatMonthYear, formatShortDate, isWithin, parseISODate, startOfMonth, startOfWeek, startOfYear } from '../dates'
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
  WeekdayComparison,
} from '../../types/dashboard'
import holidayData from './holidays-ph.json'
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
  const trendEvents = [
    ...state.visits.map((v) => ({ date: dateOf(v.dateTime), hour: hourOf(v.dateTime), complaint: v.complaint, eventTag: v.eventTag })),
    ...state.incidents.map((i) => ({ date: dateOf(i.time), hour: hourOf(i.time), complaint: i.complaint, eventTag: i.eventTag })),
  ]
  const prev = previousPeriod(query.range)
  // A previous period reaching back before the first record would compare against nothing.
  const firstRecord = [...state.visits.map((v) => dateOf(v.dateTime)), ...state.incidents.map((i) => dateOf(i.time))]
    .sort()[0]
  const comparable = query.range.preset !== 'all' && firstRecord !== undefined && prev.from >= firstRecord

  return {
    today,
    generatedAt,
    oldestRecordDate: firstRecord ?? null,
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
    complaintTrends: buildComplaintTrends(trendEvents, query.range, config, state.frontendOnly.calendarEvents),
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
      const status = inventoryStatusFor(state, item)
      // Expired-only stock has no usable expiry. The Dashboard still needs the expired batch's
      // actual date so its alert agrees with Inventory instead of rendering an unexplained null.
      const expirationDate = status.expirationDate ?? status.oldestExpiredDate
      const daysUntilExpiry = expirationDate ? diffDays(state.today, expirationDate) : null
      return { item: { ...item, currentStock: status.currentStock, expirationDate }, flags: status.flags, daysUntilExpiry }
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

/** Hour of day of a stored timestamp. Timestamps carry the clinic's +08:00 offset, like `dateOf`. */
const hourOf = (timestamp: string): number => Number(timestamp.slice(11, 13)) || 0

/** PLACEHOLDER school day for hourly trends (7 AM–5 PM), widened to any hour that has a record. */
const SCHOOL_DAY_HOURS = { first: 7, last: 17 }

/** "7 AM", "12 PM", "5 PM". */
const hourLabel = (hour: number): string => `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`

/** One bucket per hour of `date`, covering the school day plus any hour in `hours`. */
export function buildHourBuckets(date: ISODate, hours: number[]): TrendBucket[] {
  const first = Math.min(SCHOOL_DAY_HOURS.first, ...hours)
  const last = Math.max(SCHOOL_DAY_HOURS.last, ...hours)
  return Array.from({ length: last - first + 1 }, (_, i) => first + i).map((hour) => ({
    key: `${date}T${String(hour).padStart(2, '0')}`,
    label: hourLabel(hour),
    from: date,
    to: date,
    hour,
  }))
}

/**
 * The trend's bucket size, derived only from the selected range; there is no manual override.
 * Presets map directly: Today is hourly (as is any single-day Custom range), Last 7 days, Last 30
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
      return 'hour'
    case 'last7':
    case 'last30':
    case 'thisMonth':
      return 'day'
    case 'thisYear':
      return 'month'
    case 'all':
      return days <= 2 * 366 ? 'month' : 'year'
    case 'custom':
      return days <= 1 ? 'hour' : days <= 31 ? 'day' : days <= 120 ? 'week' : days <= 2 * 366 ? 'month' : 'year'
  }
}

export function buildComplaintTrends(
  events: Array<{ date: ISODate; hour?: number; complaint: string; eventTag?: string | null }>,
  range: Pick<DateRange, 'preset' | 'from' | 'to'>,
  config: Pick<MockDbConfig, 'clusterMinCount' | 'clusterRatio' | 'topComplaints'>,
  calendarEvents: Array<{ title: string; startDate: ISODate; endDate: ISODate | null }> = [],
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
  const buckets =
    granularity === 'hour'
      ? buildHourBuckets(to, events.map((e) => e.hour ?? 0))
      : buildBuckets(trendFrom, to, granularity)
  const byComplaint = new Map<string, number[]>()
  for (const e of events) {
    const index = buckets.findIndex(
      (b) => isWithin(e.date, b.from, b.to) && (b.hour === undefined || b.hour === (e.hour ?? 0)),
    )
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
    weekdayComparison: isMonthRange(range) ? buildWeekdayComparison(events, range, calendarEvents) : undefined,
  }
}

const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function weekdayIndex(date: ISODate): number {
  // JavaScript Sunday is zero; the chart deliberately starts the school week on Monday.
  return (parseISODate(date).getDay() + 6) % 7
}

function isMonthRange(range: Pick<DateRange, 'preset' | 'from' | 'to'>): boolean {
  return range.from === startOfMonth(range.from) && (range.preset === 'thisMonth' || range.to === endOfMonth(range.to))
}

function monthComparisonWindow(range: Pick<DateRange, 'from' | 'to'>): { from: ISODate; to: ISODate } {
  const previousFrom = startOfMonth(addDays(range.from, -1))
  return {
    from: previousFrom,
    // A completed selected month compares with the completed prior month. Month-to-date compares
    // the same number of elapsed days, avoiding a misleading full-month comparison mid-month.
    to: range.to === endOfMonth(range.to) ? endOfMonth(previousFrom) : addDays(previousFrom, diffDays(range.from, range.to)),
  }
}

function annotationsFor(
  date: ISODate,
  eventTags: string[],
  calendarEvents: Array<{ title: string; startDate: ISODate; endDate: ISODate | null }>,
): string[] {
  const labels = new Set(eventTags.filter(Boolean))
  for (const event of calendarEvents) {
    if (event.startDate <= date && (event.endDate ?? event.startDate) >= date) labels.add(event.title)
  }
  for (const holiday of holidayData.holidays as Array<{ date: ISODate; name: string }>) {
    if (holiday.date === date) labels.add(holiday.name)
  }
  return [...labels]
}

function buildWeekdayComparison(
  events: Array<{ date: ISODate; eventTag?: string | null }>,
  range: Pick<DateRange, 'from' | 'to'>,
  calendarEvents: Array<{ title: string; startDate: ISODate; endDate: ISODate | null }>,
): WeekdayComparison {
  const previous = monthComparisonWindow(range)
  const summarize = (window: { from: ISODate; to: ISODate }) =>
    WEEKDAY_LABELS.map((_, weekday) => {
      const byDate = new Map<ISODate, { count: number; tags: string[] }>()
      for (const event of events) {
        if (!isWithin(event.date, window.from, window.to) || weekdayIndex(event.date) !== weekday) continue
        const day = byDate.get(event.date) ?? { count: 0, tags: [] }
        day.count += 1
        if (event.eventTag) day.tags.push(event.eventTag)
        byDate.set(event.date, day)
      }
      const total = [...byDate.values()].reduce((sum, day) => sum + day.count, 0)
      const peak = [...byDate.entries()].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))[0]
      return {
        total,
        peak: peak
          ? { date: peak[0], count: peak[1].count, annotations: annotationsFor(peak[0], peak[1].tags, calendarEvents) }
          : null,
      }
    })
  const current = summarize(range)
  const prior = summarize(previous)
  return {
    currentLabel: formatMonthYear(range.from),
    previousLabel: formatMonthYear(previous.from),
    rows: WEEKDAY_LABELS.map((label, index) => ({
      label,
      current: current[index].total,
      previous: prior[index].total,
      currentPeak: current[index].peak,
      previousPeak: prior[index].peak,
    })),
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
