import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { setUserActive, type SessionUser } from '../../lib/mock-db'
import { pickStudent } from '../../test/pickStudent'
import { renderWithRouter } from '../../test/renderWithRouter'
import { NewVisitEntryPage } from './NewVisitEntryPage'

/** Sir Rey (October 25, 2026): "Assisted by" offers the staff accounts; Parent or guardian starts as the primary contact. */
const ADMIN: SessionUser = { id: 'user-admin-01', name: 'Gilan Avelida', role: 'admin' }
const moreButton = () => screen.getByRole('button', { name: /show (more|fewer) fields/i })

async function openForm(user: ReturnType<typeof userEvent.setup>) {
  renderWithRouter(<NewVisitEntryPage />)
  await pickStudent(user, '000000260001')
  await user.click(moreButton())
}

describe('Assisted by and Parent or guardian', () => {
  it('offers the active accounts only, and keeps free text for someone without an account', async () => {
    await setUserActive('user-staff-02', false, ADMIN)
    const user = userEvent.setup()
    await openForm(user)

    const field = screen.getByRole('combobox', { name: 'Assisted by' })
    await user.click(field)
    const names = within(await screen.findByRole('listbox')).getAllByRole('option').map((option) => option.textContent)
    expect(names).toEqual(['Gilan Avelida', 'Jennesse Baas'])

    await user.type(field, 'Ms. Reyes')
    expect(field).toHaveValue('Ms. Reyes')
    await user.clear(field)
    await user.type(field, 'jenn')
    await user.keyboard('{ArrowDown}{Enter}')
    expect(field).toHaveValue('Jennesse Baas')
  })

  it('prefills Parent or guardian from the primary emergency contact, and never overwrites what was typed', async () => {
    const user = userEvent.setup()
    await openForm(user)
    const guardian = screen.getByLabelText('Parent or guardian')
    expect(guardian).toHaveValue('Ferdie Quizon')

    await user.clear(guardian)
    await user.type(guardian, 'Aunt Rosa')
    await user.click(screen.getByRole('button', { name: /change student/i }))
    await pickStudent(user, '000000200002')
    expect(screen.getByLabelText('Parent or guardian')).toHaveValue('Aunt Rosa')
  })
})
