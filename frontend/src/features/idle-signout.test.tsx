import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UnsavedChangesGuard } from '../components/forms/UnsavedChanges'
import { AppShell } from '../layouts/AppShell'
import {
  getAuthenticatedUser,
  getIdleSignoutSettings,
  getRecordedAuditEntries,
  IdleSignoutSettingsError,
  listStudents,
  resetMockDb,
  saveIdleSignoutSettings,
  startMockSession,
  type SessionUser,
} from '../lib/mock-db'
import { LoginPage } from './auth/LoginPage'
import { SettingsPage } from './settings/SettingsPage'

const STAFF: SessionUser = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }
const ADMIN: SessionUser = { id: 'user-admin-01', name: 'Principal', role: 'admin' }
const MIN = 60_000

function renderShell(user: SessionUser, onLogout: (minutes?: number) => void, dirty = false) {
  return render(
    <MemoryRouter>
      <AppShell user={user} active={null} onLogout={onLogout}>
        <p>Screen</p>
        <UnsavedChangesGuard dirty={dirty} />
      </AppShell>
    </MemoryRouter>,
  )
}

/** Lets the idle setting load; the countdown starts once it has. */
async function settle() {
  await act(() => vi.advanceTimersByTimeAsync(100))
}

const warning = () => screen.queryByRole('dialog', { name: 'Still there?' })

describe('Idle sign-out for both roles (ADR-078)', () => {
  beforeEach(() => {
    resetMockDb()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('signs Staff out after their own 60 minutes, warning exactly two minutes before', async () => {
    const onLogout = vi.fn()
    renderShell(STAFF, onLogout)
    await settle()
    await act(() => vi.advanceTimersByTimeAsync(58 * MIN - 1_000))
    expect(warning()).not.toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(1_000))
    expect(warning()).toBeInTheDocument()
    expect(onLogout).not.toHaveBeenCalled()
    await act(() => vi.advanceTimersByTimeAsync(2 * MIN))
    expect(onLogout).toHaveBeenCalledWith(60)
  })

  it('signs the Admin out after the Admin setting, not the Staff one', async () => {
    const onLogout = vi.fn()
    renderShell(ADMIN, onLogout)
    await settle()
    await act(() => vi.advanceTimersByTimeAsync(30 * MIN))
    expect(onLogout).toHaveBeenCalledWith(30)
  })

  it('records "Signed out (idle)" with the user and action only', async () => {
    const onLogout = vi.fn()
    renderShell(STAFF, onLogout)
    await settle()
    await act(() => vi.advanceTimersByTimeAsync(60 * MIN))
    const entry = getRecordedAuditEntries().at(-1)!
    expect(entry).toMatchObject({ actionType: 'logout', summary: 'Signed out (idle)' })
    expect(JSON.stringify(entry)).not.toMatch(/\b60\b/)
  })

  it('applies a changed setting to the next countdown', async () => {
    const onLogout = vi.fn()
    renderShell(STAFF, onLogout)
    await settle()
    await act(() =>
      saveIdleSignoutSettings({ idleSignoutMinutesStaff: 20, idleSignoutMinutesAdmin: 30 }, STAFF),
    )
    await settle()
    await act(() => vi.advanceTimersByTimeAsync(20 * MIN))
    expect(onLogout).toHaveBeenCalledWith(20)
  })

  it('shows a live countdown, announced politely, and Stay signed in resets it', async () => {
    const onLogout = vi.fn()
    renderShell(STAFF, onLogout)
    await settle()
    await act(() => vi.advanceTimersByTimeAsync(58 * MIN))
    expect(screen.getByRole('status')).toHaveTextContent(
      'You will be signed out in 2:00 because of inactivity.',
    )
    await act(() => vi.advanceTimersByTimeAsync(30_000))
    expect(screen.getByText('1:30')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'You will be signed out in 1:30 because of inactivity.',
    )
    expect(screen.getByRole('button', { name: 'Stay signed in' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Stay signed in' }))
    expect(warning()).not.toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(57 * MIN))
    expect(warning()).not.toBeInTheDocument()
    expect(onLogout).not.toHaveBeenCalled()
  })

  it('keeps the warning open through Tab and pointer moves, so Sign out now can be reached', async () => {
    const onLogout = vi.fn()
    renderShell(STAFF, onLogout)
    await settle()
    await act(() => vi.advanceTimersByTimeAsync(58 * MIN))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
      window.dispatchEvent(new Event('pointermove'))
    })
    await act(() => vi.advanceTimersByTimeAsync(1_000))
    expect(warning()).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(2 * MIN))
    expect(onLogout).toHaveBeenCalledWith(60)
  })

  it('treats Escape as Stay signed in', async () => {
    const onLogout = vi.fn()
    renderShell(STAFF, onLogout)
    await settle()
    await act(() => vi.advanceTimersByTimeAsync(58 * MIN))
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    expect(warning()).not.toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(5 * MIN))
    expect(onLogout).not.toHaveBeenCalled()
  })

  it('signs out at once with Sign out now, as an ordinary sign-out', async () => {
    const onLogout = vi.fn()
    renderShell(STAFF, onLogout)
    await settle()
    await act(() => vi.advanceTimersByTimeAsync(58 * MIN))
    fireEvent.click(screen.getByRole('button', { name: 'Sign out now' }))
    await settle()
    expect(onLogout).toHaveBeenCalledWith()
    expect(getRecordedAuditEntries().at(-1)).toMatchObject({ actionType: 'logout' })
    expect(getRecordedAuditEntries().at(-1)?.summary).not.toBe('Signed out (idle)')
  })

  it('counts an API call as activity', async () => {
    const onLogout = vi.fn()
    renderShell(STAFF, onLogout)
    await settle()
    await act(() => vi.advanceTimersByTimeAsync(50 * MIN))
    await act(async () => {
      await listStudents()
    })
    await act(() => vi.advanceTimersByTimeAsync(50 * MIN))
    expect(onLogout).not.toHaveBeenCalled()
  })

  it('says unsaved changes will be lost only when a form is dirty', async () => {
    const { unmount } = renderShell(STAFF, vi.fn(), true)
    await settle()
    await act(() => vi.advanceTimersByTimeAsync(58 * MIN))
    expect(warning()).toHaveTextContent('Unsaved changes will be lost.')
    unmount()
    renderShell(STAFF, vi.fn(), false)
    await settle()
    await act(() => vi.advanceTimersByTimeAsync(58 * MIN))
    expect(warning()).not.toHaveTextContent('Unsaved changes will be lost.')
  })

  it('keeps the fixed 7-day maximum, whatever the activity', () => {
    startMockSession(STAFF)
    expect(getAuthenticatedUser()).toMatchObject({ id: STAFF.id })
    act(() => {
      window.dispatchEvent(new Event('keydown'))
    })
    vi.setSystemTime(Date.now() + 7 * 24 * 60 * MIN + 1)
    expect(getAuthenticatedUser()).toBeNull()
  })
})

