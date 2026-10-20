import { describe, expect, it } from 'vitest'
import { checkSeedIntegrity } from './integrity'
import { resolveSeed, seed } from './seed'
import {
  followUpDueState,
  frequentVisitors,
  incompleteRecordQueue,
  inventoryStatusFor,
} from './selectors'
import type { MockDbSeed } from './types'

/**
 * Guards `mock-db.json`. Run it after every hand-edit: `npm test -- mock-db`.
 * Each "rejects" case corrupts a copy of the real seed one way and checks the problem is reported.
 */

const clone = (): MockDbSeed => structuredClone(seed)
const problemsAfter = (edit: (s: MockDbSeed) => void) => {
  const copy = clone()
  edit(copy)
  return checkSeedIntegrity(copy).join('\n')
}

describe('mock-db.json integrity', () => {
  it('passes every rule as committed', () => {
    expect(checkSeedIntegrity(seed)).toEqual([])
  })

  it('is sized to be hand-editable but still exercise lists, charts, and pagination', () => {
    expect(seed.students.length).toBeGreaterThanOrEqual(40)
    expect(seed.students.length).toBeLessThanOrEqual(60)
    expect(seed.visits.length).toBeGreaterThan(120)
  })

  it('accepts a visit with neither treatment notes nor items given', () => {
    expect(
      problemsAfter((s) => {
        s.visits[0].treatment = ''
        s.visits[0].itemsGiven = []
      }),
    ).toBe('')
  })

  it('accepts a completed incident with neither treatment notes nor items given', () => {
    expect(
      problemsAfter((s) => {
        const incident = s.incidents.find((item) => item.stage === 2)!
        incident.vitals.treatmentNotes = ''
        incident.itemsGiven = []
      }),
    ).toBe('')
  })

  it('rejects disposition fields on the wrong disposition, and a draft beside an approved letter', () => {
    const draft = { excusedFrom: { daysAgo: 2 }, excusedUntil: { daysAgo: 1 }, note: null }
    const visit = (s: MockDbSeed, id: string) => s.visits.find((v) => v.id === id)!
    expect(problemsAfter((s) => (visit(s, 'visit-0158').excuseLetterDraft = draft))).toMatch(/only a Sent home or Referred visit/)
    expect(problemsAfter((s) => (visit(s, 'visit-0151').referredTo = 'Clinic'))).toMatch(/referredTo: only a Referred/)
    expect(
      problemsAfter((s) => (visit(s, 'visit-0151').excuseLetterDraft = { ...draft, excusedUntil: { daysAgo: 3 } })),
    ).toMatch(/excuseLetterDraft\.excusedUntil: can't be before/)
    expect(problemsAfter((s) => (visit(s, 'visit-0139').excuseLetterDraft = draft))).toMatch(/still has an excuse-letter draft/)
  })

  it('rejects an excuse letter whose period is missing or ends before it starts', () => {
    expect(
      problemsAfter((s) => delete (s.frontendOnly.excuseLetterApprovals[0] as Partial<(typeof s.frontendOnly.excuseLetterApprovals)[0]>).excusedUntil),
    ).toMatch(/excuseLetterApprovals\[0\]\.excusedUntil/)
    expect(
      problemsAfter((s) => {
        s.frontendOnly.excuseLetterApprovals[0].excusedFrom = { daysAgo: 3 }
        s.frontendOnly.excuseLetterApprovals[0].excusedUntil = { daysAgo: 5 }
      }),
    ).toMatch(/excusedUntil: can't be before excusedFrom/)
  })

  it('rejects a dangling student reference', () => {
    expect(problemsAfter((s) => (s.visits[0].studentId = 'student-9999'))).toMatch(
      /visits\[0\].*student "student-9999" doesn't exist/,
    )
  })

  it('rejects duplicate and malformed LRNs (ADR-028)', () => {
    expect(problemsAfter((s) => (s.students[1].lrn = s.students[0].lrn))).toMatch(/duplicate/)
    expect(problemsAfter((s) => (s.students[0].lrn = '12345'))).toMatch(/isn't 12 digits/)
    expect(problemsAfter((s) => (s.students[0].lrn = '1234-5678-901'))).toMatch(/isn't 12 digits/)
  })

  it('rejects a follow-up pointing at a missing record or at another student', () => {
    expect(problemsAfter((s) => (s.followUps[0].relatedRecord.id = 'visit-9999'))).toMatch(
      /relatedRecord: visit "visit-9999" doesn't exist/,
    )
    expect(
      problemsAfter((s) => {
        const other = s.students.find((st) => st.id !== s.followUps[0].studentId)!
        s.followUps[0].studentId = other.id
      }),
    ).toMatch(/doesn't match its visit's student/)
  })

  it('rejects dangling user and inventory references', () => {
    expect(problemsAfter((s) => (s.visits[0].loggedByUserId = 'user-staff-99'))).toMatch(/user "user-staff-99" doesn't exist/)
    expect(problemsAfter((s) => (s.frontendOnly.inventoryTransactions[0].itemId = 'item-9999'))).toMatch(/itemId/)
  })

  it('has visits carrying medicine lines, each backed by its transactions (ADR-018)', () => {
    expect(seed.visits.filter((v) => v.itemsGiven.length).length).toBeGreaterThanOrEqual(3)
    expect(seed.frontendOnly.inventoryTransactions.some((t) => t.type === 'adjustment')).toBe(true)
    const withLine = () => seed.visits.findIndex((v) => v.itemsGiven.length)
    expect(problemsAfter((s) => (s.visits[withLine()].itemsGiven[0].itemId = 'item-9999'))).toMatch(/itemsGiven\[0\]\.itemId: "item-9999" doesn't exist/)
    expect(problemsAfter((s) => (s.visits[withLine()].itemsGiven[0].quantity += 1))).toMatch(/transactions net to/)
    expect(problemsAfter((s) => (s.visits[withLine()].itemsGiven[0].quantity = 0))).toMatch(/quantity: must be a whole number ≥ 1/)
  })

  it('rejects transactions whose student or visit link is wrong, and an adjustment without a reason', () => {
    const linked = () => seed.frontendOnly.inventoryTransactions.findIndex((t) => t.visitId)
    expect(problemsAfter((s) => (s.frontendOnly.inventoryTransactions[linked()].visitId = 'visit-9999'))).toMatch(/visitId: "visit-9999" doesn't exist/)
    expect(problemsAfter((s) => (s.frontendOnly.inventoryTransactions[linked()].studentId = s.students[0].id))).toMatch(/must match visit/)
    expect(problemsAfter((s) => delete s.frontendOnly.inventoryTransactions.find((t) => t.type === 'adjustment')!.reason)).toMatch(/reason/)
  })

  it('rejects a seed item that starts below zero', () => {
    expect(problemsAfter((s) => (s.inventoryItems[0].currentStock = -1))).toMatch(/can't start below 0/)
  })

  it('rejects invalid stage, status, role, and disposition values', () => {
    const bad = problemsAfter((s) => {
      ;(s.incidents[0] as { stage: number }).stage = 3
      ;(s.followUps[0] as { status: string }).status = 'done'
      ;(s.users[0] as { role: string }).role = 'nurse'
      ;(s.visits[0] as { disposition: string }).disposition = 'went_home'
    })
    expect(bad).toMatch(/stage: "3"/)
    expect(bad).toMatch(/status: "done"/)
    expect(bad).toMatch(/role: "nurse"/)
    expect(bad).toMatch(/disposition: "went_home"/)
  })

  it('rejects any stored value a selector should compute', () => {
    const cases: Array<[string, (s: MockDbSeed) => void]> = [
      ['recordComplete', (s) => Object.assign(s.students[0], { recordComplete: true })],
      ['isFrequentVisitor', (s) => Object.assign(s.students[0], { isFrequentVisitor: true })],
      ['dueState', (s) => Object.assign(s.followUps[0], { dueState: 'overdue' })],
      ['flags', (s) => Object.assign(s.inventoryItems[0], { flags: ['low_stock'] })],
      ['isLowStock', (s) => Object.assign(s.inventoryItems[0], { isLowStock: true })],
      ['data', (s) => Object.assign(s.reports[0], { data: { visits: 12 } })],
      ['counts', (s) => Object.assign(s, { counts: { visits: 900 } })],
      ['needsVerification', (s) => Object.assign(s.backupLogs[0], { needsVerification: false })],
    ]
    for (const [field, edit] of cases) expect(problemsAfter(edit)).toContain(`"${field}" is a derived value`)
  })

  it('rejects typos and missing fields', () => {
    expect(problemsAfter((s) => Object.assign(s.visits[0], { complain: 'Headache' }))).toMatch(/unexpected field "complain"/)
    expect(problemsAfter((s) => delete (s.students[0] as Partial<MockDbSeed['students'][0]>).gradeLevel)).toMatch(
      /missing field "gradeLevel"/,
    )
  })

  it('rejects absolute dates, which would go stale', () => {
    expect(
      problemsAfter((s) => ((s.followUps[0] as unknown as { followUpDate: string }).followUpDate = '2026-09-28')),
    ).toMatch(/followUpDate: expected \{"daysAgo": n\}/)
  })

  it('keeps the synthetic-data notice and fake-only credentials', () => {
    expect(problemsAfter((s) => (s.meta.notice = 'Real data'))).toMatch(/synthetic/)
    expect(problemsAfter((s) => (s.frontendOnly.devAccounts[0].password = 'hunter2'))).toMatch(/obviously fake/)
  })
})

/**
 * "Dates must not rot": on any day the app is opened, the seed still shows every state. Resolved
 * against several far-apart "todays", including a leap day and a year boundary.
 */
describe.each(['2026-09-28', '2027-01-01', '2028-02-29', '2031-06-15'])('seed resolved on %s', (today) => {
  const state = resolveSeed(seed, today)
  const dueStates = state.followUps.map((f) => followUpDueState(f, today))
  const flags = state.inventoryItems.flatMap((i) => inventoryStatusFor(state, i).flags)

  it('has overdue, due-today, and upcoming follow-ups', () => {
    expect(dueStates).toEqual(expect.arrayContaining(['overdue', 'due_today', 'upcoming']))
  })

  it('has expired, expiring-soon, and low-stock items', () => {
    expect(flags).toEqual(expect.arrayContaining(['expired', 'nearing_expiration', 'low_stock']))
  })

  it('has a Stage-1 incident, an incomplete record, and frequent visitors', () => {
    expect(state.incidents.some((i) => i.stage === 1)).toBe(true)
    expect(incompleteRecordQueue(state).some((r) => r.status === 'open')).toBe(true)
    expect(frequentVisitors(state).length).toBeGreaterThan(0)
  })

  it('has visits today, for the Staff Dashboard', () => {
    expect(state.visits.some((v) => v.dateTime.startsWith(today))).toBe(true)
  })
})
