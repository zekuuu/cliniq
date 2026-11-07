import { addDays } from './dates'
import type { ISODate } from '../types/entities'

/**
 * The school year's dates, held in settings because the school may change them (professor's
 * consultation, November 6, 2026; Zean, Saturday, November 7, 2026 — 04:20 PHT). Defaults: June 15 to
 * April 14 (the Principal, October 17, 2026).
 */
export interface SchoolYearSettings {
  schoolYearStartMonth: number
  schoolYearStartDay: number
  schoolYearEndMonth: number
  schoolYearEndDay: number
  /** The years Staff started by hand (Zean, November 7, 2026), oldest first. The dates above only say when the next one is due. */
  schoolYearStarts?: SchoolYearStart[]
}

/** A school year a clinician started: the year changes only when Staff start the next one. */
export interface SchoolYearStart {
  /** "2026–2027" (en dash). */
  label: string
  startedOn: ISODate
  /** The user id of the clinician who started it. */
  startedBy: string
  /** The day Staff ended it (the last class day); the break runs from the day after until the next start. */
  endedOn?: ISODate
  endedBy?: string
}

export const DEFAULT_SCHOOL_YEAR: SchoolYearSettings = { schoolYearStartMonth: 6, schoolYearStartDay: 15, schoolYearEndMonth: 4, schoolYearEndDay: 14 }

export interface SchoolYear {
  /** "2026–2027" (en dash). */
  label: string
  /** The calendar year it starts in. */
  startYear: number
  /** The start date. */
  from: ISODate
  /** The day before the next start: the summer break belongs to the year that just ended. */
  to: ISODate
  /** The last class day: the day Staff ended it, or the end setting. Only "in session" versus "break" uses it. */
  lastClassDay: ISODate
  /** Started by Staff (true) or derived from the date settings, for years before the first recorded start (false). */
  started: boolean
  /** The day Staff ended it, or null while it is still in session (or for a derived year). */
  endedOn: ISODate | null
}

const pad = (value: number) => String(value).padStart(2, '0')
const monthDay = (month: number, day: number) => `${pad(month)}-${pad(day)}`
/** Days in a month, counting February as 28 so a setting works every year. */
const daysIn = (month: number) => [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]

export function schoolYearLabel(startYear: number): string {
  return `${startYear}–${startYear + 1}`
}

/**
 * The school year a date belongs to. A year begins on the day Staff started it and runs until the day
 * before the next start; the current year stays current until the next is started, however late
 * (Zean, November 7, 2026). Dates before the first recorded start fall back to the date settings.
 */
export function schoolYearOf(date: ISODate, settings: SchoolYearSettings = DEFAULT_SCHOOL_YEAR): SchoolYear {
  const starts = [...(settings.schoolYearStarts ?? [])].sort((a, b) => a.startedOn.localeCompare(b.startedOn))
  let index = -1
  for (let i = 0; i < starts.length; i++) if (starts[i].startedOn <= date) index = i
  if (index < 0) {
    const planned = plannedSchoolYear(date, settings)
    const first = starts[0]
    // Before the first recorded start: never the started year itself, and never past its start.
    if (!first || planned.label < first.label) return first && planned.to >= first.startedOn ? { ...planned, to: addDays(first.startedOn, -1) } : planned
    const before = plannedSchoolYear(`${Number(first.label.slice(0, 4)) - 1}-${monthDay(settings.schoolYearStartMonth, settings.schoolYearStartDay)}`, settings)
    return { ...before, to: addDays(first.startedOn, -1) }
  }
  const start = starts[index]
  const next = starts[index + 1]
  const startYear = Number(start.label.slice(0, 4))
  const planned = plannedSchoolYear(`${startYear}-${monthDay(settings.schoolYearStartMonth, settings.schoolYearStartDay)}`, settings)
  const to = next ? addDays(next.startedOn, -1) : date > planned.to ? date : planned.to
  return { label: start.label, startYear, from: start.startedOn, to, lastClassDay: start.endedOn ?? planned.lastClassDay, started: true, endedOn: start.endedOn ?? null }
}

/**
 * What Staff should do next (Zean, November 7, 2026: a year starts and ends by hand, with the break in
 * between). In session: end it, due the day after the last class day setting. Ended: start the next
 * one, due on the start setting. `due` is true once that day has come.
 */
