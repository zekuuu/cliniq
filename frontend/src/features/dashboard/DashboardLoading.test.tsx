import { renderWithRouter } from '../../test/renderWithRouter'
import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'

// Hold both requests open forever so the first-load state can be inspected.
vi.mock('./api/dashboardApi', () => ({
  fetchDashboardSummary: () => new Promise(() => {}),
  fetchCalendarDays: () => new Promise(() => {}),
  fetchHolidays: () => new Promise(() => {}),
  fetchBackupIndicator: () => new Promise(() => {}),
}))
vi.mock('react-chartjs-2', () => ({ Bar: () => null, Line: () => null }))

/**
 * Design-System.md, Feedback & System States: every section that fetches on load shows a skeleton
 * matching its own final shape. Not one generic page block, not a spinner, not a blank area.
 */
describe('Clinic Overview Dashboard: first-load skeletons', () => {
  it('shows a shaped skeleton for every data section', () => {
    const { container } = renderWithRouter(<DashboardPage />)
    const q = (name: string) => container.querySelectorAll(`[data-skeleton="${name}"]`)

    // Stat card row: five card-shaped placeholders with their real labels.
    expect(q('stat-card')).toHaveLength(5)
    for (const label of [
      'Clinic visits',
      'Incidents',
      'Incomplete records',
      'Low-stock items',
      'Active students',
    ]) {
      expect(container.textContent).toContain(label)
    }

    // Three alert lists, each with its real title and list-row-shaped placeholders.
    const lists = q('list-card')
    expect(lists).toHaveLength(3)
    const titles = [...lists].map((el) => el.textContent)
    expect(titles[0]).toContain('Due & upcoming follow-ups')
    expect(titles[1]).toContain('Frequent-visitor warnings')
    expect(titles[2]).toContain('Low-stock & expiring items')
    for (const list of lists) {
      expect(list.querySelectorAll('[data-skeleton="list-row"]').length).toBeGreaterThan(0)
    }

    // Trends row: a line-chart frame plus the common-complaints list with five bar rows.
    expect(q('complaint-trends')).toHaveLength(1)
    expect(q('trend-chart')).toHaveLength(1)
    expect(q('complaints-list')).toHaveLength(1)
    expect(q('complaint-row')).toHaveLength(5)

    // Calendar: renders independently with a month-grid placeholder (default view).
    expect(screen.getByRole('heading', { name: 'Calendar' })).toBeInTheDocument()
    const month = q('calendar-month')
    expect(month).toHaveLength(1)
    expect(within(month[0] as HTMLElement).getAllByText(/^\d{1,2}$/).length).toBeGreaterThanOrEqual(
      28,
    )

    // Loading is announced, and no spinner is used anywhere.
    expect(screen.getAllByRole('status')).toHaveLength(2)
    expect(screen.getByText('Loading clinic overview…')).toBeInTheDocument()
    expect(screen.getByText('Loading calendar…')).toBeInTheDocument()
    expect(container.querySelector('.animate-spin')).toBeNull()
  })
})
