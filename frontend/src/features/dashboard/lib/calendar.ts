import {
  addDays,
  addMonths,
  endOfMonth,
  endOfYear,
  formatDateRange,
  formatMonthYear,
  parseISODate,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from '../../../lib/dates'
import type { ISODate } from '../../../types/entities'
import type { Holiday, HolidayKind } from '../../../types/dashboard'

export type CalendarView = 'week' | 'month' | 'year'

export interface CalendarPeriod {
  from: ISODate
  to: ISODate
  label: string
}

export function periodFor(view: CalendarView, anchor: ISODate): CalendarPeriod {
  switch (view) {
    case 'week': {
      const from = startOfWeek(anchor)
      const to = addDays(from, 6)
      return { from, to, label: formatDateRange(from, to) }
    }
    case 'month':
      return { from: startOfMonth(anchor), to: endOfMonth(anchor), label: formatMonthYear(anchor) }
    case 'year':
      return { from: startOfYear(anchor), to: endOfYear(anchor), label: anchor.slice(0, 4) }
  }
}

export function shiftAnchor(view: CalendarView, anchor: ISODate, direction: 1 | -1): ISODate {
  if (view === 'week') return addDays(anchor, 7 * direction)
  if (view === 'month') return addMonths(startOfMonth(anchor), direction)
  return addMonths(startOfMonth(anchor), 12 * direction)
}

/** Sunday-first weeks covering the month; days outside the month are `null`. */
export function monthGrid(monthStart: ISODate): Array<Array<ISODate | null>> {
  const first = startOfMonth(monthStart)
  const last = endOfMonth(monthStart)
  const lead = parseISODate(first).getDay()
  const cells: Array<ISODate | null> = Array.from({ length: lead }, () => null)
  for (let d = first; d <= last; d = addDays(d, 1)) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: Array<Array<ISODate | null>> = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/**
 * Heatmap intensity: four steps of one hue (sequential, light → mid), all from documented tokens:
 * 0 = no activity (white), 1 = brand-green-light at 40%, 2 = brand-green-light, 3 = brand-green.
 * Every step keeps dark text (≥ 4.65:1). The ramp stops at brand-green instead of brand-green-dark
 * so busy weeks don't paint the page in large saturated blocks. Thresholds split the busiest day in
 * the visible period into thirds, and the legend always prints each step's numeric range, so no
 * reading depends on shade alone.
 */
export type HeatLevel = 0 | 1 | 2 | 3

export interface HeatScale {
  t1: number
  t2: number
  max: number
}

export function heatScale(totals: number[]): HeatScale {
  const max = Math.max(0, ...totals)
  return { t1: Math.ceil(max / 3), t2: Math.ceil((2 * max) / 3), max }
}

export function heatLevel(total: number, scale: HeatScale): HeatLevel {
  if (total <= 0) return 0
  if (total <= scale.t1) return 1
  if (total <= scale.t2) return 2
  return 3
}

/** Background + contrast-checked text color per level (see src/index.css contrast notes). */
export const heatClasses: Record<HeatLevel, string> = {
  0: 'bg-surface text-text-secondary', // 5.68:1
  1: 'bg-brand-green-light/40 text-text-primary', // ≥ 13:1
  2: 'bg-brand-green-light text-text-primary', // 9.16:1
  3: 'bg-brand-green text-text-primary', // 4.65:1
}

export function legendSteps(scale: HeatScale): Array<{ level: HeatLevel; label: string }> {
  const steps: Array<{ level: HeatLevel; label: string }> = [{ level: 0, label: '0' }]
  const ranges: Array<[HeatLevel, number, number]> = [
    [1, 1, scale.t1],
    [2, scale.t1 + 1, scale.t2],
    [3, scale.t2 + 1, scale.max],
  ]
  for (const [level, lo, hi] of ranges) {
    if (lo > hi) continue
    steps.push({ level, label: lo === hi ? `${lo}` : `${lo}–${hi}` })
  }
  return steps
}

/** The yellow chip used for a calendar event or an event tag (12px text, dark on yellow). */
export const eventChipClass =
  'max-w-full truncate rounded-sm border border-brand-yellow-dark bg-brand-yellow px-1.5 py-0.5 text-xs leading-tight font-semibold text-text-primary'

/** How many labels a day cell shows before collapsing the rest into "+N more". */
export const MAX_DAY_LABELS = 2

/** A day's labels in display order: its calendar events, then visit/incident tags not already shown. */
export function dayLabels(day: { events: Array<{ title: string }>; eventTags: string[] }): string[] {
  return [...day.events.map((e) => e.title), ...day.eventTags]
}

/**
 * Holidays (ADR-020): a gray chip that always says "Holiday" in text, so it never depends on color
 * and never reads as one of Staff's yellow events. Dark text on the border gray is 13.2:1.
 */
export const holidayChipClass =
  'max-w-full truncate rounded-sm border border-text-muted bg-border px-1.5 py-0.5 text-xs leading-tight font-semibold text-text-primary'

export const HOLIDAY_KIND_LABEL: Record<HolidayKind, string> = {
  regular: 'Regular holiday',
  'special-non-working': 'Special non-working day',
  'special-working': 'Special working day',
  islamic: 'Islamic holiday',
}

/** The holiday's name, marked "(estimated)" until its date is officially confirmed. */
export function holidayName(holiday: Holiday): string {
  return holiday.confirmed ? holiday.name : `${holiday.name} (estimated)`
}

/** A special working day is a normal school day; every other kind means no class. */
export function isNoClassHoliday(holiday: Holiday): boolean {
  return holiday.kind !== 'special-working'
}

/**
 * Faint diagonal stripes for a no-class holiday with zero visits, so an empty day reads as
 * "no class", not "no illness". It layers over the cell's background color, so the heat shade and
 * text contrast are unchanged.
 */
export const noClassDayClass =
  'bg-[image:repeating-linear-gradient(135deg,var(--color-border)_0_2px,transparent_2px_8px)]'

export function holidaysByDate(holidays: Holiday[]): Map<ISODate, Holiday[]> {
  const map = new Map<ISODate, Holiday[]>()
  for (const h of holidays) map.set(h.date, [...(map.get(h.date) ?? []), h])
  return map
}
