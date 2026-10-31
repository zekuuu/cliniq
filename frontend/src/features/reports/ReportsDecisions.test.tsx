import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppShell } from '../../layouts/AppShell'
import { complaintGroupKey, reportComplaint } from '../../lib/complaints'
import { monthWeeks, todayISO } from '../../lib/dates'
import {
  dispenseInventoryItem,
  getMonthlyReport,
  listInventory,
  recordVisit,
  resetMockDb,
  restockInventoryItem,
  setMockToday,
  type SessionUser,
} from '../../lib/mock-db'
import { renderWithRouter } from '../../test/renderWithRouter'
import { CalendarPage } from '../dashboard/CalendarPage'

/** Decisions sheet, Part 4: reports and calendar (ADR-050). */
describe('Reports and calendar', () => {
  beforeEach(() => resetMockDb())

  it('groups "head ache" and "Headache." with Headache, and keeps an unmatched complaint as typed', async () => {
    expect(complaintGroupKey('head ache')).toBe(complaintGroupKey('Headache.'))
    expect(reportComplaint('  head   ache ', ['Headache'])).toBe('Headache')
    expect(reportComplaint('Rash on arm!', ['Headache'])).toBe('Rash on arm')

    const month = todayISO().slice(0, 7)
    const before = (await getMonthlyReport(month)).complaintCounts.find((row) => row.complaint === 'Headache')?.count ?? 0
    for (const complaint of ['head ache', 'Headache.'])
      await recordVisit({ studentId: 'student-0001', complaint, treatment: '', disposition: 'returned_to_class', followUp: null })
    const report = await getMonthlyReport(month)
    expect(report.complaintCounts.find((row) => row.complaint === 'Headache')?.count).toBe(before + 2)
    expect(report.complaintCounts.some((row) => /head ache|Headache\./.test(row.complaint))).toBe(false)
  })

  it('writes the weeks as the Activity calendar shows them: Sunday to Saturday, clipped to the month (ADR-055)', () => {
    expect(monthWeeks('2026-09').map((week) => week.label)).toEqual(['1-5', '6-12', '13-19', '20-26', '27-30'])
    // October 2026 starts on a Thursday, so its first week is Thursday to Saturday.
    expect(monthWeeks('2026-10').map((week) => week.label)).toEqual(['1-3', '4-10', '11-17', '18-24', '25-31'])
    // August 2026 starts on a Saturday: a one-day first week.
    expect(monthWeeks('2026-08')[0]).toMatchObject({ from: '2026-08-01', to: '2026-08-01', label: '1' })
    for (const month of ['2026-02', '2026-08', '2026-09', '2026-10']) {
      const weeks = monthWeeks(month)
      expect(weeks[0].from).toBe(`${month}-01`)
      weeks.slice(1).forEach((week, index) => expect(week.from > weeks[index].to).toBe(true))
    }
  })

  it.each([['2026-09-30', '2026-09'], ['2026-10-29', '2026-10']])('sums the weekly columns to the monthly total (%s)', async (today, month) => {
    setMockToday(today)
    const report = await getMonthlyReport(month)
    const total = report.complaintCounts.reduce((sum, row) => sum + row.count, 0)
    expect(total).toBeGreaterThan(0)
    expect(report.weeklyComplaints.totals.reduce((sum, count) => sum + count, 0)).toBe(total)
    for (const row of report.weeklyComplaints.rows) expect(row.counts.reduce((sum, count) => sum + count, 0)).toBe(row.total)
  })

  it('makes Total Available minus Ending Inventory equal what the month\'s movements used', async () => {
    const month = todayISO().slice(0, 7)
    const [item] = await listInventory()
    await restockInventoryItem(item.id, 10, null, { noExpirationConfirmed: true })
    await dispenseInventoryItem(item.id, 3)
    const row = (await getMonthlyReport(month)).inventory.find((candidate) => candidate.itemId === item.id)!
    expect(row.newPurchase).toBeGreaterThanOrEqual(10)
    // Ending is today's stock; nothing after this month has moved yet.
    expect(row.endingInventory).toBe((await listInventory()).find((candidate) => candidate.id === item.id)!.totalOnHand)
    expect(row.totalAvailable - row.endingInventory).toBeGreaterThanOrEqual(3)

    const next = await getMonthlyReport(`${Number(month.slice(0, 4)) + 1}-01`)
    const later = next.inventory.find((candidate) => candidate.itemId === item.id)!
    expect(later).toMatchObject({ newPurchase: 0, totalAvailable: row.endingInventory, endingInventory: row.endingInventory })
  })

  it.each<SessionUser>([
    { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' },
    { id: 'user-admin-01', name: 'Principal', role: 'admin' },
  ])('names the screen "Activity calendar" in the sidebar and the page title ($role)', (user) => {
    render(
      <MemoryRouter>
        <AppShell user={user} active="calendar" onLogout={() => {}}>
          <p>Screen</p>
        </AppShell>
      </MemoryRouter>,
    )
    expect(screen.getAllByRole('link', { name: /Activity calendar/ }).length).toBeGreaterThan(0)
    renderWithRouter(<CalendarPage viewer={user} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Activity calendar' })).toBeInTheDocument()
  })
})
