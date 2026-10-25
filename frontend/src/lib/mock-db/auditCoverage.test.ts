import { beforeEach, describe, expect, it } from 'vitest'
import {
  addParentNotification,
  adjustInventoryStock,
  approveExcuseLetter,
  approveIncidentReport,
  archiveStudent,
  authenticateMockUser,
  changeMockPassword,
  completeIncidentStageTwo,
  confirmMockPassword,
  createCalendarEvent,
  createIssueReport,
  createSportsReport,
  deleteCalendarEvent,
  dispenseInventoryItem,
  duplicateSportsReport,
  getMockToday,
  getRecordedAuditEntries,
  getStudent,
  issueReplacementExcuseLetter,
  listFollowUps,
  logoutMockSession,
  markVisitEnteredInError,
  recordBackupNow,
  recordPrint,
  recordVisit,
  resetMockAuth,
  resetMockDb,
  resetUserPassword,
  restockInventoryItem,
  saveIncidentStageOne,
  saveInventoryItem,
  saveStudent,
  saveUser,
  setFollowUpStatus,
  setSportsReportArchived,
  setUserActive,
  submitPeReferral,
  updateCalendarEvent,
  updateSportsReport,
  updateVisit,
  verifyLatestBackup,
  type SessionUser,
} from './index'
import { addDays } from '../dates'

/**
 * Panel review AU-1: every audited event, one test each. `04-Development/Audit-Coverage.md` lists them
 * with what the user does and what the entry records. Each case checks the action, the target type
 * and, where one is written, the summary.
 */

const STAFF: SessionUser = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }
const ADMIN: SessionUser = { id: 'user-admin-01', name: 'Gilan Avelida', role: 'admin' }
const last = () => getRecordedAuditEntries().at(-1)!
const entries = () => getRecordedAuditEntries().map((e) => [e.actionType, e.targetRecord?.type ?? null, e.summary ?? null])
const today = () => getMockToday()
const base = { studentId: 'student-0001', complaint: 'Headache', treatment: '', followUp: null } as const

beforeEach(() => {
  resetMockDb()
  resetMockAuth()
})

