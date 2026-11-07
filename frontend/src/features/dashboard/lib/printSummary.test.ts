import { describe, expect, it } from 'vitest'
import type { DashboardSummary } from '../../../types/dashboard'
import { activityRows, overviewSentence, periodPhrase } from './printSummary'

function summary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    today: '2026-10-15',
    generatedAt: '2026-10-15T08:00:00Z',
    range: { from: '2026-10-01', to: '2026-10-15' },
    oldestRecordDate: '2025-09-01',
    counts: {
      visits: 0,
      incidents: 0,
      incidentsAtStage1: 0,
      pendingRecords: 0,
      lowStockItems: 0,
      activeStudents: 0,
      inClinicNow: 0,
      incidentsAwaitingStage2: 0,
      split: { visits: { students: 0, staff: 0 }, incidents: { students: 0, staff: 0 }, inClinicNow: { students: 0, staff: 0 } },
    },
    previousCounts: null,
    dueFollowUps: [],
    upcomingWindowDays: 7,
    frequentVisitors: [],
    frequentVisitorMinVisits: 3,
    showFrequentVisitors: false,
    percentMinPriorCount: 5,
    backupAlert: null,
    inventoryAlerts: [],
    complaintTrends: { granularity: 'day', buckets: [], series: [], otherComplaints: [] },
    demographics: { sex: [], gradeLevel: [] },
    ...overrides,
  }
}

const series = (complaint: string, total: number) => ({
  complaint,
  counts: [total],
  total,
  clusterBuckets: [],
})
const followUp = (dueState: 'overdue' | 'due_today' | 'upcoming') =>
  ({ dueState }) as DashboardSummary['dueFollowUps'][number]

describe('Dashboard printout summary', () => {
  it('names the period in words, never the All placeholder', () => {
    expect(periodPhrase({ preset: 'thisMonth', from: '2026-10-01', to: '2026-10-15' }, null)).toBe(
      'from Oct 1 to Oct 15, 2026',
    )
    expect(periodPhrase({ preset: 'today', from: '2026-10-15', to: '2026-10-15' }, null)).toBe(
      'on Oct 15, 2026',
    )
    expect(
      periodPhrase({ preset: 'all', from: '1900-01-01', to: '2026-10-15' }, '2025-09-01'),
    ).toBe('since Sep 1, 2025')
    expect(periodPhrase({ preset: 'all', from: '1900-01-01', to: '2026-10-15' }, null)).toBe(
      'so far',
    )
  })

  it('says only the zero counts for an empty period', () => {
    expect(overviewSentence(summary())).toBe('0 visits and 0 incidents this period.')
  })

  it('reads naturally for one of each', () => {
    const s = summary({
      counts: {
        visits: 1,
        incidents: 1,
        incidentsAtStage1: 0,
        pendingRecords: 0,
        lowStockItems: 1,
        activeStudents: 9,
        inClinicNow: 0,
      incidentsAwaitingStage2: 0,
        split: { visits: { students: 0, staff: 0 }, incidents: { students: 0, staff: 0 }, inClinicNow: { students: 0, staff: 0 } },
      },
      complaintTrends: {
        granularity: 'day',
        buckets: [],
        series: [series('Headache', 2)],
        otherComplaints: [],
      },
      dueFollowUps: [followUp('overdue')],
      inventoryAlerts: [{ flags: ['expired'] } as DashboardSummary['inventoryAlerts'][number]],
    })
    expect(overviewSentence(s)).toBe('1 visit and 1 incident this period. Most frequent symptom: Headache (2 of 2).')
  })

  it('handles ties', () => {
    const s = summary({
      counts: {
        visits: 5,
        incidents: 0,
        incidentsAtStage1: 0,
        pendingRecords: 0,
        lowStockItems: 0,
        activeStudents: 9,
        inClinicNow: 0,
      incidentsAwaitingStage2: 0,
        split: { visits: { students: 0, staff: 0 }, incidents: { students: 0, staff: 0 }, inClinicNow: { students: 0, staff: 0 } },
      },
      complaintTrends: {
        granularity: 'day',
        buckets: [],
        series: [series('Fever', 2), series('Cough', 2)],
        otherComplaints: [series('Rash', 1)],
      },
      dueFollowUps: [followUp('overdue'), followUp('upcoming'), followUp('due_today')],
    })
    expect(overviewSentence(s)).toBe('5 visits and 0 incidents this period. Most frequent symptoms: Fever and Cough (2 each).')
  })

  it('sums a daily trend into weeks without losing a visit', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']
    const trends = {
      granularity: 'day' as const,
      buckets: days.map((d) => ({ key: d, label: d, from: d, to: d })),
      series: [{ complaint: 'Fever', counts: [1, 0, 2, 3, 1], total: 7, clusterBuckets: [] }],
      otherComplaints: [
        { complaint: 'Rash', counts: [0, 1, 0, 0, 0], total: 1, clusterBuckets: [] },
      ],
    }
    // Oct 4, 2026 is a Sunday.
    expect(activityRows(trends)).toEqual([
      { label: 'Oct 1 – Oct 3, 2026', total: 4 },
      { label: 'Oct 4 – Oct 5, 2026', total: 4 },
    ])
  })
})
