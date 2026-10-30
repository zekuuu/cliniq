import {
  getExcuseLetterApproval,
  getLatestVisit,
  getVisitComplaintSuggestions,
  getPatient,
  getUser,
  getVisit,
  getVitalsWarningRanges,
  listInventory,
  markVisitEnteredInError,
  updateVisit,
  type ExcuseLetterApproval,
  type InventoryItemView,
  type ItemLineInput,
  type SessionUser,
  type VisitLogbookFields,
  type VitalsWarningRanges,
} from '../../../lib/mock-db'
import { normalizeComplaint } from '../../../lib/complaints'
import type { CollectedBy, Disposition, EnteredInError, ExcuseLetterDraft, ISODateTime, ItemGivenLine } from '../../../types/entities'
import type { Patient } from '../../../lib/patients'
import {
  collectedValuesFrom,
  emptyDispositionValues,
  dispositionPayload,
  type DispositionValues,
} from '../dispositionValues'
import { logbookPayload, logbookValuesFrom, type LogbookValues } from '../logbookValues'

export interface VisitDetail extends VisitLogbookFields {
  id: string
  /** A student or a staff member (ADR-043); a staff visit has no excuse letter. */
  student: Patient
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
  /** Who collected the student, Sent home or Referred only (ADR-049, D4). */
  collectedBy: CollectedBy | null
  /** Up to 3 more complaints (ADR-053). */
  extraComplaints: string[]
  /** The approved letter, if any. Its period and note win over everything else. */
  approval: ExcuseLetterApproval | null
  /** Current inventory, for editing the medicine lines. */
  items: InventoryItemView[]
  /** Complaint suggestions for the edit form's Complaint field. */
  complaintSuggestions: string[]
  /** Placeholder sanity bounds for the non-blocking body temperature warning (nurse to confirm). */
  vitalsRanges: VitalsWarningRanges
  /** Panel review part 2 (ADR-036). */
  lateEntry: boolean
  lateEntryReason: string | null
  enteredInError: EnteredInError | null
  /** Who marked it, for the banner. */
  enteredInErrorBy: string | null
  escalatedIncidentId: string | null
}

export interface VisitDetailValues extends DispositionValues, LogbookValues {
  /** When the visit happened, editable to correct a wrong time (never in the future). */
  visitDate: string
  visitClock: string
  complaint: string
  extraComplaints: string[]
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
    ...(draft && {
      excusedFrom: draft.excusedFrom,
      excusedUntil: draft.excusedUntil,
      letterNote: draft.note ?? '',
      stayHome: Boolean(draft.stayHomeUntilCleared),
      stayHomeNote: draft.stayHomeNote ?? '',
    }),
    referredTo: visit.referredTo ?? '',
    ...collectedValuesFrom(visit.collectedBy),
    ...logbookValuesFrom(visit),
    visitDate: visit.dateTime.slice(0, 10),
    visitClock: visit.dateTime.slice(11, 16),
    complaint: visit.complaint,
    extraComplaints: visit.extraComplaints,
    treatment: visit.treatment,
    disposition: visit.disposition,
    eventTag: visit.eventTag,
  }
}

/** `visitId` comes from the `/visits/:visitId` route; omitted, the latest active visit is used. */
export async function fetchVisitDetail(visitId?: string): Promise<VisitDetail> {
  const visit = visitId ? await getVisit(visitId) : await getLatestVisit()
  const userName = (id: string) => getUser(id).then((user) => user.name, () => 'Unknown user')
  const [student, loggedBy, items, approval, complaintSuggestions, vitalsRanges, enteredInErrorBy] = await Promise.all([
    getPatient(visit),
    userName(visit.loggedByUserId),
    listInventory(),
    getExcuseLetterApproval(visit.id),
    getVisitComplaintSuggestions(),
    getVitalsWarningRanges(),
    visit.enteredInError ? userName(visit.enteredInError.byUserId) : null,
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
    collectedBy: visit.collectedBy ?? null,
    extraComplaints: visit.extraComplaints ?? [],
    temperatureC: visit.temperatureC,
    timeOut: visit.timeOut,
    assistedBy: visit.assistedBy,
    parentGuardian: visit.parentGuardian,
    remarks: visit.remarks,
    approval,
    items,
    complaintSuggestions,
    vitalsRanges,
    lateEntry: Boolean(visit.lateEntry),
    lateEntryReason: visit.lateEntryReason ?? null,
    enteredInError: visit.enteredInError ?? null,
    enteredInErrorBy,
    escalatedIncidentId: visit.escalatedIncidentId ?? null,
  }
}

/** "Entered in error" (D2): kept, hidden from lists and counts, stock returned, letter voided. Reloads the visit. */
export async function markEnteredInError(visitId: string, reason: string, actor?: SessionUser): Promise<VisitDetail> {
  await markVisitEnteredInError(visitId, reason, actor)
  return fetchVisitDetail(visitId)
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
  /** "Save and approve now" (ADR-049, D3): approve the edited draft in the same save. */
  approveLetterNow = false,
): Promise<{ visit: VisitDetail; belowZero: string[] }> {
  // A staff patient gets no excuse letter and no "who collected" (ADR-043, D13; ADR-049, D4).
  if (visit.student.kind === 'personnel') values = { ...values, prepareLetter: false, collectedName: '', collectedRelationship: '' }
  const disposition = dispositionPayload(values.disposition, values)
  const { visit: updated, belowZero } = await updateVisit(
    visit.id,
    {
      // Same normalization as New Visit, so an edit can't reintroduce a spelling or case variant.
      complaint: normalizeComplaint(values.complaint, visit.complaintSuggestions),
      extraComplaints: values.extraComplaints,
      treatment: values.treatment.trim(),
      disposition: values.disposition,
      eventTag: values.eventTag.trim() || null,
      itemsGiven,
      // Sent only when changed, so an unchanged visit keeps its exact saved time.
      ...(`${values.visitDate}T${values.visitClock}` !== visit.dateTime.slice(0, 16) && { dateTime: `${values.visitDate}T${values.visitClock}` }),
      ...logbookPayload(values),
      // An approved letter's period is fixed: the edit sends "Referred to" and who collected, never a draft.
      ...(visit.approval ? { referredTo: disposition.referredTo, collectedBy: disposition.collectedBy } : disposition),
      approveExcuseLetterNow: approveLetterNow && !visit.approval && disposition.excuseLetterDraft !== null,
    },
    actor,
  )
  const [items, complaintSuggestions, approval] = await Promise.all([listInventory(), getVisitComplaintSuggestions(), getExcuseLetterApproval(visit.id)])
  return {
    visit: { ...visit, ...updated, collectedBy: updated.collectedBy ?? null, extraComplaints: updated.extraComplaints ?? [], eventTag: updated.eventTag ?? '', items, complaintSuggestions, approval },
    belowZero,
  }
}
