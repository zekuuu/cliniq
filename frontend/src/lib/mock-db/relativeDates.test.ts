import { describe, expect, it } from 'vitest'
import { todayISO } from '../dates'
import { resolveDateTime, resolveSchoolDateTime } from './relativeDates'

describe('seed times on the real today', () => {
  const now = new Date(2026, 9, 26, 2, 43) // Monday, October 26, 2026, 02:43 local
  const today = todayISO(now)

  it('never puts a time later than the clock, and keeps the order of today\'s times', () => {
    const visit = resolveDateTime({ daysAgo: 0, time: '07:12' }, today, now)
    const letter = resolveSchoolDateTime({ daysAgo: 0, time: '09:30' }, today, now)
    expect(visit <= `${today}T02:43:00+08:00`).toBe(true)
    expect(letter <= `${today}T02:43:00+08:00`).toBe(true)
    expect(visit < letter).toBe(true)
  })

  it('leaves times already past, other days, and a mock today that is not the real day unchanged', () => {
    expect(resolveDateTime({ daysAgo: 0, time: '01:15' }, today, now)).toBe(`${today}T01:15:00+08:00`)
    expect(resolveDateTime({ daysAgo: 1, time: '07:12' }, today, now)).toBe('2026-10-25T07:12:00+08:00')
    expect(resolveDateTime({ daysAgo: 0, time: '07:12' }, '2026-09-01', now)).toBe('2026-09-01T07:12:00+08:00')
  })
})
