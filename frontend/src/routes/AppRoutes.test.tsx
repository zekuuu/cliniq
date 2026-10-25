import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { listStudents } from '../lib/mock-db'
import { getRecordedAuditEntries, type SessionUser } from '../lib/mock-db'
import { AppRoutes } from './AppRoutes'

// jsdom has no canvas. Replace the chart with a stub that keeps its accessible label.
vi.mock('react-chartjs-2', () => {
  const Stub = (props: { 'aria-label'?: string }) => (
    <div role="img" aria-label={props['aria-label']} />
  )
  return { Bar: Stub, Line: Stub, Doughnut: Stub }
})

const STAFF: SessionUser = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }
const ADMIN: SessionUser = { id: 'usr-principal', name: 'Principal', role: 'admin' }

function CurrentPath() {
  const location = useLocation()
  return <output data-testid="path">{location.pathname + location.search}</output>
}

function renderAt(route: string, user: SessionUser = STAFF) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppRoutes user={user} onLogout={() => {}} />
      <CurrentPath />
    </MemoryRouter>,
  )
}

describe('App routes', () => {
  it('opens a screen by path inside the shell and marks its nav item current', async () => {
    renderAt('/students')

    expect(await screen.findByRole('heading', { name: 'Student List' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'Students' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('navigates between screens from the sidebar without a page reload', async () => {
    const user = userEvent.setup()
    renderAt('/students')
    await screen.findByRole('heading', { name: 'Student List' })

    await user.click(screen.getByRole('link', { name: 'Visits' }))

    expect(await screen.findByRole('heading', { name: 'Visit Log' })).toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent('/visits')
    expect(document.title).toBe('CLINIQ — Visit Log')
  })

  it('opens the Staff incident log from sidebar navigation', async () => {
    const user = userEvent.setup()
    renderAt('/students')
    await screen.findByRole('heading', { name: 'Student List' })
    await user.click(screen.getByRole('link', { name: 'Incidents' }))
    expect(await screen.findByRole('heading', { name: 'Incident Log' })).toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent('/incidents')
  })

  it('resolves the student from the /students/:studentId segment', async () => {
    const [student] = await listStudents()
    renderAt(`/students/${student.id}`)

    expect(await screen.findByRole('heading', { name: student.fullName })).toBeInTheDocument()
  })

  it('shows an error, not a different student, for an unknown LRN', async () => {
    renderAt('/students/student-9999')

    expect(await screen.findByText('Unable to load the student profile.')).toBeInTheDocument()
  })

  it.each([
    '/students/new',
    '/students/student-0001/edit',
    '/students/incomplete',
    '/staff',
    '/staff/new',
    '/staff/personnel-0001',
    '/staff/personnel-0001/edit',
    '/visits',
    '/visits/new',
    '/visits/visit-0157',
    '/incidents/new',
    '/incidents/incident-0022/complete',
    '/incidents/notifications',
    '/inventory',
    '/follow-ups',
    '/reports/sports',
  ])('redirects Admin/Principal away from the Staff-only %s to the Dashboard', async (route) => {
    renderAt(route, ADMIN)

    expect(await screen.findByRole('heading', { name: 'Clinic Overview' })).toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent(/^\/$/)
  })

  it.each([
    ['/students', 'Student List'],
    ['/students/student-0001', /.+/],
    ['/incidents', 'Incident Log'],
    ['/incidents/incident-0022/report', 'Incident Report'],
    ['/incidents/report', 'Incident Report'],
  ])('opens the read-only %s for Admin/Principal (ADR-038)', async (route, heading) => {
    renderAt(route, ADMIN)

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent(route)
  })

  it('opens the read-only audit log for Admin/Principal and marks it current', async () => {
    renderAt('/audit-log', ADMIN)

    expect(await screen.findByRole('heading', { name: 'Audit Log' })).toBeInTheDocument()
    expect(
      within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', {
        name: 'Audit Log',
      }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('opens Privacy Policy signed out, without the shell, and keeps every other route behind Login', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/privacy-policy']}>
        <AppRoutes user={null} onLogout={() => {}} />
        <CurrentPath />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'CLINIQ Privacy Policy — Draft' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Back to Sign In' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/login')
  })

  it('redirects a signed-out visitor from any other route to Login', () => {
    render(
      <MemoryRouter initialEntries={['/students']}>
        <AppRoutes user={null} onLogout={() => {}} />
        <CurrentPath />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('path')).toHaveTextContent('/login')
  })

  it.each([
    ['Staff', STAFF],
    ['Admin/Principal', ADMIN],
  ] as const)('opens Privacy Policy for %s with the footer link available', async (_, user) => {
    renderAt('/privacy-policy', user)

    expect(
      await screen.findByRole('heading', { name: 'CLINIQ Privacy Policy — Draft' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('path')).toHaveTextContent('/privacy-policy')
    expect(document.title).toBe('CLINIQ — Privacy Policy')
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('button', { name: 'Report an Issue' })).toBeInTheDocument()
    expect(screen.getByText('v0.1.0')).toBeInTheDocument()
    expect(screen.getByText('Powered by HealWare™')).toBeInTheDocument()
    expect(getRecordedAuditEntries()).toEqual([])
  })

  it.each(['/qr/scan', '/qr/print', '/emergency/mobile'])('shows Staff the not-found screen on the removed address %s', async (path) => {
    renderAt(path)

    expect(await screen.findByRole('heading', { name: 'Page Not Found' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /QR/ })).not.toBeInTheDocument()
  })

  it.each(['/users', '/users/new', '/users/user-staff-01/edit'])('sends Staff from the Admin-only %s to the Dashboard (ADR-033)', async (path) => {
    renderAt(path, STAFF)

    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(/^\/$/))
    expect(screen.queryByRole('heading', { name: /User Management|Add User|Edit User/ })).not.toBeInTheDocument()
  })

  it.each([
    ['/users', 'User Management'],
    ['/users/new', 'Add User'],
    ['/users/user-staff-01/edit', 'Edit User'],
  ])('lets the Admin/Principal open %s', async (path, heading) => {
    renderAt(path, ADMIN)

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('shows a not-found screen for an unknown path', async () => {
    renderAt('/nope')

    expect(screen.getByText("This page doesn't exist.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Home Screen' })).toHaveAttribute('href', '/')
  })
})
