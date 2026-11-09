import { configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { selectOption } from '../../test/selectOption'
import {
  getLatestRecordedMonth,
  getMonthlyReport,
  getSportsReport,
  getSportsReportContent,
  listSportsReports,
  listStudents,
  resetMockDb,
  setMockToday,
  SportsReportPermissionError,
  type SessionUser,
} from '../../lib/mock-db'
import { maskLrn } from '../../lib/lrn'
import { AdminReportsPage } from './AdminReportsPage'

vi.mock('react-chartjs-2', () => {
  const Stub = (props: { 'aria-label'?: string }) => (
    <div role="img" aria-label={props['aria-label']} />
  )
  return { Bar: Stub, Line: Stub, Doughnut: Stub }
})

configure({ asyncUtilTimeout: 5000 })

const ADMIN: SessionUser = { id: 'usr-principal', name: 'Principal', role: 'admin' }

const REPORT_TITLES = ['Monthly Report', 'Incident register', 'Symptom summary', 'Inventory sheet']

function renderAdminReports() {
  return render(
    <MemoryRouter initialEntries={['/reports']}>
      <AdminReportsPage viewer={ADMIN} />
    </MemoryRouter>,
  )
}

function monthLabel(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric',
  })
}

async function openReport(user: ReturnType<typeof userEvent.setup>, title: string) {
  const list = await screen.findByRole('list', { name: /^Reports for / })
  const row = within(list).getByText(title).closest('li')!
  const open = within(row).getByRole('button', { name: `Open ${title}` })
  await user.click(open)
  return open
}

