import {
  approveExcuseLetter as approveInLayer,
  getExcuseLetterApproval,
  getExcuseLetterById,
  getLatestVisit,
  getMockSessionUser,
  getStudent,
  getUser,
  getVisit,
  issueReplacementExcuseLetter,
  type ExcuseLetterApproval,
  type ExcusedPeriod,
  type SessionUser,
} from '../../../lib/mock-db'
import { EXCUSE_LETTER_RECIPIENT, excuseLetterBody } from '../../../lib/excuseLetter'

export { excusedPeriodError, type ExcusedPeriod } from '../../../lib/mock-db'
import type { ISODateTime, Student, Visit } from '../../../types/entities'

export interface ExcuseLetterContext {
  id: string
  student: Student
  visit: Visit
  issuedAt: ISODateTime
  checkedBy: string
  recipient: string
  body: string
  /** Stored period once approved; else the visit's draft; else the default (the visit date, one day). */
  period: ExcusedPeriod
  /** Note for the teacher: the approved one, else the visit draft's, else empty. */
  note: string
  /** "Stay home until cleared" (ADR-049, D5): the approved letter's, else the draft's. */
  stayHome: boolean
  stayHomeNote: string
  /** Set once Staff has approved this letter; it's then kept in the student's record. */
  approval: ExcuseLetterApproval | null
}

/**
 * The letter's wording names the dates it excuses (panel review EX-4) and stays non-diagnostic. It
 * follows the excused period until Staff edit the text.
 */
export function defaultBody(student: Student, visit: Visit, period: ExcusedPeriod): string {
  return excuseLetterBody(student.fullName, visit.dateTime.slice(0, 10), period)
}

/** `visitId` comes from `/visits/:visitId/excuse-letter`; omitted, the latest active visit is used. */
export async function fetchExcuseLetterContext(visitId?: string, letterId?: string): Promise<ExcuseLetterContext> {
  const visit = visitId ? await getVisit(visitId) : await getLatestVisit()
  const [student, approval] = await Promise.all([
    getStudent(visit.studentId ?? ''),
    // `letterId` opens one stored letter (a superseded one, say); otherwise the visit's current letter.
    letterId ? getExcuseLetterById(letterId).then((letter) => (letter.visitId === visit.id ? letter : null)) : getExcuseLetterApproval(visit.id),
  ])
  const visitDate = visit.dateTime.slice(0, 10)
  const period: ExcusedPeriod = approval
    ? { excusedFrom: approval.excusedFrom, excusedUntil: approval.excusedUntil }
    : visit.excuseLetterDraft
      ? { excusedFrom: visit.excuseLetterDraft.excusedFrom, excusedUntil: visit.excuseLetterDraft.excusedUntil }
      : { excusedFrom: visitDate, excusedUntil: visitDate }
  const checkedBy = approval
    ? await getUser(approval.approvedByUserId).then(
        (user) => user.name,
        () => 'Unknown user',
      )
    : getMockSessionUser().name
  return {
    id: `excuse-${visit.id}`,
    student,
    visit,
    issuedAt: approval?.approvedAt ?? new Date().toISOString(),
    checkedBy,
    // An approved letter prints the wording it was approved with (ADR-049, D6), never today's template.
    recipient: approval?.recipient ?? EXCUSE_LETTER_RECIPIENT,
    body: approval?.body ?? defaultBody(student, visit, period),
    // One source of truth: the approved letter, else the draft saved with the visit (approval clears it).
    period,
    note: (approval ? approval.note : visit.excuseLetterDraft?.note) ?? '',
    stayHome: Boolean((approval ?? visit.excuseLetterDraft)?.stayHomeUntilCleared),
    stayHomeNote: (approval ?? visit.excuseLetterDraft)?.stayHomeNote ?? '',
    approval,
  }
}

export interface LetterApproval {
  period: ExcusedPeriod
  note: string
  recipient: string
  body: string
  stayHome: boolean
  stayHomeNote: string
}

/** Stores the letter with its final wording (ADR-049, D6); the data layer writes the approval's audit entry. */
export async function approveExcuseLetter(context: ExcuseLetterContext, letter: LetterApproval, actor?: SessionUser): Promise<void> {
  await approveInLayer(
    context.visit.id,
    {
      ...letter.period,
      note: letter.note.trim() || null,
      recipient: letter.recipient,
      body: letter.body,
      stayHomeUntilCleared: letter.stayHome,
      stayHomeNote: letter.stayHomeNote,
    },
    actor,
  )
}

/** Marks the approved letter Superseded (kept) and opens a new draft with its period and note. */
export async function issueReplacement(visitId: string, reason: string, actor?: SessionUser): Promise<void> {
  await issueReplacementExcuseLetter(visitId, reason, actor)
}
