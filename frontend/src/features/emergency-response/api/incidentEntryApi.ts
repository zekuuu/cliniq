import {
  completeIncidentStageTwo,
  getIncident,
  getIncidentComplaintTypes,
  getStudent,
  getVisit,
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
  ItemGivenLine,
  Student,
  StudentSearchResult,
} from '../../../types/entities'
import { storedReadings, type ReadingValues } from '../../../lib/vitals'

export interface IncidentEntryContext {
  /**
   * `null` when the Emergency button opened Stage 1 before anyone identified the student; Stage 1
   * then asks for the student instead of silently attaching a default student.
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
  /**
   * Set when Stage 1 was opened by "Escalate to incident" (ADR-036): what carries over. `visitId` only
   * for a saved visit (Visit Details); the New Visit shortcut carries what was typed, unsaved.
   */
  escalation: EscalationPrefill | null
  /** On a saved incident escalated from a visit: that visit, with what was given there (not copied). */
  sourceVisit: { id: string; itemsGiven: ItemGivenLine[] } | null
}

/** What "Escalate to incident" carries from a visit (ADR-036). Never its medicines. */
export interface EscalationPrefill {
  visitId?: string
  studentId?: string
  complaint: string
  /** ISO time the visit happened. */
  time?: string
  temperatureC: number | null
}

export interface StageOneIncidentInput {
  studentId: string
  complaint: string
  /** All optional; only the readings taken are saved. */
  readings: ReadingValues
  generalNotes?: string
  /** The escalated visit's time (ADR-036). */
  time?: string
  sourceVisitId?: string
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
  /** Optional, Stage 2 only (D11). */
  bodyPart?: string
  /** Required only with "Nothing further was needed or done" (panel review IN-3). */
  noFurtherActionReason?: string
}

/**
 * `incidentId` reopens a saved incident for Stage 2, with its student. Without it, no student is
 * attached until Stage 1 identifies one.
 */
export async function fetchIncidentEntryContext(
  incidentId?: string,
  escalate?: { visitId?: string; prefill?: EscalationPrefill },
): Promise<IncidentEntryContext> {
  const complaintTypes = getIncidentComplaintTypes()
  const items = listInventory()
  const vitalsRanges = await getVitalsWarningRanges()
  if (incidentId) {
    const incident = await getIncident(incidentId)
    const [student, types, source] = await Promise.all([
      getStudent(incident.studentId),
      complaintTypes,
      incident.sourceVisitId ? getVisit(incident.sourceVisitId) : null,
    ])
    const sourceVisit = source && { id: source.id, itemsGiven: source.itemsGiven }
    return { student, complaintTypes: types, incident, items: await items, vitalsRanges, escalation: null, sourceVisit }
  }
  let escalation = escalate?.prefill ?? null
  let sourceVisit: IncidentEntryContext['sourceVisit'] = null
  if (escalate?.visitId) {
    const visit = await getVisit(escalate.visitId)
    escalation = { visitId: visit.id, studentId: visit.studentId, complaint: visit.complaint, time: visit.dateTime, temperatureC: visit.temperatureC }
    sourceVisit = { id: visit.id, itemsGiven: visit.itemsGiven }
  }
  const student = escalation?.studentId ? await getStudent(escalation.studentId) : null
  return { student, complaintTypes: await complaintTypes, incident: null, items: await items, vitalsRanges, escalation, sourceVisit }
}

/** Loads the picked student in full. */
export function findIncidentStudent(studentId: string): Promise<Student> {
  return getStudent(studentId)
}

/** Stage 1 needs only the complaint, plus whichever readings were taken; the layer logs it as its own event. */
export function saveStageOneIncident(input: StageOneIncidentInput, user: SessionUser): Promise<Incident> {
  return saveIncidentStageOne(
    {
      studentId: input.studentId,
      complaint: input.complaint,
      vitals: storedReadings(input.readings),
      generalNotes: input.generalNotes,
      time: input.time,
      sourceVisitId: input.sourceVisitId,
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
      bodyPart: input.bodyPart,
      noFurtherActionReason: input.noFurtherActionReason,
    },
    user,
  )
}

/** Incident Stage 1 student search: LRN prefix or name, active students, at most 8. */
export function searchIncidentStudents(query: string): Promise<StudentSearchResult[]> {
  return searchStudents(query)
}
