import {
  completeIncidentStageTwo,
  getIncident,
  getIncidentComplaintTypes,
  getStudent,
  getStudentById,
  getVitalsWarningRanges,
  listInventory,
  saveIncidentStageOne,
  searchStudents,
  type InventoryItemView,
  type ItemLineInput,
  type SessionUser,
  type VitalsWarningRanges,
} from '../../../lib/mock-db'
import type {
  FollowUp,
  HospitalReferral,
  Incident,
  ParentNotificationAttempt,
  Student,
  StudentSearchResult,
} from '../../../types/entities'
import { storedReadings, type ReadingValues } from '../../../lib/vitals'

export interface IncidentEntryContext {
  /**
   * `null` when the Emergency button opened Stage 1 before anyone identified the student; Stage 1
   * then asks for the Student Number instead of silently attaching a default student.
   */
  student: Student | null
  /** Incident complaint options (mock-only vocabulary; see mock-db.json). */
  complaintTypes: string[]
  /** Set when an existing incident is reopened to complete Stage 2 (Screen #16b). */
  incident: Incident | null
  /** Inventory with computed flags, for Stage 2's Medicines & supplies picker. */
  items: InventoryItemView[]
  /** Placeholder sanity bounds for the non-blocking vitals warning (config; nurse to confirm). */
  vitalsRanges: VitalsWarningRanges
}

export interface StageOneIncidentInput {
  studentId: string
  complaint: string
  /** All optional; only the readings taken are saved. */
  readings: ReadingValues
  generalNotes?: string
}

export interface StageTwoIncidentInput {
  incidentId: string
  studentId: string
  complaint: string
  /** All optional; only the readings taken are saved. */
  readings: ReadingValues
  treatmentNotes: string
  hospitalReferral: HospitalReferral | null
  /** Attempts logged on this form; appended to the incident's notification log. */
  parentNotifications: ParentNotificationAttempt[]
  followUp: null | Pick<FollowUp, 'followUpDate' | 'reason' | 'notes'>
  /** Dispensed with the Stage 2 save; each dispense references the incident (ADR-018). */
  itemsGiven?: ItemLineInput[]
}

/**
 * `incidentId` reopens a saved incident for Stage 2, with its student. Without it, no student is
 * attached until Stage 1 identifies one.
 */
export async function fetchIncidentEntryContext(incidentId?: string): Promise<IncidentEntryContext> {
  const complaintTypes = getIncidentComplaintTypes()
  const items = listInventory()
  const vitalsRanges = await getVitalsWarningRanges()
  if (incidentId) {
    const incident = await getIncident(incidentId)
    const [student, types] = await Promise.all([getStudentById(incident.studentId), complaintTypes])
    return { student, complaintTypes: types, incident, items: await items, vitalsRanges }
  }
  return { student: null, complaintTypes: await complaintTypes, incident: null, items: await items, vitalsRanges }
}

/** Resolves the Student Number typed on Stage 1 when the student wasn't identified beforehand. */
export function findIncidentStudent(studentNumber: string): Promise<Student> {
  return getStudent(studentNumber)
}

/** Stage 1 needs only the complaint, plus whichever readings were taken; the layer logs it as its own event. */
export function saveStageOneIncident(input: StageOneIncidentInput, user: SessionUser): Promise<Incident> {
  return saveIncidentStageOne(
    {
      studentId: input.studentId,
      complaint: input.complaint,
      vitals: storedReadings(input.readings),
      generalNotes: input.generalNotes,
    },
    user,
  )
}

export function completeStageTwoIncident(
  input: StageTwoIncidentInput,
  user: SessionUser,
): Promise<{ incident: Incident; followUp: FollowUp | null; belowZero: string[] }> {
  return completeIncidentStageTwo(
    {
      incidentId: input.incidentId,
      complaint: input.complaint,
      vitals: { ...storedReadings(input.readings), treatmentNotes: input.treatmentNotes },
      hospitalReferral: input.hospitalReferral,
      newParentNotifications: input.parentNotifications,
      followUp: input.followUp,
      itemsGiven: input.itemsGiven,
    },
    user,
  )
}

/** Incident Stage 1 student search: Student Number prefix or name, active students, at most 8. */
export function searchIncidentStudents(query: string): Promise<StudentSearchResult[]> {
  return searchStudents(query)
}
