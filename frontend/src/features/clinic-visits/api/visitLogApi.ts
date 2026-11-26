import {
  getMockToday,
  listCurrentExcuseLetterStatuses,
  listPersonnel,
  listStudents,
  listUsers,
  listVisits,
} from '../../../lib/data'
import { requestPage } from '../../../lib/api/client'
import { routed } from '../../../lib/api/routed'
import { dispositionLabel } from '../../../lib/dispositions'
import { lrnMatchesSearch } from '../../../lib/lrn'
import { pageInMemory, sortParam, toPage, type Page, type PageRequest } from '../../../lib/paging'
import { matchesPatientFilter, type PatientFilter, type PatientNumber } from '../../../lib/patients'
import { todayISO } from '../../../lib/dates'
import { rangeForPreset } from '../../../lib/dateRange'
import type { Disposition, ISODate, ISODateTime } from '../../../types/entities'

export type VisitLogSortKey = 'dateTime' | 'lrn' | 'record' | 'disposition'
export const VISIT_LOG_SORT_KEYS: readonly VisitLogSortKey[] = [
  'dateTime',
  'lrn',
  'record',
  'disposition',
]
/** The Visit Log's filters; the search box and the page travel beside them (ADR-082). */
export type VisitLogFilters = Omit<VisitLogQuery, 'search'>

/** The screen's sort rule, kept for the mock's page so mock mode orders rows as before. */
function visitLogValue(row: VisitLogRow, key: VisitLogSortKey): string {
  if (key === 'dateTime') return row.dateTime
  if (key === 'lrn') return `${row.patient.kind}|${row.patient.number}`
  if (key === 'record') return row.complaint
  return dispositionLabel(row.disposition, row.patient.kind)
}

async function mockVisitLogPage(
  request: PageRequest<VisitLogFilters, VisitLogSortKey>,
): Promise<Page<VisitLogRow>> {
  const rows = await fetchVisitLog({ ...request.filters, search: request.search })
  return pageInMemory(rows, request, visitLogValue)
}

/** `GET /api/visits/log`: one page, joined, filtered and sorted by the server (ADR-082). */
async function httpVisitLogPage(
  request: PageRequest<VisitLogFilters, VisitLogSortKey>,
  signal?: AbortSignal,
): Promise<Page<VisitLogRow>> {
  const { filters } = request
  const result = await requestPage<VisitLogRow[]>('/visits/log', {
    query: {
      from: filters.from,
      to: filters.to,
      disposition: filters.disposition,
      letter: filters.letter,
      inClinicNow: filters.inClinicNow ? 1 : undefined,
      includeEnteredInError: filters.includeEnteredInError ? 1 : undefined,
      patient: filters.patient,
      search: request.search,
      sort: sortParam(request.sort),
      page: request.page,
      perPage: request.perPage,
    },
    signal,
  })
  return toPage(result, request)
}

/** One page of the Visit Log. Mock mode pages the whole joined log in memory (ADR-080, ADR-082). */
export const fetchVisitLogPage = routed('VISITS', mockVisitLogPage, httpVisitLogPage)

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
  letterStatus: 'none' | 'draft' | 'approved' | 'voided'
  /** Resting in clinic today with no Time out: same rule as the Dashboard's "In clinic now". */
  inClinicNow: boolean
  escalated: boolean
  enteredInError: boolean
}

export function defaultVisitLogRange(today = todayISO()): { from: ISODate; to: ISODate } {
  return rangeForPreset('today', today)
}

export async function fetchVisitLog(query: VisitLogQuery): Promise<VisitLogRow[]> {
  const [visits, students, personnel, users, letterStatuses] = await Promise.all([
    listVisits(
      { from: query.from, to: query.to },
      { includeEnteredInError: query.includeEnteredInError },
    ),
    listStudents({ includeArchived: true, fullLrn: true }),
    listPersonnel({ includeArchived: true }),
    listUsers(),
    listCurrentExcuseLetterStatuses(),
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
              // The grade at the time of the visit (ADR-047); a staff row shows the staff type.
              gradeLevel: visit.gradeLevelAtTime ?? student?.gradeLevel ?? person?.type ?? '',
              dateTime: visit.dateTime,
              complaint: visit.complaint,
              disposition: visit.disposition,
              eventTag: visit.eventTag,
              loggedBy: userNames.get(visit.loggedByUserId) ?? 'Unknown user',
              letterPending:
                Boolean(visit.excuseLetterDraft) &&
                Boolean(student && !student.archived) &&
                !visit.enteredInError,
              letterStatus:
                visit.enteredInError && (visit.excuseLetterDraft || letterStatuses[visit.id])
                  ? 'voided'
                  : visit.excuseLetterDraft
                    ? 'draft'
                    : (letterStatuses[visit.id] ?? 'none'),
              inClinicNow:
                visit.disposition === 'resting_in_clinic' &&
                !visit.timeOut &&
                visit.dateTime.slice(0, 10) === today &&
                !visit.enteredInError,
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
          ? lrnMatchesSearch(row.patient.number, search)
          : row.patient.number.toLowerCase().startsWith(search.replace(/\s/g, ''))) ||
        row.gradeLevel.toLowerCase().includes(search) ||
        row.complaint.toLowerCase().includes(search) ||
        (row.eventTag?.toLowerCase().includes(search) ?? false)
      )
    })
}
