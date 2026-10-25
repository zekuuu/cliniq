import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONFIDENTIALITY_LINE } from '../components'
import { formatDateRange, todayISO } from '../lib/dates'
import { getDashboardSummary, getMonthlyReport, listAuditLog, listStudents } from '../lib/mock-db'
import { rangeForPreset } from '../lib/dateRange'
import { renderWithRouter } from '../test/renderWithRouter'
import { AuditLogPage } from './audit-log/AuditLogPage'
import { ExcuseLetterPage } from './clinic-visits/ExcuseLetterPage'
import { DashboardPage } from './dashboard/DashboardPage'
import { IncidentReportPage } from './emergency-response/IncidentReportPage'
import { ReportsPage } from './reports/ReportsPage'
import { StudentProfilePage } from './student-records/StudentProfilePage'
import { maskLrn } from '../lib/lrn'

vi.mock('react-chartjs-2', () => ({ Bar: () => null, Line: () => null, Doughnut: () => null }))

/*
 * Every Print produces a purpose-built A4 document (ADR-026, cliniq-print-patterns): letterhead, a
 * scope line, the printed-by footer, figures equal to the screen's, and no names or internal ids on a
 * multi-student printout. jsdom applies no print CSS, so this checks the markup; the PDF checks in the
 * session log cover layout.
 */

const STAFF = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' } as const
const ADMIN = { id: 'user-admin-01', name: 'Gilan Avelida', role: 'admin' } as const

/** Fires the browser's beforeprint, as Print or Ctrl+P does, and returns the mounted printout. */
function print(): HTMLElement {
  act(() => {
    window.dispatchEvent(new Event('beforeprint'))
  })
  const doc = document.body.querySelector<HTMLElement>('[data-print-document]')
  if (!doc) throw new Error('No print document mounted')
  return doc
}

afterEach(() => {
  act(() => {
    window.dispatchEvent(new Event('afterprint'))
  })
})

function expectDocument(doc: HTMLElement, title: string | RegExp) {
  // Rendered outside the app root, so print CSS can hide the screen entirely.
  expect(doc.parentElement).toBe(document.body)
  expect(doc).toHaveTextContent('Mendez Christian Academy — School Clinic')
  expect(within(doc).getByRole('heading', { level: 1 })).toHaveTextContent(title)
  expect(doc.querySelector('[data-print-scope]')?.textContent?.trim()).toBeTruthy()
  const css = doc.querySelector('style')?.textContent ?? ''
  expect(css).toContain('Printed ')
  expect(css).toContain(CONFIDENTIALITY_LINE)
  expect(css).toContain('counter(pages)')
}

async function expectNoNamesOrIds(doc: HTMLElement) {
  const names = (await listStudents({ includeArchived: true })).map((student) => student.fullName)
  for (const name of names) expect(doc.textContent).not.toContain(name)
  expect(doc.textContent).not.toMatch(/\b(visit|incident|student|followup|item|txn)-\d{3,}\b/)
}

/** The screen's own Print button sits inside a print:hidden block. */
function expectScreenControlHidden(name: string | RegExp) {
  expect(screen.getByRole('button', { name }).closest('[class*="print:hidden"]')).not.toBeNull()
}

