import { renderWithRouter } from '../../test/renderWithRouter'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getRecordedAuditEntries } from '../../lib/mock-db'
import { ParentNotificationPage } from './ParentNotificationPage'

describe('Parent Notification Log', () => {
  it('shows the selected student emergency contact context', async () => {
    renderWithRouter(<ParentNotificationPage />)

    expect(await screen.findByRole('heading', { name: 'Parent Notification Log' })).toBeInTheDocument()
    expect(screen.getByLabelText('Emergency contact details')).toBeInTheDocument()
    expect(screen.getByText('Guardian')).toBeInTheDocument()
    expect(screen.getByText('Verified')).toBeInTheDocument()
  })

  it('shows every emergency contact, primary first, and does not write a print audit entry', async () => {
    renderWithRouter(<ParentNotificationPage incidentId="incident-0017" />)

    expect(await screen.findByText('Arnel Cabrera')).toBeInTheDocument()
    expect(screen.getByText('Bea Cabrera')).toBeInTheDocument()
    expect(screen.getByText('Primary')).toBeInTheDocument()
    expect(screen.getByText('Needs verification')).toBeInTheDocument()
    expect(getRecordedAuditEntries()).toEqual([])
  })
})
