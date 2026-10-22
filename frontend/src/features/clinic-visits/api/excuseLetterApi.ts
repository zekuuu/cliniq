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
import { formatDate } from '../../../lib/dates'

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
  /** Set once Staff has approved this letter; it's then kept in the student's record. */
  approval: ExcuseLetterApproval | null
}

/**
 * The letter's wording names the dates it excuses (panel review EX-4) and stays non-diagnostic. It
 * follows the excused period until Staff edit the text.
 */
export function defaultBody(student: Student, visit: Visit, period: ExcusedPeriod): string {
  const { excusedFrom, excusedUntil } = period
  const dates = !excusedFrom || !excusedUntil
    ? 'for the dates shown above'
    : excusedFrom === excusedUntil
      ? `on ${formatDate(excusedFrom)}`
      : `from ${formatDate(excusedFrom)} to ${formatDate(excusedUntil)}`
  return [
    `This is to confirm that ${student.fullName} visited the school clinic on ${formatDate(visit.dateTime.slice(0, 10))}.`,
    `The student was assessed by the clinic staff and is excused ${dates}.`,
    'This clinic excuse letter is for school attendance documentation only.',
  ].join('\n\n')
}

/** `visitId` comes from `/visits/:visitId/excuse-letter`; omitted, the latest active visit is used. */
export async function fetchExcuseLetterContext(visitId?: string, letterId?: string): Promise<ExcuseLetterContext> {
  const visit = visitId ? await getVisit(visitId) : await getLatestVisit()
  const [student, approval] = await Promise.all([
    getStudent(visit.studentId),
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
    recipient: 'Class Adviser',
    body: defaultBody(student, visit, period),
    // One source of truth: the approved letter, else the draft saved with the visit (approval clears it).
    period,
    note: (approval ? approval.note : visit.excuseLetterDraft?.note) ?? '',
    approval,
  }
}

export async function approveExcuseLetter(
  context: ExcuseLetterContext,
  period: ExcusedPeriod,
  note = '',
  actor?: SessionUser,
): Promise<void> {
  await approveInLayer(context.visit.id, { ...period, note: note.trim() || null }, actor)
}

/** Marks the approved letter Superseded (kept) and opens a new draft with its period and note. */
export async function issueReplacement(visitId: string, reason: string, actor?: SessionUser): Promise<void> {
  await issueReplacementExcuseLetter(visitId, reason, actor)
}
