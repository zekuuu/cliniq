import type { FollowUpDueState, InventoryFlag } from '../components'
import type { DateRange } from '../lib/dateRange'
import type {
  FollowUp,
  ISODate,
  ISODateTime,
  InventoryItem,
  StudentListRef,
} from './entities'

/**
 * The Clinic Overview Dashboard's data contract (Screen Inventory #31, Module 9). This is the shape
 * the Phase B9 aggregation endpoint is expected to return. Every row is built from the shared
 * entities in `types/entities.ts`, so it lines up with Frontend Context Brief §5.
 *
 * Privacy by type: every student reference here is a `StudentListRef` (id + Student Number only).
 * A dashboard component can't render a name because it never receives one (ADR-004).
 */

export type TrendGranularity = 'day' | 'week' | 'month' | 'year'

export interface DashboardQuery {
  /** The trend's bucket size is derived from this range (preset and span); nothing else picks it. */
  range: DateRange
}

export interface DashboardCounts {
  /** Scoped to the selected date range. */
  visits: number
  incidents: number
  /** Incidents in range still at Stage 1 (fast-capture, not yet completed). */
  incidentsAtStage1: number
  /** Current state, not scoped to the date range. */
  pendingRecords: number
  lowStockItems: number
  activeStudents: number
}

export interface DueFollowUpRow {
  followUp: Pick<FollowUp, 'id' | 'followUpDate' | 'reason' | 'status' | 'relatedRecord'>
  student: StudentListRef
  dueState: FollowUpDueState
  /** Negative = overdue by N days. */
  daysFromToday: number
}

export interface FrequentVisitorRow {
  student: StudentListRef
  visitCount: number
}

export interface InventoryAlertRow {
  item: Pick<
    InventoryItem,
    'id' | 'name' | 'category' | 'currentStock' | 'unit' | 'lowStockThreshold' | 'expirationDate'
  >
  flags: InventoryFlag[]
  /** Days until the expiration date (negative = already expired); null if the item doesn't expire. */
  daysUntilExpiry: number | null
}

export interface TrendBucket {
  key: string
  /** Short axis label, e.g. "Sep 14" (week of) or "Sep 2026". */
  label: string
  from: ISODate
  to: ISODate
}

export interface ComplaintSeries {
  complaint: string
  /** One count per bucket, aligned with `ComplaintTrends.buckets`. */
  counts: number[]
  total: number
  /** Bucket indexes flagged as a possible symptom cluster (an early-warning signal only). */
  clusterBuckets: number[]
}

export interface ComplaintTrends {
  granularity: TrendGranularity
  buckets: TrendBucket[]
  /** The most common complaints in range, charted. */
  series: ComplaintSeries[]
  /** Everything outside the top series, listed in the table view so no complaint is hidden. */
  otherComplaints: ComplaintSeries[]
}

export interface DashboardSummary {
  /** Server's "today". Due/upcoming follow-ups are computed against this at request time. */
  today: ISODate
  generatedAt: ISODateTime
  range: { from: ISODate; to: ISODate }
  counts: DashboardCounts
  /** Same counts for the equal-length period just before `range`, for the trend indicator. */
  /**
   * The same counts for the equal period before the range, or `null` when no fair comparison exists:
   * the range is All, or the previous period starts before the first recorded visit or incident.
   */
  previousCounts: Pick<DashboardCounts, 'visits' | 'incidents'> | null
  dueFollowUps: DueFollowUpRow[]
  /** How many days ahead counts as "upcoming". Returned by the API so the UI never hardcodes it. */
  upcomingWindowDays: number
  frequentVisitors: FrequentVisitorRow[]
  /** Minimum visit count that raised the flag. Shown to the nurse so the warning is explainable. */
  frequentVisitorMinVisits: number
  inventoryAlerts: InventoryAlertRow[]
  complaintTrends: ComplaintTrends
}

/** A Staff-maintained school event, as the calendar shows it (ADR-019). */
export interface CalendarDayEvent {
  id: string
  title: string
  startDate: ISODate
  /** null for a one-day event. */
  endDate: ISODate | null
}

/** The Philippine holiday categories (ADR-020). Islamic holidays are proclaimed separately each year. */
export type HolidayKind = 'regular' | 'special-non-working' | 'special-working' | 'islamic'

/** A nationwide holiday: read-only reference data, separate from events and tags (ADR-020). */
export interface Holiday {
  date: ISODate
  name: string
  kind: HolidayKind
  /** false = the date is an estimate (mainly Islamic holidays awaiting their proclamation). */
  confirmed: boolean
}

export interface HolidayFeed {
  /** Holidays inside the requested range, by date. */
  holidays: Holiday[]
  /** Every year the source has at least one holiday for, so the UI can warn about a missing year. */
  years: number[]
  lastUpdated: ISODate
  source: string
}

export interface CalendarDay {
  date: ISODate
  visits: number
  incidents: number
  /** Calendar events covering this day, earliest start first. */
  events: CalendarDayEvent[]
  /**
   * Distinct free-text event tags Staff attached to that day's visits/incidents, minus any whose
   * text matches one of the day's events (case-insensitive), so the same label never shows twice.
   */
  eventTags: string[]
}
