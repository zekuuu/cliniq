import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { getAuthenticatedUser, resetMockDb } from './lib/mock-db'
import { openAccountMenu } from './test/accountMenu'

vi.mock('./components/KeyboardShortcuts', () => ({ KeyboardShortcuts: () => null }))

function openAt(path: string) {
  window.history.pushState({}, '', path)
  return render(<App />)
}

async function signIn(username: string, password: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText(/username/i), username)
  await user.type(screen.getByLabelText(/^password/i), password)
  await user.click(screen.getByRole('button', { name: 'Sign In' }))
  return user
}

/**
 * Login gate (ADR-002, security clarification): nothing opens without a real Login, so each
 * audited action is attributable to the account that signed in.
 */
describe('login gate', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    resetMockDb()
  })

  it.each([
    '/students',
    '/students?role=staff',
    '/incidents/new',
    '/reports',
    '/no-such-screen',
  ])('sends an unauthenticated visitor on %s to Login', async (path) => {
    openAt(path)

    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
    expect(getAuthenticatedUser()).toBeNull()
  })

  it('returns a visitor to the address they opened after Login, then blocks it again after Log out', async () => {
    openAt('/students')
    const user = await signIn('demo.nurse', 'demo-nurse')

    expect(await screen.findByRole('heading', { name: 'Student List' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/students')
    expect(getAuthenticatedUser()?.role).toBe('staff')

    await openAccountMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    await user.click(await screen.findByRole('button', { name: 'Sign Out' }))
    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    expect(getAuthenticatedUser()).toBeNull()
  })

  it('keeps a logged-out browser out of the Student List on the next visit', async () => {
    const first = openAt('/students')
    const user = await signIn('demo.nurse', 'demo-nurse')
    await openAccountMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    await user.click(await screen.findByRole('button', { name: 'Sign Out' }))
    await screen.findByRole('heading', { name: 'Sign In' })
    first.unmount()

    openAt('/students')
    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
  })

  it('keeps the session across a reload until Log out', async () => {
    const first = openAt('/students')
    await signIn('demo.nurse', 'demo-nurse')
    await screen.findByRole('heading', { name: 'Student List' })
    first.unmount()

    openAt('/students')
    expect(await screen.findByRole('heading', { name: 'Student List' })).toBeInTheDocument()
  })

  it('does not let a URL choose whose password is changed', async () => {
    openAt('/force-password-change?user=user-staff-01')

    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
  })

  it('gives a first-login account no session until its password is changed', async () => {
    openAt('/')
    const user = await signIn('demo.new', 'demo-change')

    expect(await screen.findByRole('heading', { name: 'Change Your Password' })).toBeInTheDocument()
    expect(getAuthenticatedUser()).toBeNull()

    await user.type(screen.getByLabelText(/^new password/i), 'a-new-demo-password')
    await user.type(screen.getByLabelText(/confirm new password/i), 'a-new-demo-password')
    await user.click(screen.getByRole('button', { name: 'Save Password' }))

    expect(await screen.findByRole('heading', { name: 'Clinic Overview' })).toBeInTheDocument()
    expect(getAuthenticatedUser()?.id).toBe('user-staff-02')
  })

  it('has no PE/Sports Instructor accounts: the old demo sign-in is refused (ADR-029)', async () => {
    openAt('/')
    await signIn('demo.pe', 'demo-pe')

    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    expect(getAuthenticatedUser()).toBeNull()
  })
})

describe('idle sign-out in the running app (ADR-078)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    resetMockDb()
  })

  it('lands on Login with the inactivity message', async () => {
    const { act } = await import('@testing-library/react')
    const { startMockSession } = await import('./lib/mock-db')
    vi.useFakeTimers()
    try {
      startMockSession({ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' })
      openAt('/settings')
      await act(() => vi.advanceTimersByTimeAsync(2_000))
      await act(() => vi.advanceTimersByTimeAsync(60 * 60_000 + 2_000))
      expect(window.location.pathname).toBe('/login')
      expect(screen.getByText('You were signed out after 60 minutes of inactivity. Sign in again.')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
