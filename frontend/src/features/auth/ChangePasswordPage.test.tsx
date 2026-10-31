import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { authenticateMockUser, resetMockAuth, resetMockDb } from '../../lib/mock-db'
import { ChangePasswordPage } from './ChangePasswordPage'

const viewer = { id: 'user-staff-01', name: 'Clinician', role: 'staff' as const }

async function fill(current: string, next: string) {
  render(<MemoryRouter><ChangePasswordPage viewer={viewer} /></MemoryRouter>)
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/current password/i), current)
  await user.type(screen.getByLabelText(/^new password/i), next)
  await user.type(screen.getByLabelText(/confirm new password/i), next)
  await user.click(screen.getByRole('button', { name: 'Save Password' }))
}

describe('Change Password', () => {
  beforeEach(() => {
    resetMockDb()
    resetMockAuth()
  })

  it('refuses a wrong current password', async () => {
    await fill('not-the-password', 'a-new-password')
    expect(await screen.findByRole('alert')).toHaveTextContent('Your current password is incorrect.')
  })

  it('changes the password, so the new one signs in', async () => {
    await fill('demo-nurse', 'a-new-password')
    expect(await screen.findByRole('status')).toHaveTextContent('Password changed.')
    await expect(authenticateMockUser('demo.nurse', 'a-new-password')).resolves.toMatchObject({ user: { id: viewer.id } })
  })
})
