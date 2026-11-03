import { beforeEach, describe, expect, it } from 'vitest'
import {
  getMockToday,
  getRecordedAuditEntries,
  getStudent,
  listFollowUps,
  getIncompleteRecordQueue,
  listPersonnel,
  listStudents,
  recordVisit,
  resetMockDb,
  rescheduleFollowUp,
  saveStudent,
  setFollowUpStatus,
} from './index'
import { addDays } from '../dates'
import { db } from './store'

const ROW_KEYS = ['archived', 'fullName', 'gradeLevel', 'id', 'lrn', 'recordComplete']
const STAFF = { id: 'user-staff-01', name: 'Audit Nurse', role: 'staff' as const }

beforeEach(() => resetMockDb())

describe('API contract fixes', () => {
  it('ADR-058: the audit log carries the name-correction reason, never the names', async () => {
    const student = await getStudent('student-0001')
    await saveStudent({ ...student, fullName: `${student.fullName} Jr.` }, { studentId: student.id, actor: STAFF, nameCorrectionReason: 'Birthcertificate zebra mismatch' })
    const entry = getRecordedAuditEntries().at(-1)
    expect(entry?.summary).toBe('Updated name. Name corrected; reason: Birthcertificate zebra mismatch')
    expect(JSON.stringify(getRecordedAuditEntries())).not.toContain(student.fullName)
  })

  it('Q7: a follow-up that reads as Missed gets a new date and stays closed', async () => {
    const pending = await stayHomeFollowUp({ studentId: 'student-0001', personnelId: null }, addDays(getMockToday(), -8))
    expect((await listFollowUps()).find((f) => f.id === pending.id)?.status).toBe('missed')
    const next = await rescheduleFollowUp(pending.id, addDays(getMockToday(), 2), STAFF)
    expect(next).toMatchObject({ status: 'pending', reason: pending.reason, relatedRecord: pending.relatedRecord })
    expect(db().followUps.find((f) => f.id === pending.id)).toMatchObject({ status: 'missed', statusReason: expect.stringMatching(/No response/) })
    expect(getRecordedAuditEntries().at(-1)).toMatchObject({ actionType: 'create', targetRecord: { id: next.id } })
  })

  it('Q7: completed, cancelled and still-pending follow-ups get no new date', async () => {
    const [first, second, third] = await listFollowUps({ status: 'pending' })
    const later = addDays(getMockToday(), 2)
    await expect(rescheduleFollowUp(first.id, later)).rejects.toThrow(/missed/i)
    await setFollowUpStatus(first.id, 'completed', STAFF)
    await expect(rescheduleFollowUp(first.id, later)).rejects.toThrow(/missed/i)
    await setFollowUpStatus(second.id, 'cancelled', STAFF, 'Transferred')
    await expect(rescheduleFollowUp(second.id, later)).rejects.toThrow(/missed/i)
    await setFollowUpStatus(third.id, 'missed', STAFF, 'Did not come')
    await expect(rescheduleFollowUp(third.id, addDays(getMockToday(), -1))).rejects.toThrow(/past/)
  })

  it('a Missed follow-up given a new date leaves the list, stays in the data, and cannot be given another', async () => {
    const old = await stayHomeFollowUp({ studentId: 'student-0001', personnelId: null }, addDays(getMockToday(), -8))
    const later = addDays(getMockToday(), 2)
    expect((await listFollowUps()).some((f) => f.id === old.id)).toBe(true)
    const next = await rescheduleFollowUp(old.id, later, STAFF)
    expect((await listFollowUps()).some((f) => f.id === old.id)).toBe(false)
    expect(db().followUps.find((f) => f.id === old.id)).toMatchObject({ status: 'missed' })
    await expect(rescheduleFollowUp(old.id, later, STAFF)).rejects.toThrow(/already has a new date/)
    // The chain goes on from the newest one, and the old row does not come back.
    await setFollowUpStatus(next.id, 'missed', STAFF, 'Did not come')
    expect((await listFollowUps()).some((f) => f.id === old.id)).toBe(false)
    expect((await listFollowUps()).some((f) => f.id === next.id)).toBe(true)
  })

  async function stayHomeFollowUp(patient: { studentId: string; personnelId: null } | { studentId: null; personnelId: string }, followUpDate = getMockToday()) {
    const { followUp } = await recordVisit({
      ...patient,
      complaint: 'Fever',
      treatment: '',
      disposition: 'sent_home',
      eventTag: null,
      loggedByUserId: STAFF.id,
      followUp: { followUpDate, reason: 'Recheck', notes: null, stayHomeUntilCleared: true, stayHomeNote: 'Until fever-free 24 hours' },
    } as never)
    return followUp!
  }

  it.each(['student', 'staff'])('Q7b: a %s patient keeps the stay-home flag and note on the new follow-up', async (kind) => {
    const [person] = await listPersonnel()
    const patient = kind === 'student' ? { studentId: 'student-0001', personnelId: null } : { studentId: null, personnelId: person.id }
    const old = await stayHomeFollowUp(patient)
    await setFollowUpStatus(old.id, 'missed', STAFF, 'Did not come')
    const next = await rescheduleFollowUp(old.id, addDays(getMockToday(), 2), STAFF)
    expect(next).toMatchObject({ ...patient, stayHomeUntilCleared: true, stayHomeNote: 'Until fever-free 24 hours' })
    expect(db().followUps.find((f) => f.id === old.id)?.status).toBe('missed')
    const entry = getRecordedAuditEntries().at(-1)
    expect(entry).toMatchObject({ actionType: 'create', targetRecord: { type: 'follow-up', id: next.id } })
    expect(JSON.stringify(entry)).not.toContain('fever-free')
  })

  it('ADR-059: a student saves without an emergency contact and is flagged Incomplete', async () => {
    const student = await getStudent('student-0001')
    const saved = await saveStudent({ ...student, lrn: '000000269992', fullName: 'No Contact Yet', emergencyContacts: [] }, { actor: STAFF, confirmDuplicate: true })
    if (saved.status !== 'saved') throw new Error('not saved')
    expect(saved.student.recordComplete).toBe(false)
    const queue = await getIncompleteRecordQueue()
    expect(queue.find((row) => row.student.id === saved.student.id)?.missingFields).toContain('Emergency contact')
  })

  it('Q2: a list row carries only the list columns, with the LRN masked', async () => {
    const rows = await listStudents()
    const [record] = await getIncompleteRecordQueue()
    for (const row of [...rows, record.student]) {
      expect(Object.keys(row).sort()).toEqual(ROW_KEYS)
      expect(row.lrn).toMatch(/^•{8}\d{4}$/)
    }
    expect((await getStudent(rows[0].id)).allergies).toBeDefined()
  })
})
