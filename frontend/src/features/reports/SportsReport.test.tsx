import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  archiveStudent,
  createSportsReport,
  duplicateSportsReport,
  getRecordedAuditEntries,
  getSportsReport,
  getSportsReportContent,
  getStudent,
  listIncidents,
  listSportsReports,
  listStudents,
  listVisits,
  resetMockDb,
  saveIncidentStageOne,
  setMockToday,
  setSportsReportArchived,
  SportsReportPermissionError,
  sportsReportWindowStart,
  updateSportsReport,
  type SessionUser,
  type SportsReportInput,
} from '../../lib/mock-db'
import { addDays } from '../../lib/dates'
import { AppRoutes } from '../../routes/AppRoutes'
import { SportsReportFormPage } from './SportsReportFormPage'
import { SportsReportPage } from './SportsReportPage'

vi.mock('react-chartjs-2', () => {
  const Stub = (props: { 'aria-label'?: string }) => <div role="img" aria-label={props['aria-label']} />
  return { Bar: Stub, Line: Stub, Doughnut: Stub }
})

const STAFF: SessionUser = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }
const ADMIN: SessionUser = { id: 'user-admin-01', name: 'Gilan Avelida', role: 'admin' }
const TODAY = '2026-10-07'

function input(studentIds: string[], overrides: Partial<SportsReportInput> = {}): SportsReportInput {
  return {
    title: 'Palaro tryouts',
    activity: 'Palaro 2026, Boys Basketball',
    requestedBy: 'Coach Ramon Cruz',
    window: 90,
    includeConditions: false,
    students: studentIds.map((studentId) => ({ studentId, note: '' })),
    ...overrides,
  }
}

/** A student with a visit 31 to 90 days ago and none in the last 30, so the window decides whether it prints. */
async function studentWithOlderVisitOnly() {
  const visits = await listVisits()
  const incidents = await listIncidents()
  const recent = addDays(TODAY, -29)
  const older = addDays(TODAY, -89)
  const recentIds = new Set([...visits.filter((v) => v.dateTime.slice(0, 10) >= recent), ...incidents.filter((i) => i.time.slice(0, 10) >= recent)].map((r) => r.studentId))
  const visit = visits.find((v) => v.dateTime.slice(0, 10) >= older && v.dateTime.slice(0, 10) < recent && !recentIds.has(v.studentId))
  if (!visit) throw new Error('seed has no student with only an older visit')
  return { studentId: visit.studentId!, visit }
}

/** An active student with no visit or incident in the last school year. */
async function studentWithNoEntries() {
  const visits = await listVisits()
  const incidents = await listIncidents()
  const seen = new Set([...visits.map((v) => v.studentId), ...incidents.map((i) => i.studentId)])
  const student = (await listStudents()).find((s) => !seen.has(s.id))
  if (!student) throw new Error('seed has no student without history')
  return student
}

function printNow(): HTMLElement {
  act(() => {
    window.dispatchEvent(new Event('beforeprint'))
  })
  const doc = document.body.querySelector<HTMLElement>('[data-print-document]')
  if (!doc) throw new Error('No print document mounted')
  return doc
}

function CurrentPath() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

beforeEach(() => {
  setMockToday(TODAY)
  resetMockDb()
})

afterEach(() => {
  act(() => {
    window.dispatchEvent(new Event('afterprint'))
  })
  vi.restoreAllMocks()
})

