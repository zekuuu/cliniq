import {
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
  /** `null` when the form was opened without an identified student; it then asks for the Student Number. */
  student: Student | null
  /** Complaint options + their Smart Triage checklists (mock-only content; see mock-db.json). */
  complaintTypes: ComplaintType[]
  /** Complaint suggestions: predefined types plus complaints saved on visits, most used first. */
  complaintSuggestions: string[]
  /** Every inventory item with its computed flags, for the Medicines & supplies picker. */
  items: InventoryItemView[]
  /** Placeholder sanity bounds for the non-blocking body temperature warning (nurse to confirm). */
  vitalsRanges: VitalsWarningRanges
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
}

export interface NewVisitResult {
  visit: Visit
  followUp: FollowUp | null
  /** Names of items the save took below zero (warned, never blocked). */
  belowZero: string[]
}

/** `studentNumber` is the route's `?student=` pre-selection; without one no student is attached. */
export async function fetchNewVisitContext(studentNumber?: string): Promise<NewVisitContext> {
  const [student, complaintTypes, complaintSuggestions, items, vitalsRanges] = await Promise.all([
    studentNumber ? getStudent(studentNumber) : Promise.resolve(null),
    getVisitComplaintTypes(),
    getVisitComplaintSuggestions(),
    listInventory(),
    getVitalsWarningRanges(),
  ])
  return { student, complaintTypes, complaintSuggestions, items, vitalsRanges }
}

/** Fresh complaint suggestions after a save, so a newly typed complaint is offered next time. */
export function fetchComplaintSuggestions(): Promise<string[]> {
  return getVisitComplaintSuggestions()
}

/** The New Visit student search: Student Number prefix or name, active students, at most 8. */
export function searchVisitStudents(query: string): Promise<StudentSearchResult[]> {
  return searchStudents(query)
}

/** Resolves the Student Number typed on the form when the student wasn't identified beforehand. */
export function findVisitStudent(studentNumber: string): Promise<Student> {
  return getStudent(studentNumber)
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
    },
    user,
  )
}
