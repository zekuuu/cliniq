import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ItemsGivenField } from '../../components'
import { allergyMatches } from '../../lib/itemsGiven'
import {
  approveIncidentReport,
  completeIncidentStageTwo,
  getIncident,
  getRecordedAuditEntries,
  getStudent,
  getVisit,
  IncidentApprovedError,
  listInventory,
  recordVisit,
  resetMockDb,
  saveIncidentStageOne,
  saveInventoryItem,
  saveStudent,
} from '../../lib/mock-db'
import { renderWithRouter } from '../../test/renderWithRouter'
import { StudentAlertCard } from '../emergency-response/StudentAlertCard'
import { submitStudentForm } from './api/studentFormApi'
import { StudentProfilePage } from './StudentProfilePage'

/** Decisions sheet, Part 2: student and incident records (ADR-047, ADR-049, ADR-051). */
describe('Student and incident records', () => {
  beforeEach(() => resetMockDb())

  it('reads "None recorded" in plain text for empty allergies and conditions, and shows entries as typed', async () => {
    const student = await getStudent('student-0001')
    expect(student.allergies).toEqual([])
    renderWithRouter(<StudentProfilePage studentId={student.id} />)
    expect(await screen.findAllByText('None recorded.')).toHaveLength(2)
    // No warning banner when nothing is recorded.
    expect(screen.queryByRole('region', { name: /allergies and medical conditions/i })).not.toBeInTheDocument()

    render(<StudentAlertCard student={{ ...student, allergies: ['Penicillin (rash)'] }} />)
    expect(screen.getByText('Penicillin (rash)')).toBeInTheDocument()
  })

  it('stores the "None recorded" choice, typed "None" and an empty field all as no entries', async () => {
    const student = await getStudent('student-0001')
    const base = {
      lrn: student.lrn,
      fullName: student.fullName,
      gradeLevel: student.gradeLevel,
      sex: student.sex,
      contactInfo: '',
      emergencyContacts: student.emergencyContacts,
    }
    for (const [allergies, medicalConditions] of [['None recorded', 'None'], ['', '']]) {
      const result = await submitStudentForm({ ...base, allergies, medicalConditions }, { mode: 'edit', studentId: student.id })
      expect(result.status === 'saved' && result.student).toMatchObject({ allergies: [], medicalConditions: [], recordComplete: true })
    }
  })

  it('keeps a record complete with no student mobile number', async () => {
    const student = await getStudent('student-0001')
    const result = await saveStudent({ ...student, contactInfo: '' }, { studentId: student.id })
    expect(result.status === 'saved' && result.student.recordComplete).toBe(true)
  })

  it('matches an item\'s "avoid if allergic to" word against the allergies, case-insensitively', () => {
    expect(allergyMatches({ avoidIfAllergicTo: ['penicillin'] }, ['Penicillin (rash)'])).toEqual(['penicillin'])
    expect(allergyMatches({ avoidIfAllergicTo: ['penicillin'] }, ['Peanuts'])).toEqual([])
    expect(allergyMatches({}, ['Penicillin'])).toEqual([])
  })

  it('warns beside the allergies at the medicine picker and never blocks the line', async () => {
    const [item] = await listInventory()
    const { name, category, unit, lowStockThreshold, brand, currentStock, expirationDate } = item
    await saveInventoryItem({ name, category, unit, lowStockThreshold, brand, currentStock, expirationDate, avoidIfAllergicTo: [' penicillin ', 'Penicillin', ''] }, { itemId: item.id })
    const [tagged] = (await listInventory()).filter((candidate) => candidate.id === item.id)
    expect(tagged.avoidIfAllergicTo).toEqual(['penicillin'])
    expect(getRecordedAuditEntries().at(-1)).toMatchObject({ actionType: 'update', summary: 'Updated avoid if allergic to' })

    render(<ItemsGivenField items={[tagged]} lines={[{ itemId: item.id, quantity: 1, instructions: '' }]} onChange={() => {}} allergies={['Penicillin']} />)
    expect(screen.getByText('Avoid if allergic to penicillin: this patient lists penicillin.')).toBeInTheDocument()

    // Recording it is still allowed (ADR-018).
    const { visit } = await recordVisit({
      studentId: 'student-0001',
      complaint: 'Fever',
      treatment: '',
      disposition: 'returned_to_class',
      followUp: null,
      itemsGiven: [{ itemId: item.id, quantity: 1 }],
    })
    expect(visit.itemsGiven).toHaveLength(1)
  })

  it('keeps the grade a visit and an incident were saved in after the student moves up', async () => {
    const student = await getStudent('student-0001')
    const { visit } = await recordVisit({ studentId: student.id, complaint: 'Fever', treatment: '', disposition: 'returned_to_class', followUp: null })
    const incident = await saveIncidentStageOne({ studentId: student.id, complaint: 'Fainting', vitals: {} })
    expect(visit.gradeLevelAtTime).toBe(student.gradeLevel)
    await saveStudent({ ...student, gradeLevel: 'Grade 1' }, { studentId: student.id })
    expect((await getVisit(visit.id)).gradeLevelAtTime).toBe(student.gradeLevel)
    expect((await getIncident(incident.id)).gradeLevelAtTime).toBe(student.gradeLevel)
  })

  it('fills the grade on records saved before the field existed, and none for staff', async () => {
    expect((await getVisit('visit-0001')).gradeLevelAtTime).toBe((await getStudent('student-0018')).gradeLevel)
    const { visit } = await recordVisit({ personnelId: 'personnel-0001', complaint: 'Fever', treatment: '', disposition: 'returned_to_class', followUp: null })
    expect(visit.gradeLevelAtTime).toBeUndefined()
  })

  it('lets Additional notes be corrected until the incident report is approved, audited, then fixed', async () => {
    const incident = await saveIncidentStageOne({ studentId: 'student-0001', complaint: 'Fainting', vitals: {}, generalNotes: 'First note' })
    const stageTwo = { incidentId: incident.id, complaint: 'Fainting', vitals: { treatmentNotes: 'Rested' }, hospitalReferral: null, newParentNotifications: [], followUp: null }
    await completeIncidentStageTwo({ ...stageTwo, generalNotes: 'Corrected note' })
    expect((await getIncident(incident.id)).generalNotes).toBe('Corrected note')
    expect(getRecordedAuditEntries().at(-1)?.summary).toMatch(/corrected additional notes/)

    await approveIncidentReport(incident.id)
    await expect(completeIncidentStageTwo({ ...stageTwo, generalNotes: 'Too late' })).rejects.toBeInstanceOf(IncidentApprovedError)
    expect((await getIncident(incident.id)).generalNotes).toBe('Corrected note')
  })

  it('shows Additional notes as an editable field on Stage 2 until approval', async () => {
    const user = userEvent.setup()
    const { IncidentEntryPage } = await import('../emergency-response/IncidentEntryPage')
    const incident = await saveIncidentStageOne({ studentId: 'student-0001', complaint: 'Fainting', vitals: {}, generalNotes: 'First note' })
    renderWithRouter(<IncidentEntryPage incidentId={incident.id} />)
    const notes = await screen.findByLabelText('Additional notes (optional)')
    expect(notes).toHaveValue('First note')
    await user.clear(notes)
    await user.type(notes, 'Edited')
    expect(notes).toHaveValue('Edited')
  })
})