describe('Idle sign-out settings', () => {
  beforeEach(() => resetMockDb())

  it('defaults to 60 minutes for Staff and 30 for the Admin', async () => {
    expect(await getIdleSignoutSettings()).toEqual({
      idleSignoutMinutesStaff: 60,
      idleSignoutMinutesAdmin: 30,
    })
  })

  it('allows 10 to 240 whole minutes, and refuses 9 and 241', async () => {
    for (const bad of [9, 241, 30.5])
      await expect(
        saveIdleSignoutSettings(
          { idleSignoutMinutesStaff: bad, idleSignoutMinutesAdmin: 30 },
          STAFF,
        ),
      ).rejects.toBeInstanceOf(IdleSignoutSettingsError)
    await expect(
      saveIdleSignoutSettings({ idleSignoutMinutesStaff: 60, idleSignoutMinutesAdmin: 241 }, STAFF),
    ).rejects.toBeInstanceOf(IdleSignoutSettingsError)
    await expect(
      saveIdleSignoutSettings({ idleSignoutMinutesStaff: 10, idleSignoutMinutesAdmin: 240 }, STAFF),
    ).resolves.toEqual({ idleSignoutMinutesStaff: 10, idleSignoutMinutesAdmin: 240 })
  })

  it('lets only Staff change them, audited by field name only', async () => {
    await expect(
      saveIdleSignoutSettings({ idleSignoutMinutesStaff: 45, idleSignoutMinutesAdmin: 30 }, ADMIN),
    ).rejects.toBeInstanceOf(IdleSignoutSettingsError)
    await saveIdleSignoutSettings(
      { idleSignoutMinutesStaff: 45, idleSignoutMinutesAdmin: 30 },
      STAFF,
    )
    const entry = getRecordedAuditEntries().at(-1)!
    expect(entry).toMatchObject({
      actionType: 'update',
      summary: 'Updated Staff idle sign-out minutes',
    })
    expect(JSON.stringify(entry)).not.toMatch(/45/)
  })

  it('shows Staff both fields with Save, and the Admin the values read only', async () => {
    const { unmount } = render(
      <MemoryRouter>
        <SettingsPage viewer={STAFF} />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'People are signed out after this many minutes without activity. Shorter is safer on a shared computer.',
      ),
    ).toBeInTheDocument()
    expect(await screen.findByLabelText('Staff (minutes)')).toHaveValue(60)
    expect(screen.getByLabelText('Admin (minutes)')).toHaveValue(30)
    fireEvent.change(screen.getByLabelText('Staff (minutes)'), { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Enter whole minutes from 10 to 240.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Staff (minutes)'), { target: { value: '90' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Sign-out times saved.')).toBeInTheDocument()
    expect((await getIdleSignoutSettings()).idleSignoutMinutesStaff).toBe(90)
    unmount()

    render(
      <MemoryRouter>
        <SettingsPage viewer={ADMIN} />
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { level: 1, name: 'Settings' })
    expect(await screen.findByLabelText('Staff (minutes)')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })

  it('tells Login how many minutes ended the session', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { signedOutAfterMinutes: 60 } }]}>
        <LoginPage onLogin={() => {}} />
      </MemoryRouter>,
    )
    expect(
      screen.getByText('You were signed out after 60 minutes of inactivity. Sign in again.'),
    ).toBeInTheDocument()
  })
})
