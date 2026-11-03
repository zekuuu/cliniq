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
