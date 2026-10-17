import { describe, expect, it } from 'vitest'
import { rangeForPreset } from '../dateRange'
import type { FollowUp, InventoryItem, Visit } from '../../types/entities'
import {
  buildBuckets,
  buildCalendarDays,
  buildComplaintTrends,
  buildDashboardSummary,
  buildDueFollowUps,
  buildInventoryAlerts,
  detectClusters,
  trendGranularityFor,
} from './dashboard'
import type { DbState, MockDbConfig, SeedStudent } from './types'

const TODAY = '2026-09-26'

// Pinned here so these rule tests don't move when someone tunes `config` in mock-db.json.
const CONFIG: MockDbConfig = {
  frequentVisitorMinVisits: 3,
  frequentVisitorWindowDays: 30,
  upcomingFollowUpDays: 7,
  expiryWarningDays: 30,
  clusterMinCount: 8,
  clusterRatio: 2,
  topComplaints: 5,
  vitalsWarningRanges: { temperatureC: { min: 30, max: 43 }, pulseBpm: { min: 30, max: 250 } },
}

// Hand-built records typed against the §5 entity shapes. If the entity contract changes, this
// file stops compiling, which is exactly the check the loop's "Simulate" step wants.
const student = (id: string, n: string, extra: Partial<SeedStudent> = {}): SeedStudent => ({
  id,
  studentNumber: n,
  fullName: `SECRET NAME ${id}`,
  gradeLevel: 'Grade 5',
  sex: 'female',
  contactInfo: '0900-000-0000',
  allergies: [],
  medicalConditions: [],
  emergencyContact: { name: 'Guardian', relationship: 'Parent', phone: '0900-111-0000', verified: true },
  archived: false,
  ...extra,
})

const followUp = (id: string, date: string, status: FollowUp['status'] = 'pending'): FollowUp => ({
  id,
  studentId: 's1',
  relatedRecord: { type: 'visit', id: 'v1' },
  followUpDate: date,
  reason: 'Recheck temperature',
  status,
  notes: null,
  createdByUserId: 'u1',
})

const visit = (
  id: string,
  studentId: string,
  date: string,
  complaint = 'Headache',
  eventTag: string | null = null,
): Visit => ({
  id,
  studentId,
  dateTime: `${date}T09:00:00+08:00`,
  complaint,
  treatment: 'Rest',
  disposition: 'returned_to_class',
  loggedByUserId: 'u1',
  eventTag,
  itemsGiven: [],
  excuseLetterDraft: null,
  referredTo: null,
})

const item = (id: string, extra: Partial<InventoryItem>): InventoryItem => ({
  id,
  name: id,
  category: 'medicine',
  unit: 'tablets',
  batches: [{ id: `${id}-batch-0001`, quantity: 100, expirationDate: null, receivedDate: TODAY }],
  lowStockThreshold: 10,
  ...extra,
})

function dataset(partial: Partial<DbState>): DbState {
  return {
    today: TODAY,
    config: CONFIG,
    users: [],
    students: [],
    visits: [],
    incidents: [],
    followUps: [],
    inventoryItems: [],
    reports: [],
    backupLogs: [],
    auditLog: [],
    frontendOnly: {
      devAccounts: [],
      visitComplaintTypes: [],
      incidentComplaintTypes: [],
      inventoryTransactions: [],
      recordReviews: [],
      excuseLetterApprovals: [],
      peReferrals: [],
      issueReports: [],
      calendarEvents: [],
    },
    ...partial,
  }
}

describe('due/upcoming follow-ups', () => {
  const students = [student('s1', '2026-00001')]

  it('lists only pending follow-ups up to the upcoming window, with the right due state', () => {
    const data = dataset({
      students,
      followUps: [
        followUp('overdue', '2026-09-24'),
        followUp('today', TODAY),
        followUp('soon', '2026-10-03'), // exactly +7
        followUp('too-far', '2026-10-04'), // +8
        followUp('done', '2026-09-25', 'completed'),
        followUp('missed', '2026-09-20', 'missed'),
      ],
    })
    const rows = buildDueFollowUps(data)
    expect(rows.map((r) => [r.followUp.id, r.dueState, r.daysFromToday])).toEqual([
      ['overdue', 'overdue', -2],
      ['today', 'due_today', 0],
      ['soon', 'upcoming', 7],
    ])
  })

  it('carries the Student Number and never the name', () => {
    const rows = buildDueFollowUps(dataset({ students, followUps: [followUp('a', TODAY)] }))
    expect(rows[0].student).toEqual({ id: 's1', studentNumber: '2026-00001' })
    expect(JSON.stringify(rows)).not.toContain('SECRET NAME')
  })
})

