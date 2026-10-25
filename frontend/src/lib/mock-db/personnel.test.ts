import { beforeEach, describe, expect, it } from 'vitest'
import {
  archivePersonnel,
  dispenseInventoryItem,
  getInventoryItem,
  getPersonnelHistory,
  getRecordedAuditEntries,
  getStudentHistory,
  listPersonnel,
  listVisits,
  recordVisit,
  resetMockDb,
  saveIncidentStageOne,
  savePersonnel,
  searchPatients,
  searchPersonnel,
  type PersonnelInput,
  type SessionUser,
} from './index'
import { checkSeedIntegrity } from './integrity'
import { patientSplit } from './selectors'
import { seed } from './seed'
import { db, migratePersistedState } from './store'
import type { MockDbSeed } from './types'

/** Staff patients, the data layer only (ADR-043 part 1). */

const STAFF: SessionUser = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }
const ADMIN: SessionUser = { id: 'user-admin-01', name: 'Gilan Avelida', role: 'admin' }
const PARACETAMOL = 'item-0001'
const STAFF_MEMBER = 'personnel-0002'

const problemsAfter = (edit: (s: MockDbSeed) => void) => {
  const copy = structuredClone(seed)
  edit(copy)
  return checkSeedIntegrity(copy).join('\n')
}
const staffVisit = (s: MockDbSeed) => s.visits.find((v) => v.personnelId)!
const newStaff = (fullName: string): PersonnelInput => ({
  fullName,
  type: 'Teacher',
  department: 'Grade 2 adviser',
  contactInfo: '0900-300-9999',
  allergies: [],
  medicalConditions: [],
  emergencyContacts: [],
})

beforeEach(() => resetMockDb())

describe('exactly one patient on every clinical record', () => {
  it('rejects a seed record with both or neither, naming the record', () => {
    expect(problemsAfter((s) => (staffVisit(s).studentId = 'student-0001'))).toMatch(/visits\[\d+\] \(visit-\d+\): sets both studentId and personnelId/)
    expect(problemsAfter((s) => (staffVisit(s).personnelId = null))).toMatch(/visits\[\d+\] \(visit-\d+\): sets neither studentId nor personnelId/)
    expect(problemsAfter((s) => (s.incidents[0].personnelId = 'personnel-0001'))).toMatch(/incidents\[0\].*sets both/)
  })

  it('rejects the same in a write, and saves nothing', async () => {
    const before = db().visits.length
    const visit = { complaint: 'Headache', treatment: '', disposition: 'returned_to_class' as const, followUp: null }
    await expect(recordVisit({ ...visit, studentId: 'student-0001', personnelId: STAFF_MEMBER }, STAFF)).rejects.toThrow(/Choose one patient/)
    await expect(recordVisit(visit, STAFF)).rejects.toThrow(/Choose one patient/)
    await expect(saveIncidentStageOne({ complaint: 'Fainting', vitals: {} }, STAFF)).rejects.toThrow(/Choose one patient/)
    expect(db().visits.length).toBe(before)
  })
})

