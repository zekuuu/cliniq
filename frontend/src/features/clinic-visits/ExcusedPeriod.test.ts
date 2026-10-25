import { beforeEach, describe, expect, it } from 'vitest'
import {
  approveExcuseLetter,
  excusedPeriodError,
  getExcuseLetterApproval,
  getStudentExcuseLetters,
  getVisit,
  listPendingExcuseLetters,
  resetMockDb,
  updateVisit,
} from '../../lib/mock-db'
import { fetchExcuseLetterContext } from './api/excuseLetterApi'

describe('Excused period', () => {
  beforeEach(() => resetMockDb())

  it('requires both dates and rejects "until" before "from"', () => {
    expect(excusedPeriodError({ excusedFrom: '2026-10-03', excusedUntil: '2026-10-05' })).toBeNull()
    expect(excusedPeriodError({ excusedFrom: '2026-10-03', excusedUntil: '2026-10-03' })).toBeNull()
    expect(excusedPeriodError({ excusedFrom: '2026-10-05', excusedUntil: '2026-10-03' })).toMatch(/can't be before/)
    expect(excusedPeriodError({ excusedFrom: '', excusedUntil: '2026-10-03' })).toMatch(/required/)
    expect(excusedPeriodError({ excusedFrom: '2026-10-03', excusedUntil: '' })).toMatch(/required/)
  })

  it('defaults a draft to the visit date, one day', async () => {
    const context = await fetchExcuseLetterContext('visit-0001')
    const visitDate = context.visit.dateTime.slice(0, 10)
    expect(context.approval).toBeNull()
    expect(context.period).toEqual({ excusedFrom: visitDate, excusedUntil: visitDate })
  })

  it('stores the period on approval, rejects an invalid one, and locks it afterwards', async () => {
    const visitDate = (await getVisit('visit-0001')).dateTime.slice(0, 10)
    await expect(
      approveExcuseLetter('visit-0001', { excusedFrom: visitDate, excusedUntil: '2000-01-01' }),
    ).rejects.toThrow(/can't be before/)
    expect(await getExcuseLetterApproval('visit-0001')).toBeNull()

    await approveExcuseLetter('visit-0001', { excusedFrom: visitDate, excusedUntil: visitDate })
    expect(await getExcuseLetterApproval('visit-0001')).toMatchObject({ excusedFrom: visitDate, excusedUntil: visitDate })
    expect((await fetchExcuseLetterContext('visit-0001')).period).toEqual({ excusedFrom: visitDate, excusedUntil: visitDate })

    await expect(
      approveExcuseLetter('visit-0001', { excusedFrom: visitDate, excusedUntil: '2099-01-01' }),
    ).rejects.toThrow(/already approved/)
  })

  it("lists a student's letters with the visit disposition", async () => {
    const visit = await getVisit('visit-0139')
    const letters = await getStudentExcuseLetters(visit.studentId!)
    expect(letters).toEqual([expect.objectContaining({ visitId: 'visit-0139', disposition: 'sent_home' })])
  })

  it('prefills the letter from the draft saved with the visit', async () => {
    const draft = (await getVisit('visit-0151')).excuseLetterDraft!
    const context = await fetchExcuseLetterContext('visit-0151')
    expect(context.approval).toBeNull()
    expect(context.period).toEqual({ excusedFrom: draft.excusedFrom, excusedUntil: draft.excusedUntil })
    expect(context.note).toBe(draft.note)
  })

  it('moves the draft onto the letter at approval, so only one record holds the period', async () => {
    await approveExcuseLetter('visit-0151', { excusedFrom: '2026-10-01', excusedUntil: '2026-10-02', note: ' Missed quiz ' })
    expect(await getExcuseLetterApproval('visit-0151')).toMatchObject({
      excusedFrom: '2026-10-01',
      excusedUntil: '2026-10-02',
      note: 'Missed quiz',
    })
    expect((await getVisit('visit-0151')).excuseLetterDraft).toBeNull()
    const context = await fetchExcuseLetterContext('visit-0151')
    expect(context.period).toEqual({ excusedFrom: '2026-10-01', excusedUntil: '2026-10-02' })
  })

  it('rejects a draft on an approved visit, on Returned to class, or with an invalid period', async () => {
    const edit = (id: string, patch: Partial<Parameters<typeof updateVisit>[1]>) =>
      getVisit(id).then((v) =>
        updateVisit(id, { complaint: v.complaint, treatment: v.treatment, disposition: v.disposition, eventTag: v.eventTag, ...patch }),
      )
    const draft = { excusedFrom: '2026-10-01', excusedUntil: '2026-10-02', note: null }
    await expect(edit('visit-0139', { excuseLetterDraft: draft })).rejects.toThrow(/already has an approved excuse letter/)
    await expect(edit('visit-0151', { disposition: 'returned_to_class' })).rejects.toThrow(/Only a Sent home or Referred/)
    await expect(edit('visit-0151', { excuseLetterDraft: { ...draft, excusedUntil: '2026-09-01' } })).rejects.toThrow(/can't be before/)
    await expect(edit('visit-0151', { referredTo: 'Clinic' })).rejects.toThrow(/Only a Referred to hospital/)
  })

  it('normalizes the complaint on edit, the same as on a new visit', async () => {
    const visit = await getVisit('visit-0158')
    const { visit: edited } = await updateVisit(visit.id, { ...visit, complaint: '  fEVER ' })
    expect(edited.complaint).toBe('Fever')
  })

  it('lists drafts as pending, on the profile and in the Staff pending list, until approved', async () => {
    const visit = await getVisit('visit-0151')
    expect(await getStudentExcuseLetters(visit.studentId!)).toEqual([
      expect.objectContaining({ visitId: 'visit-0151', status: 'pending' }),
    ])
    expect((await listPendingExcuseLetters()).map((row) => row.visitId)).toEqual(['visit-0151'])

    await approveExcuseLetter('visit-0151', { excusedFrom: '2026-10-01', excusedUntil: '2026-10-02' })
    expect(await getStudentExcuseLetters(visit.studentId!)).toEqual([
      expect.objectContaining({ visitId: 'visit-0151', status: 'approved' }),
    ])
    expect(await listPendingExcuseLetters()).toEqual([])
  })
})
