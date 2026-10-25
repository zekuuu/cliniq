import { addDays, parseISODate, todayISO } from '../dates'
import type { ISODate, ISODateTime } from '../../types/entities'
import type { RelativeDate, RelativeDateTime } from './types'

/**
 * Resolves the seed's relative dates against one "today", so the seed never goes stale: whatever
 * day the app is opened, an item seeded 11 days from expiry is still 11 days from expiry.
 */

export function resolveDate(value: RelativeDate, today: ISODate): ISODate {
  return 'daysAgo' in value ? addDays(today, -value.daysAgo) : addDays(today, value.daysFromNow)
}

/**
 * A seed time on the real today must not be later than the clock: before 07:12, a visit seeded at
 * 07:12 today is "in the future", and editing it fails ("can't be in the future"). Today's times are
 * scaled into midnight–now, which keeps their order (a visit stays before its letter) and leaves
 * every other day, and any fixed mock today, untouched.
 */
function notAfterNow(date: ISODate, time: string, now: Date): string {
  if (date !== todayISO(now)) return time
  const [h, m] = time.split(':').map(Number)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const minutes = h * 60 + m
  if (minutes <= nowMinutes) return time
  const scaled = Math.floor((minutes * nowMinutes) / (24 * 60))
  return `${String(Math.floor(scaled / 60)).padStart(2, '0')}:${String(scaled % 60).padStart(2, '0')}`
}

/** Seed times are Philippine time (UTC+8), the clinic's only timezone. */
export function resolveDateTime(value: RelativeDateTime, today: ISODate, now = new Date()): ISODateTime {
  const date = resolveDate(value, today)
  return `${date}T${notAfterNow(date, value.time, now)}:00+08:00`
}

/**
 * Clinic activity happens on school days (panel review 5.3): a resolved date in the past that falls on a
 * Saturday or Sunday moves back to the Friday before. Today is never moved, nor is the future. The
 * mapping never reverses order, so linked dates (a visit and its letter, an incident and its calls) keep
 * their sequence. Backups and calendar events keep their own days.
 */
export function toSchoolDay(date: ISODate, today: ISODate): ISODate {
  if (date >= today) return date
  const weekday = parseISODate(date).getDay()
  return weekday === 6 ? addDays(date, -1) : weekday === 0 ? addDays(date, -2) : date
}

export function resolveSchoolDate(value: RelativeDate, today: ISODate): ISODate {
  return toSchoolDay(resolveDate(value, today), today)
}

export function resolveSchoolDateTime(value: RelativeDateTime, today: ISODate, now = new Date()): ISODateTime {
  const date = resolveSchoolDate(value, today)
  return `${date}T${notAfterNow(date, value.time, now)}:00+08:00`
}

export function isRelativeDate(value: unknown): value is RelativeDate {
  if (!value || typeof value !== 'object') return false
  const keys = Object.keys(value).filter((key) => key !== 'time')
  if (keys.length !== 1) return false
  const n = (value as Record<string, unknown>)[keys[0]]
  return (keys[0] === 'daysAgo' || keys[0] === 'daysFromNow') && Number.isInteger(n) && (n as number) >= 0
}

export function isRelativeDateTime(value: unknown): value is RelativeDateTime {
  const time = (value as { time?: unknown } | null)?.time
  return isRelativeDate(value) && typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
}
