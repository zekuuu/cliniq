import { renderWithRouter } from '../../test/renderWithRouter'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ParentNotificationPage } from './ParentNotificationPage'

describe('Parent Notification Log', () => {
  it('shows the selected student emergency contact context', async () => {
    renderWithRouter(<ParentNotificationPage />)

    expect(await screen.findByRole('heading', { name: 'Parent Notification Log' })).toBeInTheDocument()
    expect(screen.getByLabelText('Emergency contact details')).toBeInTheDocument()
    expect(screen.getByText('Relationship')).toBeInTheDocument()
    expect(screen.getByText('Verification')).toBeInTheDocument()
  })
})
