import {
  approveExcuseLetter as approveInLayer,
  getExcuseLetterApproval,
  getLatestVisit,
  getMockSessionUser,
  getStudent,
  getUser,
  getVisit,
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

function defaultBody(student: Student, visit: Visit): string {
  return [
    `This is to confirm that ${student.fullName} visited the school clinic on ${formatDate(visit.dateTime.slice(0, 10))}.`,
    'The student was assessed by the clinic staff and may be excused for the clinic visit period as recorded in CLINIQ.',
    'This clinic excuse letter is for school attendance documentation only.',
  ].join('\n\n')
}

/** `visitId` comes from `/visits/:visitId/excuse-letter`; omitted, the latest active visit is used. */
export async function fetchExcuseLetterContext(visitId?: string): Promise<ExcuseLetterContext> {
  const visit = visitId ? await getVisit(visitId) : await getLatestVisit()
  const [student, approval] = await Promise.all([
    getStudent(visit.studentId),
    getExcuseLetterApproval(visit.id),
  ])
  const visitDate = visit.dateTime.slice(0, 10)
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
    body: defaultBody(student, visit),
    // One source of truth: the approved letter, else the draft saved with the visit (approval clears it).
    period: approval
      ? { excusedFrom: approval.excusedFrom, excusedUntil: approval.excusedUntil }
      : visit.excuseLetterDraft
        ? { excusedFrom: visit.excuseLetterDraft.excusedFrom, excusedUntil: visit.excuseLetterDraft.excusedUntil }
        : { excusedFrom: visitDate, excusedUntil: visitDate },
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
