import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'
import { clearMockSession, getRecordedAuditEntries, resetMockDb, startMockSession, type SessionUser } from '../lib/mock-db'
import { db } from '../lib/mock-db/store'
import { SHOW_SHORTCUTS_EVENT } from '../lib/shortcuts'
import { renderWithRouter } from '../test/renderWithRouter'
import { openAccountMenu } from '../test/accountMenu'

const STAFF: SessionUser = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }
const ADMIN: SessionUser = { id: 'user-admin-01', name: 'Principal', role: 'admin' }

function shell(viewer: SessionUser = STAFF, onLogout = vi.fn()) {
  startMockSession(viewer)
  renderWithRouter(
    <AppShell user={viewer} active="dashboard" onLogout={onLogout}>
      <button type="button">Outside</button>
    </AppShell>,
  )
  return onLogout
}

const button = () => screen.getByRole('button', { name: /^Account menu, / })
const itemNames = () => within(screen.getByRole('menu', { name: 'Account' })).getAllByRole('menuitem').map((item) => [...item.childNodes].filter((node) => node.nodeName !== 'KBD').map((node) => node.textContent).join(''))

/** Account menu (ADR-066; Zean, Thursday, November 5, 2026). */
describe('Account menu', () => {
  beforeEach(() => resetMockDb())
  afterEach(() => {
    clearMockSession()
    vi.unstubAllGlobals()
  })

  it('is one button with the avatar, name and role, and the old header icons are gone', async () => {
    shell()
    expect(await screen.findByRole('button', { name: 'Account menu, Jennesse Baas' })).toHaveAttribute('aria-haspopup', 'menu')
    expect(button()).toHaveAttribute('aria-expanded', 'false')
    expect(button()).toHaveTextContent('School Clinician')
    expect(screen.queryByRole('link', { name: 'Change password' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show keyboard shortcuts' })).not.toBeInTheDocument()
    expect(button().closest('header')).toHaveClass('print:hidden')
  })

  it('lists the account actions in order, with the account details above them', async () => {
    const user = userEvent.setup()
    shell()
    const menu = await openAccountMenu(user)
    expect(button()).toHaveAttribute('aria-expanded', 'true')
    expect(itemNames()).toEqual(['Edit profile', 'Change password', 'Keyboard shortcuts', 'Report an issue', 'Privacy Policy', 'Sign out'])
    const panel = menu.parentElement!
    expect(panel).toHaveTextContent('Username: demo.nurse')
    expect(panel).toHaveTextContent(/Signed in /)
    expect(within(menu).getByRole('menuitem', { name: 'Edit profile' })).toHaveFocus()
  })

  it('gives the Admin the same personal items and nothing clinical', async () => {
    const user = userEvent.setup()
    shell(ADMIN)
    await openAccountMenu(user)
    expect(itemNames()).toEqual(['Edit profile', 'Change password', 'Keyboard shortcuts', 'Report an issue', 'Privacy Policy', 'Sign out'])
  })

  it('leaves out Keyboard shortcuts on a phone or tablet width', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }))
    const user = userEvent.setup()
    shell()
    await openAccountMenu(user)
    expect(itemNames()).not.toContain('Keyboard shortcuts')
  })

  it.each([['Enter', '{Enter}'], ['Space', ' '], ['ArrowDown', '{ArrowDown}']])('opens with %s on the first item', async (_, key) => {
    const user = userEvent.setup()
    shell()
    button().focus()
    await user.keyboard(key)
    expect(screen.getByRole('menuitem', { name: 'Edit profile' })).toHaveFocus()
  })

  it('opens with ArrowUp on the last item', async () => {
    const user = userEvent.setup()
    shell()
    button().focus()
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveFocus()
  })

  it('moves with the arrows, Home, End and a first letter, and wraps', async () => {
    const user = userEvent.setup()
    shell()
    await openAccountMenu(user)
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Change password' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Edit profile' })).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('menuitem', { name: 'Edit profile' })).toHaveFocus()
    await user.keyboard('p')
    expect(screen.getByRole('menuitem', { name: 'Privacy Policy' })).toHaveFocus()
    await user.keyboard('r')
    expect(screen.getByRole('menuitem', { name: 'Report an issue' })).toHaveFocus()
  })

  it('closes with Escape and returns focus to the button', async () => {
    const user = userEvent.setup()
    shell()
    await openAccountMenu(user)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(button()).toHaveFocus()
    expect(button()).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes with Tab, a click outside, and a second click on the button', async () => {
    const user = userEvent.setup()
    shell()
    await openAccountMenu(user)
    await user.tab()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await openAccountMenu(user)
    await user.click(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await openAccountMenu(user)
    await user.click(button())
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('links Change password and Privacy Policy to their pages', async () => {
    const user = userEvent.setup()
    shell()
    await openAccountMenu(user)
    expect(screen.getByRole('menuitem', { name: 'Change password' })).toHaveAttribute('href', '/account/password')
    expect(screen.getByRole('menuitem', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy-policy')
  })

  it('opens the keyboard shortcuts and Report an Issue, closing the menu', async () => {
    const user = userEvent.setup()
    const shown = vi.fn()
    window.addEventListener(SHOW_SHORTCUTS_EVENT, shown)
    shell()
    await openAccountMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Keyboard shortcuts' }))
    expect(shown).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    window.removeEventListener(SHOW_SHORTCUTS_EVENT, shown)
    await openAccountMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Report an issue' }))
    expect(await screen.findByRole('dialog', { name: 'Report an Issue' })).toBeInTheDocument()
  })

  it('still asks before signing out, with Cancel focused', async () => {
    const user = userEvent.setup()
    const onLogout = shell()
    await openAccountMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    const dialog = await screen.findByRole('dialog', { name: 'Sign out of CLINIQ?' })
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    expect(onLogout).not.toHaveBeenCalled()
  })
})

describe('Edit profile dialog', () => {
  beforeEach(() => resetMockDb())
  afterEach(() => clearMockSession())

  async function openEditProfile(user: ReturnType<typeof userEvent.setup>) {
    await openAccountMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Edit profile' }))
    return screen.findByRole('dialog', { name: 'Edit profile' })
  }

  it('opens over the screen with the details, the name field and the picture, and no route change', async () => {
    const user = userEvent.setup()
    shell()
    const dialog = await openEditProfile(user)
    expect(window.location.pathname).not.toContain('/account/profile')
    expect(dialog).toHaveTextContent('demo.nurse')
    expect(dialog).toHaveTextContent('School Clinician')
    expect(within(dialog).getByRole('textbox', { name: /Full name/ })).toHaveValue('Jennesse Baas')
    expect(within(dialog).getByRole('textbox', { name: /Full name/ })).toHaveFocus()
    expect(within(dialog).getByRole('button', { name: 'Change picture' })).toBeInTheDocument()
    expect(dialog).toHaveTextContent('To change your password, use Change password in the menu.')
    expect(within(dialog).getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('closes with Escape and returns focus to the account button', async () => {
    const user = userEvent.setup()
    shell()
    await openEditProfile(user)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(button()).toHaveFocus())
  })

  it('saves a new name, says so, and shows it in the header at once', async () => {
    const user = userEvent.setup()
    shell()
    const dialog = await openEditProfile(user)
    const field = within(dialog).getByRole('textbox', { name: /Full name/ })
    await user.clear(field)
    await user.type(field, 'Jennesse B. Ocampo')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Profile updated.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Account menu, Jennesse B. Ocampo' })).toBeInTheDocument()
    expect(db().users.find((u) => u.id === STAFF.id)?.name).toBe('Jennesse B. Ocampo')
    expect(getRecordedAuditEntries().map((entry) => entry.summary)).toEqual(['Changed own name'])
  })

  it('refuses a blank name with its own message, and keeps the dialog open', async () => {
    const user = userEvent.setup()
    shell()
    const dialog = await openEditProfile(user)
    await user.clear(within(dialog).getByRole('textbox', { name: /Full name/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(within(dialog).getByText('Enter your full name.')).toBeInTheDocument()
    expect(getRecordedAuditEntries()).toEqual([])
  })

  it('asks before discarding unsaved changes', async () => {
    const user = userEvent.setup()
    shell()
    const dialog = await openEditProfile(user)
    await user.type(within(dialog).getByRole('textbox', { name: /Full name/ }), ' Jr.')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    const ask = await screen.findByRole('dialog', { name: 'Discard unsaved changes?' })
    await user.click(within(ask).getByRole('button', { name: 'Keep Editing' }))
    expect(within(screen.getByRole('dialog', { name: 'Edit profile' })).getByRole('textbox', { name: /Full name/ })).toHaveValue('Jennesse Baas Jr.')
    await user.keyboard('{Escape}')
    await user.click(within(await screen.findByRole('dialog', { name: 'Discard unsaved changes?' })).getByRole('button', { name: 'Discard Changes' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(getRecordedAuditEntries()).toEqual([])
  })

  it('removes the picture, audited without the image', async () => {
    const staff = db().users.find((u) => u.id === STAFF.id)!
    staff.profilePicture = 'data:image/webp;base64,AAAA'
    const user = userEvent.setup()
    shell()
    const dialog = await openEditProfile(user)
    await user.click(within(dialog).getByRole('button', { name: 'Remove picture' }))
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await screen.findByText('Profile updated.')
    expect(staff.profilePicture).toBeNull()
    expect(getRecordedAuditEntries().map((entry) => entry.summary)).toEqual(['Changed own profile picture'])
    await act(async () => {})
  })
})
