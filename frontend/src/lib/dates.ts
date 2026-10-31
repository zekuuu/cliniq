import type { ISODate, ISODateTime } from '../types/entities'

/**
 * Timezone-safe calendar-date helpers. Every function works on local calendar days, never UTC
 * instants, so a date like 2026-09-26 can't shift to the 25th on a UTC+8 (Philippine) machine.
 * No date library here on purpose: bundle size matters on the 4GB target machine.
 */

export function parseISODate(value: ISODate): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toISODate(date: Date): ISODate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const isRealDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && toISODate(parseISODate(value)) === value

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now)
}

export function addDays(value: ISODate, days: number): ISODate {
  const d = parseISODate(value)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function addMonths(value: ISODate, months: number): ISODate {
  const d = parseISODate(value)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return toISODate(d)
}

/** Whole days from `a` to `b` (positive if b is later). */
export function diffDays(a: ISODate, b: ISODate): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime()
  return Math.round(ms / 86_400_000)
}

/** Weeks start on Sunday, matching the wall calendars commonly used in Philippine schools. */
export function startOfWeek(value: ISODate): ISODate {
  const d = parseISODate(value)
  return addDays(value, -d.getDay())
}

export function startOfMonth(value: ISODate): ISODate {
  return value.slice(0, 8) + '01'
}

export function endOfMonth(value: ISODate): ISODate {
  const d = parseISODate(value)
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

export function startOfYear(value: ISODate): ISODate {
  return value.slice(0, 4) + '-01-01'
}

export function endOfYear(value: ISODate): ISODate {
  return value.slice(0, 4) + '-12-31'
}

/** Inclusive list of every calendar day from `from` to `to`. */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const days: ISODate[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d)
  return days
}

export function isWithin(value: ISODate, from: ISODate, to: ISODate): boolean {
  return value >= from && value <= to
}

const locale = 'en-PH'

export function formatDate(value: ISODate, options?: Intl.DateTimeFormatOptions): string {
  return parseISODate(value).toLocaleDateString(
    locale,
    options ?? { month: 'short', day: 'numeric', year: 'numeric' },
  )
}

export function formatLongDate(value: ISODate): string {
  return formatDate(value, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export function formatMonthYear(value: ISODate): string {
  return formatDate(value, { month: 'long', year: 'numeric' })
}

export function formatShortDate(value: ISODate): string {
  return formatDate(value, { month: 'short', day: 'numeric' })
}

export function formatDateRange(from: ISODate, to: ISODate): string {
  if (from === to) return formatDate(from)
  const sameYear = from.slice(0, 4) === to.slice(0, 4)
  const start = formatDate(from, sameYear ? { month: 'short', day: 'numeric' } : undefined)
  return `${start} – ${formatDate(to)}`
}

/** The clinic's wall clock. Timestamps display in Philippine time whatever the viewing device is set to. */
const CLINIC_TIME_ZONE = 'Asia/Manila'

/**
 * THE display format for a timestamp (Design-System.md, "Dates & Times"): "Sep 27, 2026 · 9:05 AM",
 * 12-hour, Philippine time. Date-only values use `formatDate` ("Sep 27, 2026"). Screens must not
 * format dates themselves or show raw ISO strings.
 */
export function formatDateTime(value: ISODateTime): string {
  if (!value.includes('T')) return formatDate(value)
  // A timestamp stored without an offset was recorded on the clinic's clock.
  const zoned = /(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}+08:00`
  const d = new Date(zoned)
  if (Number.isNaN(d.getTime())) return value
  const date = d.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: CLINIC_TIME_ZONE,
  })
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: CLINIC_TIME_ZONE,
  })
  return `${date} · ${time}`
}

/** Time of day only, e.g. "9:05 AM" (12-hour, Philippine time). */
export function formatTime(value: ISODateTime | number): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: CLINIC_TIME_ZONE,
  })
}

export interface MonthWeek {
  from: ISODate
  to: ISODate
  /** "4-10", or "31" for a one-day week. */
  label: string
}

/**
 * The Monthly Report's weeks (ADR-055): Sunday-to-Saturday weeks, as the Activity calendar shows them,
 * clipped to the month, so a month that starts on a Thursday opens with Thursday to Saturday.
 * `month` is "YYYY-MM".
 */
export function monthWeeks(month: string): MonthWeek[] {
  const chunks: ISODate[][] = []
  for (const day of eachDay(`${month}-01`, endOfMonth(`${month}-01`))) {
    if (!chunks.length || parseISODate(day).getDay() === 0) chunks.push([day])
    else chunks[chunks.length - 1].push(day)
  }
  return chunks.map((chunk) => {
    const first = Number(chunk[0].slice(8))
    const last = Number(chunk[chunk.length - 1].slice(8))
    return { from: chunk[0], to: chunk[chunk.length - 1], label: first === last ? String(first) : `${first}-${last}` }
  })
}
