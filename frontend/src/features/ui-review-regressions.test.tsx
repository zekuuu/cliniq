import { act, renderHook, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// jsdom has no Web Worker, which the real scanner needs. A camera that fails to start is exactly the
// case under test here ("Camera scan is unavailable").
vi.mock('qr-scanner', () => ({
  default: class {
    start() {
      return Promise.reject(new Error('Camera unavailable in tests'))
    }
    stop() {}
    destroy() {}
  },
}))

// jsdom has no canvas. Replace the chart with a stub that keeps its accessible label.
vi.mock('react-chartjs-2', () => {
  const Stub = (props: { 'aria-label'?: string }) => <div role="img" aria-label={props['aria-label']} />
  return { Bar: Stub, Line: Stub }
})
import { renderWithRouter } from '../test/renderWithRouter'
import { db } from '../lib/mock-db/store'
import { getGradeLevels, getRecordedAuditEntries, getStudent, listIncidents, listVisits, resetMockDb } from '../lib/mock-db'
import { StudentProfilePage } from './student-records/StudentProfilePage'
import { IncidentReportPage } from './emergency-response/IncidentReportPage'
import { UserFormPage } from './user-management/UserFormPage'
import { VisitLogListPage } from './clinic-visits/VisitLogListPage'
import { NewVisitEntryPage } from './clinic-visits/NewVisitEntryPage'
import { AuditLogPage } from './audit-log/AuditLogPage'
import { BackupStatusPage } from './backup/BackupStatusPage'
import { DashboardPage } from './dashboard/DashboardPage'
import { useAsyncData } from '../hooks/useAsyncData'
import { QrMobileHubPage } from './qr-digital-health-id/mobile/QrMobileHubPage'
import { QrDesktopHubPage } from './qr-digital-health-id/desktop/QrDesktopHubPage'
import { Button, Modal } from '../components'
import { AppShell } from '../layouts/AppShell'

/**
 * Regressions from the interaction-based UI/UX review (Wednesday, September 30, 2026). Each case
 * reproduces a problem found by clicking through the running app.
 */
describe('UI/UX review regressions', () => {
  beforeEach(() => resetMockDb())

  it('archives a student only after a confirmation step, then shows the archived badge', async () => {
    const user = userEvent.setup()
    renderWithRouter(<StudentProfilePage studentNumber="2026-00001" />)

    await user.click(await screen.findByRole('button', { name: 'Archive' }))
    const dialog = screen.getByRole('dialog', { name: 'Archive this student record?' })
    expect(getRecordedAuditEntries()).toEqual([])

    await user.click(within(dialog).getByRole('button', { name: 'Archive Record' }))
    expect(await screen.findByText('Archived')).toBeInTheDocument()
    expect((await getStudent('2026-00001')).archived).toBe(true)
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toEqual(['archive'])
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument()
  })

  it('labels incident vitals in plain language and confirms report approval', async () => {
    const user = userEvent.setup()
    const [incident] = await listIncidents()
    renderWithRouter(<IncidentReportPage incidentId={incident.id} />)

    await screen.findByRole('heading', { name: 'Incident Report' })
    expect(screen.getByText('Temperature')).toBeInTheDocument()
    expect(screen.queryByText('temperatureC')).not.toBeInTheDocument()

    // The summary carries the referral and parent-notification detail, not just a count.
    expect(screen.getByRole('heading', { name: 'Hospital referral' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Parent notification attempts' })).toBeInTheDocument()
    const picker = screen.getByLabelText('Report pending sign-off')
    await user.click(picker)
    const pendingBefore = screen.getAllByRole('option').length
    await user.keyboard('{Escape}')

    await user.click(screen.getByRole('button', { name: 'Approve Report' }))
    const dialog = screen.getByRole('dialog', { name: 'Approve this incident report?' })
    expect(getRecordedAuditEntries()).toEqual([])
    await user.click(within(dialog).getByRole('button', { name: 'Approve Report' }))
    expect(await screen.findByText('Report approved and logged.')).toBeInTheDocument()
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toEqual(['approve'])

    // Signed off: it can't be approved again, and only it is marked approved in the picker.
    expect(screen.getByRole('button', { name: 'Approved' })).toBeDisabled()
    await user.click(screen.getByLabelText('Report pending sign-off'))
    await waitFor(() => expect(screen.getAllByRole('option', { name: /\(approved\)/ })).toHaveLength(1))
    expect(screen.getAllByRole('option')).toHaveLength(pendingBefore)
  })

  it('explains empty required fields on the user form instead of ignoring the submit', async () => {
    const user = userEvent.setup()
    renderWithRouter(<UserFormPage />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Add User' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create User' }))
    expect(screen.getByText("Enter the person's full name.")).toBeInTheDocument()
    expect(screen.getByText('Enter a username for this account.')).toBeInTheDocument()
    expect(getRecordedAuditEntries()).toEqual([])
  })

  it('paginates the visit log and reaches every visit, not only the first 120', async () => {
    const user = userEvent.setup()
    const total = (await listVisits()).length
    renderWithRouter(<VisitLogListPage />)

    expect(await screen.findByText(`${total} records shown`)).toBeInTheDocument()
    expect(screen.getByText(`Showing 1–10 of ${total} visits`)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText(`Showing 11–20 of ${total} visits`)).toBeInTheDocument()
    await user.type(screen.getByLabelText('Search'), '2026')
    expect(await screen.findByText(/^Showing 1–/)).toBeInTheDocument()
  })
})

describe('grade-level order', () => {
  it('lists Kinder before Grade 1', async () => {
    const levels = await getGradeLevels()
    expect(levels[0]).toBe('Kinder')
    expect(levels.indexOf('Grade 2')).toBeLessThan(levels.indexOf('Grade 10'))
  })
})

/** Group A fixes from the follow-up session (Wednesday, September 30, 2026). */
describe('UI/UX review follow-up fixes', () => {
  beforeEach(() => resetMockDb())

  function ModalHarness() {
    const [open, setOpen] = useState(false)
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open dialog</Button>
        <Modal open={open} title="Confirm" onClose={() => setOpen(false)}>
          <Button data-autofocus onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary">Confirm</Button>
        </Modal>
      </>
    )
  }

  it('moves focus into the dialog, keeps Tab inside it, and returns focus on close', async () => {
    const user = userEvent.setup()
    renderWithRouter(<ModalHarness />)
    const opener = screen.getByRole('button', { name: 'Open dialog' })

    await user.click(opener)
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('rejects a username another account already uses, case-insensitively', async () => {
    const user = userEvent.setup()
    renderWithRouter(<UserFormPage />)

    await screen.findByRole('heading', { level: 1, name: 'Add User' })
    await user.type(screen.getByLabelText(/full name/i), 'Test Person')
    await user.type(screen.getByLabelText(/username/i), 'Demo.Nurse')
    await user.click(screen.getByRole('button', { name: 'Create User' }))

    expect(await screen.findByText('Another account already uses this username. Choose a different one.')).toBeInTheDocument()
    expect(screen.queryByText('User saved and audit event recorded.')).not.toBeInTheDocument()
    expect(getRecordedAuditEntries()).toEqual([])
  })

  it('keeps loaded data on screen while reload() re-fetches (no skeleton flash after a save)', async () => {
    let resolveSecond: (value: string) => void = () => {}
    const loader = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('first')
      .mockImplementationOnce(() => new Promise((resolve) => (resolveSecond = resolve)))
    const { result } = renderHook(() => useAsyncData('notification-log', loader))
    await waitFor(() => expect(result.current.data).toBe('first'))

    act(() => result.current.reload())
    expect(result.current.data).toBe('first')
    expect(result.current.isRefetching).toBe(true)

    await act(async () => resolveSecond('second'))
    expect(result.current.data).toBe('second')
    expect(result.current.isRefetching).toBe(false)
  })

  it('clears a previous "Student not found" message when a camera scan starts', async () => {
    const user = userEvent.setup()
    renderWithRouter(<QrMobileHubPage />)

    // The student leaves the records between the search and the pick, so the lookup can't find them.
    await user.type(screen.getByRole('combobox', { name: /student number or student name/i }), '202600001')
    await screen.findByRole('option', { name: /2026-00001/ })
    db().students = db().students.filter((student) => student.studentNumber !== '2026-00001')
    await user.keyboard('{Enter}')
    expect(await screen.findByText('Student not found.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Scan QR Code' }))
    expect(screen.queryByText('Student not found.')).not.toBeInTheDocument()
  })

  it('shows a ready state, not a loading skeleton, before a desktop QR lookup begins', () => {
    renderWithRouter(<QrDesktopHubPage viewer={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }} />)

    expect(screen.getByText('Ready to identify a student')).toBeInTheDocument()
    expect(screen.queryByText('Loading student...')).not.toBeInTheDocument()
  })

  it('does not expose sidebar nav groups as landmark regions', () => {
    renderWithRouter(
      <AppShell user={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }} active="dashboard" onLogout={() => {}}>
        <div>Screen</div>
      </AppShell>,
    )
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).queryAllByRole('region')).toHaveLength(0)
    expect(within(nav).getByRole('group', { name: 'Overview' })).toBeInTheDocument()
  })
})

