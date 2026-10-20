import {
  getExcuseLetterApproval,
  getLatestVisit,
  getVisitComplaintSuggestions,
  getStudentById,
  getUser,
  getVisit,
  getVitalsWarningRanges,
  listInventory,
  updateVisit,
  type ExcuseLetterApproval,
  type InventoryItemView,
  type ItemLineInput,
  type SessionUser,
  type VisitLogbookFields,
  type VitalsWarningRanges,
} from '../../../lib/mock-db'
import { normalizeComplaint } from '../../../lib/complaints'
import type { Disposition, ExcuseLetterDraft, ISODateTime, ItemGivenLine, Student } from '../../../types/entities'
import {
  emptyDispositionValues,
  dispositionPayload,
  type DispositionValues,
} from '../dispositionValues'
import { logbookPayload, logbookValuesFrom, type LogbookValues } from '../logbookValues'

export interface VisitDetail extends VisitLogbookFields {
  id: string
  student: Student
  dateTime: ISODateTime
  complaint: string
  treatment: string
  disposition: Disposition
  eventTag: string
  loggedBy: string
  itemsGiven: ItemGivenLine[]
  /** Unapproved letter values saved with the visit. Always null once `approval` is set. */
  excuseLetterDraft: ExcuseLetterDraft | null
  referredTo: string | null
  /** The approved letter, if any. Its period and note win over everything else. */
  approval: ExcuseLetterApproval | null
  /** Current inventory, for editing the medicine lines. */
  items: InventoryItemView[]
  /** Complaint suggestions for the edit form's Complaint field. */
  complaintSuggestions: string[]
  /** Placeholder sanity bounds for the non-blocking body temperature warning (nurse to confirm). */
  vitalsRanges: VitalsWarningRanges
}

export interface VisitDetailValues extends DispositionValues, LogbookValues {
  complaint: string
  treatment: string
  disposition: Disposition
  eventTag: string
}

export function valuesFromVisit(visit: VisitDetail): VisitDetailValues {
  const draft = visit.excuseLetterDraft
  return {
    ...emptyDispositionValues(visit.dateTime.slice(0, 10)),
    // A Sent home or referred visit saved without a draft had the box unticked.
    prepareLetter: Boolean(draft),
    ...(draft && { excusedFrom: draft.excusedFrom, excusedUntil: draft.excusedUntil, letterNote: draft.note ?? '' }),
    referredTo: visit.referredTo ?? '',
    ...logbookValuesFrom(visit),
    complaint: visit.complaint,
    treatment: visit.treatment,
    disposition: visit.disposition,
    eventTag: visit.eventTag,
  }
}

/** `visitId` comes from the `/visits/:visitId` route; omitted, the latest active visit is used. */
export async function fetchVisitDetail(visitId?: string): Promise<VisitDetail> {
  const visit = visitId ? await getVisit(visitId) : await getLatestVisit()
  const [student, loggedBy, items, approval, complaintSuggestions, vitalsRanges] = await Promise.all([
    getStudentById(visit.studentId),
    getUser(visit.loggedByUserId).then((user) => user.name, () => 'Unknown user'),
    listInventory(),
    getExcuseLetterApproval(visit.id),
    getVisitComplaintSuggestions(),
    getVitalsWarningRanges(),
  ])
  return {
    id: visit.id,
    student,
    dateTime: visit.dateTime,
    complaint: visit.complaint,
    treatment: visit.treatment,
    disposition: visit.disposition,
    eventTag: visit.eventTag ?? '',
    loggedBy,
    itemsGiven: visit.itemsGiven,
    excuseLetterDraft: visit.excuseLetterDraft,
    referredTo: visit.referredTo,
    temperatureC: visit.temperatureC,
    timeOut: visit.timeOut,
    assistedBy: visit.assistedBy,
    parentGuardian: visit.parentGuardian,
    remarks: visit.remarks,
    approval,
    items,
    complaintSuggestions,
    vitalsRanges,
  }
}

/**
 * Saves the edit. Changed medicine lines adjust stock through `visit_edited` transactions in the
 * same write (ADR-018). Returns the updated visit with fresh stock figures and any items now below zero.
 */
export async function updateVisitDetail(
  visit: VisitDetail,
  values: VisitDetailValues,
  itemsGiven: ItemLineInput[],
  actor?: SessionUser,
): Promise<{ visit: VisitDetail; belowZero: string[] }> {
  const { visit: updated, belowZero } = await updateVisit(
    visit.id,
    {
      // Same normalization as New Visit, so an edit can't reintroduce a spelling or case variant.
      complaint: normalizeComplaint(values.complaint, visit.complaintSuggestions),
      treatment: values.treatment.trim(),
      disposition: values.disposition,
      eventTag: values.eventTag.trim() || null,
      itemsGiven,
      ...logbookPayload(values),
      // An approved letter's period is fixed: the edit sends "Referred to" only, never a draft.
      ...(visit.approval
        ? { referredTo: dispositionPayload(values.disposition, values).referredTo }
        : dispositionPayload(values.disposition, values)),
    },
    actor,
  )
  const [items, complaintSuggestions] = await Promise.all([listInventory(), getVisitComplaintSuggestions()])
  return {
    visit: { ...visit, ...updated, eventTag: updated.eventTag ?? '', items, complaintSuggestions },
    belowZero,
  }
}