describe('inventory alerts', () => {
  it('keeps low-stock and expiry as separate flags that can both apply', () => {
    const data = dataset({
      inventoryItems: [
        item('both', { batches: [{ id: 'both-batch', quantity: 2, expirationDate: '2026-10-06', receivedDate: TODAY }] }),
        item('expired', { batches: [{ id: 'expired-batch', quantity: 100, expirationDate: '2026-09-20', receivedDate: TODAY }] }),
        item('at-threshold', { batches: [{ id: 'threshold-batch', quantity: 10, expirationDate: null, receivedDate: TODAY }] }), // "below" the threshold = strictly less
        item('fine', { batches: [{ id: 'fine-batch', quantity: 100, expirationDate: '2027-09-26', receivedDate: TODAY }] }),
      ],
    })
    const rows = buildInventoryAlerts(data)
    expect(rows.map((r) => [r.item.id, r.flags, r.daysUntilExpiry])).toEqual([
      ['expired', ['low_stock', 'expired'], -6],
      ['both', ['low_stock', 'nearing_expiration'], 10],
    ])
  })
})

describe('complaint trends', () => {
  it('clips week buckets to the selected range', () => {
    const buckets = buildBuckets('2026-09-02', '2026-09-26', 'week')
    expect(buckets[0]).toMatchObject({ key: '2026-08-30', from: '2026-09-02', to: '2026-09-05' })
    expect(buckets.at(-1)).toMatchObject({ from: '2026-09-20', to: '2026-09-26' })
  })

  it('charts the top complaints and lists the rest in otherComplaints', () => {
    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    const events = names.flatMap((c, i) =>
      Array.from({ length: 10 - i }, () => ({ date: '2026-09-10', complaint: c })),
    )
    const trends = buildComplaintTrends(events, { preset: 'custom', from: '2026-09-01', to: '2026-09-30' }, CONFIG)
    expect(trends.series.map((s) => s.complaint)).toEqual(names.slice(0, CONFIG.topComplaints))
    expect(trends.otherComplaints.map((s) => s.complaint)).toEqual(
      names.slice(CONFIG.topComplaints),
    )
  })

  it('keeps an All-range trend bounded by the first recorded event', () => {
    const trends = buildComplaintTrends(
      [{ date: '2026-09-10', complaint: 'Headache' }],
      rangeForPreset('all', TODAY),
      CONFIG,
    )
    expect(trends.granularity).toBe('month')
    expect(trends.buckets[0].from).toBe('2026-09-10')
    expect(trends.buckets.length).toBeLessThan(5)
  })

  it('keeps bounded ranges anchored at their selected start and fills zero buckets', () => {
    const trends = buildComplaintTrends(
      [{ date: '2026-09-03', complaint: 'Headache' }],
      { preset: 'custom', from: '2026-09-01', to: '2026-09-05' },
      CONFIG,
    )
    expect(trends.buckets.map((bucket) => bucket.from)).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
    ])
    expect(trends.series[0].counts).toEqual([0, 0, 1, 0, 0])
  })

  it('derives the bucket size from the date range alone', () => {
    const preset = (p: Parameters<typeof rangeForPreset>[0]) => {
      const range = rangeForPreset(p, TODAY)
      return trendGranularityFor(range.preset, range)
    }
    expect(preset('today')).toBe('hour')
    expect(preset('last7')).toBe('day')
    expect(preset('last30')).toBe('day')
    expect(preset('thisMonth')).toBe('day')
    expect(preset('thisYear')).toBe('month')
    // All is sized by its recorded history: monthly up to two years, then yearly.
    expect(trendGranularityFor('all', { from: '2025-06-01', to: TODAY })).toBe('month')
    expect(trendGranularityFor('all', { from: '2018-01-01', to: TODAY })).toBe('year')
    // Custom follows its actual span.
    const custom = (from: string) => trendGranularityFor('custom', { from, to: TODAY })
    expect(custom(TODAY)).toBe('hour')
    expect(custom('2026-09-20')).toBe('day')
    expect(custom('2026-07-01')).toBe('week')
    expect(custom('2025-10-01')).toBe('month')
    expect(custom('2022-01-01')).toBe('year')
  })

  it('buckets a single day by hour over the school day, widened to any recorded hour', () => {
    const trends = buildComplaintTrends(
      [
        { date: TODAY, hour: 9, complaint: 'Headache' },
        { date: TODAY, hour: 9, complaint: 'Headache' },
        { date: TODAY, hour: 18, complaint: 'Fever' },
      ],
      { preset: 'today', from: TODAY, to: TODAY },
      CONFIG,
    )
    expect(trends.granularity).toBe('hour')
    expect(trends.buckets.map((b) => b.label)).toEqual([
      '7 AM', '8 AM', '9 AM', '10 AM', '11 AM', '12 PM',
      '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM',
    ])
    const headache = trends.series.find((s) => s.complaint === 'Headache')
    expect(headache?.counts[2]).toBe(2)
    expect(headache?.total).toBe(2)
    expect(trends.series.find((s) => s.complaint === 'Fever')?.counts.at(-1)).toBe(1)
  })

  it('buckets This year by month, with empty months as zeros', () => {
    const trends = buildComplaintTrends(
      [{ date: '2026-03-04', complaint: 'Headache' }],
      rangeForPreset('thisYear', TODAY),
      CONFIG,
    )
    expect(trends.granularity).toBe('month')
    expect(trends.buckets).toHaveLength(9)
    expect(trends.series[0].counts).toEqual([0, 0, 1, 0, 0, 0, 0, 0, 0])
  })

  it('compares a completed calendar month by Monday through Sunday with its prior month', () => {
    const trends = buildComplaintTrends(
      [
        { date: '2024-01-05', complaint: 'Headache' }, // Friday, prior month
        { date: '2024-02-02', complaint: 'Headache' }, // Friday, leap-year month
        { date: '2024-02-02', complaint: 'Fever', eventTag: 'Foundation practice' },
        { date: '2024-02-04', complaint: 'Fever' }, // Sunday
      ],
      { preset: 'custom', from: '2024-02-01', to: '2024-02-29' },
      CONFIG,
      [{ title: 'Foundation practice', startDate: '2024-02-02', endDate: null }],
    )
    expect(trends.weekdayComparison).toMatchObject({
      currentLabel: 'February 2024',
      previousLabel: 'January 2024',
    })
    expect(trends.weekdayComparison?.rows.find((row) => row.label === 'Friday')).toMatchObject({
      current: 2,
      previous: 1,
      currentPeak: { date: '2024-02-02', count: 2, annotations: ['Foundation practice'] },
    })
    expect(trends.weekdayComparison?.rows.find((row) => row.label === 'Sunday')).toMatchObject({ current: 1, previous: 0 })
  })

  it('uses December as the prior month for a January weekday comparison', () => {
    const trends = buildComplaintTrends(
      [{ date: '2025-12-01', complaint: 'Headache' }, { date: '2026-01-05', complaint: 'Headache' }],
      { preset: 'custom', from: '2026-01-01', to: '2026-01-31' },
      CONFIG,
    )
    expect(trends.weekdayComparison).toMatchObject({ previousLabel: 'December 2025', currentLabel: 'January 2026' })
  })

  it('keeps an All range with no events to a single bucket instead of a century of months', () => {
    const trends = buildComplaintTrends([], rangeForPreset('all', TODAY), CONFIG)
    expect(trends.buckets).toHaveLength(1)
  })

  it('exposes This year as January 1 through today', () => {
    expect(rangeForPreset('thisYear', TODAY)).toMatchObject({ from: '2026-01-01', to: TODAY })
  })

  it('flags a spike as a possible cluster only when there are buckets to compare', () => {
    expect(detectClusters([2, 3, 12, 2], CONFIG)).toEqual([2])
    expect(detectClusters([12], CONFIG)).toEqual([])
    expect(detectClusters([6, 7, 6], CONFIG)).toEqual([])
  })
})

