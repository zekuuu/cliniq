import { fireEvent, render, screen } from '@testing-library/react'
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
  it('shows the lockup, one Sign In heading and the school name in the panel, without a footer', () => {
    renderLogin()

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Sign In' })).toBeInTheDocument()
    expect(screen.getByText('CLINIQ')).toBeInTheDocument()
    expect(screen.getByText('Mendez Christian Academy')).toBeInTheDocument()
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
    expect(screen.queryByText(/assigned clinic account/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/clinic account/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/all rights reserved/i)).not.toBeInTheDocument()
    expect(screen.getByAltText('Mendez Christian Academy logo')).toHaveAttribute('src', '/MCA_Logo.png')
  })

  it('focuses the first invalid field after a failed submit', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(screen.getByLabelText(/Username/)).toHaveFocus()

    await user.type(screen.getByLabelText(/Username/), 'demo.nurse')
    await user.click(screen.getByRole('button', { name: 'Sign In' }))
    expect(screen.getByLabelText(/^Password/)).toHaveFocus()
  })

  it('explains that password reset is not available yet, without resetting anything', async () => {
    const user = userEvent.setup()
    renderLogin()

    const trigger = screen.getByRole('button', { name: 'Forgot password?' })
    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Forgot your password?' })
    expect(dialog).toHaveTextContent(/not available in CLINIQ yet/i)
    expect(dialog.querySelector('input')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
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
