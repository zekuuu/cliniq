import {
  CalendarEventValidationError,
  SportsReportPermissionError,
  SportsReportValidationError,
  type CalendarEvent,
  type CalendarEventInput,
  type ClusterAlert,
  type MonthlyReportData,
  type SportsReport,
  type SportsReportContent,
  type SportsReportDetail,
  type SportsReportInput,
  type SportsReportSummary,
} from '../../mock-db'
import type {
  CalendarDay,
  CalendarDayEvent,
  DashboardQuery,
  DashboardSummary,
  HolidayFeed,
} from '../../../types/dashboard'
import type { ISODate } from '../../../types/entities'
import { http } from '../client'
import { firstFieldErrors, mapped, type ErrorMap } from '../errors'

/**
 * DASHBOARD (with the calendar and holidays) and REPORTS (with Sports Reports) in API mode (S6;
 * API-Contract.md "Dashboard and Calendar", "Reports", "Sports Reports"). Every figure is computed
 * by the server; the print layouts stay in the frontend and print the server's data.
 */

// --- Dashboard and calendar ---

export function getDashboardSummary(query: DashboardQuery): Promise<DashboardSummary> {
  return http.get('/dashboard/summary', {
    query: {
      preset: query.range.preset,
      from: query.range.from,
      to: query.range.to,
      sex: query.sex ?? undefined,
      gradeLevel: query.gradeLevel ?? undefined,
    },
  })
}

export function listClusterAlerts(): Promise<ClusterAlert[]> {
  return http.get('/dashboard/cluster-alerts')
}

export function getCalendarDays(from: ISODate, to: ISODate): Promise<CalendarDay[]> {
  return http.get('/calendar/days', { query: { from, to } })
}

export function getHolidays(from: ISODate, to: ISODate): Promise<HolidayFeed> {
  return http.get('/calendar/holidays', { query: { from, to } })
}

export function listCalendarEvents(from: ISODate, to: ISODate): Promise<CalendarDayEvent[]> {
  return http.get('/calendar/events', { query: { from, to } })
}

/** The calendar form reads one message per field, as the mock's error carried. */
const EVENT_ERRORS: ErrorMap = {
  validation: (_message, error) => new CalendarEventValidationError(firstFieldErrors(error)),
}

export function createCalendarEvent(input: CalendarEventInput): Promise<CalendarEvent> {
  return mapped(http.post('/calendar/events', input), EVENT_ERRORS)
}

export function updateCalendarEvent(id: string, input: CalendarEventInput): Promise<CalendarEvent> {
  return mapped(http.put(`/calendar/events/${encodeURIComponent(id)}`, input), EVENT_ERRORS)
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await http.delete(`/calendar/events/${encodeURIComponent(id)}`)
}

// --- Reports ---

export function getMonthlyReport(month: string): Promise<MonthlyReportData> {
  return http.get('/reports/monthly', { query: { month } })
}

export async function getLatestRecordedMonth(): Promise<string> {
  return (await http.get<{ month: string }>('/reports/latest-month')).month
}

// --- Sports Reports (Staff only, ADR-034) ---

const SPORTS_ERRORS: ErrorMap = {
  forbidden: () => new SportsReportPermissionError(),
  validation: (_message, error) => new SportsReportValidationError(firstFieldErrors(error)),
}

const sports = <T>(promise: Promise<T>) => mapped(promise, SPORTS_ERRORS)

export function listSportsReports(): Promise<SportsReportSummary[]> {
  return sports(http.get('/sports-reports'))
}

export function getSportsReport(id: string): Promise<SportsReportDetail> {
  return sports(http.get(`/sports-reports/${encodeURIComponent(id)}`))
}

export function getSportsReportContent(id: string): Promise<SportsReportContent> {
  return sports(http.get(`/sports-reports/${encodeURIComponent(id)}/content`))
}

export function createSportsReport(input: SportsReportInput): Promise<SportsReport> {
  return sports(http.post('/sports-reports', input))
}

export function updateSportsReport(id: string, input: SportsReportInput): Promise<SportsReport> {
  return sports(http.put(`/sports-reports/${encodeURIComponent(id)}`, input))
}

export function duplicateSportsReport(id: string): Promise<SportsReport> {
  return sports(http.post(`/sports-reports/${encodeURIComponent(id)}/duplicate`))
}

export function setSportsReportArchived(id: string, archived: boolean): Promise<SportsReport> {
  return sports(http.put(`/sports-reports/${encodeURIComponent(id)}/archived`, { archived }))
}
