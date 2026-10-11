import { renderWithRouter } from '../../../test/renderWithRouter'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { getRecordedAuditEntries, resetMockDb } from '../../../lib/mock-db'
import { demoStudentNumber } from '../api/qrLookupApi'
import { QrMobileHubPage } from './QrMobileHubPage'

describe('QR Mobile Hub', () => {
  beforeEach(() => resetMockDb())

  it('shows Staff mobile quick actions after lookup', async () => {
    const user = userEvent.setup()
    renderWithRouter(<QrMobileHubPage />)

    expect(screen.getByRole('heading', { name: 'QR Scan / Lookup' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Emergency' })).toHaveAttribute(
      'href',
      '/incidents/new',
    )
    await user.click(screen.getByRole('button', { name: 'Use Demo Scan' }))

    expect(await screen.findByRole('heading', { name: /quick actions/i })).toBeInTheDocument()
    const studentNumber = await demoStudentNumber()
    expect(screen.getByRole('link', { name: 'Record Visit' })).toHaveAttribute(
      'href',
      `/visits/new?student=${studentNumber}`,
    )
    expect(screen.getByRole('link', { name: 'Log Emergency' })).toHaveAttribute(
      'href',
      `/incidents/new?student=${studentNumber}`,
    )
    expect(screen.getByRole('link', { name: 'View Full Profile' })).toHaveAttribute(
      'href',
      `/students/${studentNumber}`,
    )
    expect(screen.getByRole('link', { name: 'Dispense Medicine' })).toHaveAttribute(
      'href',
      `/inventory/dispense?student=${studentNumber}`,
    )
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toEqual(['scan'])
  })

  it('marks the manual search optional, and a picked Student Number alone is enough to look up', async () => {
    const user = userEvent.setup()
    renderWithRouter(<QrMobileHubPage />)

    const field = screen.getByRole('combobox', { name: 'Enter Student Number or student name (optional)' })
    expect(field).not.toBeRequired()
    await user.type(field, '202600001')
    await screen.findByRole('option', { name: /2026-00001/ })
    await user.keyboard('{Enter}')

    expect(await screen.findByRole('heading', { name: /quick actions/i })).toBeInTheDocument()
  })

  it('shows Instructor read-only lookup with no action buttons', async () => {
    const user = userEvent.setup()
    renderWithRouter(<QrMobileHubPage viewer={{ id: 'usr-pe', name: 'PE Instructor', role: 'instructor' }} />)

    expect(screen.getByRole('heading', { name: 'Instructor Lookup' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Emergency' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Use Demo Scan' }))

    expect(await screen.findByRole('heading', { name: 'Read-only health history' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Record Visit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Log Emergency' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Dispense Medicine' })).not.toBeInTheDocument()
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toEqual(['scan'])
  })
})
