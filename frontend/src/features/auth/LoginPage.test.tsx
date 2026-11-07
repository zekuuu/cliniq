import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { LOGIN_BACKDROP_SRC } from './LoginBackdrop'

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <LoginPage onLogin={vi.fn()} />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('shows the lockup (panel on phones, photo from md), one Sign In heading and the school name, without a footer', () => {
    renderLogin()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Sign In' })).toBeInTheDocument()
    // Two lockups by design; CSS shows only one at a time (md:hidden in the panel, hidden md:flex on the photo).
    expect(screen.getAllByText('CLINIQ')).toHaveLength(2)
    expect(screen.getAllByText('Mendez Christian Academy')).toHaveLength(2)
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
    expect(screen.queryByText(/assigned clinic account/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/clinic account/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/all rights reserved/i)).not.toBeInTheDocument()
    for (const logo of screen.getAllByAltText('Mendez Christian Academy logo')) expect(logo).toHaveAttribute('src', '/MCA_Logo.png')
  })

  it('focuses the first invalid field after a failed submit', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(screen.getByLabelText(/Username/)).toHaveFocus()

    await user.type(screen.getByLabelText(/Username/), 'demo.nurse')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(screen.getByLabelText(/^Password/)).toHaveFocus()
    // No clear (X) button on the username (Zean, November 5, 2026).
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
  })

  // ADR-072: the dialog is now the authenticator recovery flow (see features/account/Authenticator.test.tsx).
  it('opens the recovery flow, names the Administrator fallback, and resets nothing on Cancel', async () => {
    const user = userEvent.setup()
    renderLogin()

    const trigger = screen.getByRole('button', { name: 'Forgot password?' })
    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Forgot your password?' })
    expect(dialog).toHaveTextContent(/authenticator app/i)
    expect(dialog).toHaveTextContent(/ask the Administrator to reset your password/i)
    // The username comes first; the code boxes follow once it is checked (Zean, November 7, 2026).
    expect(within(dialog).getByLabelText(/^Username/)).toBeInTheDocument()
    expect(within(dialog).queryByLabelText(/code/i)).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('puts Sign In straight after the fields, with a quiet Forgot password below it', () => {
    renderLogin()
    const signIn = screen.getByRole('button', { name: 'Sign In' })
    const forgot = screen.getByRole('button', { name: 'Forgot password?' })

    expect(screen.getByLabelText(/^Password/).compareDocumentPosition(signIn)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(signIn.compareDocumentPosition(forgot)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(forgot).toHaveClass('text-text-secondary')
    expect(forgot).not.toHaveClass('font-semibold')
  })

  it('sets field labels at 14px, the same as the typed value', () => {
    const { container } = renderLogin()
    const labels = container.querySelectorAll('label')

    expect(labels).toHaveLength(2)
    labels.forEach((label) => expect(label).toHaveClass('text-sm'))
  })

  it('warns while Caps Lock is on in the password field', () => {
    renderLogin()
    const password = screen.getByLabelText(/^Password/)

    fireEvent.keyDown(password, { key: 'A', modifierCapsLock: true })
    expect(password).toHaveAccessibleDescription('Caps Lock is on.')
    fireEvent.keyUp(password, { key: 'a', modifierCapsLock: false })
    expect(screen.queryByText('Caps Lock is on.')).not.toBeInTheDocument()
  })

  it('says when a locked account can try again, in one message', async () => {
    const user = userEvent.setup()
    renderLogin()
    await user.type(screen.getByLabelText(/Username/), 'demo.principal')
    for (let attempt = 0; attempt < 5; attempt++) {
      await user.clear(screen.getByLabelText(/^Password/))
      await user.type(screen.getByLabelText(/^Password/), `wrong-${attempt}`)
      await user.click(screen.getByRole('button', { name: 'Sign In' }))
      await screen.findByRole('alert')
    }
    expect(await screen.findByText(/locked after repeated failed attempts\. Try again at \d{1,2}:\d{2}/)).toBeInTheDocument()
    expect(screen.queryByText(/^Locked until/)).not.toBeInTheDocument()
  })

  it('shows the privacy link, the attribution and the version', () => {
    renderLogin()
    expect(screen.queryByText(/Authorized clinic personnel/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy-policy')
    const attribution = screen.getByText('Powered by HealWare™')
    expect(attribution.querySelector('img')).toHaveAttribute('src', '/Healware_Logo.png')
    // Attribution comes first, then the Privacy Policy link.
    expect(attribution.compareDocumentPosition(screen.getByRole('link', { name: 'Privacy Policy' }))).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(screen.getByText(/^v\d/)).toBeInTheDocument()
  })

  it('keeps the demo accounts and the simulated-auth notice off the page until asked for', async () => {
    const user = userEvent.setup()
    renderLogin()

    expect(screen.queryByText('demo.nurse')).not.toBeInTheDocument()
    expect(screen.queryByText(/authentication is simulated/i)).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Sign In' })).toHaveLength(1)

    const trigger = screen.getByRole('button', { name: 'Demo Accounts' })
    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Demo accounts' })
    // No PE/Sports Instructor account any more (ADR-029).
    expect(dialog).not.toHaveTextContent('demo.pe')
    for (const username of ['demo.nurse', 'demo.principal', 'demo.new']) {
      expect(dialog).toHaveTextContent(username)
    }
    expect(dialog).toHaveTextContent(/authentication is simulated until the Laravel Sanctum API is connected/i)

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()

    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('falls back to the brand gradient when the backdrop photo is missing', () => {
    renderLogin()
    const backdrop = screen.getByTestId('login-backdrop')
    const photo = backdrop.querySelector('img')
    expect(photo).toHaveAttribute('src', LOGIN_BACKDROP_SRC)

    fireEvent.error(photo!)
    expect(backdrop.querySelector('img')).toBeNull()
    expect(backdrop).toHaveClass('from-brand-green-dark', 'to-brand-green')
  })
})
