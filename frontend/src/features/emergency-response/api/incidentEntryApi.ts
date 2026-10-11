import {
  completeIncidentStageTwo,
  getIncident,
  getIncidentComplaintTypes,
  getStudent,
  getStudentById,
  listInventory,
  saveIncidentStageOne,
  searchStudents,
  type InventoryItemView,
  type ItemLineInput,
  type SessionUser,
} from '../../../lib/mock-db'
import type {
  FollowUp,
  HospitalReferral,
  Incident,
  ParentNotificationAttempt,
  Student,
  StudentSearchResult,
} from '../../../types/entities'

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
}

export interface StageOneIncidentInput {
  studentId: string
  complaint: string
  temperatureC: string
  pulseBpm: string
  generalNotes?: string
}

export interface StageTwoIncidentInput {
  incidentId: string
  studentId: string
  complaint: string
  temperatureC: string
  pulseBpm: string
  bloodPressure: string
  oxygenSaturation: string
  treatmentNotes: string
  hospitalReferral: HospitalReferral | null
  /** Attempts logged on this form; appended to the incident's notification log. */
  parentNotifications: ParentNotificationAttempt[]
  followUp: null | Pick<FollowUp, 'followUpDate' | 'reason' | 'notes'>
  /** Dispensed with the Stage 2 save; each dispense references the incident (ADR-018). */
  itemsGiven?: ItemLineInput[]
}

/**
 * `studentNumber` is the route's `?student=` pre-selection; `incidentId` reopens a saved incident for
 * Stage 2. With neither, no student is attached until Stage 1 identifies one.
 */
export async function fetchIncidentEntryContext(
  options: { studentNumber?: string; incidentId?: string } = {},
): Promise<IncidentEntryContext> {
  const complaintTypes = getIncidentComplaintTypes()
  const items = listInventory()
  if (options.incidentId) {
    const incident = await getIncident(options.incidentId)
    const [student, types] = await Promise.all([getStudentById(incident.studentId), complaintTypes])
    return { student, complaintTypes: types, incident, items: await items }
  }
  const [student, types] = await Promise.all([
    options.studentNumber ? getStudent(options.studentNumber) : Promise.resolve(null),
    complaintTypes,
  ])
  return { student, complaintTypes: types, incident: null, items: await items }
}

/** Resolves the Student Number typed on Stage 1 when the student wasn't identified beforehand. */
export function findIncidentStudent(studentNumber: string): Promise<Student> {
  return getStudent(studentNumber)
}

/** Stage 1 saves with only complaint + immediate vitals; the layer logs it as its own event. */
export function saveStageOneIncident(input: StageOneIncidentInput, user: SessionUser): Promise<Incident> {
  return saveIncidentStageOne(
    {
      studentId: input.studentId,
      complaint: input.complaint,
      vitals: { temperatureC: Number(input.temperatureC), pulseBpm: Number(input.pulseBpm) },
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
      vitals: {
        temperatureC: Number(input.temperatureC),
        pulseBpm: Number(input.pulseBpm),
        bloodPressure: input.bloodPressure,
        oxygenSaturation: input.oxygenSaturation,
        treatmentNotes: input.treatmentNotes,
      },
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
