import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  diffDays,
  endOfMonth,
  formatDate,
  formatDateTime,
  formatTime,
  startOfWeek,
} from './dates'

describe('dates', () => {
  it('does calendar-day arithmetic without timezone drift', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(diffDays('2026-09-26', '2026-10-03')).toBe(7)
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29')
  })
  it('clamps month arithmetic to the last day of the month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
  })
  it('starts weeks on Sunday', () => {
    expect(startOfWeek('2026-09-26')).toBe('2026-09-20')
    expect(startOfWeek('2026-09-20')).toBe('2026-09-20')
  })
  // Design-System.md, "Dates & Times": one display format, 12-hour, Philippine time.
  it('formats timestamps as "Sep 27, 2026 · 9:05 AM" whatever the device timezone', () => {
    expect(formatDateTime('2026-09-27T09:05:00+08:00')).toBe('Sep 27, 2026 · 9:05 AM')
    expect(formatDateTime('2026-09-27T13:46:00+08:00')).toBe('Sep 27, 2026 · 1:46 PM')
    // Stored in UTC (e.g. `toISOString()`): still shown on the clinic's clock.
    expect(formatDateTime('2026-09-27T16:30:00Z')).toBe('Sep 28, 2026 · 12:30 AM')
    // No offset recorded: treated as the clinic's wall clock.
    expect(formatDateTime('2026-09-27T00:05')).toBe('Sep 27, 2026 · 12:05 AM')
  })
  it('formats a date-only value without a time', () => {
    expect(formatDate('2026-09-27')).toBe('Sep 27, 2026')
    expect(formatDateTime('2026-09-27')).toBe('Sep 27, 2026')
    expect(formatTime('2026-09-27T21:00:00+08:00')).toBe('9:00 PM')
  })
})
