import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DatePicker, ErrorState } from '../components'
import { beginPasswordChange, getMockToday, getPendingPasswordChangeUser, getStudent, recordVisit, resetMockDb } from '../lib/mock-db'
import { renderWithRouter } from '../test/renderWithRouter'
import { ForcePasswordChangePage } from './auth/ForcePasswordChangePage'
import { LoginPage } from './auth/LoginPage'
import { VisitLogListPage } from './clinic-visits/VisitLogListPage'
import { DashboardPage } from './dashboard/DashboardPage'
import { IncidentEntryPage } from './emergency-response/IncidentEntryPage'
import { ReportsPage } from './reports/ReportsPage'
import { StaffFormPage } from './staff-records/StaffFormPage'
import { StaffProfilePage } from './staff-records/StaffProfilePage'
import { StudentFormPage } from './student-records/StudentFormPage'
import { StudentListPage } from './student-records/StudentListPage'
import { StudentProfilePage } from './student-records/StudentProfilePage'

vi.mock('react-chartjs-2', () => {
  const Stub = (props: { 'aria-label'?: string }) => <div role="img" aria-label={props['aria-label']} />
  return { Bar: Stub, Line: Stub, Doughnut: Stub }
})

const STAFF = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' } as const

beforeEach(() => resetMockDb())

describe('Force Password Change on a shared workstation (C3)', () => {
  it('forgets the verified account when the page is left unfinished', async () => {
    beginPasswordChange('user-staff-02')
    expect(getPendingPasswordChangeUser()).not.toBeNull()
    const user = userEvent.setup({ delay: null })
    render(
      <MemoryRouter initialEntries={['/force-password-change']}>
        <Routes>
          <Route path="/force-password-change" element={<ForcePasswordChangePage onComplete={() => {}} />} />
          <Route path="/login" element={<LoginPage onLogin={() => {}} />} />
        </Routes>
      </MemoryRouter>,
    )
    await user.click(await screen.findByRole('link', { name: 'Back to Sign In' }))
    await screen.findByRole('button', { name: /sign in/i })
    expect(getPendingPasswordChangeUser()).toBeNull()
  })
})

describe('DatePicker placeholder contrast (C4)', () => {
  it('uses the 4.5:1 secondary text on an empty value', () => {
    render(<DatePicker label="Expiry" value="" onChange={() => {}} />)
    expect(screen.getByText('Select date')).toHaveClass('text-text-secondary')
  })
})