describe('dashboard summary', () => {
  const students = [
    student('s1', '2026-00001'),
    student('s2', '2026-00002', { emergencyContact: null }), // incomplete: counts as pending
    student('s3', '2020-00003', { archived: true, emergencyContact: null }), // archived: doesn't
  ]
  const data = dataset({
    students,
    visits: [
      ...['2026-09-20', '2026-09-22', '2026-09-24'].map((d, i) => visit(`v${i}`, 's1', d)),
      visit('v9', 's2', '2026-09-25'),
      visit('old', 's2', '2026-08-01'),
    ],
  })
  const summary = buildDashboardSummary(
    data,
    { range: rangeForPreset('last7', TODAY) },
    'now',
  )

  it('scopes visits to the range and leaves current-state counts unscoped', () => {
    expect(summary.counts).toMatchObject({ visits: 4, pendingRecords: 1, activeStudents: 2 })
  })

  it('raises a frequent-visitor warning by Student Number at the threshold', () => {
    expect(summary.frequentVisitors).toEqual([
      { student: { id: 's1', studentNumber: '2026-00001' }, visitCount: 3 },
    ])
  })

  it('never includes a student name anywhere in the payload', () => {
    expect(JSON.stringify(summary)).not.toContain('SECRET NAME')
  })

  it('returns aggregate demographic counts and applies those filters only to Trends', () => {
    expect(summary.demographics).toEqual({
      sex: [
        { key: 'female', label: 'Female', count: 4, share: 1 },
        { key: 'male', label: 'Male', count: 0, share: 0 },
      ],
      gradeLevel: [{ key: 'Grade 5', label: 'Grade 5', count: 4, share: 1 }],
    })

    const filtered = buildDashboardSummary(
      data,
      { range: rangeForPreset('last7', TODAY), sex: 'male', gradeLevel: null },
      'now',
    )
    expect(filtered.counts).toMatchObject({ visits: 4, activeStudents: 2 })
    expect(filtered.complaintTrends.series).toEqual([])
    expect(filtered.demographics.gradeLevel).toEqual([
      { key: 'Grade 5', label: 'Grade 5', count: 0, share: 0 },
    ])
  })
})

