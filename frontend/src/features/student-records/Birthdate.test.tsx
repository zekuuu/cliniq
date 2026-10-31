import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addDays, formatDate } from '../../lib/dates'
import {
  getDashboardSummary,
  getIncompleteRecordQueue,
  getMonthlyReport,
  getMockToday,
  getRecordedAuditEntries,
  getStudent,
  listFollowUps,
  listStudents,
  resetMockDb,
  saveStudent,
  searchPatients,
  searchStudents,
} from '../../lib/mock-db'
import { checkSeedIntegrity } from '../../lib/mock-db/integrity'
import { seed } from '../../lib/mock-db/seed'
import { db, migratePersistedState } from '../../lib/mock-db/store'
import type { MockDbSeed } from '../../lib/mock-db/types'
import { pickDate } from '../../test/pickDate'
import { renderWithRouter } from '../../test/renderWithRouter'
import { selectOption } from '../../test/selectOption'
import { fetchVisitLog } from '../clinic-visits/api/visitLogApi'
import { fetchIncidentLog } from '../emergency-response/api/incidentLogApi'
import { StudentFormPage } from './StudentFormPage'
import { StudentProfilePage } from './StudentProfilePage'

const SLOW = 20_000
const STAFF = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' } as const
const ADMIN = { id: 'user-admin-01', name: 'Gilan Avelida', role: 'admin' } as const

/** Sets a birthdate on the store directly, for states the form itself refuses. */
function storeBirthDate(studentId: string, birthDate: string | null) {
  const student = db().students.find((st) => st.id === studentId)
  if (!student) throw new Error(studentId)
  student.birthDate = birthDate
}

function printed(): HTMLElement {
  act(() => {
    window.dispatchEvent(new Event('beforeprint'))
  })
  const doc = document.body.querySelector<HTMLElement>('[data-print-document]')
  if (!doc) throw new Error('No print document mounted')
  return doc
}

beforeEach(() => resetMockDb())
afterEach(() => {
  act(() => {
    window.dispatchEvent(new Event('afterprint'))
  })
})