describe('ErrorState heading (C5)', () => {
  it('names the screen as its h1 only when the screen failed before its heading', () => {
    const { rerender } = render(<ErrorState title="Unable to load." asPageTitle />)
    expect(screen.getByRole('heading', { level: 1, name: 'Unable to load.' })).toBeInTheDocument()
    rerender(<ErrorState title="Unable to load." />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})

describe('After Edit Student saves (C6)', () => {
  it('goes Profile, Edit, Save, Back without showing the profile twice', async () => {
    const user = userEvent.setup({ delay: null })
    const student = await getStudent('student-0001')
    function Start() {
      return <Link to={`/students/${student.id}`}>Open profile</Link>
    }
    function Profile() {
      return <StudentProfilePage viewer={STAFF} studentId={student.id} />
    }
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<Start />} />
          <Route path="/students/:id" element={<Profile />} />
          <Route path="/students/:id/edit" element={<StudentFormPage studentId={student.id} />} />
        </Routes>
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('link', { name: 'Open profile' }))
    await user.click(await screen.findByRole('link', { name: /edit/i }))
    await screen.findByRole('heading', { name: 'Edit Student' })
    await user.click(screen.getByRole('radio', { name: student.sex === 'female' ? 'Male' : 'Female' }))
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByText(/^Student record updated for/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(await screen.findByRole('link', { name: 'Open profile' })).toBeInTheDocument()
  })
})

describe('After Edit Staff saves', () => {
  it('goes Profile, Edit, Save, Back without showing the profile twice', async () => {
    const user = userEvent.setup({ delay: null })
    const id = 'personnel-0001'
    render(
      <MemoryRouter initialEntries={['/previous', `/staff/${id}`, `/staff/${id}/edit`]} initialIndex={2}>
        <Routes>
          <Route path="/previous" element={<p>Previous screen</p>} />
          <Route path="/staff/:id" element={<StaffProfilePage viewer={STAFF} personnelId={id} />} />
          <Route path="/staff/:id/edit" element={<StaffFormPage viewer={STAFF} personnelId={id} />} />
        </Routes>
      </MemoryRouter>,
    )
    await user.click(await screen.findByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByText(/^Staff record updated for/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(await screen.findByText('Previous screen')).toBeInTheDocument()
  })
})

describe('Reopening a completed incident (C8)', () => {
  it('prefills the saved hospital referral', async () => {
    renderWithRouter(<IncidentEntryPage incidentId="incident-0021" />, { route: '/incidents/incident-0021/complete' })
    const referred = await screen.findByRole('checkbox', { name: /referred to hospital/i })
    expect(referred).toBeChecked()
    expect(screen.getByLabelText(/destination/i)).not.toHaveValue('')
    expect(screen.getByLabelText(/transport/i)).not.toHaveValue('')
  })
})

describe('Demo Accounts (C9)', () => {
  it.each([
    [true, 1],
    [false, 0],
  ])('with DEV %s renders %i demo trigger', async (dev, count) => {
    vi.stubEnv('DEV', dev)
    renderWithRouter(<LoginPage onLogin={() => {}} />)
    expect(screen.queryAllByRole('button', { name: /demo/i })).toHaveLength(count)
    vi.unstubAllEnvs()
  })
})

describe('Dashboard links to Reports (C10)', () => {
  it('opens the matching Reports tab and month', async () => {
    const user = userEvent.setup({ delay: null })
    const month = getMockToday().slice(0, 7)
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<DashboardPage viewer={STAFF} />} />
          <Route path="/reports" element={<ReportsPage viewer={STAFF} />} />
        </Routes>
      </MemoryRouter>,
    )
    await user.click(await screen.findByRole('link', { name: 'View full report: Monthly Report' }))
    expect(await screen.findByRole('tab', { name: 'Monthly Report', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /month/i })).toHaveTextContent(new Date(`${month}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'long' }))
  })

  // S3 (Zean, November 4, 2026): "View full report" moved out of the header to a right-aligned footer row.
  it('puts the Overview link in a right-aligned footer under the Activity summary cards, after them in tab order', async () => {
    render(<MemoryRouter><DashboardPage viewer={STAFF} /></MemoryRouter>)
    const link = await screen.findByRole('link', { name: 'View full report: Monthly Report' })
    const activity = screen.getByRole('heading', { name: 'Activity summary' }).closest('section')!
    const footer = link.closest('footer')!
    // Right after the Summary counts region, whose last part is the Activity summary cards; not one of the count cards.
    const summary = screen.getByRole('region', { name: 'Summary counts' })
    expect(summary.lastElementChild).toBe(activity)
    expect(summary.nextElementSibling).toBe(footer)
    expect(footer).toHaveClass('justify-end', 'print:hidden')
    expect(link).toHaveAttribute('href', '/reports')
    expect(link).toHaveTextContent('View full report')
    const cardLinks = within(activity).getAllByRole('link')
    expect(cardLinks.at(-1)!.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('puts the Common complaints link in the card footer, not its header, and opens the Complaint summary', async () => {
    const user = userEvent.setup({ delay: null })
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<DashboardPage viewer={STAFF} />} />
          <Route path="/reports" element={<ReportsPage viewer={STAFF} />} />
        </Routes>
      </MemoryRouter>,
    )
    await user.click(await screen.findByRole('tab', { name: /Trends/ }))
    const link = await screen.findByRole('link', { name: 'View full report: Complaint summary' })
    const card = screen.getByRole('region', { name: 'Common complaints' })
    const heading = within(card).getByRole('heading', { name: 'Common complaints' })
    const footer = link.closest('footer')!
    expect(card).toContainElement(footer)
    expect(footer).toHaveClass('justify-end', 'print:hidden')
    expect(heading.parentElement!.parentElement!.parentElement).not.toContainElement(link)
    expect(heading.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.click(link)
    expect(await screen.findByRole('tab', { name: 'Complaint summary', selected: true })).toBeInTheDocument()
  })
})

describe('?focus=search and Alt + K (C11)', () => {
  it('focuses the Student List search once the list has loaded', async () => {
    renderWithRouter(<StudentListPage />, { route: '/students?focus=search' })
    await waitFor(() => expect(screen.getByLabelText('Search')).toHaveFocus())
  })

  it('focuses it when Alt + K arrives on an open list', async () => {
    const user = userEvent.setup({ delay: null })
    function Shortcut() {
      return <Link to={`${useLocation().pathname}?focus=search`}>Shortcut</Link>
    }
    render(
      <MemoryRouter initialEntries={['/students']}>
        <Shortcut />
        <StudentListPage />
      </MemoryRouter>,
    )
    const search = await screen.findByLabelText('Search')
    expect(search).not.toHaveFocus()
    await user.click(screen.getByRole('link', { name: 'Shortcut' }))
    await waitFor(() => expect(search).toHaveFocus())
  })
})

describe('?inClinic=1 (C12)', () => {
  it('the Visit Log opens filtered', async () => {
    await recordVisit({ studentId: 'student-0001', complaint: 'Fever', treatment: '', disposition: 'resting_in_clinic', followUp: null })
    renderWithRouter(<VisitLogListPage />, { route: '/visits?inClinic=1' })
    const table = (await screen.findAllByRole('table'))[0]
    expect(within(table).getAllByText('Fever').length).toBeGreaterThan(0)
  })
})