/** Group B decisions from the UI/UX review, applied Wednesday, September 30, 2026. */
describe('UI/UX review Group B decisions', () => {
  beforeEach(() => resetMockDb())

  it('gives Staff a New Visit shortcut and backup indicator on the Dashboard, and Admin neither', async () => {
    const staff = renderWithRouter(<DashboardPage viewer={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }} />)
    const strip = await screen.findByRole('region', { name: 'Staff shortcuts' })
    expect(within(strip).getByRole('link', { name: 'New Visit' })).toHaveAttribute('href', '/visits/new')
    expect(await within(strip).findByText(/^Last backup \w{3} \d{1,2}, \d{4} · \d{1,2}:\d{2} [AP]M$/)).toBeInTheDocument()
    expect(within(strip).getByRole('link', { name: /backup status/i })).toHaveAttribute('href', '/backup')
    staff.unmount()

    renderWithRouter(<DashboardPage viewer={{ id: 'user-admin-01', name: 'Gilan Avelida', role: 'admin' }} />)
    await screen.findByRole('heading', { name: 'Clinic Overview' })
    expect(screen.queryByRole('region', { name: 'Staff shortcuts' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'New Visit' })).not.toBeInTheDocument()
  })

  it('asks for the Student Number on New Visit instead of using a default student', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage />)

    await screen.findByRole('heading', { name: 'New Visit' })
    expect(screen.getByText(/student not identified yet/i)).toBeInTheDocument()
    await user.type(screen.getByRole('combobox', { name: /complaint/i }), 'Headache{Escape}')
    await user.type(screen.getByLabelText(/treatment/i), 'Rested in clinic.')
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))
    expect(screen.getByText(/choose the student/i)).toBeInTheDocument()
    expect(getRecordedAuditEntries()).toEqual([])

    await user.type(screen.getByRole('combobox', { name: /student/i }), '2026-00001')
    await screen.findByRole('option', { name: /2026-00001/ })
    await user.keyboard('{Enter}')
    await screen.findByRole('button', { name: /change student/i })
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))
    expect(await screen.findByText(/visit saved/i)).toBeInTheDocument()
    const student = await getStudent('2026-00001')
    const visits = await listVisits()
    expect(visits.some((visit) => visit.studentId === student.id && visit.treatment === 'Rested in clinic.')).toBe(true)
    // Ready for the next student: the field is back and empty.
    expect(screen.getByRole('combobox', { name: /student/i })).toHaveValue('')
  })

  it('confirms before recording a backup verification', async () => {
    const user = userEvent.setup()
    renderWithRouter(<BackupStatusPage />)

    await user.click(await screen.findByRole('button', { name: 'Mark as Verified' }))
    const dialog = screen.getByRole('dialog', { name: 'Mark this backup as verified?' })
    expect(getRecordedAuditEntries()).toEqual([])
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(getRecordedAuditEntries()).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Mark as Verified' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Mark as Verified' }))
    expect(await screen.findByText('Verification recorded in the audit trail.')).toBeInTheDocument()
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toEqual(['update'])
  })

  it('never shows an internal record id in the Audit Log', async () => {
    renderWithRouter(<AuditLogPage viewer={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }} />)

    const table = await screen.findByRole('table', { name: 'Filtered audit log' })
    expect(table.textContent).not.toMatch(/\b(visit|incident|item|student|user|followup)-(staff-|admin-|instructor-)?\d{2,4}\b/)
    expect(table.textContent).toMatch(/(Visit|Incident)\d{4}-\d{5}/)
  })
})
