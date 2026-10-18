import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { SessionUser } from '../../lib/mock-db'
import { DashboardPage } from './DashboardPage'

vi.mock('react-chartjs-2', () => ({ Bar: () => null, Doughnut: () => null, Line: () => null }))

const ADMIN: SessionUser = { id: 'user-admin-01', name: 'Admin', role: 'admin' }

function Location() {
  const location = useLocation()
  return <output aria-label="Location">{location.pathname + location.search}</output>
}

function renderDashboard(route = '/', viewer?: SessionUser) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/" element={<><DashboardPage viewer={viewer} /><Location /></>} />
        <Route path="/calendar" element={<><p>Calendar screen</p><Location /></>} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

describe('Clinic Overview Dashboard: views', () => {
  it('keeps operational alerts in Overview and moves calendar out of the tab strip', async () => {
    renderDashboard()
    await screen.findByRole('region', { name: 'Summary counts' })
    expect(screen.getByRole('tab', { name: /^Overview/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Trends' })).toBeInTheDocument()
    expect(screen.getByLabelText('More items needing attention')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /frequent-visitor warnings/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^calendar$/i })).not.toBeInTheDocument()
  })

  it('switches between Overview and Trends with replace navigation', async () => {
    const user = renderDashboard()
    await screen.findByRole('region', { name: 'Summary counts' })
    await user.click(screen.getByRole('tab', { name: 'Trends' }))
    expect(screen.getByRole('status', { name: 'Location' })).toHaveTextContent('/?view=trends')
    expect(await screen.findByRole('heading', { name: /visits trend/i })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Summary counts' })).not.toBeInTheDocument()
  })

  it('redirects an old calendar tab link to the standalone Calendar screen', () => {
    renderDashboard('/?view=calendar')
    expect(screen.getByText('Calendar screen')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Location' })).toHaveTextContent('/calendar')
  })

  it('keeps Admin counts static when the linked detail screen is Staff-only', async () => {
    renderDashboard('/', ADMIN)
    await screen.findByRole('region', { name: 'Summary counts' })
    const summary = screen.getByRole('region', { name: 'Summary counts' })
    expect(within(summary).queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'New Visit' })).not.toBeInTheDocument()
  })
})
