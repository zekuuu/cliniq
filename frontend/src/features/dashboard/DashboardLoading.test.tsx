import { renderWithRouter } from '../../test/renderWithRouter'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'

vi.mock('./api/dashboardApi', () => ({
  fetchDashboardSummary: () => new Promise(() => {}),
  fetchBackupIndicator: () => new Promise(() => {}),
  fetchPendingExcuseLetters: () => new Promise(() => {}),
  fetchPeriodEvents: () => new Promise(() => {}),
}))
vi.mock('react-chartjs-2', () => ({ Bar: () => null, Line: () => null }))

describe('Clinic Overview Dashboard: first-load skeletons', () => {
  it('shows summary-shaped placeholders while its shared request loads', () => {
    const { container } = renderWithRouter(<DashboardPage />)
    expect(container.querySelectorAll('[data-skeleton="stat-card"]')).toHaveLength(5)
    for (const label of ['Clinic visits', 'Incidents', 'Active students', 'Pending excuse letters', 'Due & overdue follow-ups']) {
      expect(container.textContent).toContain(label)
    }
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(screen.getAllByText(/Loading clinic overview|Loading trends/)).toHaveLength(2)
    expect(container.querySelector('.animate-spin')).toBeNull()
  })
})
