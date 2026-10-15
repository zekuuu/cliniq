import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionUser } from '../../lib/mock-db'
import { DashboardPage } from './DashboardPage'

// One switch per data source, so a test can fail one view's request and keep the others working.
const fail = vi.hoisted(() => ({ summary: false, calendar: false }))
vi.mock('./api/dashboardApi', async (importOriginal) => {
  const api = await importOriginal<typeof import('./api/dashboardApi')>()
  return {
    ...api,
    fetchDashboardSummary: (...args: Parameters<typeof api.fetchDashboardSummary>) =>
      fail.summary ? Promise.reject(new Error('summary down')) : api.fetchDashboardSummary(...args),
    fetchCalendarDays: (...args: Parameters<typeof api.fetchCalendarDays>) =>
      fail.calendar ? Promise.reject(new Error('calendar down')) : api.fetchCalendarDays(...args),
  }
})
vi.mock('react-chartjs-2', () => ({ Bar: () => null, Line: () => null }))

const ADMIN: SessionUser = { id: 'user-admin-01', name: 'Admin', role: 'admin' }

/** Renders the Dashboard after another screen, with a probe that shows the URL and can go Back. */
function renderDashboard({ route = '/', viewer }: { route?: string; viewer?: SessionUser } = {}) {
  function Probe() {
    const location = useLocation()
    const navigate = useNavigate()
    return (
      <>
        <output aria-label="Location">{location.pathname + location.search}</output>
        <button type="button" onClick={() => navigate(-1)}>
          History back
        </button>
      </>
    )
  }
  render(
    <MemoryRouter initialEntries={['/previous', route]} initialIndex={1}>
      <Routes>
        <Route path="/previous" element={<p>Previous screen</p>} />
        <Route
          path="/"
          element={
            <>
              <DashboardPage viewer={viewer} />
              <Probe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

const tab = (name: string) => screen.getByRole('tab', { name: new RegExp(`^${name}`) })
const visiblePanel = () => screen.getByRole('tabpanel')
const location = () => screen.getByRole('status', { name: 'Location' }).textContent

describe('Clinic Overview Dashboard: views (ADR-025)', () => {
  beforeEach(() => {
    fail.summary = false
    fail.calendar = false
  })

  it('opens on Overview, which holds the alerts (regression: alerts stay in the default view)', async () => {
    renderDashboard()
    expect(tab('Overview')).toHaveAttribute('aria-selected', 'true')
    const panel = visiblePanel()
    expect(panel).toHaveAttribute('aria-labelledby', tab('Overview').id)
    for (const name of [
      /due & upcoming follow-ups/i,
      /frequent-visitor warnings/i,
      /low-stock & expiring items/i,
    ]) {
      expect(await within(panel).findByRole('heading', { name })).toBeInTheDocument()
    }
    expect(within(panel).getByRole('region', { name: 'Summary counts' })).toBeInTheDocument()
    // The alert count rides on the Overview tab, so it's visible from every view.
    expect(tab('Overview')).toHaveAccessibleName(/^Overview, \d+ alerts?$/)
  })

  it('shows only the selected view’s section', async () => {
    const user = renderDashboard()
    await within(visiblePanel()).findByRole('region', { name: 'Summary counts' })

    await user.click(tab('Trends'))
    // A switch shows the view's own skeleton briefly, then its content.
    expect(visiblePanel().querySelector('[data-skeleton="complaint-trends"]')).not.toBeNull()
    expect(
      await within(visiblePanel()).findByRole('heading', { name: /visits trend/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Summary counts' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /^calendar$/i })).not.toBeInTheDocument()

    await user.click(tab('Calendar'))
    expect(visiblePanel().querySelector('[data-skeleton^="calendar-"]')).not.toBeNull()
    expect(within(visiblePanel()).getByRole('heading', { name: /^calendar$/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /visits trend/i })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /due & upcoming follow-ups/i }),
    ).not.toBeInTheDocument()
  })

  it('keeps the calendar’s period, mode, and open day across a round trip', async () => {
    const user = renderDashboard({ route: '/?view=calendar' })
    await user.click(screen.getByRole('radio', { name: 'Weekly' }))
    await user.click(screen.getByRole('button', { name: /^Next ?Week$/ }))
    const label = within(visiblePanel()).getByRole('heading', { level: 3 }).textContent
    await user.click(screen.getByRole('radio', { name: /table/i }))

    await user.click(tab('Overview'))
    await user.click(tab('Calendar'))
    expect(screen.getByRole('radio', { name: 'Weekly' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: /table/i })).toHaveAttribute('aria-checked', 'true')
    expect(within(visiblePanel()).getByRole('heading', { level: 3 })).toHaveTextContent(label!)
  })

  it('reads ?view= and falls back to Overview for an unknown value', async () => {
    renderDashboard({ route: '/?view=trends' })
    expect(tab('Trends')).toHaveAttribute('aria-selected', 'true')
    expect(
      await within(visiblePanel()).findByRole('heading', { name: /visits trend/i }),
    ).toBeInTheDocument()
  })

  it('falls back to Overview for an unknown ?view=', () => {
    renderDashboard({ route: '/?view=everything' })
    expect(tab('Overview')).toHaveAttribute('aria-selected', 'true')
  })

  it('writes the view to the query string without adding history entries', async () => {
    const user = renderDashboard()
    expect(location()).toBe('/')
    await user.click(tab('Calendar'))
    expect(location()).toBe('/?view=calendar')
    await user.click(tab('Trends'))
    expect(location()).toBe('/?view=trends')
    await user.click(tab('Overview'))
    expect(location()).toBe('/')
    // Back still leaves the Dashboard in one step.
    await user.click(screen.getByRole('button', { name: 'History back' }))
    expect(screen.getByText('Previous screen')).toBeInTheDocument()
  })

  it('keeps hidden views in the page for print, and keeps the tabs out of it', async () => {
    renderDashboard()
    await within(visiblePanel()).findByRole('region', { name: 'Summary counts' })
    const panels = screen.getAllByRole('tabpanel', { hidden: true })
    expect(panels).toHaveLength(3)
    for (const panel of panels) expect(panel).toHaveAttribute('data-print-all')
    expect(panels.filter((p) => p.hidden)).toHaveLength(2)
    expect(
      within(panels[1]).getByRole('heading', { name: /visits trend/i, hidden: true }),
    ).toBeInTheDocument()
    expect(
      within(panels[2]).getByRole('heading', { name: /^calendar$/i, hidden: true }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tablist')).toHaveClass('print:hidden')
  })

  it('hides the Date range on the Calendar view, which has its own period', async () => {
    const user = renderDashboard()
    await within(visiblePanel()).findByRole('region', { name: 'Summary counts' })
    expect(screen.getByRole('button', { name: 'Date range' })).toBeInTheDocument()
    await user.click(tab('Calendar'))
    expect(screen.queryByRole('button', { name: 'Date range' })).not.toBeInTheDocument()
    // The "Showing …" line stays in the print header only.
    expect(screen.getByText(/^Showing /)).toHaveClass('hidden', 'print:inline')
    await user.click(tab('Trends'))
    expect(screen.getByRole('button', { name: 'Date range' })).toHaveTextContent('This month')
  })

  it('gives Staff and Admin the same three views; Admin’s Overview has no excuse letters', async () => {
    renderDashboard()
    expect(screen.getAllByRole('tab').map((t) => t.textContent?.replace(/\d.*$/, ''))).toEqual([
      'Overview',
      'Trends',
      'Calendar',
    ])
    expect(
      await within(visiblePanel()).findByRole('heading', {
        name: /excuse letters awaiting approval/i,
      }),
    ).toBeInTheDocument()
  })

  it('shows Admin a complete Overview without the Staff-only parts', async () => {
    renderDashboard({ viewer: ADMIN })
    expect(screen.getAllByRole('tab')).toHaveLength(3)
    const panel = visiblePanel()
    expect(await within(panel).findByRole('region', { name: 'Summary counts' })).toBeInTheDocument()
    expect(within(panel).getByRole('region', { name: 'Alerts' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /excuse letters awaiting approval/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /backup status/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'New Visit' })).not.toBeInTheDocument()
  })

  it('keeps the other views working when the calendar fails', async () => {
    fail.calendar = true
    const user = renderDashboard({ route: '/?view=calendar' })
    expect(
      await within(visiblePanel()).findByText('Unable to load the calendar.'),
    ).toBeInTheDocument()
    await user.click(tab('Overview'))
    expect(
      await within(visiblePanel()).findByRole('region', { name: 'Summary counts' }),
    ).toBeInTheDocument()
    await user.click(tab('Trends'))
    expect(
      await within(visiblePanel()).findByRole('heading', { name: /visits trend/i }),
    ).toBeInTheDocument()
  })

  it('keeps the calendar working when the summary fails', async () => {
    fail.summary = true
    const user = renderDashboard()
    await waitFor(() =>
      expect(
        within(visiblePanel()).getByText('Unable to load the clinic overview.'),
      ).toBeInTheDocument(),
    )
    await user.click(tab('Calendar'))
    expect(
      await within(visiblePanel()).findAllByRole('button', { name: /\. Open day$/ }),
    ).not.toHaveLength(0)
    expect(within(visiblePanel()).queryByText(/^Unable to load/)).not.toBeInTheDocument()
  })
})
