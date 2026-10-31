import { act, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  getIncident,
  getRecordedAuditEntries,
  getStudent,
  getVisit,
  recordVisit,
  resetMockDb,
  saveIncidentStageOne,
  saveStudent,
  type SessionUser,
} from '../../lib/mock-db'
import { checkSeedIntegrity } from '../../lib/mock-db/integrity'
import { seed } from '../../lib/mock-db/seed'
import { renderWithRouter } from '../../test/renderWithRouter'
import { VisitLogListPage } from '../clinic-visits/VisitLogListPage'
import { StudentListPage } from './StudentListPage'
import { StudentProfilePage } from './StudentProfilePage'
import { submitStudentForm, type StudentFormValues } from './api/studentFormApi'

const STAFF: SessionUser = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }
const STUDENT = 'student-0001'
const SECTION = 'Sampaguita'

/** The student's own values as a saveStudent input, with changes on top. */
async function input(changes: Record<string, unknown>) {
  const { lrn, fullName, gradeLevel, section, sex, birthDate, allergies, medicalConditions, emergencyContacts } = await getStudent(STUDENT)
  return { lrn, fullName, gradeLevel, section, sex, birthDate, allergies, medicalConditions, emergencyContacts, ...changes }
}
const setSection = async (section: string) => saveStudent(await input({ section }), { studentId: STUDENT, actor: STAFF })

const newStudent = (lrn: string, fullName: string, section: string): StudentFormValues => ({
  lrn,
  fullName,
  gradeLevel: 'Grade 7',
  section,
  sex: 'female',
  birthDate: '',
  emergencyContacts: [{ name: 'A Parent', relationship: 'Mother', phone: '0900-000-0000', verified: false }],
  allergies: '',
  medicalConditions: '',
})

const visitInput = (studentId: string) => ({ studentId, complaint: 'Headache', treatment: '', disposition: 'returned_to_class' as const, followUp: null })

function printout(): HTMLElement {
  act(() => {
    window.dispatchEvent(new Event('beforeprint'))
  })
  return document.body.querySelector<HTMLElement>('[data-print-document]')!
}

afterEach(() => {
  act(() => {
    window.dispatchEvent(new Event('afterprint'))
  })
})
beforeEach(() => resetMockDb())

describe('Optional student section (ADR-047)', () => {
  it('saves a student with a section, and stores nothing for a blank one', async () => {
    const withSection = await submitStudentForm(newStudent('000000209901', 'Ana Sample', ` ${SECTION} `), { mode: 'add', actor: STAFF })
    const blank = await submitStudentForm(newStudent('000000209902', 'Bea Sample', '   '), { mode: 'add', actor: STAFF })
    expect(withSection.status === 'saved' && withSection.student.section).toBe(SECTION)
    expect(blank.status === 'saved' && 'section' in blank.student).toBe(false)
  })

  it('shows the section on the profile and its printout only when present', async () => {
    const first = renderWithRouter(<StudentProfilePage viewer={STAFF} studentId={STUDENT} />)
    await screen.findByRole('heading', { name: 'Overview' })
    expect(screen.queryByText('Section')).not.toBeInTheDocument()
    expect(printout()).not.toHaveTextContent('Section')
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
    first.unmount()

    await setSection(SECTION)
    renderWithRouter(<StudentProfilePage viewer={STAFF} studentId={STUDENT} />)
    await screen.findByRole('heading', { name: 'Overview' })
    expect(screen.getByText('Section')).toBeInTheDocument()
    expect(screen.getAllByText(SECTION).length).toBeGreaterThan(0)
    expect(printout()).toHaveTextContent(SECTION)
  })

  it('never shows the section on the Student List or the Visit Log', async () => {
    await setSection(SECTION)
    await recordVisit(visitInput(STUDENT), STAFF)
    const list = renderWithRouter(<StudentListPage viewer={STAFF} />)
    await screen.findByRole('heading', { name: 'Student List' })
    await screen.findAllByRole('row')
    expect(list.container).not.toHaveTextContent(SECTION)
    list.unmount()
    const log = renderWithRouter(<VisitLogListPage />)
    await screen.findAllByRole('row')
    expect(log.container).not.toHaveTextContent(SECTION)
  })

  it('keeps the section at the time on a visit and an incident, after the student changes section', async () => {
    await setSection(SECTION)
    const { visit } = await recordVisit(visitInput(STUDENT), STAFF)
    const incident = await saveIncidentStageOne({ studentId: STUDENT, complaint: 'Fainting', vitals: {} }, STAFF)
    await setSection('Rosal')
    expect((await getVisit(visit.id)).sectionAtTime).toBe(SECTION)
    expect((await getIncident(incident.id)).sectionAtTime).toBe(SECTION)
    const { visit: later } = await recordVisit(visitInput(STUDENT), STAFF)
    expect(later.sectionAtTime).toBe('Rosal')
  })

  it('gives no section at the time to a student without one or to a staff patient', async () => {
    const { visit } = await recordVisit(visitInput(STUDENT), STAFF)
    expect('sectionAtTime' in visit).toBe(false)
    const { visit: staffVisit } = await recordVisit({ ...visitInput(''), studentId: undefined, personnelId: 'personnel-0002' }, STAFF)
    expect('sectionAtTime' in staffVisit).toBe(false)
    const staffIncident = await saveIncidentStageOne({ personnelId: 'personnel-0002', complaint: 'Fainting', vitals: {} }, STAFF)
    expect('sectionAtTime' in staffIncident).toBe(false)
  })

  it('shows the grade and section at the time in the profile history rows', async () => {
    await setSection(SECTION)
    const { gradeLevel } = await getStudent(STUDENT)
    await recordVisit(visitInput(STUDENT), STAFF)
    await saveIncidentStageOne({ studentId: STUDENT, complaint: 'Fainting', vitals: {} }, STAFF)
    await setSection('Rosal')
    renderWithRouter(<StudentProfilePage viewer={STAFF} studentId={STUDENT} />)
    await screen.findByRole('heading', { name: 'Visit History' })
    const rows = screen.getAllByText(new RegExp(`${gradeLevel} · ${SECTION}$`))
    expect(rows.length).toBeGreaterThanOrEqual(2)
  })

  it('audits a section change by field name only, and not an unrelated edit', async () => {
    await saveStudent(await input({ allergies: ['Dust'] }), { studentId: STUDENT, actor: STAFF })
    expect(getRecordedAuditEntries().at(-1)?.summary).toBe('Updated allergies')
    await setSection(SECTION)
    const summary = getRecordedAuditEntries().at(-1)?.summary
    expect(summary).toMatch(/section/i)
    expect(JSON.stringify(getRecordedAuditEntries())).not.toContain(SECTION)
  })

  it('is accepted by the seed integrity check on students, visits and incidents', () => {
    const copy = structuredClone(seed)
    copy.students[0].section = SECTION
    Object.assign(copy.visits[0], { sectionAtTime: SECTION })
    Object.assign(copy.incidents[0], { sectionAtTime: SECTION })
    expect(checkSeedIntegrity(copy)).toEqual([])
  })
})
