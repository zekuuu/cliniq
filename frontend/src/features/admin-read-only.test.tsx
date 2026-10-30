import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { getRecordedAuditEntries, startMockSession, type SessionUser } from '../lib/mock-db'
import { renderWithRouter } from '../test/renderWithRouter'
import { IncidentLogListPage } from './emergency-response/IncidentLogListPage'
import { IncidentReportPage } from './emergency-response/IncidentReportPage'
import { StudentListPage } from './student-records/StudentListPage'
import { StudentProfilePage } from './student-records/StudentProfilePage'

/** ADR-038: the Admin reads the Student List, Student Profile, Incident Log and Incident Report, and never prints. */
const ADMIN: SessionUser = { id: 'user-admin-01', name: 'Principal', role: 'admin' }
const STAFF: SessionUser = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }
const WRITE_CONTROLS = /^(Add Student|Edit|Archive|New Visit|New Incident|Complete Stage 2|Approve Report|Review letter|Log .*notification)/

function expectNoWriteControls() {
  expect(screen.queryByRole('link', { name: WRITE_CONTROLS })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: WRITE_CONTROLS })).not.toBeInTheDocument()
}

function viewEntries() {
  return getRecordedAuditEntries().filter((entry) => entry.actionType === 'view')
}

describe('Admin read-only access (ADR-038)', () => {
  it('Student List: no Add Student for the Admin; Staff keeps it', async () => {
    const { unmount } = renderWithRouter(<StudentListPage viewer={ADMIN} />)
    await screen.findByRole('heading', { name: 'Student records' })
    expectNoWriteControls()
    unmount()
    renderWithRouter(<StudentListPage viewer={STAFF} />)
    expect(await screen.findByRole('link', { name: 'Add Student' })).toBeInTheDocument()
  })

  it('Student Profile: no Edit or Archive, visits as text, Print disabled with its reason', async () => {
    renderWithRouter(<StudentProfilePage viewer={ADMIN} studentId="student-0001" />)
    await screen.findByRole('heading', { name: 'Visit History' })
    expectNoWriteControls()
    expect(within(screen.getByRole('list', { name: 'Visit History' })).queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Excuse Letters' })).not.toBeInTheDocument()
    const print = screen.getByRole('button', { name: /print/i })
    expect(print).toHaveAttribute('aria-disabled', 'true')
    expect(print).toHaveAccessibleDescription('Printing is done by the clinician.')
  })

  it('shows the reason as a tooltip on hover or focus, Escape hides it, and a click prints nothing', async () => {
    const user = userEvent.setup()
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
    renderWithRouter(<StudentProfilePage viewer={ADMIN} studentId="student-0001" />)
    await screen.findByRole('heading', { name: 'Visit History' })
    const print = screen.getByRole('button', { name: /print/i })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    await user.hover(print)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Printing is done by the clinician.')
    await user.unhover(print)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    act(() => print.focus())
    expect(screen.getByRole('tooltip')).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    await user.click(print)
    expect(printSpy).not.toHaveBeenCalled()
  })

  it('Student Profile: Staff keeps Edit, Archive and an enabled Print', async () => {
    renderWithRouter(<StudentProfilePage viewer={STAFF} studentId="student-0001" />)
    expect(await screen.findByRole('link', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /print/i })).not.toHaveAttribute('aria-disabled')
  })

  it('Incident Log: View Report only, no New Incident or Stage 2', async () => {
    renderWithRouter(<IncidentLogListPage viewer={ADMIN} />)
    await screen.findByRole('heading', { name: 'Incident Log' })
    expectNoWriteControls()
  })

  it('Incident Report: no Approve, no visit link, Print disabled', async () => {
    renderWithRouter(<IncidentReportPage viewer={ADMIN} incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Incident summary' })
    expectNoWriteControls()
    expect(screen.queryByRole('link', { name: 'Open the visit' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /print/i })).toHaveAttribute('aria-disabled', 'true')
  })

  it('mounts no printout for the Admin, even on the browser’s own Print', async () => {
    renderWithRouter(<IncidentReportPage viewer={ADMIN} incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Incident summary' })
    act(() => {
      window.dispatchEvent(new Event('beforeprint'))
    })
    expect(document.querySelector('[data-print-document]')).toBeNull()
    expect(getRecordedAuditEntries().some((entry) => entry.actionType === 'print')).toBe(false)
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
  })

  it('logs the Admin opening a profile and a report once per record per session, and the clinician views too (ADR-048)', async () => {
    startMockSession(ADMIN)
    const first = renderWithRouter(<StudentProfilePage viewer={ADMIN} studentId="student-0001" />)
    await screen.findByRole('heading', { name: 'Visit History' })
    first.unmount()
    const again = renderWithRouter(<StudentProfilePage viewer={ADMIN} studentId="student-0001" />)
    await screen.findByRole('heading', { name: 'Visit History' })
    again.unmount()
    const report = renderWithRouter(<IncidentReportPage viewer={ADMIN} incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Incident summary' })
    report.unmount()
    await waitFor(() => expect(viewEntries()).toHaveLength(2))
    expect(viewEntries().map((entry) => [entry.userId, entry.targetRecord])).toEqual([
      ['user-admin-01', { type: 'student', id: 'student-0001' }],
      ['user-admin-01', { type: 'incident', id: 'incident-0022' }],
    ])

    // A new sign-in session logs the view again.
    startMockSession(ADMIN)
    const later = renderWithRouter(<StudentProfilePage viewer={ADMIN} studentId="student-0001" />)
    await screen.findByRole('heading', { name: 'Visit History' })
    later.unmount()
    await waitFor(() => expect(viewEntries()).toHaveLength(3))

    // ADR-048: the clinician's views are logged too.
    renderWithRouter(<StudentProfilePage viewer={STAFF} studentId="student-0002" />)
    await screen.findByRole('heading', { name: 'Visit History' })
    await waitFor(() => expect(viewEntries()).toHaveLength(4))
    expect(viewEntries().at(-1)).toMatchObject({ userId: STAFF.id, targetRecord: { type: 'student', id: 'student-0002' } })
  })
})