describe('calendar days', () => {
  it('counts visits per day and collects distinct event tags', () => {
    const data = dataset({
      visits: [
        visit('a', 's1', '2026-09-14', 'Headache', 'Intramurals'),
        visit('b', 's1', '2026-09-14', 'Fever', 'Intramurals'),
        visit('c', 's1', '2026-09-15'),
      ],
    })
    expect(buildCalendarDays(data, '2026-09-14', '2026-09-16')).toEqual([
      { date: '2026-09-14', visits: 2, incidents: 0, events: [], eventTags: ['Intramurals'] },
      { date: '2026-09-15', visits: 1, incidents: 0, events: [], eventTags: [] },
      { date: '2026-09-16', visits: 0, incidents: 0, events: [], eventTags: [] },
    ])
  })

  it('puts calendar events on every day they cover, including empty and future days', () => {
    const event = (id: string, title: string, startDate: string, endDate: string | null) => ({
      id,
      title,
      startDate,
      endDate,
      createdByUserId: 'u1',
      createdAt: '2026-09-01T08:00:00+08:00',
      updatedAt: '2026-09-01T08:00:00+08:00',
    })
    const base = dataset({ visits: [visit('a', 's1', '2026-09-15', 'Headache', 'intramurals')] })
    const data = {
      ...base,
      frontendOnly: {
        ...base.frontendOnly,
        calendarEvents: [
          event('e1', 'Intramurals', '2026-09-13', '2026-09-15'),
          event('e2', 'Foundation Day', '2026-09-30', null),
        ],
      },
    }
    const days = buildCalendarDays(data, '2026-09-14', '2026-09-30')
    const on = (date: string) => days.find((d) => d.date === date)!
    // Clipped to the visible range but still describes the whole event.
    expect(on('2026-09-14').events).toEqual([
      { id: 'e1', title: 'Intramurals', startDate: '2026-09-13', endDate: '2026-09-15' },
    ])
    // The visit tag repeats the event's title (different case), so it shows once, as the event.
    expect(on('2026-09-15')).toMatchObject({ visits: 1, eventTags: [] })
    expect(on('2026-09-15').events.map((e) => e.id)).toEqual(['e1'])
    expect(on('2026-09-16').events).toEqual([])
    expect(on('2026-09-30').events.map((e) => e.title)).toEqual(['Foundation Day'])
  })
})
