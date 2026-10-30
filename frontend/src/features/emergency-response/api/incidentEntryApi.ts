import {
  completeIncidentStageTwo,
  getIncident,
  getIncidentComplaintTypes,
  getPatient,
  getVisit,
  getVitalsWarningRanges,
  listApprovedIncidentReportIds,
  listInventory,
  saveIncidentStageOne,
  searchPatients,
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
  PatientRef,
  PatientSearchResult,
} from '../../../types/entities'
import type { Patient } from '../../../lib/patients'
import { storedReadings, type ReadingValues } from '../../../lib/vitals'

export interface IncidentEntryContext {
  /**
   * The patient, a student or a staff member (ADR-043). `null` when the Emergency button opened
   * Stage 1 before anyone identified them; Stage 1 then asks instead of attaching a default patient.
   */
  student: Patient | null
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
  /** The incident report is approved: Additional notes are fixed from then on (ADR-049). */
  approved: boolean
}

/** What "Escalate to incident" carries from a visit (ADR-036). Never its medicines. */
export interface EscalationPrefill extends Partial<PatientRef> {
  visitId?: string
  complaint: string
  /** ISO time the visit happened. */
  time?: string
  temperatureC: number | null
}

export interface StageOneIncidentInput extends PatientRef {
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
  complaint: string
  /** All optional; only the readings taken are saved. */
  readings: ReadingValues
  treatmentNotes: string
  hospitalReferral: HospitalReferral | null
  /** Attempts logged on this form; appended to the incident's notification log. */
  parentNotifications: ParentNotificationAttempt[]
  followUp: null | (Pick<FollowUp, 'followUpDate' | 'reason' | 'notes'> & Partial<Pick<FollowUp, 'stayHomeUntilCleared' | 'stayHomeNote'>>)
  /** Dispensed with the Stage 2 save; each dispense references the incident (ADR-018). */
  itemsGiven?: ItemLineInput[]
  /** Optional, Stage 2 only (D11). */
  bodyPart?: string
  /** Required only with "Nothing further was needed or done" (panel review IN-3). */
  noFurtherActionReason?: string
  /** Corrected Additional notes (ADR-049); omitted once the report is approved. */
  generalNotes?: string
}

/**
 * `incidentId` reopens a saved incident for Stage 2, with its student. Without it, no student is
 * attached until Stage 1 identifies one.
 */
export async function fetchIncidentEntryContext(
  incidentId?: string,
  escalate?: { visitId?: string; prefill?: EscalationPrefill; staffId?: string },
): Promise<IncidentEntryContext> {
  const complaintTypes = getIncidentComplaintTypes()
  const items = listInventory()
  const vitalsRanges = await getVitalsWarningRanges()
  if (incidentId) {
    const incident = await getIncident(incidentId)
    const [student, types, source, approvedIds] = await Promise.all([
      getPatient(incident),
      complaintTypes,
      incident.sourceVisitId ? getVisit(incident.sourceVisitId) : null,
      listApprovedIncidentReportIds(),
    ])
    const sourceVisit = source && { id: source.id, itemsGiven: source.itemsGiven }
    return { student, complaintTypes: types, incident, items: await items, vitalsRanges, escalation: null, sourceVisit, approved: approvedIds.includes(incident.id) }
  }
  let escalation = escalate?.prefill ?? null
  let sourceVisit: IncidentEntryContext['sourceVisit'] = null
  if (escalate?.visitId) {
    const visit = await getVisit(escalate.visitId)
    escalation = { visitId: visit.id, studentId: visit.studentId, personnelId: visit.personnelId, complaint: visit.complaint, time: visit.dateTime, temperatureC: visit.temperatureC }
    sourceVisit = { id: visit.id, itemsGiven: visit.itemsGiven }
  }
  // The Staff Profile's "Record an incident" opens with the staff member chosen (`?staff=`, D8).
  const ref = escalate?.staffId ? { studentId: null, personnelId: escalate.staffId } : escalation
  const student = ref?.studentId || ref?.personnelId ? await getPatient({ studentId: ref.studentId ?? null, personnelId: ref.personnelId ?? null }) : null
  return { student, complaintTypes: await complaintTypes, incident: null, items: await items, vitalsRanges, escalation, sourceVisit, approved: false }
}

/** Loads the picked patient in full. */
export function findIncidentPatient(ref: PatientRef): Promise<Patient> {
  return getPatient(ref)
}

/** Stage 1 needs only the complaint, plus whichever readings were taken; the layer logs it as its own event. */
export function saveStageOneIncident(input: StageOneIncidentInput, user: SessionUser): Promise<Incident> {
  return saveIncidentStageOne(
    {
      studentId: input.studentId,
      personnelId: input.personnelId,
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
      generalNotes: input.generalNotes,
    },
    user,
  )
}

/** Incident Stage 1 patient search (ADR-043): students and staff in one box, at most 8, labelled. */
export function searchIncidentPatients(query: string): Promise<PatientSearchResult[]> {
  return searchPatients(query)
}
