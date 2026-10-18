import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithRouter } from '../../test/renderWithRouter'
import { CalendarPage } from './CalendarPage'

describe('Clinic Calendar', () => {
  it('keeps the existing calendar controls on its own top-level screen', async () => {
    const user = userEvent.setup()
    renderWithRouter(<CalendarPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Clinic calendar' })).toBeInTheDocument()
    expect(await screen.findByRole('radiogroup', { name: 'Calendar period' })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Weekly' }))
    expect(within(screen.getByRole('radiogroup', { name: 'Calendar period' })).getByRole('radio', { name: 'Weekly' })).toHaveAttribute('aria-checked', 'true')
  })

  it('keeps Admin calendar days view-only', async () => {
    renderWithRouter(<CalendarPage viewer={{ id: 'admin', name: 'Principal', role: 'admin' }} />)
    await screen.findByRole('radiogroup', { name: 'Calendar period' })
    expect(screen.queryByRole('button', { name: /open day/i })).not.toBeInTheDocument()
  })
})
