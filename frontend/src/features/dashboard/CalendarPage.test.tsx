import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithRouter } from '../../test/renderWithRouter'
import { CalendarPage } from './CalendarPage'

describe('Activity calendar', () => {
  it('keeps the existing calendar controls on its own top-level screen', async () => {
    const user = userEvent.setup()
    renderWithRouter(<CalendarPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Activity calendar' })).toBeInTheDocument()
    expect(await screen.findByRole('radiogroup', { name: 'Calendar period' })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Weekly' }))
    expect(within(screen.getByRole('radiogroup', { name: 'Calendar period' })).getByRole('radio', { name: 'Weekly' })).toHaveAttribute('aria-checked', 'true')
  })

  it('lets the Admin open a day to manage its events, without the Staff-only View visits link (ADR-042)', async () => {
    const user = userEvent.setup()
    renderWithRouter(<CalendarPage viewer={{ id: 'admin', name: 'Principal', role: 'admin' }} />)
    const days = await screen.findAllByRole('button', { name: /open day/i })
    await user.click(days[0])
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /add event/i })).toBeInTheDocument()
    expect(within(dialog).queryByRole('link', { name: /view visits/i })).not.toBeInTheDocument()
  })
})
