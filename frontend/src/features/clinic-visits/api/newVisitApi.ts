import {
  getIncidentComplaintTypes,
  getStudent,
  getVisitComplaintSuggestions,
  getVisitComplaintTypes,
  getVitalsWarningRanges,
  listInventory,
  recordVisit,
  searchStudents,
  type ComplaintType,
  type InventoryItemView,
  type ItemLineInput,
  type SessionUser,
  type VisitLogbookFields,
  type VitalsWarningRanges,
} from '../../../lib/mock-db'
import type { Disposition, ExcuseLetterDraft, FollowUp, Student, StudentSearchResult, Visit } from '../../../types/entities'

export interface NewVisitContext {
  /** Complaint options + their first-aid checklists (mock-only content; see mock-db.json). */
  complaintTypes: ComplaintType[]
  /** Complaint suggestions: predefined types plus complaints saved on visits, most used first. */
  complaintSuggestions: string[]
  /** Every inventory item with its computed flags, for the Medicines & supplies picker. */
  items: InventoryItemView[]
  /** Placeholder sanity bounds for the non-blocking body temperature warning (nurse to confirm). */
  vitalsRanges: VitalsWarningRanges
  /** The incident complaint list: a visit complaint on it gets the "Escalate to an incident?" hint (ADR-036). */
  emergencyComplaints: string[]
}

export interface NewVisitInput extends Partial<VisitLogbookFields> {
  studentId: string
  complaint: string
  treatment: string
  disposition: Disposition
  triageStepsCompleted: string[]
  followUp: null | Pick<FollowUp, 'followUpDate' | 'reason' | 'notes'>
  itemsGiven?: ItemLineInput[]
  /** Sent home or referred, letter box ticked: the draft period and note. Not an approved letter. */
  excuseLetterDraft?: ExcuseLetterDraft | null
  referredTo?: string | null
  /** "YYYY-MM-DDTHH:MM", only when Staff changed it from now (a late entry). */
  dateTime?: string
  lateEntryReason?: string | null
}

export interface NewVisitResult {
  visit: Visit
  followUp: FollowUp | null
  /** Names of items the save took below zero (warned, never blocked). */
  belowZero: string[]
}

/** Everything New Visit needs before the student is picked on the form. */
export async function fetchNewVisitContext(): Promise<NewVisitContext> {
  const [complaintTypes, complaintSuggestions, items, vitalsRanges, emergencyComplaints] = await Promise.all([
    getVisitComplaintTypes(),
    getVisitComplaintSuggestions(),
    listInventory(),
    getVitalsWarningRanges(),
    getIncidentComplaintTypes(),
  ])
  return { complaintTypes, complaintSuggestions, items, vitalsRanges, emergencyComplaints }
}

/** Fresh complaint suggestions after a save, so a newly typed complaint is offered next time. */
export function fetchComplaintSuggestions(): Promise<string[]> {
  return getVisitComplaintSuggestions()
}

/** The New Visit student search: LRN prefix or name, active students, at most 8. */
export function searchVisitStudents(query: string): Promise<StudentSearchResult[]> {
  return searchStudents(query)
}

/** Loads the picked student in full (allergies included). */
export function findVisitStudent(studentId: string): Promise<Student> {
  return getStudent(studentId)
}

/** Fresh stock figures after a save, so the picker shows what's left. */
export function fetchVisitItems(): Promise<InventoryItemView[]> {
  return listInventory()
}

/**
 * Saves the visit, its medicine lines, and its optional follow-up as one write (ADR-018). The data layer writes both audit entries.
 * `triageStepsCompleted` has no field in the §5 Visit shape yet, so it isn't persisted (ADR-014).
 */
export function submitNewVisit(input: NewVisitInput, user: SessionUser): Promise<NewVisitResult> {
  return recordVisit(
    {
      studentId: input.studentId,
      complaint: input.complaint,
      treatment: input.treatment,
      disposition: input.disposition,
      followUp: input.followUp,
      itemsGiven: input.itemsGiven,
      excuseLetterDraft: input.excuseLetterDraft ?? null,
      referredTo: input.referredTo ?? null,
      temperatureC: input.temperatureC,
      timeOut: input.timeOut,
      assistedBy: input.assistedBy,
      parentGuardian: input.parentGuardian,
      remarks: input.remarks,
      dateTime: input.dateTime,
      lateEntryReason: input.lateEntryReason,
    },
    user,
  )
}
