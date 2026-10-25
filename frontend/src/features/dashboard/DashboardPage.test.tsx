import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithRouter } from '../../test/renderWithRouter'
import { DashboardPage } from './DashboardPage'
import { db } from '../../lib/mock-db/store'

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

  it('lists the five most frequent visitors, with Show all for the rest (Zean, October 25, 2026)', async () => {
    const user = userEvent.setup()
    renderWithRouter(<DashboardPage />, { route: '/?range=all' })
    await screen.findByRole('region', { name: 'Summary counts' })
    await user.click(screen.getByRole('button', { name: 'Date range' }))
    await user.click(screen.getByRole('option', { name: 'All' }))
    const panel = screen.getByRole('region', { name: 'Frequent visitor warnings' })
    const list = () => within(panel).getAllByRole('listitem')
    const showAll = await within(panel).findByRole('button', { name: /^Show all \d+$/ })
    const total = Number(showAll.textContent?.match(/\d+/)?.[0])
    expect(total).toBeGreaterThan(5)
    expect(list()).toHaveLength(5)
    // The section title already says it; no per-row "Frequent-visit warning" badge (Zean, October 25, 2026).
    expect(within(panel).queryByText('Frequent-visit warning')).not.toBeInTheDocument()
    await user.click(showAll)
    expect(list()).toHaveLength(total)
    await user.click(within(panel).getByRole('button', { name: 'Show top 5' }))
    expect(list()).toHaveLength(5)
  })

  it.each([false, true])('prints the Frequent-visitor section only with the switch on (%s)', async (on) => {
    db().config.showFrequentVisitors = on
    renderWithRouter(<DashboardPage />)
    await screen.findByRole('region', { name: 'Summary counts' })
    expect(Boolean(screen.queryByRole('heading', { name: /frequent-visitor warnings/i }))).toBe(on)
    // The print listener is attached in an effect, so retry until the printout mounts.
    await waitFor(() => {
      act(() => {
        window.dispatchEvent(new Event('beforeprint'))
      })
      expect(document.body.querySelector('[data-print-document]')?.textContent).toMatch(/Clinic Overview Report/)
    })
    const doc = document.body.querySelector('[data-print-document]')
    expect(doc?.textContent?.includes('Frequent visitors')).toBe(on)
    expect(doc?.textContent?.includes('and frequent visitors')).toBe(on)
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
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

  it('shows Admin the same counts, linking only Students and Incidents (ADR-038)', async () => {
    renderWithRouter(<DashboardPage viewer={{ id: 'admin', name: 'Principal', role: 'admin' }} />)
    const summary = await screen.findByRole('region', { name: 'Summary counts' })
    expect(within(summary).getAllByRole('link')).toHaveLength(2)
    expect(within(summary).queryByRole('link', { name: /visits|follow-ups|letters/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /low stock/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /print/i })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Printing is done by the clinician.')).toBeInTheDocument()
  })
})
