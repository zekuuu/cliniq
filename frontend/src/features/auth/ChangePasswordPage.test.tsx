import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authenticateMockUser, changeOwnPassword, getRecordedAuditEntries, resetMockAuth, resetMockDb } from '../../lib/mock-db'
import { AppRoutes } from '../../routes/AppRoutes'
import { paths } from '../../routes/paths'
import { ChangePasswordPage } from './ChangePasswordPage'

vi.mock('react-chartjs-2', () => {
  const Stub = (props: { 'aria-label'?: string }) => <div role="img" aria-label={props['aria-label']} />
  return { Bar: Stub, Line: Stub, Doughnut: Stub }
})

const STAFF = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' as const }
const ADMIN = { id: 'user-admin-01', name: 'Gilan Avelida', role: 'admin' as const }

async function fill(current: string, next: string, confirmation = next, viewer: typeof STAFF | typeof ADMIN = STAFF) {
  const view = render(<MemoryRouter><ChangePasswordPage viewer={viewer} /></MemoryRouter>)
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/current password/i), current)
  await user.type(screen.getByLabelText(/^new password/i), next)
  await user.type(screen.getByLabelText(/confirm new password/i), confirmation)
  await user.click(screen.getByRole('button', { name: 'Save Password' }))
  return view
}

const passwordEntries = () => getRecordedAuditEntries().filter((entry) => entry.summary === 'Changed password')

function Path() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

describe('Change Password', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockAuth()
  })

  it('refuses a wrong current password, changes nothing and audits nothing', async () => {
    await fill('not-the-password', 'a-new-password')
    expect(await screen.findByRole('alert')).toHaveTextContent('Your current password is incorrect.')
    expect(passwordEntries()).toEqual([])
    await expect(authenticateMockUser('demo.nurse', 'demo-nurse')).resolves.toMatchObject({ user: { id: STAFF.id } })
  })

  it('changes the password, so the new one signs in, and audits it without a password', async () => {
    await fill('demo-nurse', 'a-new-password')
    expect(await screen.findByRole('status')).toHaveTextContent('Password changed.')
    await expect(authenticateMockUser('demo.nurse', 'a-new-password')).resolves.toMatchObject({ user: { id: STAFF.id } })
    expect(passwordEntries()).toHaveLength(1)
    expect(JSON.stringify(getRecordedAuditEntries())).not.toContain('a-new-password')
  })

  it('lets the Admin change their own password', async () => {
    await fill('demo-admin', 'a-new-admin-password', 'a-new-admin-password', ADMIN)
    expect(await screen.findByRole('status')).toHaveTextContent('Password changed.')
    await expect(authenticateMockUser('demo.principal', 'a-new-admin-password')).resolves.toMatchObject({ user: { id: ADMIN.id } })
  })

  it.each([
    ['under 8 characters', 'short', 'short', 'Password must be at least 8 characters.'],
    ['a mismatched confirmation', 'a-new-password', 'another-password', 'Passwords do not match.'],
  ])('refuses %s and changes nothing', async (_, next, confirmation, message) => {
    await fill('demo-nurse', next, confirmation)
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(passwordEntries()).toEqual([])
    await expect(authenticateMockUser('demo.nurse', 'demo-nurse')).resolves.toMatchObject({ user: { id: STAFF.id } })
  })

  it('refuses any of the last 5 passwords and changes nothing', async () => {
    await changeOwnPassword(STAFF.id, 'demo-nurse', 'second-password')
    await changeOwnPassword(STAFF.id, 'second-password', 'third-password')
    await fill('third-password', 'demo-nurse')
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a password that was not used recently.')
    expect(passwordEntries()).toHaveLength(2)
    await expect(authenticateMockUser('demo.nurse', 'third-password')).resolves.toMatchObject({ user: { id: STAFF.id } })
  })

  it.each([
    ['staff', STAFF],
    ['admin', ADMIN],
  ])('is reached from the top bar by %s', async (_, viewer) => {
    render(
      <MemoryRouter initialEntries={['/audit-log']}>
        <AppRoutes user={viewer} onLogout={() => {}} />
        <Path />
      </MemoryRouter>,
    )
    await userEvent.setup().click(await screen.findByRole('link', { name: 'Change password' }))
    expect(await screen.findByRole('heading', { name: 'Change Password' })).toBeInTheDocument()
    expect(within(screen.getByTestId('path')).getByText(paths.changePassword)).toBeInTheDocument()
  })

  it('sends a signed-out visitor to Login', async () => {
    render(
      <MemoryRouter initialEntries={[paths.changePassword]}>
        <AppRoutes user={null} onLogout={() => {}} />
        <Path />
      </MemoryRouter>,
    )
    expect(await screen.findByTestId('path')).toHaveTextContent(paths.login)
  })
})