describe('the integrity check names the bad field', () => {
  it.each([
    ['a dangling personnelId', (s: MockDbSeed) => (staffVisit(s).personnelId = 'personnel-9999'), /personnelId: staff member "personnel-9999" doesn't exist/],
    ['a malformed Staff No.', (s: MockDbSeed) => (s.personnel[0].staffNumber = 'STF-1'), /personnel\[0\].*staffNumber: "STF-1" doesn't look like STF-0001/],
    ['a duplicate Staff No.', (s: MockDbSeed) => (s.personnel[1].staffNumber = s.personnel[0].staffNumber), /personnel\[1\].*staffNumber: duplicate "STF-0001"/],
    ['an invalid type', (s: MockDbSeed) => (s.personnel[0].type = 'Janitor'), /personnel\[0\].*type: "Janitor" is not one of/],
    ['a stored derived value', (s: MockDbSeed) => Object.assign(s.personnel[0], { recordComplete: true }), /personnel\[0\].*"recordComplete" is a derived value/],
    ['an excuse letter for staff', (s: MockDbSeed) => {
      const v = s.visits.find((x) => x.personnelId && x.disposition === 'sent_home')!
      v.excuseLetterDraft = { excusedFrom: { daysAgo: 1 }, excusedUntil: { daysAgo: 1 }, note: null }
    }, /excuseLetterDraft: an excuse letter is only for a student/],
    ['a follow-up whose patient differs from its record', (s: MockDbSeed) => {
      const f = s.followUps.find((x) => x.personnelId)!
      f.personnelId = 'personnel-0001'
    }, /personnel personnel-0001 doesn't match its (visit|incident)'s personnel personnel-\d{4}/],
  ])('rejects %s', (_label, edit, message) => {
    expect(problemsAfter(edit)).toMatch(message)
  })
})

describe('staff records and history', () => {
  it('keeps a staff visit in the staff history and the Visit Log, and in no student history', async () => {
    const { visit } = await recordVisit(
      { personnelId: STAFF_MEMBER, complaint: 'Headache', treatment: '', disposition: 'returned_to_class', followUp: null },
      STAFF,
    )
    expect(visit).toMatchObject({ studentId: null, personnelId: STAFF_MEMBER })
    expect((await getPersonnelHistory(STAFF_MEMBER)).visits.map((v) => v.id)).toContain(visit.id)
    for (const student of db().students)
      expect((await getStudentHistory(student.id, Infinity)).visits.map((v) => v.id)).not.toContain(visit.id)
    expect((await listVisits()).map((v) => v.id)).toContain(visit.id)
  })

  it('takes stock for a staff member and points the transaction at them', async () => {
    const stock = async () => (await getInventoryItem(PARACETAMOL)).currentStock
    const start = await stock()
    const { visit } = await recordVisit(
      { personnelId: STAFF_MEMBER, complaint: 'Headache', treatment: '', disposition: 'returned_to_class', followUp: null, itemsGiven: [{ itemId: PARACETAMOL, quantity: 1 }] },
      STAFF,
    )
    await dispenseInventoryItem(PARACETAMOL, 2, { personnelId: STAFF_MEMBER }, STAFF)
    expect(await stock()).toBe(start - 3)
    const added = db().frontendOnly.inventoryTransactions.slice(-2)
    expect(added.map((t) => [t.type, t.quantity, t.studentId, t.personnelId, t.visitId])).toEqual([
      ['dispense', 1, null, STAFF_MEMBER, visit.id],
      ['dispense', 2, null, STAFF_MEMBER, null],
    ])
  })

  it('assigns the next free Staff No., logs each write as Staff, and never deletes', async () => {
    const first = await savePersonnel(newStaff('Ana Test'), { actor: STAFF })
    const second = await savePersonnel(newStaff('Ben Test'), { actor: STAFF })
    expect([first.personnel.staffNumber, second.personnel.staffNumber]).toEqual(['STF-0013', 'STF-0014'])
    await savePersonnel({ ...newStaff('Ben Test'), allergies: ['Latex'] }, { personnelId: second.personnel.id, actor: STAFF })
    await archivePersonnel(first.personnel.id, STAFF)
    expect(getRecordedAuditEntries().map((e) => [e.actionType, e.targetRecord?.type, e.summary])).toEqual([
      ['create', 'staff', undefined],
      ['create', 'staff', undefined],
      ['update', 'staff', 'Updated allergies'],
      ['archive', 'staff', undefined],
    ])
    expect((await listPersonnel()).map((p) => p.id)).not.toContain(first.personnel.id)
    expect((await listPersonnel({ includeArchived: true })).map((p) => p.id)).toContain(first.personnel.id)
    expect(await searchPersonnel('Ana Test')).toEqual([])
    // Archived records keep their number, so the next one doesn't reuse it.
    expect((await savePersonnel(newStaff('Cy Test'), { actor: STAFF })).personnel.staffNumber).toBe('STF-0015')
  })

  it('lets only the School Clinician write staff records', async () => {
    await expect(savePersonnel(newStaff('Ana Test'), { actor: ADMIN })).rejects.toThrow(/Only the clinic staff/)
    await expect(archivePersonnel(STAFF_MEMBER, ADMIN)).rejects.toThrow(/Only the clinic staff/)
  })

  it('searches students and staff in one box, labelled, nothing medical', async () => {
    const byNumber = await searchPatients('STF-0002')
    expect(byNumber).toEqual([{ kind: 'personnel', id: STAFF_MEMBER, staffNumber: 'STF-0002', fullName: 'Dindo Arcega', type: 'Teacher' }])
    const mixed = await searchPatients('a')
    expect(new Set(mixed.map((r) => r.kind))).toEqual(new Set(['student', 'personnel']))
    expect(mixed.length).toBeLessThanOrEqual(8)
    for (const result of mixed) expect(result).not.toHaveProperty('allergies')
  })

  it('splits any set of records into students and staff', () => {
    expect(patientSplit(db().visits)).toEqual({
      students: db().visits.filter((v) => v.studentId).length,
      staff: db().visits.filter((v) => v.personnelId).length,
    })
  })
})

describe('a copy saved before staff patients existed', () => {
  it('gets an empty staff list, the staff types, and personnelId: null on every record', () => {
    // What such a copy holds: students' records only, and no personnelId, staff list or staff types.
    const state = structuredClone(db())
    state.visits = state.visits.filter((v) => v.studentId)
    state.incidents = state.incidents.filter((i) => i.studentId)
    state.followUps = state.followUps.filter((f) => f.studentId)
    state.frontendOnly.inventoryTransactions = state.frontendOnly.inventoryTransactions.filter((t) => !t.personnelId)
    const records = () => [...state.visits, ...state.incidents, ...state.followUps, ...state.frontendOnly.inventoryTransactions]
    for (const record of records()) delete (record as { personnelId?: unknown }).personnelId
    delete (state as { personnel?: unknown }).personnel
    delete (state.config as { personnelTypes?: unknown }).personnelTypes

    const { state: migrated } = migratePersistedState({ state, seedAuditLength: 0 })
    expect(migrated.personnel).toEqual([])
    expect(migrated.config.personnelTypes).toEqual(['Teacher', 'Non-teaching staff', 'Utility worker'])
    expect(records().length).toBeGreaterThan(0)
    for (const record of records()) expect(record.personnelId).toBeNull()
  })
})