describe('Admin Reports page (ADR-077)', () => {
  beforeEach(() => resetMockDb())

  it('shows only the Report month drop-down and the four monthly reports', async () => {
    renderAdminReports()
    expect(await screen.findByRole('heading', { level: 1, name: 'Reports' })).toBeInTheDocument()
    expect(screen.getByText(/printing and saving are done by the clinic staff/)).toBeInTheDocument()
    expect(await screen.findByLabelText('Report month')).toBeInTheDocument()
    const list = await screen.findByRole('list', { name: /^Reports for / })
    expect(
      within(list)
        .getAllByRole('heading', { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(REPORT_TITLES)
    expect(within(list).getAllByRole('button', { name: /^Open / })).toHaveLength(4)
    // Nothing else of the Staff page.
    expect(screen.queryByRole('link', { name: /Sports Report/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /print|save|export|download/i }),
    ).not.toBeInTheDocument()
  })

  it('defaults to the latest month with records', async () => {
    const latest = await getLatestRecordedMonth()
    renderAdminReports()
    expect(
      await screen.findByRole('list', { name: `Reports for ${monthLabel(latest)}` }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Report month')).toHaveTextContent(monthLabel(latest))
  })

  it('offers the current school year newest first, then the earlier recorded year labelled with its year', async () => {
    const user = userEvent.setup()
    renderAdminReports()
    await screen.findByRole('list', { name: /^Reports for / })
    await user.click(screen.getByLabelText('Report month'))
    const labels = within(screen.getByRole('listbox'))
      .getAllByRole('option')
      .map((o) => o.textContent)
    await user.keyboard('{Escape}')
    expect(labels).toContain('June 2026')
    expect(labels).toContain('May 2026 (2025–2026)')
    expect(labels.at(-1)).toBe('June 2025 (2025–2026)')
    expect(labels.filter((l) => l?.startsWith('June 2026'))).toHaveLength(1)
  })

  it('changes the list with the month', async () => {
    const user = userEvent.setup()
    renderAdminReports()
    const latest = await getLatestRecordedMonth()
    await screen.findByRole('list', { name: `Reports for ${monthLabel(latest)}` })
    const trigger = screen.getByLabelText('Report month')
    await user.click(trigger)
    const other = within(screen.getByRole('listbox'))
      .getAllByRole('option')
      .map((o) => o.textContent!)
      .find((label) => !label.startsWith(monthLabel(latest)))!
    await user.keyboard('{Escape}')
    await selectOption(user, trigger, other)
    expect(
      await screen.findByRole('list', { name: `Reports for ${other.replace(/ \(.+\)$/, '')}` }),
    ).toBeInTheDocument()
  })

  it('shows an honest empty state for a month with no visits', async () => {
    const user = userEvent.setup()
    // The seed is relative to today, so moving the store's today years ahead leaves the offered months empty.
    setMockToday('2030-03-01')
    renderAdminReports()
    await screen.findByRole('list', { name: /^Reports for / })
    const trigger = screen.getByLabelText('Report month')
    await user.click(trigger)
    const labels = within(screen.getByRole('listbox'))
      .getAllByRole('option')
      .map((o) => o.textContent!)
    await user.keyboard('{Escape}')
    for (const label of labels) {
      const value = new Date(`1 ${label.replace(/ \(.+\)$/, '')}`)
      const month = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`
      if ((await getMonthlyReport(month)).counts.visits === 0) {
        await selectOption(user, trigger, label)
        expect(await screen.findByText('No visits recorded this month')).toBeInTheDocument()
        return
      }
    }
    throw new Error('the seed offers no month without visits')
  })

  afterEach(() => setMockToday(null))

  it('opens a report as a view-only page with Back, and returns focus to its Open button', async () => {
    const user = userEvent.setup()
    renderAdminReports()
    const open = await openReport(user, 'Monthly Report')
    const paper = await screen.findByRole('article', { name: /^Monthly Clinic Report — / })
    expect(within(paper).getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(document.title).toMatch(/^CLINIQ Monthly Report, [A-Z][a-z]+ \d{4}$/)
    expect(
      screen.queryByRole('button', { name: /print|save|download|export|copy/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/Print \/ Save as PDF|Download|Export/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Report month')).not.toBeInTheDocument()
    const back = screen.getByRole('button', { name: 'Back' })
    expect(back).toHaveFocus()
    await user.click(back)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Open Monthly Report' })).toHaveFocus(),
    )
    expect(
      open.isConnected || screen.getByRole('button', { name: 'Open Monthly Report' }),
    ).toBeTruthy()
  })

  it('shows the same figures Staff print for the month', async () => {
    const user = userEvent.setup()
    renderAdminReports()
    const latest = await getLatestRecordedMonth()
    const report = await getMonthlyReport(latest)
    await openReport(user, 'Monthly Report')
    const totals = await screen.findByRole('table', {
      name: 'Monthly totals compared with the previous month',
    })
    const visits = within(totals).getByRole('row', { name: /^Clinic visits/ })
    expect(within(visits).getAllByRole('cell')[1]).toHaveTextContent(String(report.counts.visits))
    const incidents = within(totals).getByRole('row', { name: /^Incidents/ })
    expect(within(incidents).getAllByRole('cell')[1]).toHaveTextContent(
      String(report.counts.incidents),
    )
  })

  it('names no student and shows no full LRN in any report (masked LRNs only)', async () => {
    const user = userEvent.setup()
    const students = await listStudents({ fullLrn: true })
    const latest = await getLatestRecordedMonth()
    const report = await getMonthlyReport(latest)
    const student = report.incidents.find((row) => row.patient.kind === 'student')
    renderAdminReports()
    for (const title of ['Monthly Report', 'Incident register']) {
      await openReport(user, title)
      const paper = await screen.findByRole('article')
      const text = paper.textContent ?? ''
      for (const s of students) {
        expect(text).not.toContain(s.lrn)
        expect(text).not.toContain(s.fullName)
      }
      if (student) expect(text).toContain(maskLrn(student.patient.number))
      await user.click(screen.getByRole('button', { name: 'Back' }))
    }
  })

  it('keeps tab order: drop-down, then each Open; Enter opens', async () => {
    const user = userEvent.setup()
    renderAdminReports()
    await screen.findByRole('list', { name: /^Reports for / })
    screen.getByLabelText('Report month').focus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Open Monthly Report' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Open Incident register' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(
      await screen.findByRole('article', { name: /^Incident register — / }),
    ).toBeInTheDocument()
  })
})

describe('Report data guards for the Admin', () => {
  beforeEach(() => resetMockDb())

  it('lets the Admin read the aggregate monthly report', async () => {
    await expect(getMonthlyReport(await getLatestRecordedMonth())).resolves.toBeTruthy()
  })

  it('refuses every Sports Report read for the Admin', async () => {
    await expect(listSportsReports(ADMIN)).rejects.toBeInstanceOf(SportsReportPermissionError)
    await expect(getSportsReport('any', ADMIN)).rejects.toBeInstanceOf(SportsReportPermissionError)
    await expect(getSportsReportContent('any', ADMIN)).rejects.toBeInstanceOf(
      SportsReportPermissionError,
    )
  })
})
