import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { VitalsWarning } from '../components'
import { addDays, todayISO } from '../lib/dates'
import {
  getDashboardSummary,
  getMonthlyReport,
  getVitalsWarningRanges,
  listFollowUps,
  listInventory,
  listStudents,
  listVisits,
  recordVisit,
  resetMockDb,
  saveInventoryItem,
} from '../lib/mock-db'
import { renderWithRouter } from '../test/renderWithRouter'
import { recordedWrites } from '../test/recordedWrites'
import { ageGroupOf } from '../lib/vitals'
import { followUpDueState, withAutoClosedFollowUps } from '../lib/mock-db/selectors'
import { NewVisitEntryPage } from './clinic-visits/NewVisitEntryPage'
import { IncidentEntryPage } from './emergency-response/IncidentEntryPage'
import { SportsReportPage } from './reports/SportsReportPage'
import { StaffFormPage } from './staff-records/StaffFormPage'
import { StudentFormPage } from './student-records/StudentFormPage'

const STAFF = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' as const }

/** Decisions sheet, Part 5: clinic settings and rules (ADR-051). */
describe('Clinic settings and rules', () => {
  beforeEach(() => resetMockDb())

  it('flags a frequent visitor at 3 visits in 14 days, not at 3 spread over 20', async () => {
    const today = todayISO()
    const visit = (studentId: string, daysAgo: number) =>
      recordVisit({ studentId, complaint: 'Fever', treatment: '', disposition: 'returned_to_class', followUp: null, ...(daysAgo && { dateTime: `${addDays(today, -daysAgo)}T07:00` }) })
    // Two students with no visits in the last 30 days, so only these count.
    const recent = new Set((await listVisits({ from: addDays(today, -30), to: today })).map((v) => v.studentId))
    const [near, spread] = (await listStudents()).map((student) => student.id).filter((id) => !recent.has(id))
    for (const daysAgo of [0, 6, 13]) await visit(near, daysAgo)
    for (const daysAgo of [0, 10, 19]) await visit(spread, daysAgo)
    // The Dashboard passes its own range; without one the window is config.frequentVisitorWindowDays (14).
    const summary = await getDashboardSummary({ range: { preset: 'custom', from: addDays(today, -13), to: today } })
    expect(summary.showFrequentVisitors).toBe(true)
    const flagged = summary.frequentVisitors.map((row) => row.student.id)
    expect(flagged).toContain(near)
    expect(flagged).not.toContain(spread)
  })

  it('counts stock exactly at the threshold as low', async () => {
    const [item] = await listInventory()
    const { name, category, unit, brand, currentStock, expirationDate } = item
    await saveInventoryItem({ name, category, unit, brand, currentStock, expirationDate, lowStockThreshold: item.currentStock }, { itemId: item.id })
    expect((await listInventory()).find((candidate) => candidate.id === item.id)!.flags).toContain('low_stock')
  })

  it('shows a follow-up as Due on its date, Overdue on day 4, and closed as Missed with the note on day 8', () => {
    const followUp = { id: 'f', studentId: 's', personnelId: null, relatedRecord: { type: 'visit' as const, id: 'v' }, followUpDate: '2026-10-12', reason: 'Recheck', status: 'pending' as const, notes: null, createdByUserId: 'u' }
    const on = (day: string) => {
      const [read] = withAutoClosedFollowUps([followUp], day, 7)
      return [read.status, followUpDueState(read, day, 3), read.statusReason ?? null]
    }
    expect(on('2026-10-11')).toEqual(['pending', 'upcoming', null])
    expect(on('2026-10-12')).toEqual(['pending', 'due_today', null])
    expect(on('2026-10-15')).toEqual(['pending', 'due', null])
    expect(on('2026-10-16')).toEqual(['pending', 'overdue', null])
    expect(on('2026-10-19')).toEqual(['pending', 'overdue', null])
    expect(on('2026-10-20')).toEqual(['missed', null, 'No response (closed automatically after 7 days)'])
  })

  it('uses one rule for the list and the Dashboard: Due, Overdue, then Missed after 7 days', async () => {
    const today = todayISO()
    for (const [passed, reason] of [[2, 'two'], [4, 'four'], [8, 'eight']] as const)
      await recordVisit({
        studentId: 'student-0001',
        complaint: 'Fever',
        treatment: '',
        disposition: 'returned_to_class',
        followUp: null,
      }).then(() =>
        recordVisit({ studentId: 'student-0001', complaint: 'Fever', treatment: '', disposition: 'returned_to_class', followUp: { followUpDate: addDays(today, -passed), reason, notes: null } }),
      )
    const rows = await listFollowUps()
    const byReason = (reason: string) => rows.find((row) => row.reason === reason)!
    expect(byReason('two')).toMatchObject({ status: 'pending', dueState: 'due' })
    expect(byReason('four')).toMatchObject({ status: 'pending', dueState: 'overdue' })
    expect(byReason('eight')).toMatchObject({ status: 'missed', dueState: null, statusReason: 'No response (closed automatically after 7 days)' })
    const dashboard = await getDashboardSummary({ range: { preset: 'today', from: today, to: today } })
    const due = dashboard.dueFollowUps.map((row) => row.followUp.reason)
    expect(due).toEqual(expect.arrayContaining(['two', 'four']))
    expect(due).not.toContain('eight')
  })

  it('notes a pulse of 130 for a Grade 3 student as outside the usual range, and still lets the visit save', async () => {
    const ranges = await getVitalsWarningRanges()
    expect(ageGroupOf({ kind: 'student', gradeLevel: 'Grade 3' }, '2026-10-30')).toBe('grades1to6')
    render(<VitalsWarning readings={{ pulseBpm: '130' }} ranges={ranges} ageGroup="grades1to6" />)
    expect(screen.getByRole('status')).toHaveTextContent('Outside the usual range for this age (starting range, nurse to confirm): pulse 130 bpm (usual 70 to 100).')
    expect(screen.getByRole('status')).toHaveTextContent('You can still save.')
  })

  it('keeps the stronger "looks unusual" note for a typing slip instead of the usual-range note', async () => {
    const ranges = await getVitalsWarningRanges()
    render(<VitalsWarning readings={{ pulseBpm: '300', temperatureC: '35.5' }} ranges={ranges} ageGroup="adult" />)
    const note = screen.getByRole('status')
    expect(note).toHaveTextContent('Pulse 300 bpm looks unusual.')
    expect(note).not.toHaveTextContent('pulse 300 bpm (usual')
    expect(note).toHaveTextContent('temperature 35.5 °C (usual from 36 °C)')
  })

  it('shows the which-form hint on both forms', async () => {
    const { unmount } = renderWithRouter(<NewVisitEntryPage />)
    expect(await screen.findByText('Visit: a common, routine case. A worse case that needs fast two-stage capture is an Incident.')).toBeInTheDocument()
    unmount()
    renderWithRouter(<IncidentEntryPage />)
    expect(await screen.findByText('Incident: a worse case that needs fast two-stage capture. A common, routine case is a Visit.')).toBeInTheDocument()
  })

  it('prints only the Sports Report entries left ticked, and says how many', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SportsReportPage reportId="sports-report-0001" viewer={STAFF} />)
    const ticks = await screen.findAllByRole('checkbox', { name: /^Include / })
    expect(ticks.length).toBeGreaterThan(1)
    ticks.forEach((tick) => expect(tick).toBeChecked())
    expect(screen.getByText(new RegExp(`${ticks.length} of ${ticks.length} entr`))).toBeInTheDocument()
    await user.click(ticks[0])
    expect(screen.getByText(new RegExp(`${ticks.length - 1} of ${ticks.length} entr`))).toBeInTheDocument()

    const window_ = window as unknown as { print: () => void }
    let printedEntries = -1
    window_.print = () => {
      window.dispatchEvent(new Event('beforeprint'))
      const doc = document.body.querySelector('[data-print-document]') as HTMLElement
      printedEntries = within(doc).queryAllByRole('listitem').length
    }
    await user.click(screen.getByRole('button', { name: 'Print / Save as PDF' }))
    expect(printedEntries).toBe(ticks.length - 1)
  })

  it('counts the Monthly Report visits by sex, adding up to the student total, with staff apart', async () => {
    const month = todayISO().slice(0, 7)
    await recordVisit({ personnelId: 'personnel-0001', complaint: 'Fever', treatment: '', disposition: 'returned_to_class', followUp: null })
    const report = await getMonthlyReport(month)
    const studentVisits = report.complaintCounts.reduce((sum, row) => sum + row.count, 0) - report.visitsBySex.staff
    expect(report.visitsBySex.female + report.visitsBySex.male).toBe(studentVisits)
    expect(report.visitsBySex.staff).toBeGreaterThanOrEqual(1)
  })

  /** Every empty field that carries the required mark must stop the save (ADR-051 item 10). */
  it.each<[string, () => ReactElement, RegExp]>([
    ['New Visit', () => <NewVisitEntryPage />, /^Save Visit$/],
    ['Add Student', () => <StudentFormPage />, /^Save Student$/],
    ['Add Staff', () => <StaffFormPage />, /^Save/],
    ['Incident Stage 1', () => <IncidentEntryPage />, /^Save Stage 1/],
  ])('%s: a marked field never saves empty, and nothing is written', async (_name, ui, save) => {
    const user = userEvent.setup()
    renderWithRouter(ui())
    const button = await screen.findByRole('button', { name: save })
    await user.click(button)
    const marked = [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[required], textarea[required]')]
    const empty = marked.filter((field) => field.value === '' && field.offsetParent !== undefined)
    for (const field of empty) expect(field, field.getAttribute('aria-label') ?? field.id).toHaveAttribute('aria-invalid', 'true')
    expect(recordedWrites()).toEqual([])
  })

  it('shows no required mark on a staff emergency contact, which can be saved empty', async () => {
    renderWithRouter(<StaffFormPage />)
    await screen.findByRole('heading', { name: /Add Staff/ })
    const contact = screen.getByRole('group', { name: /emergency contact/i })
    expect(within(contact).queryByText('*')).not.toBeInTheDocument()
    expect(contact.querySelectorAll('[required]')).toHaveLength(0)
  })
})
