import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { createMemoryRouter, Link, RouterProvider, useNavigate } from 'react-router'
import { describe, expect, it } from 'vitest'
import { useCancelNavigation } from './useCancelNavigation'

function Form() {
  const [text, setText] = useState('')
  const navigate = useNavigate()
  const { cancel, discardDialog, allowLeave } = useCancelNavigation('/list', text !== '')
  return (
    <>
      {discardDialog}
      <label>Name<input value={text} onChange={(event) => setText(event.target.value)} /></label>
      <button onClick={cancel}>Cancel</button>
      <button onClick={() => { allowLeave(); void navigate('/saved') }}>Save</button>
      <button onClick={() => void navigate('/form?step=2')}>Same screen</button>
      <Link to="/list">Sidebar link</Link>
    </>
  )
}

function renderForm() {
  const router = createMemoryRouter(
    [{ path: '/list', element: <h1>List</h1> }, { path: '/saved', element: <h1>Saved</h1> }, { path: '/form', element: <Form /> }],
    { initialEntries: ['/list', '/form'], initialIndex: 1 },
  )
  render(<RouterProvider router={router} />)
  return { user: userEvent.setup(), router }
}

/** ADR-021: every way out of a dirty form asks; a clean form and a save never do. */
describe('Unsaved-input guard', () => {
  it('asks when a link leaves a dirty form; Keep Editing stays, Discard leaves', async () => {
    const { user } = renderForm()
    await user.type(screen.getByLabelText('Name'), 'a')
    await user.click(screen.getByRole('link', { name: 'Sidebar link' }))
    const dialog = await screen.findByRole('dialog', { name: 'Discard unsaved changes?' })
    await user.click(within(dialog).getByRole('button', { name: 'Keep Editing' }))
    expect(screen.getByLabelText('Name')).toHaveValue('a')
    await user.click(screen.getByRole('link', { name: 'Sidebar link' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard Changes' }))
    expect(await screen.findByRole('heading', { name: 'List' })).toBeInTheDocument()
  })

  it('asks on browser Back', async () => {
    const { user, router } = renderForm()
    await user.type(screen.getByLabelText('Name'), 'a')
    await router.navigate(-1)
    expect(await screen.findByRole('dialog', { name: 'Discard unsaved changes?' })).toBeInTheDocument()
  })

  it('asks once on Cancel, not twice', async () => {
    const { user } = renderForm()
    await user.type(screen.getByLabelText('Name'), 'a')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Discard Changes' }))
    expect(await screen.findByRole('heading', { name: 'List' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not ask on a clean form, after a save, or for a change that stays on the screen', async () => {
    const { user } = renderForm()
    await user.type(screen.getByLabelText('Name'), 'a')
    await user.click(screen.getByRole('button', { name: 'Same screen' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('heading', { name: 'Saved' })).toBeInTheDocument()
  })

  it('lets a clean form leave at once', async () => {
    const { user } = renderForm()
    await user.click(screen.getByRole('link', { name: 'Sidebar link' }))
    expect(await screen.findByRole('heading', { name: 'List' })).toBeInTheDocument()
  })
})