describe('Sports Report data rules (ADR-034)', () => {
  it('refuses the Admin/Principal in the data layer, and writes nothing', async () => {
    const report = await createSportsReport(input([]), STAFF)
    const before = getRecordedAuditEntries().length
    await expect(listSportsReports(ADMIN)).rejects.toBeInstanceOf(SportsReportPermissionError)
    await expect(getSportsReport(report.id, ADMIN)).rejects.toBeInstanceOf(SportsReportPermissionError)
    await expect(getSportsReportContent(report.id, ADMIN)).rejects.toBeInstanceOf(SportsReportPermissionError)
    await expect(createSportsReport(input([]), ADMIN)).rejects.toBeInstanceOf(SportsReportPermissionError)
    await expect(updateSportsReport(report.id, input([]), ADMIN)).rejects.toBeInstanceOf(SportsReportPermissionError)
    await expect(duplicateSportsReport(report.id, ADMIN)).rejects.toBeInstanceOf(SportsReportPermissionError)
    await expect(setSportsReportArchived(report.id, true, ADMIN)).rejects.toBeInstanceOf(SportsReportPermissionError)
    expect(getRecordedAuditEntries()).toHaveLength(before)
  })

  it('saves only the list and the notes, never medical content', async () => {
    const { studentId, visit } = await studentWithOlderVisitOnly()
    const report = await createSportsReport(
      { ...input([studentId, studentId], { includeConditions: true }), students: [{ studentId, note: '  Cleared by her doctor last week. ' }, { studentId, note: '' }] },
      STAFF,
    )
    expect(Object.keys(report).sort()).toEqual(['activity', 'archived', 'createdAt', 'createdByUserId', 'id', 'includeConditions', 'requestedBy', 'students', 'title', 'updatedAt', 'window'])
    // Duplicates collapse to one entry, holding the id and the note only.
    expect(report.students).toEqual([{ studentId, note: 'Cleared by her doctor last week.' }])
    const student = await getStudent(studentId)
    const saved = JSON.stringify(report)
    for (const value of [visit.complaint, visit.treatment, student.lrn, student.fullName, ...student.medicalConditions, ...student.allergies]) {
      expect(saved).not.toContain(value)
    }
  })

  it('computes the content when asked, so a new incident shows on the next print', async () => {
    const student = await studentWithNoEntries()
    const report = await createSportsReport(input([student.id]), STAFF)
    expect((await getSportsReportContent(report.id, STAFF)).rows[0].entries).toEqual([])
    const complaint = (await listIncidents())[0].complaint
    await saveIncidentStageOne({ studentId: student.id, complaint, vitals: {} }, STAFF)
    const [row] = (await getSportsReportContent(report.id, STAFF)).rows
    expect(row.entries).toHaveLength(1)
    expect(row.entries[0]).toMatchObject({ kind: 'Incident', what: complaint, outcome: 'No hospital referral recorded' })
  })

  it('prints what falls in the look-back window, newest first', async () => {
    const { studentId, visit } = await studentWithOlderVisitOnly()
    const report = await createSportsReport(input([studentId]), STAFF)
    let content = await getSportsReportContent(report.id, STAFF)
    expect(content.from).toBe(addDays(TODAY, -89))
    expect(content.to).toBe(TODAY)
    expect(content.rows[0].entries.map((entry) => entry.id)).toContain(visit.id)
    const dates = content.rows[0].entries.map((entry) => entry.dateTime)
    expect(dates).toEqual([...dates].sort().reverse())

    await updateSportsReport(report.id, input([studentId], { window: 30 }), STAFF)
    content = await getSportsReportContent(report.id, STAFF)
    expect(content.from).toBe(addDays(TODAY, -29))
    expect(content.rows[0].entries).toEqual([])
  })

  it('starts the school-year window on June 15', () => {
    expect(sportsReportWindowStart('school_year', '2026-10-07')).toBe('2026-06-15')
    expect(sportsReportWindowStart('school_year', '2027-03-01')).toBe('2026-06-15')
    expect(sportsReportWindowStart('school_year', '2027-06-15')).toBe('2027-06-15')
  })

  it('adds conditions and allergies only when ticked', async () => {
    const { studentId } = await studentWithOlderVisitOnly()
    const report = await createSportsReport(input([studentId]), STAFF)
    expect((await getSportsReportContent(report.id, STAFF)).rows[0].conditions).toBeUndefined()
    await updateSportsReport(report.id, input([studentId], { includeConditions: true }), STAFF)
    const student = await getStudent(studentId)
    expect((await getSportsReportContent(report.id, STAFF)).rows[0].conditions).toEqual({ medicalConditions: student.medicalConditions, allergies: student.allergies })
  })

  it('leaves an archived student out and counts it', async () => {
    const [first, second] = await listStudents({ limit: 2 })
    const report = await createSportsReport(input([first.id, second.id]), STAFF)
    await archiveStudent(second.id, STAFF)
    const content = await getSportsReportContent(report.id, STAFF)
    expect(content.rows.map((row) => row.studentId)).toEqual([first.id])
    expect(content.leftOut).toEqual({ archived: 1, missing: 0 })
    expect((await getSportsReport(report.id, STAFF)).students.map((s) => s.status)).toEqual(['active', 'archived'])
  })

  it('audits create, edit, duplicate and archive without naming a student', async () => {
    const [student] = await listStudents({ limit: 1 })
    const report = await createSportsReport(input([student.id]), STAFF)
    await updateSportsReport(report.id, input([student.id], { title: 'Palaro finals' }), STAFF)
    const copy = await duplicateSportsReport(report.id, STAFF)
    await setSportsReportArchived(report.id, true, STAFF)
    expect(copy).toMatchObject({ title: 'Copy of Palaro finals', archived: false, students: [{ studentId: student.id, note: null }] })
    expect((await listSportsReports(STAFF)).map((r) => [r.title, r.archived])).toEqual(
      expect.arrayContaining([['Palaro finals', true], ['Copy of Palaro finals', false]]),
    )
    const entries = getRecordedAuditEntries().filter((entry) => entry.targetRecord?.type === 'sports-report')
    expect(entries.map((entry) => [entry.actionType, entry.targetRecord?.id, entry.summary])).toEqual([
      ['create', report.id, undefined],
      ['update', report.id, 'Updated title'],
      ['create', copy.id, 'Duplicated from another Sports Report'],
      ['archive', report.id, undefined],
    ])
    expect(JSON.stringify(entries)).not.toContain(student.fullName)
    expect(JSON.stringify(entries)).not.toContain(student.lrn)
  })
})

