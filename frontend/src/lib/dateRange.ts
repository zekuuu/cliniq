import type { ISODate } from '../types/entities'
import { addDays, diffDays, formatDateRange, startOfMonth, startOfYear } from './dates'

export type DateRangePreset = 'today' | 'last7' | 'last30' | 'thisMonth' | 'thisYear' | 'all' | 'custom'

export interface DateRange {
  preset: DateRangePreset
  from: ISODate
  to: ISODate
}

export const PRESET_LABELS: Record<DateRangePreset, string> = {
  today: 'Today',
  last7: 'Last 7 days',
  last30: 'Last 30 days',
  thisMonth: 'This month',
  thisYear: 'This year',
  all: 'All',
  custom: 'Custom range',
}

export function rangeForPreset(
  preset: Exclude<DateRangePreset, 'custom'>,
  today: ISODate,
): DateRange {
  switch (preset) {
    case 'today':
      return { preset, from: today, to: today }
    case 'last7':
      return { preset, from: addDays(today, -6), to: today }
    case 'last30':
      return { preset, from: addDays(today, -29), to: today }
    case 'thisMonth':
      return { preset, from: startOfMonth(today), to: today }
    case 'thisYear':
      return { preset, from: startOfYear(today), to: today }
    case 'all':
      // HTML date inputs do not consistently support year 0000. This safely predates CLINIQ.
      return { preset, from: '1900-01-01', to: today }
  }
}

/** Human label for what a range covers, e.g. "Last 30 days" or "Sep 1 – Sep 12, 2026". */
export function describeRange(range: DateRange): string {
  return range.preset === 'custom'
    ? formatDateRange(range.from, range.to)
    : PRESET_LABELS[range.preset]
}

/**
 * The dates a range covers, for a header or a printout: "Oct 1 – Oct 14, 2026", or "All records" for
 * the All preset, whose 1900 start date is a placeholder and never a date to show.
 */
export function describeRangeDates(range: DateRange): string {
  return range.preset === 'all' ? 'All records' : formatDateRange(range.from, range.to)
}

/** The equal-length period immediately before `range`, used for "vs previous period" trends. */
export function previousPeriod(range: DateRange): { from: ISODate; to: ISODate } {
  const length = diffDays(range.from, range.to) + 1
  return { from: addDays(range.from, -length), to: addDays(range.from, -1) }
}

export function rangeLengthDays(range: { from: ISODate; to: ISODate }): number {
  return diffDays(range.from, range.to) + 1
}
