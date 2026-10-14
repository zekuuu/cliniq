import { renderWithRouter } from '../../test/renderWithRouter'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockDb } from '../../lib/mock-db'
import { IncidentReportPage } from './IncidentReportPage'

describe('Incident Report', () => {
  beforeEach(() => resetMockDb())

  it('shows the no-treatment state and keeps approval available', async () => {
    renderWithRouter(<IncidentReportPage incidentId="incident-0020" />)

    expect(await screen.findByRole('heading', { name: 'Incident summary' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Treatment' })).toBeInTheDocument()
    expect(screen.getByText('No treatment recorded')).toBeInTheDocument()
    expect(screen.getByText('No treatment recorded. Check this is correct before approving.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve Report' })).toBeEnabled()
  })
})
