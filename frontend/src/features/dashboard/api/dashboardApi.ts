import {
  getBackupStatus,
  getCalendarDays,
  getDashboardSummary,
  getHolidays,
  listCalendarEvents,
  listClusterAlerts,
  listPendingExcuseLetters,
  type ClusterAlert,
  type SessionUser,
  type BackupStatusView,
  type PendingExcuseLetter,
} from '../../../lib/mock-db'
import type { ISODate } from '../../../types/entities'
import type {
  CalendarDay,
  CalendarDayEvent,
  DashboardQuery,
  DashboardSummary,
  Holiday,
  HolidayFeed,
} from '../../../types/dashboard'

/**
 * Dashboard data access. Everything here is read-only except calendar events (bottom of the file),
 * whose writes the data layer audit-logs (see `.claude/skills/cliniq-audit-trail/`).
 *
 * Every count, flag, and trend is computed by the data layer (`lib/mock-db/`) from raw records, so
 * the Dashboard always agrees with the list screens it summarizes. When Phase B9 lands, the layer
 * becomes real requests to the Laravel API; these signatures stay the contract.
 *
 * Preview switches: `?mock=slow`, `?mock=empty`, `?mock=error` (see `lib/mock-db/devToggles.ts`).
 */

/** The Admin's incident totals leave out staff incidents (ADR-053); pass the viewer. */
export function fetchDashboardSummary(query: DashboardQuery, viewer?: SessionUser): Promise<DashboardSummary> {
  return getDashboardSummary(query, viewer)
}

export function fetchCalendarDays(from: ISODate, to: ISODate): Promise<CalendarDay[]> {
  return getCalendarDays(from, to)
}

/** Nationwide holidays in a range, plus the source's last-updated date and name (ADR-020). */
export function fetchHolidays(from: ISODate, to: ISODate): Promise<HolidayFeed> {
  return getHolidays(from, to)
}

/** School events and holidays inside the Date range, for the printout's Visit activity section. */
export async function fetchPeriodEvents(
  from: ISODate,
  to: ISODate,
): Promise<{ events: CalendarDayEvent[]; holidays: Holiday[] }> {
  const [events, feed] = await Promise.all([listCalendarEvents(from, to), getHolidays(from, to)])
  return { events, holidays: feed.holidays }
}

/** What the Staff Dashboard's backup indicator needs: the latest run and whether it still needs checking. */
export type BackupIndicator = Pick<BackupStatusView, 'latest' | 'needsVerification'>

export function fetchBackupIndicator(): Promise<BackupIndicator> {
  return getBackupStatus()
}

/** Staff only: excuse-letter drafts saved with visits and still awaiting approval. Not range-filtered. */
export function fetchPendingExcuseLetters(): Promise<PendingExcuseLetter[]> {
  return listPendingExcuseLetters()
}

/** Possible clusters (ADR-050); always empty for the Admin. */
export function fetchClusterAlerts(viewer: SessionUser): Promise<ClusterAlert[]> {
  return listClusterAlerts(viewer)
}

/**
 * Calendar events (Module 9, ADR-019): Staff add, edit, and delete them; each write is audit-logged
 * by the data layer in the same call.
 */
export {
  CALENDAR_EVENT_TITLE_MAX,
  CalendarEventValidationError,
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
  validateCalendarEvent,
  type CalendarEventErrors,
  type CalendarEventInput,
} from '../../../lib/mock-db'
