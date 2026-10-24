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
  it('opens with Today as its date range', async () => {
    renderWithRouter(<DashboardPage />)

    await screen.findByRole('region', { name: 'Summary counts' })
    expect(screen.getByRole('button', { name: 'Date range' })).toHaveTextContent('Today')
  })

  it('puts the requested operational totals before its lower-detail sections', async () => {
    renderWithRouter(<DashboardPage />)
    const summary = await screen.findByRole('region', { name: 'Summary counts' })
    // Sidebar order: Students, Visits, Incidents, Follow-Ups.
    const order = ['Active students', 'Clinic visits', 'Pending excuse letters', 'Incidents', 'Due & overdue follow-ups']
    expect(within(summary).getAllByText((_, element) => element?.tagName === 'P' && order.includes(element.textContent ?? '')).map((p) => p.textContent)).toEqual(order)
    expect(within(summary).getByText((_, element) => element?.tagName === 'P' && element.textContent === 'Active students')).toHaveClass('text-brand-green-dark')
    expect(within(summary).getByText((_, element) => element?.tagName === 'P' && element.textContent === 'Pending excuse letters')).toHaveClass('text-warning')
    expect(within(summary).getByText((_, element) => element?.tagName === 'P' && element.textContent === 'Due & overdue follow-ups')).toHaveClass('text-warning')
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

  it('sends Staff from the Pending excuse letters card to the filtered Visit Log, with no duplicate list', async () => {
    renderWithRouter(<DashboardPage />)
    await screen.findByRole('region', { name: 'Summary counts' })
    expect(screen.getByRole('link', { name: 'Pending excuse letters' })).toHaveAttribute('href', '/visits?letter=pending')
    expect(screen.queryByRole('heading', { name: /excuse letters awaiting approval/i })).not.toBeInTheDocument()
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
