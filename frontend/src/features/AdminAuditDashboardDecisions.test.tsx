import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { todayISO } from '../lib/dates'
import {
  approveIncidentReport,
  getRecordedAuditEntries,
  listClusterAlerts,
  recordVisit,
  resetMockDb,
  type SessionUser,
} from '../lib/mock-db'
import { AppShell } from '../layouts/AppShell'
import { renderWithRouter } from '../test/renderWithRouter'
import { IncidentReportPage } from './emergency-response/IncidentReportPage'
import { fetchStaffProfile } from './staff-records/api/staffApi'
import { fetchStudentProfile } from './student-records/api/studentProfileApi'
import { fetchIncidentRecord } from './emergency-response/api/incidentRecordApi'

const STAFF: SessionUser = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }
const ADMIN: SessionUser = { id: 'user-admin-01', name: 'Principal', role: 'admin' }

/** Decisions sheet, Part 3: Admin, audit and Dashboard (ADR-048, ADR-050). */
describe('Admin, audit and Dashboard', () => {
  beforeEach(() => resetMockDb())
  afterEach(() => vi.useRealTimers())

  it('gives the Admin no Acknowledge on an approved report: the Principal signs the printout (ADR-060)', async () => {
    await approveIncidentReport('incident-0001', STAFF)
    renderWithRouter(<IncidentReportPage viewer={ADMIN} incidentId="incident-0001" />)
    await screen.findByRole('heading', { name: 'Incident Report' })
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument()
  })

  function renderShell(user: SessionUser, onLogout: (minutes?: number) => void) {
    return render(
      <MemoryRouter>
        <AppShell user={user} active={null} onLogout={onLogout}>
          <p>Screen</p>
        </AppShell>
      </MemoryRouter>,
    )
  }

  it('signs the Admin out after the idle setting (30 minutes), with a notice two minutes before (ADR-078)', async () => {
    vi.useFakeTimers()
    const onLogout = vi.fn()
    renderShell(ADMIN, onLogout)
    // The idle limit loads first; the countdown starts once it has.
    await act(() => vi.advanceTimersByTimeAsync(100))
    await act(() => vi.advanceTimersByTimeAsync(28 * 60_000 - 5_000))
    expect(screen.queryByRole('dialog', { name: 'Still there?' })).not.toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(10_000))
    expect(screen.getByRole('dialog', { name: 'Still there?' })).toBeInTheDocument()
    expect(onLogout).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(2 * 60_000))
    expect(onLogout).toHaveBeenCalledWith(30)
    expect(getRecordedAuditEntries().at(-1)).toMatchObject({ actionType: 'logout', summary: 'Signed out (idle)' })
  })

  it('keeps the Admin signed in while they are active, and times the clinician out only after their own 60 minutes (ADR-078)', async () => {
    vi.useFakeTimers()
    const adminLogout = vi.fn()
    const { unmount } = renderShell(ADMIN, adminLogout)
    await act(() => vi.advanceTimersByTimeAsync(100))
    for (let i = 0; i < 4; i++) {
      await act(() => vi.advanceTimersByTimeAsync(20 * 60_000))
      act(() => {
        window.dispatchEvent(new Event('keydown'))
      })
    }
    expect(adminLogout).not.toHaveBeenCalled()
    unmount()

    const staffLogout = vi.fn()
    renderShell(STAFF, staffLogout)
    await act(() => vi.advanceTimersByTimeAsync(100))
    await act(() => vi.advanceTimersByTimeAsync(59 * 60_000))
    expect(staffLogout).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(60_000))
    expect(staffLogout).toHaveBeenCalledWith(60)
  })

  it("logs the clinician opening a student or staff profile or an incident report, once per record per session", async () => {
    await fetchStudentProfile('student-0001', STAFF)
    await fetchStudentProfile('student-0001', STAFF)
    await fetchStaffProfile('personnel-0001', STAFF)
    await fetchIncidentRecord('incident-0001', STAFF)
    const views = getRecordedAuditEntries().filter((entry) => entry.actionType === 'view')
    expect(views.map((entry) => [entry.userId, entry.targetRecord?.type, entry.summary])).toEqual([
      [STAFF.id, 'student', 'Opened student profile'],
      [STAFF.id, 'staff', 'Opened staff profile'],
      [STAFF.id, 'incident', 'Opened incident report'],
    ])
  })

  async function chillsVisits(patients: Array<{ studentId?: string; personnelId?: string }>) {
    for (const patient of patients)
      await recordVisit({ ...patient, complaint: 'Chills', treatment: '', disposition: 'returned_to_class', followUp: null })
  }

  it('flags 3 students with the same complaint and grade within 3 days, not 2, and ignores staff', async () => {
    await chillsVisits([{ studentId: 'student-0001' }, { studentId: 'student-0014' }, { personnelId: 'personnel-0001' }, { studentId: 'student-0001' }])
    expect((await listClusterAlerts(STAFF)).filter((alert) => alert.complaint === 'Chills')).toEqual([])
    await chillsVisits([{ studentId: 'student-0027' }])
    expect((await listClusterAlerts(STAFF)).filter((alert) => alert.complaint === 'Chills')).toEqual([
      { complaint: 'Chills', gradeLevel: 'Kinder', students: 3, from: expect.any(String), to: todayISO() },
    ])
    expect(await listClusterAlerts(ADMIN)).toEqual([])
  })
})
