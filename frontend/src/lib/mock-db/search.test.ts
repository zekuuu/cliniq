import { beforeEach, describe, expect, it } from 'vitest'
import { getVisitComplaintSuggestions, recordVisit, searchStudents } from './api'
import { getMockSessionUser } from './session'
import { resetMockDb } from './store'

describe('student search', () => {
  beforeEach(() => resetMockDb())

  it('answers nothing for an empty query, and from the first character on at most 8', async () => {
    expect(await searchStudents('')).toEqual([])
    expect(await searchStudents('   ')).toEqual([])
    const one = await searchStudents('a')
    expect(one.length).toBeGreaterThan(0)
    expect(one.length).toBeLessThanOrEqual(8)
  })

  it('matches an LRN prefix or a name substring, case-insensitively, at most 8 (ADR-028)', async () => {
    expect((await searchStudents('000000260001')).map((s) => s.fullName)).toEqual(['Gian Quizon'])
    expect((await searchStudents('0000-0026-0001')).map((s) => s.fullName)).toEqual(['Gian Quizon'])
    expect((await searchStudents('00000026')).every((s) => s.lrn.startsWith('00000026'))).toBe(true)
    const byName = await searchStudents('QUIZON')
    expect(byName.length).toBeGreaterThanOrEqual(2)
    expect(byName.every((s) => s.fullName.includes('Quizon'))).toBe(true)
    expect((await searchStudents('an')).length).toBe(8)
  })

  it('returns active students only, with no medical fields', async () => {
    expect(await searchStudents('Hannah Umali')).toEqual([])
    const [first] = await searchStudents('000000260001')
    expect(Object.keys(first).sort()).toEqual(['fullName', 'gradeLevel', 'id', 'lrn'])
  })
})

describe('complaint suggestions', () => {
  beforeEach(() => resetMockDb())

  it('ranks the most used complaints first and keeps never-used predefined types', async () => {
    const suggestions = await getVisitComplaintSuggestions()
    // Seed: Stomachache 37 visits, Headache 29; Fainting is predefined but never used on a visit.
    expect(suggestions.slice(0, 2)).toEqual(['Stomachache', 'Headache'])
    expect(suggestions.at(-1)).toBe('Fainting')
  })

  it('adds a saved free-text complaint and never splits a known one by case', async () => {
    const actor = getMockSessionUser()
    const [student] = await searchStudents('000000260001')
    const base = { studentId: student.id, treatment: 'Rested', disposition: 'returned_to_class' as const, followUp: null }
    const saved = await recordVisit({ ...base, complaint: '  headache ' }, actor)
    expect(saved.visit.complaint).toBe('Headache')
    await recordVisit({ ...base, complaint: 'Nose  bleed' }, actor)
    const suggestions = await getVisitComplaintSuggestions()
    expect(suggestions).toContain('Nose bleed')
    expect(suggestions.filter((s) => s.toLowerCase() === 'headache')).toEqual(['Headache'])
  })
})
