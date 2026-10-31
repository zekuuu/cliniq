import { describe, expect, it } from 'vitest'
import { ageOn, ageText, unusualAgeNote, usualAgeForGrade } from './age'
import { seed } from './mock-db/seed'
import { ageGroupOf, usualRangeNotes } from './vitals'

const usual = seed.config.vitalsUsualRanges
const student = (gradeLevel: string, birthDate: string | null) => ({ kind: 'student' as const, gradeLevel, birthDate })

describe('ageOn (ADR-054)', () => {
  it('turns a year older on the birthday, not the day before', () => {
    expect(ageOn('2017-10-30', '2026-10-30')).toBe(9)
    expect(ageOn('2017-10-30', '2026-10-29')).toBe(8)
  })

  it('counts a 29 February birthdate as turned on 1 March in a year with no 29 February', () => {
    expect(ageOn('2016-02-29', '2026-02-28')).toBe(9)
    expect(ageOn('2016-02-29', '2026-03-01')).toBe(10)
    expect(ageOn('2016-02-29', '2024-02-29')).toBe(8)
  })

  it('gives no age for a birthdate after the day asked about, or none at all', () => {
    expect(ageOn('2026-10-31', '2026-10-30')).toBeNull()
    expect(ageOn(null, '2026-10-30')).toBeNull()
  })

  it('reads as whole years', () => {
    expect(ageText(9)).toBe('9 years')
    expect(ageText(1)).toBe('1 year')
  })
})

describe('the unusual-age note', () => {
  it('knows the usual age for each grade', () => {
    expect(usualAgeForGrade('Kinder')).toBe(5)
    expect(usualAgeForGrade('Grade 1')).toBe(6)
    expect(usualAgeForGrade('Grade 12')).toBe(17)
    expect(usualAgeForGrade('Other')).toBeNull()
  })

  it('starts only past the limit', () => {
    // Grade 3 is usually 8: age 11 is exactly 3 away, age 12 is past it.
    expect(unusualAgeNote('2015-01-01', 'Grade 3', '2026-10-30', 3)).toBeNull()
    expect(unusualAgeNote('2014-01-01', 'Grade 3', '2026-10-30', 3)).toBe('Age 12 is unusual for Grade 3. Check the birthdate.')
    expect(unusualAgeNote('2011-01-01', 'Grade 3', '2026-10-30', 3)).toBe('Age 15 is unusual for Grade 3. Check the birthdate.')
  })

  it('stays quiet with no birthdate or no grade yet', () => {
    expect(unusualAgeNote('', 'Grade 3', '2026-10-30', 3)).toBeNull()
    expect(unusualAgeNote('2011-01-01', '', '2026-10-30', 3)).toBeNull()
  })
})

describe('ageGroupOf (ADR-054)', () => {
  const onDate = '2026-10-30'

  it('follows the age over the grade', () => {
    expect(ageGroupOf(student('Grade 1', '2021-01-01'), onDate, usual)).toBe('kinder') // 5
    expect(ageGroupOf(student('Grade 6', '2013-01-01'), onDate, usual)).toBe('grades7to12') // 13
    expect(ageGroupOf(student('Kinder', '2020-01-01'), onDate, usual)).toBe('grades1to6') // 6
    expect(ageGroupOf(student('Grade 7', '2014-01-01'), onDate, usual)).toBe('grades1to6') // 12
  })

  it('falls back to the grade with no birthdate', () => {
    expect(ageGroupOf(student('Kinder', null), onDate, usual)).toBe('kinder')
    expect(ageGroupOf(student('Grade 3', null), onDate, usual)).toBe('grades1to6')
    expect(ageGroupOf(student('Grade 9', null), onDate, usual)).toBe('grades7to12')
    expect(ageGroupOf(student('Other', null), onDate, usual)).toBeNull()
  })

  it('keeps a staff patient an adult', () => {
    expect(ageGroupOf({ kind: 'personnel' }, onDate, usual)).toBe('adult')
  })

  it("uses the visit's date, not today's, so a late entry does not move the group", () => {
    const turnsThirteen = student('Grade 7', '2013-10-20')
    expect(ageGroupOf(turnsThirteen, '2026-10-19', usual)).toBe('grades1to6')
    expect(ageGroupOf(turnsThirteen, '2026-10-20', usual)).toBe('grades7to12')
  })

  it('changes the note the form shows', () => {
    const ranges = { ...seed.config.vitalsWarningRanges, usual }
    const reading = { pulseBpm: '105' }
    expect(usualRangeNotes(reading, ranges, ageGroupOf(student('Grade 1', '2021-01-01'), onDate, usual))).toEqual([])
    expect(usualRangeNotes(reading, ranges, ageGroupOf(student('Grade 1', null), onDate, usual))).toHaveLength(1)
  })
})
