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
    expect(screen.queryByAltText('Mendez Christian Academy logo')).not.toBeInTheDocument()
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

  it('keeps the demo accounts and the simulated-auth notice off the page until asked for', async () => {
    const user = userEvent.setup()
    renderLogin()

    expect(screen.queryByText('demo.nurse')).not.toBeInTheDocument()
    expect(screen.queryByText(/authentication is simulated/i)).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Sign In' })).toHaveLength(1)

    const trigger = screen.getByRole('button', { name: 'Demo Accounts' })
    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Demo accounts' })
    for (const username of ['demo.nurse', 'demo.principal', 'demo.pe', 'demo.pe2']) {
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