describe('purpose-built printouts', () => {
  it('mounts nothing until the browser prints', async () => {
    renderWithRouter(<DashboardPage viewer={STAFF} />)
    await screen.findByRole('heading', { name: /due & upcoming follow-ups/i })
    expect(document.body.querySelector('[data-print-document]')).toBeNull()
  })

  it('Dashboard: a Clinic Overview Report with the screen’s figures, masked LRNs only', async () => {
    renderWithRouter(<DashboardPage viewer={STAFF} />)
    await screen.findByRole('heading', { name: /due & upcoming follow-ups/i })
    expectScreenControlHidden('Print / Save as PDF')
    const summary = await getDashboardSummary({ range: rangeForPreset('thisMonth', todayISO()) })
    const doc = print()
    expectDocument(doc, 'Clinic Overview Report')
    expect(doc.querySelector('[data-print-scope]')).not.toHaveTextContent('1900')
    const figures = within(doc)
      .getAllByRole('definition')
      .map((dd) => dd.textContent)
    for (const value of [
      summary.counts.visits,
      summary.counts.incidents,
      summary.counts.pendingRecords,
      summary.counts.lowStockItems,
      summary.counts.activeStudents,
    ])
      expect(figures).toContain(String(value))
    for (const row of summary.dueFollowUps) expect(doc).toHaveTextContent(row.patient.kind === 'student' ? maskLrn(row.patient.number) : row.patient.number)
    expect(doc).toHaveTextContent('Excuse letters awaiting approval')
    await expectNoNamesOrIds(doc)
  })

  it('Dashboard: the Admin gets no printout and a disabled Print (ADR-038 item 3)', async () => {
    renderWithRouter(<DashboardPage viewer={ADMIN} />)
    await screen.findByRole('region', { name: 'Summary counts' })
    expect(screen.getByRole('button', { name: 'Print / Save as PDF' })).toHaveAttribute('aria-disabled', 'true')
    act(() => {
      window.dispatchEvent(new Event('beforeprint'))
    })
    expect(document.body.querySelector('[data-print-document]')).toBeNull()
  })

  it('Reports: prints the tab on screen as its own document, totals beside the previous month', async () => {
    const user = userEvent.setup()
    renderWithRouter(<ReportsPage viewer={STAFF} />)
    await screen.findByRole('heading', { name: 'Monthly Report' })
    await screen.findByText('Clinic visits')
    expectScreenControlHidden('Print / Save as PDF')
    const report = await getMonthlyReport(todayISO().slice(0, 7))
    let doc = print()
    expectDocument(doc, /^Monthly Clinic Report — /)
    const totals = within(doc).getByRole('table', { name: /monthly totals/i })
    expect(within(totals).getByRole('row', { name: /clinic visits/i })).toHaveTextContent(
      String(report.counts.visits),
    )
    expect(within(totals).getByRole('row', { name: /clinic visits/i })).toHaveTextContent(
      String(report.previousCounts.visits),
    )
    expect(doc).toHaveTextContent('Reviewed by (Principal)')
    await expectNoNamesOrIds(doc)
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })

    await user.click(screen.getByRole('tab', { name: 'Incident register' }))
    doc = print()
    expectDocument(doc, /^Incident register — /)
    expect(within(doc).getAllByRole('row')).toHaveLength(report.incidents.length + 1)
    await expectNoNamesOrIds(doc)
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })

    await user.click(screen.getByRole('tab', { name: 'Complaint summary' }))
    doc = print()
    expectDocument(doc, /^Complaint summary — /)
    expect(doc).toHaveTextContent('Aggregated counts only')
    await expectNoNamesOrIds(doc)
  })

  it('Excuse Letter: a draft mounts no printout and its Print is disabled (ADR-038 item 6)', async () => {
    renderWithRouter(<ExcuseLetterPage viewer={STAFF} visitId="visit-0151" />)
    await screen.findByRole('heading', { name: 'Excuse Letter' })
    expect(screen.getByRole('button', { name: 'Print / Save as PDF' })).toHaveAttribute('aria-disabled', 'true')
    act(() => {
      window.dispatchEvent(new Event('beforeprint'))
    })
    expect(document.body.querySelector('[data-print-document]')).toBeNull()
  })

  it('Excuse Letter: an approved letter prints unstamped, with a reference block without ids', async () => {
    renderWithRouter(<ExcuseLetterPage viewer={STAFF} visitId="visit-0141" />)
    await screen.findByRole('heading', { name: 'Excuse Letter' })
    expectScreenControlHidden('Print / Save as PDF')
    const doc = print()
    expectDocument(doc, 'Clinic Excuse Letter')
    expect(doc).not.toHaveTextContent(/DRAFT|VOID|SUPERSEDED/)
    expect(doc).toHaveTextContent('Not a medical certificate')
    // A letter about one student carries the full LRN (Zean, October 25, 2026).
    expect(doc).toHaveTextContent(/LRN \d{12}/)
    expect(doc).not.toHaveTextContent('●')
    expect(doc.textContent).not.toMatch(/visit-\d+/)
    expect(doc).toHaveTextContent(/Approved \w{3} \d{1,2}, \d{4}/)
    // Panel review EX-4: a signature line, and no internal storage wording on paper.
    expect(doc).toHaveTextContent('Signature over printed name')
    expect(doc).not.toHaveTextContent('stored in the student record')
  })

  it('Incident Report: a Stage 1 record prints a “Not yet completed” notice and signature lines', async () => {
    renderWithRouter(<IncidentReportPage viewer={STAFF} incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Incident Report' })
    expectScreenControlHidden('Print / Save as PDF')
    const doc = print()
    expectDocument(doc, 'Incident Report')
    expect(doc).toHaveTextContent('Not yet completed')
    expect(doc).toHaveTextContent('Parent or guardian informed')
    expect(doc).toHaveTextContent('No treatment recorded.')
    expect(doc).toHaveTextContent(/LRN \d{12}/)
    expect(doc).not.toHaveTextContent('●')
    expect(doc.textContent).not.toMatch(/incident-\d+/)
  })

  it('Student Profile: a Student Health Record with every visit, not just the screen’s eight', async () => {
    renderWithRouter(<StudentProfilePage viewer={STAFF} studentId="student-0004" />)
    await screen.findByRole('heading', { name: 'Visit History' })
    expectScreenControlHidden('Print / Save as PDF')
    const doc = print()
    expectDocument(doc, 'Student Health Record')
    const visits = within(doc).getByRole('table', { name: 'Clinic visits' })
    expect(within(visits).getAllByRole('row').length - 1).toBe(12)
    expect(doc).toHaveTextContent('Excuse letters issued')
    expect(doc).not.toHaveTextContent('Archive')
    expect(doc).toHaveTextContent('LRN 000000220004')
    expect(doc).not.toHaveTextContent('●')
  })

  it('Audit Log: the filters in words, the entry count, and every matching entry', async () => {
    renderWithRouter(<AuditLogPage viewer={STAFF} />)
    await screen.findByRole('table', { name: 'Filtered audit log' })
    expectScreenControlHidden('Print / Save as PDF')
    const { rows } = await listAuditLog({
      from: '1900-01-01',
      to: todayISO(),
      userId: '',
      actionTypes: [],
      targetTypes: [],
    })
    const doc = print()
    expectDocument(doc, 'Audit Log')
    expect(doc.querySelector('[data-print-scope]')).toHaveTextContent(
      `${rows.length} entries. Filters: all dates; all users; all actions; all targets`,
    )
    expect(within(doc).getAllByRole('row')).toHaveLength(rows.length + 1)
    await expectNoNamesOrIds(doc)
  })

  it('uses the period in words, never the All placeholder', async () => {
    const { oldestRecordDate } = await getDashboardSummary({
      range: rangeForPreset('all', todayISO()),
    })
    expect(formatDateRange(oldestRecordDate!, todayISO())).not.toContain('1900')
  })
})
