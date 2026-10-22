import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithRouter } from '../../test/renderWithRouter'
import { IncidentLogListPage } from './IncidentLogListPage'
import { defaultIncidentLogRange, fetchIncidentLog } from './api/incidentLogApi'
import { maskLrn } from '../../lib/lrn'

describe('Incident Log', () => {
  it('links to New Incident from the page header', async () => {
    renderWithRouter(<IncidentLogListPage />)
    expect(await screen.findByRole('link', { name: 'New Incident' })).toHaveAttribute('href', '/incidents/new')
  })

  it('does not repeat the all-incidents scope in the page header', async () => {
    renderWithRouter(<IncidentLogListPage />)

    await screen.findByRole('heading', { name: 'Incident Log' })
    expect(screen.queryByText('All incidents')).not.toBeInTheDocument()
  })

  it('opens on Today while retaining the full date-range menu', async () => {
    renderWithRouter(<IncidentLogListPage />)

    expect(await screen.findByRole('button', { name: 'Date range' })).toHaveTextContent('Today')
  })

  it('renders a privacy-safe multi-student incident list with completion statuses', async () => {
    renderWithRouter(<IncidentLogListPage />)

    expect(await screen.findByRole('heading', { name: 'Incident Log' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'LRN' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Reason / description' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /full name/i })).not.toBeInTheDocument()
  })

  it('searches incidents by actual LRN', async () => {
    const user = userEvent.setup()
    const all = await fetchIncidentLog({ ...defaultIncidentLogRange(), search: '', completion: 'all' })
    const [incident] = all
    const expected = all.filter((row) => row.lrn === incident.lrn).length
    renderWithRouter(<IncidentLogListPage />)
    await screen.findByRole('heading', { name: 'Incident Log' })
    await user.type(screen.getByLabelText('Search'), incident.lrn)
    expect(await screen.findByText(`${expected} record${expected === 1 ? '' : 's'} shown`)).toBeInTheDocument()
    expect(screen.getAllByText(maskLrn(incident.lrn))).toHaveLength(expected)
  })

  it('filters by completion state', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentLogListPage />)
    await screen.findByRole('heading', { name: 'Incident Log' })
    await user.click(screen.getByRole('radio', { name: 'Needs completion' }))
    await waitFor(() => expect(screen.getAllByText('Needs completion').length).toBeGreaterThan(0))
  })
})
