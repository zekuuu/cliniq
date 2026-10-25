import { getMockToday, listPersonnel, listStudents, listUsers, listVisits } from '../../../lib/mock-db'
import { matchesPatientFilter, type PatientFilter, type PatientNumber } from '../../../lib/patients'
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
  /** Everyone, students only or staff only (ADR-043, D11). */
  patient?: PatientFilter
}

export interface VisitLogRow {
  id: string
  /** The masked LRN or the Staff No., never the name (ADR-004, ADR-028, ADR-043). */
  patient: PatientNumber
  /** Grade level for a student, staff type for a staff member. */
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
  const [visits, students, personnel, users] = await Promise.all([
    listVisits({ from: query.from, to: query.to }, { includeEnteredInError: query.includeEnteredInError }),
    listStudents({ includeArchived: true }),
    listPersonnel({ includeArchived: true }),
    listUsers(),
  ])
  const studentsById = new Map(students.map((student) => [student.id, student]))
  const personnelById = new Map(personnel.map((person) => [person.id, person]))
  const userNames = new Map(users.map((user) => [user.id, user.name]))
  const search = query.search.trim().toLowerCase()
  const today = getMockToday()

  return visits
    .filter((visit) => query.disposition === 'all' || visit.disposition === query.disposition)
    .flatMap((visit): VisitLogRow[] => {
      const student = studentsById.get(visit.studentId ?? '')
      const person = personnelById.get(visit.personnelId ?? '')
      const patient: PatientNumber | null = student
        ? { kind: 'student', number: student.lrn }
        : person
          ? { kind: 'personnel', number: person.staffNumber }
          : null
      return patient && matchesPatientFilter(patient.kind, query.patient ?? 'everyone')
        ? [
            {
              id: visit.id,
              patient,
              gradeLevel: student?.gradeLevel ?? person?.type ?? '',
              dateTime: visit.dateTime,
              complaint: visit.complaint,
              disposition: visit.disposition,
              eventTag: visit.eventTag,
              loggedBy: userNames.get(visit.loggedByUserId) ?? 'Unknown user',
              letterPending: Boolean(visit.excuseLetterDraft) && Boolean(student && !student.archived) && !visit.enteredInError,
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
        (row.patient.kind === 'student'
          ? row.patient.number.startsWith(search.replace(/[\s-]/g, ''))
          : row.patient.number.toLowerCase().startsWith(search.replace(/\s/g, ''))) ||
        row.gradeLevel.toLowerCase().includes(search) ||
        row.complaint.toLowerCase().includes(search) ||
        (row.eventTag?.toLowerCase().includes(search) ?? false)
      )
    })
}