export function schoolYearStep(settings: SchoolYearSettings = DEFAULT_SCHOOL_YEAR, today: ISODate): { kind: 'end' | 'start'; label: string; dueOn: ISODate; due: boolean; soon: boolean } {
  const current = currentSchoolYear(settings, today)
  const soon = (dueOn: ISODate) => today < dueOn && today >= addDays(dueOn, -SCHOOL_YEAR_NOTICE_DAYS)
  if (current.started && !current.endedOn) {
    // The end is due on the last class day itself.
    const dueOn = plannedSchoolYear(current.from, settings).lastClassDay
    return { kind: 'end', label: current.label, dueOn, due: today > dueOn, soon: soon(dueOn) || today === dueOn }
  }
  const next = nextSchoolYear(settings, today)
  return { kind: 'start', ...next, soon: soon(next.dueOn) }
}

/** Days before a start or end is due when the Dashboard begins to remind Staff (Zean, November 7, 2026: "reminder when the start date is near"). Starting value. */
export const SCHOOL_YEAR_NOTICE_DAYS = 7

/** The next school year: its label, the day it is due by the date settings, and whether that day has come. */
export function nextSchoolYear(settings: SchoolYearSettings = DEFAULT_SCHOOL_YEAR, today: ISODate): { label: string; dueOn: ISODate; due: boolean } {
  const current = currentSchoolYear(settings, today)
  // Due on the first start date after the year ended (or began): a start date changed during the year
  // means this year's date, not next year's.
  const after = current.endedOn ?? current.from
  const md = monthDay(settings.schoolYearStartMonth, settings.schoolYearStartDay)
  const sameYear = `${after.slice(0, 4)}-${md}`
  const dueOn = sameYear > after ? sameYear : `${Number(after.slice(0, 4)) + 1}-${md}`
  return { label: schoolYearLabel(current.startYear + 1), dueOn, due: today >= dueOn }
}

/** The school year a date would fall in by the date settings alone. */
function plannedSchoolYear(date: ISODate, settings: SchoolYearSettings): SchoolYear {
  const start = monthDay(settings.schoolYearStartMonth, settings.schoolYearStartDay)
  const year = Number(date.slice(0, 4))
  const startYear = date.slice(5) >= start ? year : year - 1
  const end = monthDay(settings.schoolYearEndMonth, settings.schoolYearEndDay)
  // The end falls after the start: later the same calendar year, or in the next one.
  const endYear = end > start ? startYear : startYear + 1
  return {
    label: schoolYearLabel(startYear),
    startYear,
    from: `${startYear}-${start}`,
    to: addDays(`${startYear + 1}-${start}`, -1),
    lastClassDay: `${endYear}-${end}`,
    started: false,
    endedOn: null,
  }
}

export function currentSchoolYear(settings: SchoolYearSettings = DEFAULT_SCHOOL_YEAR, today: ISODate): SchoolYear {
  return schoolYearOf(today, settings)
}

/** Classes are on (start to the last class day), as against the break before the next start. A started year with no end is in session. */
export function isInSession(date: ISODate, settings: SchoolYearSettings = DEFAULT_SCHOOL_YEAR): boolean {
  const year = schoolYearOf(date, settings)
  if (year.started && !year.endedOn) return true
  return date <= year.lastClassDay
}

/** The first problem with a setting, or null. Messages are plain, for the settings form. */
export function schoolYearSettingsError(settings: SchoolYearSettings): string | null {
  const months = [settings.schoolYearStartMonth, settings.schoolYearEndMonth]
  if (months.some((month) => !Number.isInteger(month) || month < 1 || month > 12)) return 'Choose a month from January to December.'
  if (!Number.isInteger(settings.schoolYearStartDay) || settings.schoolYearStartDay < 1 || settings.schoolYearStartDay > daysIn(settings.schoolYearStartMonth))
    return 'The start day is not a date in that month.'
  if (!Number.isInteger(settings.schoolYearEndDay) || settings.schoolYearEndDay < 1 || settings.schoolYearEndDay > daysIn(settings.schoolYearEndMonth))
    return 'The end day is not a date in that month.'
  // Any other end day falls before the next start, a year after this one.
  if (monthDay(settings.schoolYearStartMonth, settings.schoolYearStartDay) === monthDay(settings.schoolYearEndMonth, settings.schoolYearEndDay))
    return 'The last class day must fall before the next school year starts.'
  return null
}
