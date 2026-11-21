import { afterEach, describe, expect, it, vi } from 'vitest'
import { DuplicateLrnError, PersonnelPermissionError, SchoolYearSettingsError } from '../../mock-db'
import * as data from '../../data'
import { ok, stubApi } from './testFetch'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const staff = { id: '1', name: 'Nurse', role: 'staff' as const }

describe('STUDENTS in API mode (S2)', () => {
  it('lists and searches with the LRN in the body, never in the URL', async () => {
    const calls = stubApi(() => ok([]))
    await data.listStudents({ search: '1234', includeArchived: true, limit: 80 })
    await data.searchStudents('000000260001', 5)
    await data.checkStudentDuplicates('000000260001', 'Gian Quizon')
    expect(calls).toEqual([
      {
        url: '/api/students/query',
        method: 'POST',
        body: {
          search: '1234',
          gradeLevel: null,
          includeArchived: true,
          recordStatus: null,
          limit: 80,
        },
      },
      { url: '/api/students/search', method: 'POST', body: { q: '000000260001', limit: 5 } },
      {
        url: '/api/students/check-duplicates',
        method: 'POST',
        body: { lrn: '000000260001', firstName: 'Gian Quizon' },
      },
    ])
    expect(calls.every((call) => !call.url.includes('0000002600'))).toBe(true)
  })

  it('creates with POST, updates with PUT and the correction reason, and maps duplicate_lrn', async () => {
    const calls = stubApi((url, method) =>
      method === 'POST' && url === '/api/students'
        ? { status: 409, body: { code: 'rule_violated', rule: 'duplicate_lrn', message: 'Taken.' } }
        : ok({ status: 'saved', student: {}, action: 'update' }),
    )
    const input = { lrn: '000000260001', firstName: 'Gian', lastName: 'Quizon' } as never
    await expect(data.saveStudent(input, { confirmDuplicate: true })).rejects.toBeInstanceOf(
      DuplicateLrnError,
    )
    await data.saveStudent(input, { studentId: '1', nameCorrectionReason: 'Typo' })
    expect(calls[0].body).toMatchObject({ confirmDuplicate: true })
    expect(calls[1]).toMatchObject({
      url: '/api/students/1',
      method: 'PUT',
      body: { nameCorrectionReason: 'Typo' },
    })
  })

  it('archives with the reason', async () => {
    const calls = stubApi(() => ok({}))
    await data.archiveStudent('7', staff, 'Transferred')
    expect(calls[0]).toEqual({
      url: '/api/students/7/archive',
      method: 'POST',
      body: { reason: 'Transferred' },
    })
  })

  it('restores out of the archive (ADR-085)', async () => {
    const calls = stubApi(() => ok({}))
    await data.restoreStudent('7', staff)
    await data.restorePersonnel('8', staff)
    expect(calls.map((c) => c.url)).toEqual(['/api/students/7/restore', '/api/personnel/8/restore'])
  })
})

describe('STAFF_PATIENTS in API mode (S2)', () => {
  it('reads the list with its filters and maps the Admin 403 to the staff-only error', async () => {
    const calls = stubApi((url) =>
      url.startsWith('/api/personnel/9')
        ? { status: 403, body: { code: 'forbidden', message: "You don't have access to this." } }
        : ok([]),
    )
    await data.listPersonnel({ search: 'STF', type: 'Teacher', includeArchived: true })
    expect(calls[0].url).toBe('/api/personnel?search=STF&type=Teacher&includeArchived=1')
    await expect(data.getPersonnel('9')).rejects.toBeInstanceOf(PersonnelPermissionError)
  })

  it('reads one patient by kind and id', async () => {
    const calls = stubApi(() => ok({ kind: 'personnel' }))
    await data.getPatient({ studentId: null, personnelId: '4' })
    await data.getPatient({ studentId: '3', personnelId: null })
    expect(calls.map((c) => c.url)).toEqual([
      '/api/patients/personnel/4',
      '/api/patients/student/3',
    ])
  })
})

const schoolYears = {
  current: {
    label: '2026–2027',
    from: '2026-06-15',
    to: '2027-06-14',
    endedOn: null,
    startedBy: 'Nurse',
    endedBy: null,
  },
  step: { kind: 'end', label: '2026–2027', dueOn: '2027-04-14', due: false, soon: false },
  settings: {
    schoolYearStartMonth: 6,
    schoolYearStartDay: 15,
    schoolYearEndMonth: 4,
    schoolYearEndDay: 14,
  },
  years: [{ label: '2026–2027', startedOn: '2026-06-15', endedOn: null }],
}

describe('SCHOOL_YEARS and the Archive in API mode (S2)', () => {
  it('joins the Archive back into the mock shape, every page of every year', async () => {
    const row = (id: string) => ({ id, kind: 'student', archivedSchoolYear: '2026–2027' })
    const calls = stubApi((url) => {
      if (url === '/api/school-years') return ok(schoolYears)
      if (url === '/api/archive/years')
        return ok({
          years: [{ label: '2026–2027', from: '2026-06-15', to: '2027-06-14', months: [] }],
          defaultYear: '2026–2027',
        })
      if (url.startsWith('/api/archive/students') && url.includes('page=1'))
        return ok([row('1'), row('2')], { page: 1, perPage: 100, total: 3 })
      if (url.startsWith('/api/archive/students'))
        return ok([row('3')], { page: 2, perPage: 100, total: 3 })
      return ok([], { page: 1, perPage: 100, total: 0 })
    })
    const view = await data.getArchive({ ...staff, role: 'admin' })
    expect(view.students.map((r) => r.id)).toEqual(['1', '2', '3'])
    expect(view.staff).toEqual([])
    expect(calls.some((c) => c.url.startsWith('/api/archive/staff'))).toBe(false)
    expect(view.current).toMatchObject({ label: '2026–2027', startYear: 2026, started: true })
    expect(view.currentStartedBy).toBe('Nurse')
    expect(view.settings.schoolYearStarts).toEqual([
      { label: '2026–2027', startedOn: '2026-06-15', startedBy: '' },
    ])
  })

  it('reads a school-year refusal as SchoolYearSettingsError with the server message', async () => {
    stubApi((url) =>
      url === '/api/school-years/start'
        ? {
            status: 409,
            body: {
              code: 'rule_violated',
              rule: 'school_year',
              message: 'End school year 2026–2027 first.',
            },
          }
        : ok(schoolYears),
    )
    const error = await data.startSchoolYear(staff).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SchoolYearSettingsError)
    expect((error as Error).message).toBe('End school year 2026–2027 first.')
  })
})