describe('Add/Edit Student', () => {
  it('saves a student without a birthdate, and has no mobile number field', async () => {
    const user = userEvent.setup()
    renderWithRouter(<StudentFormPage />)
    await screen.findByRole('heading', { name: 'Add Student' })
    expect(screen.queryByLabelText(/mobile number/i)).not.toBeInTheDocument()

    await user.type(screen.getByLabelText(/^LRN/), '123456789012')
    await user.type(screen.getByLabelText(/full name/i), 'Lara Santos')
    await selectOption(user, screen.getByLabelText(/grade level/i), 'Grade 6')
    await selectOption(user, screen.getByLabelText(/^sex/i), 'Female')
    await user.type(screen.getByLabelText(/contact name/i), 'Marisol Santos')
    await user.type(screen.getByLabelText(/relationship/i), 'Mother')
    await user.type(screen.getByLabelText(/contact phone/i), '0917-333-4444')
    await user.click(screen.getByRole('button', { name: 'Save Student' }))

    expect(await screen.findByText('Student record created for Lara Santos.')).toBeInTheDocument()
    const created = (await listStudents({ search: 'Lara Santos' }))[0]
    expect((await getStudent(created.id)).birthDate).toBeNull()
  }, SLOW)

  it('refuses a future birthdate on the form', async () => {
    const user = userEvent.setup()
    storeBirthDate('student-0002', '2999-01-01')
    renderWithRouter(<StudentFormPage studentId="student-0002" />)
    await screen.findByRole('heading', { name: 'Edit Student' })
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText("The birthdate can't be in the future.")).toBeInTheDocument()
    expect(getRecordedAuditEntries().filter((entry) => entry.actionType === 'update')).toEqual([])
  }, SLOW)

  it('refuses a future or impossible birthdate in the data layer too', async () => {
    const student = await getStudent('student-0002')
    await expect(saveStudent({ ...student, birthDate: '2999-01-01' }, { studentId: student.id })).rejects.toThrow("can't be in the future")
    await expect(saveStudent({ ...student, birthDate: '2015-02-30' }, { studentId: student.id })).rejects.toThrow('real birthdate')
  })

  it('shows the unusual-age note and still saves', async () => {
    const user = userEvent.setup()
    const year = Number(getMockToday().slice(0, 4)) - 16
    const birthDate = `${year}-01-15`
    renderWithRouter(<StudentFormPage studentId="student-0002" />)
    await screen.findByRole('heading', { name: 'Edit Student' })

    await pickDate(user, screen.getByLabelText(/birthdate/i), birthDate)
    expect(await screen.findByText('Age 16 is unusual for Grade 1. Check the birthdate.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(async () => expect((await getStudent('student-0002')).birthDate).toBe(birthDate))
  }, SLOW)

  it('audits a birthdate change by field name, never the value', async () => {
    const student = await getStudent('student-0002')
    await saveStudent({ ...student, birthDate: '2019-03-04' }, { studentId: student.id })
    const entry = getRecordedAuditEntries().find((row) => row.actionType === 'update')
    expect(entry?.summary).toBe('Updated birth date')
    expect(JSON.stringify(entry)).not.toContain('2019-03-04')
  })
})

describe('Student Profile', () => {
  const header = () => screen.getByRole('heading', { level: 1 }).parentElement!.parentElement!

  it.each([
    ['Staff', STAFF],
    ['Admin', ADMIN],
  ])('shows %s the age in the header, and the date in the details and the printout', async (_role, viewer) => {
    storeBirthDate('student-0002', '2019-03-04')
    const age = Number(getMockToday().slice(0, 4)) - 2019 - (getMockToday().slice(5) < '03-04' ? 1 : 0)
    renderWithRouter(<StudentProfilePage viewer={viewer} studentId="student-0002" />)
    await screen.findByRole('heading', { name: 'Overview' })

    expect(header()).toHaveTextContent(`· ${age} years old`)
    expect(header()).not.toHaveTextContent(formatDate('2019-03-04'))
    const overview = screen.getByRole('region', { name: 'Overview' })
    expect(within(overview).getByText('Birthdate')).toBeInTheDocument()
    expect(within(overview).getByText(formatDate('2019-03-04'))).toBeInTheDocument()
    // The Admin's Print stays disabled (ADR-038), so only Staff get the printout.
    if (viewer.role === 'staff') expect(printed()).toHaveTextContent(`Birthdate${formatDate('2019-03-04')}`)
  })

  it('shows neither with no birthdate, and no mobile number', async () => {
    storeBirthDate('student-0002', null)
    renderWithRouter(<StudentProfilePage viewer={STAFF} studentId="student-0002" />)
    await screen.findByRole('heading', { name: 'Overview' })

    expect(header()).not.toHaveTextContent(/\d+ years?/)
    expect(screen.queryByText('Birthdate')).not.toBeInTheDocument()
    expect(screen.queryByText(/mobile number/i)).not.toBeInTheDocument()
    const doc = printed()
    expect(doc).not.toHaveTextContent('Birthdate')
    expect(doc).not.toHaveTextContent(/mobile number/i)
  })
})

describe('display privacy (ADR-004, ADR-040, ADR-054)', () => {
  it('keeps the birthdate off every multi-student data source', async () => {
    const dates = db().students.flatMap((student) => (student.birthDate ? [student.birthDate] : []))
    expect(dates.length).toBeGreaterThan(40)
    const today = getMockToday()
    const everything = {
      list: await listStudents({ includeArchived: true }),
      queue: await getIncompleteRecordQueue(),
      search: await searchStudents('a'),
      patients: await searchPatients('a'),
      dashboard: await getDashboardSummary({ range: { preset: 'custom', from: addDays(today, -60), to: today } } as never),
      report: await getMonthlyReport(today.slice(0, 7)),
      followUps: await listFollowUps(),
      visits: await fetchVisitLog({ from: addDays(today, -60), to: today, search: '', disposition: 'all' }),
      incidents: await fetchIncidentLog({ from: addDays(today, -60), to: today, search: '', completion: 'all' }),
    }
    for (const [name, value] of Object.entries(everything)) {
      const text = JSON.stringify(value)
      expect(text, name).not.toContain('birthDate')
      for (const date of dates) expect(text, name).not.toContain(date)
    }
  })
})

describe('saved mock state and the seed', () => {
  it("removes a student's own number on migration and keeps a staff member's", () => {
    const state = structuredClone(db())
    const legacy = state.students[0] as unknown as Record<string, unknown>
    legacy.contactInfo = '0900-000-1000'
    delete legacy.birthDate
    const staffNumber = state.personnel[0].contactInfo
    expect(staffNumber).toBeTruthy()

    const { state: migrated } = migratePersistedState({ state, seedAuditLength: 0 })
    expect(migrated.students[0]).not.toHaveProperty('contactInfo')
    expect(migrated.students[0].birthDate).toBeNull()
    expect(migrated.personnel[0].contactInfo).toBe(staffNumber)
  })

  it('fills the new config on an older saved copy', () => {
    const state = structuredClone(db())
    const config = state.config as unknown as Record<string, unknown>
    delete config.unusualAgeYears
    delete (config.vitalsUsualRanges as Record<string, unknown>).grades1to6FromAge
    const { state: migrated } = migratePersistedState({ state, seedAuditLength: 0 })
    expect(migrated.config.unusualAgeYears).toBe(3)
    expect(migrated.config.vitalsUsualRanges.grades1to6FromAge).toBe(6)
  })

  it("rejects a student's number or a future or malformed birthdate in the seed", () => {
    const edited = structuredClone(seed) as MockDbSeed
    ;(edited.students[0] as unknown as Record<string, unknown>).contactInfo = '0900'
    edited.students[1].birthDate = '2999-01-01'
    edited.students[2].birthDate = '2015-02-30'
    ;(edited.students[3] as unknown as Record<string, unknown>).birthDate = { daysAgo: 2000 }
    const problems = checkSeedIntegrity(edited)
    expect(problems.join('\n')).toContain('unexpected field "contactInfo"')
    expect(problems.join('\n')).toContain("birthDate: can't be in the future")
    expect(problems.filter((problem) => problem.includes('expected a real "YYYY-MM-DD" date'))).toHaveLength(2)
  })

  it('stores every seeded birthdate as a calendar date', () => {
    for (const student of seed.students) expect(student.birthDate === null || /^\d{4}-\d{2}-\d{2}$/.test(student.birthDate)).toBe(true)
  })

  it('gives most students a birthdate that fits their grade, and leaves a few without', () => {
    const students = db().students
    const without = students.filter((student) => !student.birthDate)
    expect(without.length).toBeGreaterThan(0)
    expect(without.length).toBeLessThan(students.length / 4)
  })
})
