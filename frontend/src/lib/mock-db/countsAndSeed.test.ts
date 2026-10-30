import { beforeEach, describe, expect, it } from 'vitest'
import { addDays, parseISODate } from '../dates'
import { itemsNamedInNotes } from '../itemsGiven'
import {
  getCalendarDays,
  getDashboardSummary,
  getMockToday,
  getMonthlyReport,
  listFollowUps,
  listIncidents,
  listInventory,
  listVisits,
  resetMockDb,
} from './index'
import { seed, resolveSeed } from './seed'

/**
 * Panel review part 7: one definition per number (DB-3, FU-5), checked across every screen that shows
 * it, and a seed that reads like a real clinic (5.3).
 *
 * The definitions (the "data dictionary" for these counts):
 * - Visits in a period: visits dated in it, not entered in error, not escalated to an incident (ADR-036).
 * - Incidents in a period: incidents dated in it, at either stage.
 * - Incidents still at Stage 1: `stage === 1`.
 * - Overdue follow-ups: `pending` with a follow-up date before today.
 */

const monthOf = (date: string) => date.slice(0, 7)
const lastDay = (month: string) => addDays(`${monthOf(addDays(`${month}-28`, 7))}-01`, -1)

beforeEach(() => resetMockDb())

describe('the same count on every screen (DB-3, FU-5)', () => {
  it('this month\'s visits and incidents agree on the Dashboard, the calendar, the Monthly Report and the Incident register', async () => {
    const today = getMockToday()
    const month = monthOf(today)
    const range = { preset: 'thisMonth' as const, from: `${month}-01`, to: today }
    const [dashboard, report, days, incidents] = await Promise.all([
      getDashboardSummary({ range }),
      getMonthlyReport(month),
      getCalendarDays(`${month}-01`, lastDay(month)),
      listIncidents({ from: `${month}-01`, to: lastDay(month) }),
    ])
    const calendarIncidents = days.reduce((sum, day) => sum + day.incidents, 0)
    const calendarVisits = days.reduce((sum, day) => sum + day.visits, 0)
    expect(report.counts.incidents).toBe(dashboard.counts.incidents)
    expect(calendarIncidents).toBe(dashboard.counts.incidents)
    // The Incident register is the Monthly Report's incident list.
    expect(report.incidents).toHaveLength(dashboard.counts.incidents)
    expect(incidents).toHaveLength(dashboard.counts.incidents)
    expect(report.counts.visits).toBe(dashboard.counts.visits)
    expect(calendarVisits).toBe(dashboard.counts.visits)
  })

  it('incidents still at Stage 1 agree between the Dashboard and the incident list', async () => {
    const today = getMockToday()
    const dashboard = await getDashboardSummary({ range: { preset: 'today', from: today, to: today } })
    const all = await listIncidents()
    expect(dashboard.counts.incidentsAwaitingStage2).toBe(all.filter((i) => i.stage === 1).length)
  })

  it('overdue follow-ups agree between the Dashboard and the Follow-ups list', async () => {
    const today = getMockToday()
    const dashboard = await getDashboardSummary({ range: { preset: 'today', from: today, to: today } })
    const list = await listFollowUps({ status: 'pending' })
    expect(dashboard.dueFollowUps.filter((row) => row.dueState === 'overdue').length).toBe(list.filter((f) => f.dueState === 'overdue').length)
  })
})

describe('a believable seed (5.3)', () => {
  it('puts no past visit, incident or notification on a weekend, whatever weekday today is', () => {
    for (const today of ['2026-10-19', '2026-10-21', '2026-10-24', '2026-10-25']) {
      const state = resolveSeed(seed, today)
      const stamps = [
        ...state.visits.map((v) => v.dateTime),
        ...state.incidents.flatMap((i) => [i.time, ...i.parentNotifications.map((n) => n.timestamp)]),
      ].filter((stamp) => stamp.slice(0, 10) < today)
      const weekend = stamps.filter((stamp) => [0, 6].includes(parseISODate(stamp.slice(0, 10)).getDay()))
      expect(weekend, `today ${today}`).toEqual([])
    }
  })

  it('has no two visits at the same minute', async () => {
    const visits = await listVisits()
    const minutes = visits.map((v) => v.dateTime.slice(0, 16))
    expect(new Set(minutes).size).toBe(minutes.length)
  })

  it('has no visit whose notes name a stocked medicine that its list lacks', async () => {
    const [visits, items] = await Promise.all([listVisits(), listInventory()])
    // Stock and expiry don't matter for this check: any stocked name counts.
    const all = items.map((item) => ({ ...item, currentStock: 1, flags: [] }))
    expect(visits.filter((v) => itemsNamedInNotes(v.treatment, all, v.itemsGiven).length).map((v) => v.id)).toEqual([])
  })
})