describe('Sports Report screens', () => {
  it('keeps every Sports Report route from the Admin/Principal, and the Reports entry is Staff only', async () => {
    const report = await createSportsReport(input([]), STAFF)
    for (const path of ['/reports/sports', '/reports/sports/new', `/reports/sports/${report.id}`, `/reports/sports/${report.id}/edit`]) {
      const view = render(
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes user={ADMIN} onLogout={() => {}} />
          <CurrentPath />
        </MemoryRouter>,
      )
      expect(screen.getByTestId('path')).toHaveTextContent(/^\/$/)
      view.unmount()
    }
    const admin = render(
      <MemoryRouter initialEntries={['/reports']}>
        <AppRoutes user={ADMIN} onLogout={() => {}} />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: 'Reports', level: 1 }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sports Reports' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Monthly Report', 'Incident register', 'Complaint summary', 'Inventory sheet'])
    admin.unmount()
    render(
      <MemoryRouter initialEntries={['/reports']}>
        <AppRoutes user={STAFF} onLogout={() => {}} />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('link', { name: 'Sports Reports' }, { timeout: 5000 })).toHaveAttribute('href', '/reports/sports')
  })

  it('prints the content read at print time, writes one audit entry, and shows none of the withheld fields', async () => {
    const { studentId, visit } = await studentWithOlderVisitOnly()
    const none = await studentWithNoEntries()
    const report = await createSportsReport(
      { ...input([studentId, none.id]), students: [{ studentId, note: 'Light drills only this week.' }, { studentId: none.id, note: '' }] },
      STAFF,
    )
    const student = await getStudent(studentId)
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    render(
      <MemoryRouter>
        <SportsReportPage reportId={report.id} viewer={STAFF} />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { name: 'Palaro tryouts' }, { timeout: 5000 })).toBeInTheDocument()
    const preview = screen.getByRole('table', { name: 'Sports Report preview' })
    expect(within(preview).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Student', 'Recent visits and incidents', "Clinician's note"])
    expect(within(preview).getByText('No visits or incidents recorded in this period')).toBeInTheDocument()

    const before = getRecordedAuditEntries().length
    await userEvent.click(screen.getByRole('button', { name: 'Print / Save as PDF' }))
    expect(print).toHaveBeenCalledTimes(1)
    const doc = printNow()
    const text = doc.textContent ?? ''
    expect(text).toContain('Sports Report')
    expect(text).toContain('Requested by: Coach Ramon Cruz')
    expect(text).toContain('Activity: Palaro 2026, Boys Basketball')
    expect(text).toMatch(/As of .+ \(Philippine time\)/)
    expect(text).toContain(`${student.fullName}${student.gradeLevel}`)
    expect(text).toContain(visit.complaint)
    expect(text).toContain('Light drills only this week.')
    expect(text).toContain('No visits or incidents recorded in this period')
    expect(text).toContain('Released by:')
    expect(text).toContain('Received by:')
    expect(text).toContain('PE/Sports Instructor')
    expect(text).not.toContain('Recorded conditions and allergies')
    expect(doc.querySelector('style')?.textContent).not.toContain('Confidential')
    const withheld = [student.lrn, none.lrn, student.lrn.slice(-4), visit.treatment, visit.remarks, visit.parentGuardian, visit.assistedBy, ...student.emergencyContacts.flatMap((c) => [c.name, c.phone]), ...visit.itemsGiven.map((line) => line.itemName)]
    for (const value of withheld.filter((v): v is string => Boolean(v && v.trim()))) expect(text).not.toContain(value)
    if (visit.temperatureC !== null) expect(text).not.toContain(`${visit.temperatureC}`)

    await waitFor(() =>
      expect(getRecordedAuditEntries().slice(before)).toEqual([
        expect.objectContaining({ actionType: 'print', targetRecord: { type: 'sports-report', id: report.id }, summary: 'Printed for 2 students' }),
      ]),
    )
  })

  it('shows the conditions column only when ticked', async () => {
    const { studentId } = await studentWithOlderVisitOnly()
    const report = await createSportsReport(input([studentId], { includeConditions: true }), STAFF)
    render(
      <MemoryRouter>
        <SportsReportPage reportId={report.id} viewer={STAFF} />
      </MemoryRouter>,
    )
    const preview = await screen.findByRole('table', { name: 'Sports Report preview' }, { timeout: 5000 })
    expect(within(preview).getByRole('columnheader', { name: 'Recorded conditions and allergies' })).toBeInTheDocument()
    expect(printNow().textContent).toContain('Recorded conditions and allergies')
  })

  it('will not print a report without students, and says why', async () => {
    const report = await createSportsReport(input([]), STAFF)
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    render(
      <MemoryRouter>
        <SportsReportPage reportId={report.id} viewer={STAFF} />
      </MemoryRouter>,
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Print / Save as PDF' }, { timeout: 5000 }))
    expect(screen.getByRole('alert')).toHaveTextContent('This report has no students to print.')
    expect(print).not.toHaveBeenCalled()
  })

  it('builds a report by keyboard: picks a student by LRN, labels the note with the name, and refuses a repeat', async () => {
    const user = userEvent.setup()
    const [student] = await listStudents({ limit: 1 })
    render(
      <MemoryRouter initialEntries={['/reports/sports/new']}>
        <Routes>
          <Route path="/reports/sports/new" element={<SportsReportFormPage viewer={STAFF} />} />
          <Route path="/reports/sports/:reportId" element={<CurrentPath />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('checkbox', { name: /Include recorded conditions and allergies/ }, { timeout: 5000 })).not.toBeChecked()
    await user.type(screen.getByRole('textbox', { name: /^Title/ }), 'Intramurals volleyball')
    await user.type(screen.getByRole('textbox', { name: /^Requested by/ }), 'Coach Liza Reyes')
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await user.click(screen.getByRole('combobox', { name: /Add a student/ }))
      await user.keyboard(student.lrn)
      await screen.findByRole('option', { name: new RegExp(`LRN ending in ${student.lrn.slice(-4)}`) })
      await user.keyboard('{Enter}')
    }
    expect(await screen.findByText(`${student.fullName} is already on this report.`)).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: `Note for ${student.fullName}` }), 'Watch the left knee.')
    await user.click(screen.getByRole('button', { name: 'Create Report' }))
    expect(await screen.findByTestId('path')).toHaveTextContent(/^\/reports\/sports\/sports-report-\d{4}$/)
    const [saved] = await listSportsReports(STAFF)
    expect(saved).toMatchObject({ title: 'Intramurals volleyball', requestedBy: 'Coach Liza Reyes', studentCount: 1 })
    expect((await getSportsReport(saved.id, STAFF)).students).toMatchObject([{ studentId: student.id, note: 'Watch the left knee.' }])
  })
})
