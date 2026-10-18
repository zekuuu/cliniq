import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithRouter } from '../../test/renderWithRouter'
import { DashboardPage } from './DashboardPage'

vi.mock('react-chartjs-2', () => {
  const Stub = (props: { 'aria-label'?: string }) => <div role="img" aria-label={props['aria-label']} />
  return { Bar: Stub, Doughnut: Stub, Line: Stub }
})

describe('Clinic Overview Dashboard', () => {
  it('puts the requested operational totals before its lower-detail sections', async () => {
    renderWithRouter(<DashboardPage />)
    const summary = await screen.findByRole('region', { name: 'Summary counts' })
    for (const label of ['Clinic visits', 'Incidents', 'Active students', 'Pending excuse letters', 'Due & overdue follow-ups']) {
      expect(within(summary).getByText((_, element) => element?.tagName === 'P' && element.textContent === label)).toBeInTheDocument()
    }
    expect(screen.getByRole('heading', { name: /frequent-visitor warnings/i })).toBeInTheDocument()
  })

  it('drills Staff into range-aware logs and attention filters', async () => {
    renderWithRouter(<DashboardPage />)
    await screen.findByRole('region', { name: 'Summary counts' })
    expect(screen.getByRole('link', { name: 'Clinic visits' })).toHaveAttribute('href', expect.stringMatching(/^\/visits\?from=\d{4}-\d{2}-\d{2}&to=/))
    expect(screen.getByRole('link', { name: 'Incidents' })).toHaveAttribute('href', expect.stringMatching(/^\/incidents\?from=\d{4}-\d{2}-\d{2}&to=/))
    expect(screen.getByRole('link', { name: /low stock/i })).toHaveAttribute('href', '/inventory?attention=low_stock')
    expect(screen.getByRole('link', { name: /expired or expiring/i })).toHaveAttribute('href', '/inventory?attention=expiry')
    expect(screen.getByRole('link', { name: /incomplete records/i })).toHaveAttribute('href', '/students/incomplete')
  })

  it('keeps the Dashboard focused on Overview and Trends', async () => {
    const user = userEvent.setup()
    renderWithRouter(<DashboardPage />)
    await screen.findByRole('region', { name: 'Summary counts' })
    expect(screen.queryByRole('tab', { name: 'Calendar' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Trends' }))
    expect(await screen.findByRole('heading', { name: /visits trend/i })).toBeInTheDocument()
  })

  it('shows Admin the same counts without links to Staff-only screens', async () => {
    renderWithRouter(<DashboardPage viewer={{ id: 'admin', name: 'Principal', role: 'admin' }} />)
    const summary = await screen.findByRole('region', { name: 'Summary counts' })
    expect(within(summary).queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /low stock/i })).not.toBeInTheDocument()
  })
})
