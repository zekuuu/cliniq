import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDashboardSummary, getMockToday, resetMockDb, type SessionUser } from '../../lib/mock-db'
import { renderWithRouter } from '../../test/renderWithRouter'
import { ReportsPage } from '../reports/ReportsPage'
import { trendFor } from './lib/statTrend'
import { urgentCount } from './lib/urgentCount'

/** Panel review part 4: small-number trends, the urgent badge, renames and register links. */

const range = { preset: 'custom' as const, from: '2026-10-01', to: '2026-10-22' }
const STAFF: SessionUser = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }
const ADMIN: SessionUser = { id: 'user-admin-01', name: 'Principal', role: 'admin' }

describe('stat card trends (DB-2, D4)', () => {
  it('shows both counts instead of a percentage when the prior count is under the threshold', () => {
    expect(trendFor(4, 1, range, 5)).toEqual({ direction: 'up', text: '4 vs 1 in the prior 22 days' })
    expect(trendFor(3, 0, range, 5)).toEqual({ direction: 'up', text: '3 vs 0 in the prior 22 days' })
    expect(trendFor(2, 2, range, 5)).toEqual({ direction: 'flat', text: 'No change vs prior 22 days' })
  })

  it('keeps the percentage from the threshold up, with the counts for screen readers', () => {
    expect(trendFor(30, 10, range, 5)).toEqual({ direction: 'up', text: '200% vs prior 22 days', detail: '30 vs 10 in the prior 22 days' })
    expect(trendFor(5, 10, range, 5)).toMatchObject({ direction: 'down', text: '50% vs prior 22 days' })
  })
})

describe('the Overview badge counts urgent items only (DB-4)', () => {
  beforeEach(() => resetMockDb())

  it('adds expired stock, overdue follow-ups and incidents awaiting Stage 2, nothing else', async () => {
    const today = getMockToday()
    const summary = await getDashboardSummary({ range: { preset: 'today', from: today, to: today } })
    const expected =
      summary.inventoryAlerts.filter((row) => row.flags.includes('expired')).length +
      summary.dueFollowUps.filter((row) => row.daysFromToday < 0).length +
      summary.counts.incidentsAwaitingStage2
    expect(urgentCount(summary)).toBe(expected)
    expect(summary.counts.incidentsAwaitingStage2).toBeGreaterThan(0)
    // Low stock and incomplete records are not part of it.
    expect(urgentCount({ ...summary, counts: { ...summary.counts, pendingRecords: 999, lowStockItems: 999 } })).toBe(expected)
  })
})

describe('Incident register and Complaint summary (RP-4, RP-7)', () => {
  beforeEach(() => resetMockDb())

  it('lets Staff open each incident from the register, and shows the new names', async () => {
    const user = userEvent.setup()
    renderWithRouter(<ReportsPage viewer={STAFF} />)
    await user.click(await screen.findByRole('tab', { name: 'Incident register' }))
    expect(screen.getByRole('heading', { name: 'Incident register' })).toBeInTheDocument()
    const opens = await screen.findAllByRole('link', { name: /^(Open report|Complete Stage 2):/ })
    expect(opens.length).toBeGreaterThan(0)
    await user.click(screen.getByRole('tab', { name: 'Complaint summary' }))
    expect(screen.getByRole('heading', { name: 'Complaint summary' })).toBeInTheDocument()
  })

  it('gives the Admin no incident links (the incident screens are Staff only)', async () => {
    const user = userEvent.setup()
    renderWithRouter(<ReportsPage viewer={ADMIN} />)
    await user.click(await screen.findByRole('tab', { name: 'Incident register' }))
    await screen.findByRole('table', { name: 'Incident register' })
    expect(screen.queryByRole('link', { name: /^(Open report|Complete Stage 2):/ })).not.toBeInTheDocument()
  })
})