describe('every audited event is written (AU-1)', () => {
  it('sign-in, sign-out, password confirmation and password change', async () => {
    await authenticateMockUser('demo.nurse', 'demo-nurse')
    await confirmMockPassword(STAFF.id, 'demo-nurse', 'archive a student record')
    await logoutMockSession(STAFF)
    await changeMockPassword('user-staff-02', 'brand-new-pass-1')
    expect(entries()).toEqual([
      ['login', 'user', null],
      ['login', 'user', 'Confirmed with password: archive a student record'],
      ['logout', null, null],
      ['update', 'user', 'Changed password'],
    ])
  })

  it('accounts: create, edit, disable, enable, reset password', async () => {
    const user = await saveUser({ name: 'New Nurse', username: 'new.nurse', role: 'staff', temporaryPassword: 'temp-pass-123' }, { actor: ADMIN })
    await saveUser({ name: 'New Nurse B', username: 'new.nurse', role: 'staff' }, { userId: user.id, actor: ADMIN })
    await setUserActive(user.id, false, ADMIN)
    await setUserActive(user.id, true, ADMIN)
    await resetUserPassword(user.id, 'another-temp-1', ADMIN)
    expect(entries().map(([action, type, summary]) => [action, type, summary === null ? null : String(summary).split(':')[0]])).toEqual([
      ['create', 'user', null],
      ['update', 'user', expect.any(String)],
      ['update', 'user', 'Disabled account'],
      ['update', 'user', 'Enabled account'],
      ['update', 'user', 'Reset password'],
    ])
  })

  it('students: create, edit, archive', async () => {
    const student = await getStudent('student-0001')
    const input = { ...student, lrn: '000000269991', fullName: 'Audit Pupil', emergencyContacts: student.emergencyContacts }
    const created = await saveStudent(input, { actor: STAFF, confirmDuplicate: true })
    if (created.status !== 'saved') throw new Error('not saved')
    await saveStudent({ ...input, fullName: 'Audit Pupil B' }, { studentId: created.student.id, actor: STAFF, nameCorrectionReason: 'Typo in the surname' })
    await archiveStudent(created.student.id, STAFF)
    expect(entries().map(([action, type]) => [action, type])).toEqual([
      ['create', 'student'],
      ['update', 'student'],
      ['archive', 'student'],
    ])
  })

  it('visits: submit (and late entry), edit, follow-up, entered in error, escalation', async () => {
    const { visit } = await recordVisit({ ...base, disposition: 'sent_home', followUp: { followUpDate: addDays(today(), 1), reason: 'Recheck', notes: null }, excuseLetterDraft: { excusedFrom: today(), excusedUntil: today(), note: null } })
    expect(entries()).toEqual([['submit', 'visit', null], ['create', 'follow-up', null]])
    await updateVisit(visit.id, { complaint: 'Fever', treatment: '', disposition: 'sent_home', eventTag: null })
    expect(last()).toMatchObject({ actionType: 'update', targetRecord: { type: 'visit' } })
    const late = await recordVisit({ ...base, disposition: 'returned_to_class', dateTime: `${today()}T00:00` })
    if (late.visit.lateEntry) expect(last()).toMatchObject({ actionType: 'submit', summary: 'Late entry' })
    const escalate = await recordVisit({ ...base, disposition: 'returned_to_class' })
    await saveIncidentStageOne({ studentId: base.studentId, complaint: 'Fainting', vitals: {}, sourceVisitId: escalate.visit.id })
    expect(getRecordedAuditEntries().at(-2)).toMatchObject({ actionType: 'update', summary: 'Escalated to incident' })
    await markVisitEnteredInError(visit.id, 'Wrong student')
    expect(last()).toMatchObject({ actionType: 'update', targetRecord: { type: 'follow-up' }, summary: 'Marked cancelled: visit entered in error' })
    expect(getRecordedAuditEntries().at(-2)).toMatchObject({ actionType: 'update', summary: 'Voided: visit entered in error' })
    expect(getRecordedAuditEntries().at(-3)).toMatchObject({ actionType: 'update', summary: 'Marked entered in error' })
  })

  it('excuse letters: approve, replacement', async () => {
    const { visit } = await recordVisit({ ...base, disposition: 'sent_home', excuseLetterDraft: { excusedFrom: today(), excusedUntil: today(), note: null } })
    await approveExcuseLetter(visit.id, { excusedFrom: today(), excusedUntil: today() })
    expect(last()).toMatchObject({ actionType: 'approve', targetRecord: { type: 'excuse-letter' } })
    await issueReplacementExcuseLetter(visit.id, 'Wrong date')
    expect(last()).toMatchObject({ actionType: 'update', summary: 'Superseded; replacement draft opened' })
  })

  it('PE/Sports referral, and its escalation when referred to hospital', async () => {
    await submitPeReferral({ studentId: 'student-0001', referredBy: 'Coach', activity: 'Basketball', injurySummary: 'Twisted ankle', clinicalAssessment: 'Swelling', treatment: 'Cold compress', disposition: 'referred_to_hospital' }, STAFF)
    expect(entries()).toEqual([['submit', 'pe-sports-referral', null], ['create', 'incident-escalation', null]])
  })

  it('incidents: Stage 1, Stage 2 with a notification, a later notification, report approval', async () => {
    const incident = await saveIncidentStageOne({ studentId: 'student-0001', complaint: 'Fainting', vitals: {} })
    await completeIncidentStageTwo({ incidentId: incident.id, complaint: 'Fainting', vitals: { treatmentNotes: 'Observed' }, hospitalReferral: null, newParentNotifications: [{ outcome: 'reached', timestamp: `${today()}T09:00:00+08:00` }], followUp: null })
    await addParentNotification(incident.id, 'no_answer')
    await approveIncidentReport(incident.id)
    expect(entries().map(([action, type]) => [action, type])).toEqual([
      ['submit', 'incident-stage-1'],
      ['update', 'incident-stage-2'],
      ['create', 'parent-notification'],
      ['create', 'parent-notification'],
      ['approve', 'incident-report'],
    ])
  })

  it('follow-up status changes', async () => {
    const [pending] = await listFollowUps({ status: 'pending' })
    await setFollowUpStatus(pending.id, 'completed')
    expect(last()).toMatchObject({ actionType: 'update', targetRecord: { type: 'follow-up' }, summary: 'Marked completed' })
  })

  it('inventory: add item, dispense, restock, adjust, and visit lines', async () => {
    const item = await saveInventoryItem({ name: 'Saline', category: 'supply', currentStock: 5, unit: 'bottles', lowStockThreshold: 1, expirationDate: null, noExpirationConfirmed: true })
    await dispenseInventoryItem('item-0011', 1, {}, STAFF)
    await restockInventoryItem('item-0011', 5, null, { noExpirationConfirmed: true, actor: STAFF })
    await adjustInventoryStock('item-0011', { change: -1, reason: 'damaged_spilled' }, STAFF)
    await recordVisit({ ...base, disposition: 'returned_to_class', itemsGiven: [{ itemId: 'item-0011', quantity: 1 }] })
    expect(entries().map(([action, type]) => [action, type])).toEqual([
      ['create', 'inventory'],
      ['submit', 'inventory-dispensation'],
      ['submit', 'inventory-restock'],
      ['submit', 'inventory-adjustment'],
      ['submit', 'visit'],
      ['submit', 'inventory-dispensation'],
    ])
    expect(item.name).toBe('Saline')
  })

  it('backup: back up now, verify', async () => {
    await recordBackupNow(ADMIN)
    await verifyLatestBackup(STAFF)
    expect(entries()).toEqual([['create', 'backup', 'Backup started from the Backup page'], ['update', 'backup', 'Verified backup']])
  })

  it('calendar events: create, edit, delete', async () => {
    const event = await createCalendarEvent({ title: 'Intramurals', startDate: today(), endDate: null }, STAFF)
    await updateCalendarEvent(event.id, { title: 'Intramurals Day 1', startDate: today(), endDate: null }, STAFF)
    await deleteCalendarEvent(event.id, STAFF)
    expect(entries().map(([action, type]) => [action, type])).toEqual([['create', 'calendar-event'], ['update', 'calendar-event'], ['delete', 'calendar-event']])
  })

  it('Sports Reports: create, edit, duplicate, archive, restore', async () => {
    const input = { title: 'Varsity', activity: 'Basketball', requestedBy: 'Coach', window: 90 as const, includeConditions: false, students: [{ studentId: 'student-0001', note: '' }] }
    const report = await createSportsReport(input, STAFF)
    await updateSportsReport(report.id, { ...input, title: 'Varsity A' }, STAFF)
    await duplicateSportsReport(report.id, STAFF)
    await setSportsReportArchived(report.id, true, STAFF)
    await setSportsReportArchived(report.id, false, STAFF)
    expect(entries().map(([action, type]) => [action, type])).toEqual([
      ['create', 'sports-report'],
      ['update', 'sports-report'],
      ['create', 'sports-report'],
      ['archive', 'sports-report'],
      ['update', 'sports-report'],
    ])
  })

  it('printing and issue reports', async () => {
    await recordPrint('Monthly Clinic Report', STAFF)
    await createIssueReport({ description: 'Button overlaps on a phone', route: '/visits', pageName: 'Visit Log' }, STAFF)
    expect(entries().map(([action, type]) => [action, type])).toEqual([['print', 'print-document'], ['create', 'issue-report']])
  })
})
