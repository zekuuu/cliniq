import { describe, expect, it } from 'vitest'
import { currentSchoolYear, DEFAULT_SCHOOL_YEAR, isInSession, nextSchoolYear, schoolYearOf, schoolYearStep, schoolYearSettingsError } from './schoolYear'

describe('school years (June 15 to April 14 by default)', () => {
  it('starts on the start day, not the day before', () => {
    expect(schoolYearOf('2026-06-14').label).toBe('2025–2026')
    expect(schoolYearOf('2026-06-15').label).toBe('2026–2027')
    expect(schoolYearOf('2026-06-16').label).toBe('2026–2027')
  })

  it('runs until the day before the next start, so the summer break belongs to the year that just ended', () => {
    const year = schoolYearOf('2027-04-20')
    expect(year).toMatchObject({ label: '2026–2027', from: '2026-06-15', to: '2027-06-14', lastClassDay: '2027-04-14' })
    expect(isInSession('2027-04-14')).toBe(true)
    expect(isInSession('2027-04-15')).toBe(false)
    expect(isInSession('2027-06-14')).toBe(false)
    expect(isInSession('2027-06-15')).toBe(true)
  })

  it('handles a leap day and the calendar-year edges', () => {
    expect(schoolYearOf('2028-02-29').label).toBe('2027–2028')
    expect(schoolYearOf('2026-12-31').label).toBe('2026–2027')
    expect(schoolYearOf('2027-01-01').label).toBe('2026–2027')
    expect(currentSchoolYear(DEFAULT_SCHOOL_YEAR, '2026-11-07').label).toBe('2026–2027')
  })

  it('follows a changed setting', () => {
    const august = { schoolYearStartMonth: 8, schoolYearStartDay: 1, schoolYearEndMonth: 5, schoolYearEndDay: 31 }
    expect(schoolYearOf('2026-07-31', august).label).toBe('2025–2026')
    expect(schoolYearOf('2026-08-01', august)).toMatchObject({ label: '2026–2027', to: '2027-07-31', lastClassDay: '2027-05-31' })
    // An end later in the same calendar year.
    expect(schoolYearOf('2026-03-01', { schoolYearStartMonth: 1, schoolYearStartDay: 10, schoolYearEndMonth: 11, schoolYearEndDay: 30 }).lastClassDay).toBe('2026-11-30')
  })

  it('rejects a month or day that does not exist, and an end on the start', () => {
    expect(schoolYearSettingsError(DEFAULT_SCHOOL_YEAR)).toBeNull()
    expect(schoolYearSettingsError({ ...DEFAULT_SCHOOL_YEAR, schoolYearStartMonth: 13 })).toMatch(/month/)
    expect(schoolYearSettingsError({ ...DEFAULT_SCHOOL_YEAR, schoolYearStartMonth: 2, schoolYearStartDay: 29 })).toMatch(/start day/)
    expect(schoolYearSettingsError({ ...DEFAULT_SCHOOL_YEAR, schoolYearEndMonth: 4, schoolYearEndDay: 31 })).toMatch(/end day/)
    expect(schoolYearSettingsError({ ...DEFAULT_SCHOOL_YEAR, schoolYearEndMonth: 6, schoolYearEndDay: 15 })).toMatch(/before the next school year/)
  })
})

describe('school years started by hand (Zean, November 7, 2026)', () => {
  const started = { ...DEFAULT_SCHOOL_YEAR, schoolYearStarts: [{ label: '2025–2026', startedOn: '2025-06-16', startedBy: 'u', endedOn: '2026-04-10', endedBy: 'u' }, { label: '2026–2027', startedOn: '2026-06-22', startedBy: 'u' }] }

  it('begins on the day it was started and ends the day before the next start', () => {
    expect(schoolYearOf('2026-06-21', started)).toMatchObject({ label: '2025–2026', from: '2025-06-16', to: '2026-06-21' })
    expect(schoolYearOf('2026-06-22', started)).toMatchObject({ label: '2026–2027', from: '2026-06-22', lastClassDay: '2027-04-14' })
  })

  it('keeps the current year past its due date until the next is started', () => {
    expect(currentSchoolYear(started, '2027-08-01')).toMatchObject({ label: '2026–2027', to: '2027-08-01' })
    expect(nextSchoolYear(started, '2027-08-01')).toEqual({ label: '2027–2028', dueOn: '2027-06-15', due: true })
    expect(nextSchoolYear(started, '2027-06-14').due).toBe(false)
  })

  it('files dates before the first start under the dates, never past that start', () => {
    expect(schoolYearOf('2025-06-15', started)).toMatchObject({ label: '2024–2025', to: '2025-06-15' })
    expect(schoolYearOf('2024-01-10', started).label).toBe('2023–2024')
  })

  it('is in session from the start until Staff end it, then on break', () => {
    expect(schoolYearOf('2026-04-10', started)).toMatchObject({ label: '2025–2026', endedOn: '2026-04-10', lastClassDay: '2026-04-10' })
    expect(isInSession('2026-04-10', started)).toBe(true)
    expect(isInSession('2026-04-11', started)).toBe(false)
    // Not ended yet: in session even past the last class day setting.
    expect(isInSession('2027-05-01', started)).toBe(true)
  })

  it('names the next step: end, due on the last class day, then start; soon is the week before', () => {
    expect(schoolYearStep(started, '2027-04-06')).toEqual({ kind: 'end', label: '2026–2027', dueOn: '2027-04-14', due: false, soon: false })
    expect(schoolYearStep(started, '2027-04-07').soon).toBe(true)
    expect(schoolYearStep(started, '2027-04-14')).toMatchObject({ due: false, soon: true })
    expect(schoolYearStep(started, '2027-04-15')).toMatchObject({ due: true, soon: false })
    const ended = { ...started, schoolYearStarts: [started.schoolYearStarts[0], { ...started.schoolYearStarts[1], endedOn: '2027-04-14', endedBy: 'u' }] }
    expect(schoolYearStep(ended, '2027-06-08')).toEqual({ kind: 'start', label: '2027–2028', dueOn: '2027-06-15', due: false, soon: true })
    expect(schoolYearStep(ended, '2027-06-15')).toMatchObject({ due: true, soon: false })
    // A start date moved to later this year counts this year (Zean's test: November 10, after ending on November 7).
    const november = { ...ended, schoolYearStartMonth: 11, schoolYearStartDay: 10, schoolYearStarts: [started.schoolYearStarts[0], { ...started.schoolYearStarts[1], endedOn: '2026-11-07', endedBy: 'u' }] }
    expect(schoolYearStep(november, '2026-11-07')).toEqual({ kind: 'start', label: '2027–2028', dueOn: '2026-11-10', due: false, soon: true })
  })
})
