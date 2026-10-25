import type { FollowUpDueState, InventoryFlag } from '../components'
import type { DateRange } from '../lib/dateRange'
import type {
  FollowUp,
  ISODate,
  ISODateTime,
  InventoryItem,
  StudentListRef,
  StudentSex,
} from './entities'

/**
 * The Clinic Overview Dashboard's data contract (Screen Inventory #31, Module 9). This is the shape
 * the Phase B9 aggregation endpoint is expected to return. Every row is built from the shared
 * entities in `types/entities.ts`, so it lines up with Frontend Context Brief §5.
 *
 * Privacy by type: every student reference here is a `StudentListRef` (id + LRN only).
 * A dashboard component can't render a name because it never receives one (ADR-004).
 */

export type TrendGranularity = 'hour' | 'day' | 'week' | 'month' | 'year'

export interface DashboardQuery {
  /** The trend's bucket size is derived from this range (preset and span); nothing else picks it. */
  range: DateRange
  /** Trends-only demographic filters; Overview counts deliberately ignore them. */
  sex?: StudentSex | null
  gradeLevel?: string | null
}

export interface DemographicCount {
  key: string
  label: string
  /** Visits plus incidents. */
  count: number
  visits: number
  incidents: number
  share: number
}

/** Aggregate visit/incident counts for the interactive Trends demographic controls. */
export interface DemographicAnalysis {
  sex: DemographicCount[]
  gradeLevel: DemographicCount[]
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
  /** Today's visits marked "Resting in clinic" with no Time out yet (panel review VS-1). Current state, not the range. */
  inClinicNow: number
  /** Every incident still at Stage 1, whatever the range: one of the Overview tab's urgent items (DB-4). */
  incidentsAwaitingStage2: number
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
  item: Pick<InventoryItem, 'id' | 'name' | 'category' | 'unit' | 'lowStockThreshold'> & {
    currentStock: number
    expirationDate: ISODate | null
  }
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
  /** Hour of day (0–23, Philippine time) for hourly buckets; absent otherwise. */
  hour?: number
}

export interface ComplaintSeries {
  complaint: string
  /** One count per bucket, aligned with `ComplaintTrends.buckets`. */
  counts: number[]
  total: number
  /** Bucket indexes flagged as a possible symptom cluster (an early-warning signal only). */
  clusterBuckets: number[]
}

/** The busiest date behind one weekday total, with any event or holiday already known to CLINIQ. */
export interface WeekdayPeak {
  date: ISODate
  count: number
  annotations: string[]
}

/** One Monday-through-Sunday comparison row for a monthly Visits Trend. */
export interface WeekdayComparisonRow {
  label: string
  current: number
  previous: number
  currentPeak: WeekdayPeak | null
  previousPeak: WeekdayPeak | null
}

/** A selected calendar month (or month-to-date) grouped by weekday beside the equivalent prior month. */
export interface WeekdayComparison {
  currentLabel: string
  previousLabel: string
  rows: WeekdayComparisonRow[]
}

export interface ComplaintTrends {
  granularity: TrendGranularity
  buckets: TrendBucket[]
  /** The most common complaints in range, charted. */
  series: ComplaintSeries[]
  /** Everything outside the top series, listed in the table view so no complaint is hidden. */
  otherComplaints: ComplaintSeries[]
  /** Present only for a calendar-month range; its grouped bars replace the daily trend. */
  weekdayComparison?: WeekdayComparison
}

export interface DashboardSummary {
  /** Server's "today". Due/upcoming follow-ups are computed against this at request time. */
  today: ISODate
  generatedAt: ISODateTime
  range: { from: ISODate; to: ISODate }
  /** Date of the oldest visit or incident on record, or `null` when there are none. */
  oldestRecordDate: ISODate | null
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
  /** Config switch: the Frequent-visitor panel and print section are hidden while `false` (on by default). */
  showFrequentVisitors: boolean
  /** Config: the smallest prior-period count that gets a percentage on a stat card (D4). */
  percentMinPriorCount: number
  /**
   * Set when the backup needs attention (panel review BK-2): no successful backup yet, the latest run
   * failed, or the last successful one is older than `config.staleBackupHours`. Both roles see it.
   */
  backupAlert: BackupAlert | null
  inventoryAlerts: InventoryAlertRow[]
  complaintTrends: ComplaintTrends
  demographics: DemographicAnalysis
}

export interface BackupAlert {
  kind: 'never' | 'failed' | 'stale'
  /** When the last successful backup ran, if ever. */
  lastSuccessAt: ISODateTime | null
  staleAfterHours: number
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
