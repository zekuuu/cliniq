import { getMockToday, listStudents, listUsers, listVisits } from '../../../lib/mock-db'
import { todayISO } from '../../../lib/dates'
import { rangeForPreset } from '../../../lib/dateRange'
import type { Disposition, ISODate, ISODateTime } from '../../../types/entities'

export interface VisitLogQuery {
  from: ISODate
  to: ISODate
  search: string
  disposition: Disposition | 'all'
  /** `pending`: only visits whose excuse-letter draft awaits approval (the Dashboard's count). */
  letter?: 'pending' | ''
  /** Only students resting in the clinic now (the Dashboard's "In clinic now" chip). */
  inClinicNow?: boolean
  /** Also list visits marked "Entered in error" (hidden by default). */
  includeEnteredInError?: boolean
}

export interface VisitLogRow {
  id: string
  /** Shown masked (`lib/lrn.ts`), never the name (ADR-004, ADR-028). */
  lrn: string
  gradeLevel: string
  dateTime: ISODateTime
  /** Shown beside the LRN in the list (ADR-010, Option A). */
  complaint: string
  disposition: Disposition
  eventTag: string | null
  loggedBy: string
  /** Same rule as the Dashboard's "Pending excuse letters" count: a draft, for a student not archived. */
  letterPending: boolean
  /** Resting in clinic today with no Time out: same rule as the Dashboard's "In clinic now". */
  inClinicNow: boolean
  escalated: boolean
  enteredInError: boolean
}

export function defaultVisitLogRange(today = todayISO()): { from: ISODate; to: ISODate } {
  return rangeForPreset('today', today)
}

export async function fetchVisitLog(query: VisitLogQuery): Promise<VisitLogRow[]> {
  const [visits, students, users] = await Promise.all([
    listVisits({ from: query.from, to: query.to }, { includeEnteredInError: query.includeEnteredInError }),
    listStudents({ includeArchived: true }),
    listUsers(),
  ])
  const studentsById = new Map(students.map((student) => [student.id, student]))
  const userNames = new Map(users.map((user) => [user.id, user.name]))
  const search = query.search.trim().toLowerCase()
  const today = getMockToday()

  return visits
    .filter((visit) => query.disposition === 'all' || visit.disposition === query.disposition)
    .flatMap((visit): VisitLogRow[] => {
      const student = studentsById.get(visit.studentId)
      return student
        ? [
            {
              id: visit.id,
              lrn: student.lrn,
              gradeLevel: student.gradeLevel,
              dateTime: visit.dateTime,
              complaint: visit.complaint,
              disposition: visit.disposition,
              eventTag: visit.eventTag,
              loggedBy: userNames.get(visit.loggedByUserId) ?? 'Unknown user',
              letterPending: Boolean(visit.excuseLetterDraft) && !student.archived && !visit.enteredInError,
              inClinicNow:
                visit.disposition === 'resting_in_clinic' && !visit.timeOut && visit.dateTime.slice(0, 10) === today && !visit.enteredInError,
              escalated: Boolean(visit.escalatedIncidentId),
              enteredInError: Boolean(visit.enteredInError),
            },
          ]
        : []
    })
    .filter((row) => query.letter !== 'pending' || row.letterPending)
    .filter((row) => !query.inClinicNow || row.inClinicNow)
    .filter((row) => {
      if (!search) return true
      return (
        row.lrn.startsWith(search.replace(/[\s-]/g, '')) ||
        row.gradeLevel.toLowerCase().includes(search) ||
        row.complaint.toLowerCase().includes(search) ||
        (row.eventTag?.toLowerCase().includes(search) ?? false)
      )
    })
}
