import { act, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { pickMonth } from '../../test/pickDate'
import { ReportsPage } from './ReportsPage'
import { todayISO } from '../../lib/dates'
import { getMonthlyReport } from '../../lib/mock-db'
import { maskLrn } from '../../lib/lrn'

// jsdom has no canvas. Replace the chart with a stub that keeps its accessible label.
const barMock = vi.hoisted(() => ({ props: undefined as unknown }))

vi.mock('react-chartjs-2', () => {
  const Stub = (props: { 'aria-label'?: string }) => (
    <div role="img" aria-label={props['aria-label']} />
  )
  return {
    Bar: (props: { 'aria-label'?: string; options?: unknown }) => {
      barMock.props = props
      return <Stub {...props} />
    },
    Line: Stub,
    Doughnut: Stub,
  }
})

const STAFF = { id: 'usr-nurse', name: 'Nurse', role: 'staff' } as const

const thisMonth = () => getMonthlyReport(todayISO().slice(0, 7))

function renderReports(viewer = STAFF, reportView?: 'monthly' | 'health') {
  return render(<MemoryRouter initialEntries={[{ pathname: '/reports', state: reportView ? { reportView } : null }]}><ReportsPage viewer={viewer} /></MemoryRouter>)
}

describe('Reports', () => {
  it('switches between print-friendly report views', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'print').mockImplementation(() => {})
    renderReports({ id: 'usr-nurse', name: 'Nurse', role: 'staff' })
    expect(await screen.findByRole('heading', { name: 'Monthly Report' })).toBeInTheDocument()
    expect((await screen.findAllByRole('columnheader')).map((header) => header.textContent)).toContainEqual(expect.stringMatching(/^[A-Z][a-z]{2} \d+–\d+$/))
    await user.click(screen.getByRole('tab', { name: 'Incident register' }))
    expect(screen.getByRole('heading', { name: 'Incident register' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Complaint summary' }))
    expect(screen.getByRole('heading', { name: 'Complaint summary' })).toBeInTheDocument()
  })

  it('uses the linked student’s actual LRN in the incident archive', async () => {
    const user = userEvent.setup()
    renderReports({ id: 'usr-nurse', name: 'Nurse', role: 'staff' })
    await user.click(screen.getByRole('tab', { name: 'Incident register' }))
    const incident = (await thisMonth()).incidents.find((row) => row.patient.kind === 'student')!
    const archive = await screen.findByRole('table', { name: 'Incident register' })
    expect(within(archive).getAllByText(maskLrn(incident.patient.number)).length).toBeGreaterThan(0)
  })

  it('prints the full LRN in the incident register while the screen stays masked', async () => {
    const user = userEvent.setup()
    renderReports({ id: 'usr-nurse', name: 'Nurse', role: 'staff' })
    await user.click(screen.getByRole('tab', { name: 'Incident register' }))
    const incident = (await thisMonth()).incidents.find((row) => row.patient.kind === 'student')!
    const archive = await screen.findByRole('table', { name: 'Incident register' })
    expect(within(archive).queryByText(incident.patient.number)).not.toBeInTheDocument()
    // The print listener is attached in an effect, so retry until the printout mounts.
    await waitFor(() => {
      act(() => {
        window.dispatchEvent(new Event('beforeprint'))
      })
      expect(document.body.querySelector('[data-print-document]')?.textContent).toContain(incident.patient.number)
    })
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
  })

  it('lists the newest incidents first, matching the Incident Log', async () => {
    const user = userEvent.setup()
    renderReports()
    await user.click(screen.getByRole('tab', { name: 'Incident register' }))

    const rows = (await thisMonth()).incidents
    expect(rows.map((incident) => incident.time)).toEqual(
      [...rows.map((incident) => incident.time)].sort((a, b) => b.localeCompare(a)),
    )
  })

  it('shows the health summary as a sorted bar chart by default, with a table view', async () => {
    const user = userEvent.setup()
    renderReports()
    await user.click(screen.getByRole('tab', { name: 'Complaint summary' }))

    const rows = (await thisMonth()).complaintCounts
    const chart = await screen.findByRole('img', { name: /clinic visits by complaint/i })
    expect(chart).toHaveAccessibleName(
      `Clinic visits by complaint: ${rows.map((r) => `${r.complaint} ${r.count}`).join('; ')}.`,
    )
    expect(screen.getByRole('radio', { name: 'Chart' })).toBeChecked()

    await user.click(screen.getByRole('radio', { name: 'Table' }))
    const table = screen.getByRole('table', { name: 'Complaint summary by complaint' })
    const bodyRows = within(table).getAllByRole('row').slice(1)
    expect(bodyRows.map((row) => within(row).getByRole('rowheader').textContent)).toEqual(
      rows.map((r) => r.complaint),
    )
    // Counts run from most to fewest visits.
    expect(rows.map((r) => r.count)).toEqual([...rows.map((r) => r.count)].sort((a, b) => b - a))
  })

  it('uses the shared smooth white tooltip behavior for the health summary chart', async () => {
    const user = userEvent.setup()
    renderReports()
    await user.click(screen.getByRole('tab', { name: 'Complaint summary' }))
    await screen.findByRole('img', { name: /clinic visits by complaint/i })

    const options = (barMock.props as {
      options?: {
        animation?: { duration?: number; easing?: string } | false
        transitions?: { active?: { animation?: { duration?: number; easing?: string } } }
        plugins?: { tooltip?: { enabled?: boolean; external?: unknown } }
      }
    }).options
    expect(options?.animation).toMatchObject({ duration: 280, easing: 'easeOutCubic' })
    expect(options?.transitions?.active?.animation).toMatchObject({
      duration: 160,
      easing: 'easeOutCubic',
    })
    expect(options?.plugins?.tooltip).toMatchObject({ enabled: false })
    expect(options?.plugins?.tooltip?.external).toEqual(expect.any(Function))
  })

  it('keeps both the chart and the table in the page so both print', async () => {
    const user = userEvent.setup()
    const { container } = renderReports()
    await user.click(screen.getByRole('tab', { name: 'Complaint summary' }))
    await screen.findByRole('img', { name: /clinic visits by complaint/i })

    // Chart view: the table is hidden on screen but printed.
    expect(container.querySelector('[data-table="health-summary"]')).toHaveClass('hidden', 'print:block')

    // Table view: the chart stays mounted off-screen and hidden from assistive tech, for print.
    await user.click(screen.getByRole('radio', { name: 'Table' }))
    const chartWrapper = container.querySelector('[data-chart="health-summary"]')!.parentElement!
    expect(chartWrapper).toHaveAttribute('aria-hidden', 'true')
    expect(chartWrapper).toHaveClass('print:static')
  })

  it('shows an empty state instead of a blank chart for a month with no visits', async () => {
    const user = userEvent.setup()
    renderReports()
    await user.click(screen.getByRole('tab', { name: 'Complaint summary' }))
    await pickMonth(user, screen.getByLabelText('Report month'), '2000-01')

    expect(await screen.findByText('No clinic visits recorded this month')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /clinic visits by complaint/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Chart' })).not.toBeInTheDocument()
  })

  it('opens the matching dashboard report tab from router state', async () => {
    renderReports(STAFF, 'health')
    expect(await screen.findByRole('heading', { name: 'Complaint summary' })).toBeInTheDocument()
  })
})
