import { listIncidents, listPersonnel, listStudents, type SessionUser } from '../../../lib/data'
import { requestPage } from '../../../lib/api/client'
import { routed } from '../../../lib/api/routed'
import { pageInMemory, sortParam, toPage, type Page, type PageRequest } from '../../../lib/paging'
import { lrnMatchesSearch } from '../../../lib/lrn'
import { matchesPatientFilter, type PatientFilter, type PatientNumber } from '../../../lib/patients'
import { todayISO } from '../../../lib/dates'
import { rangeForPreset } from '../../../lib/dateRange'
import type { ISODate, ISODateTime } from '../../../types/entities'

export type IncidentCompletion = 'needs_completion' | 'complete'

export interface IncidentLogQuery {
  from: ISODate
  to: ISODate
  search: string
  completion: IncidentCompletion | 'all'
  /** Everyone, students only or staff only (ADR-043, D11). */
  patient?: PatientFilter
}

export interface IncidentLogRow {
  id: string
  /** The masked LRN or the Staff No., never the name (ADR-004, ADR-028, ADR-043). */
  patient: PatientNumber
  /** Grade level for a student, staff type for a staff member. */
  gradeLevel: string
  time: ISODateTime
  complaint: string
  completion: IncidentCompletion
  eventTag: string | null
}

export function defaultIncidentLogRange(today = todayISO()): { from: ISODate; to: ISODate } {
  return rangeForPreset('today', today)
}

/** The Admin's log leaves out staff patients' incidents (D15); the data layer enforces it. */
export async function fetchIncidentLog(
  query: IncidentLogQuery,
  viewer?: SessionUser,
): Promise<IncidentLogRow[]> {
  const [incidents, students, personnel] = await Promise.all([
    listIncidents({ from: query.from, to: query.to }, viewer),
    listStudents({ includeArchived: true, fullLrn: true }),
    // The staff list is Staff only (ADR-043): the API answers the Admin 403, and the Admin's log has
    // no staff incidents to name anyway.
    viewer?.role === 'admin' ? Promise.resolve([]) : listPersonnel({ includeArchived: true }),
  ])
  const studentsById = new Map(students.map((student) => [student.id, student]))
  const personnelById = new Map(personnel.map((person) => [person.id, person]))
  const search = query.search.trim().toLowerCase()

  return incidents
    .flatMap((incident): IncidentLogRow[] => {
      const student = studentsById.get(incident.studentId ?? '')
      const person = personnelById.get(incident.personnelId ?? '')
      const patient: PatientNumber | null = student
        ? { kind: 'student', number: student.lrn }
        : person
          ? { kind: 'personnel', number: person.staffNumber }
          : null
      if (!patient || !matchesPatientFilter(patient.kind, query.patient ?? 'everyone')) return []
      return [
        {
          id: incident.id,
          patient,
          // The grade at the time of the incident (ADR-047); a staff row shows the staff type.
          gradeLevel: incident.gradeLevelAtTime ?? student?.gradeLevel ?? person?.type ?? '',
          time: incident.time,
          complaint: incident.complaint,
          completion: incident.stage === 1 ? 'needs_completion' : 'complete',
          eventTag: incident.eventTag,
        },
      ]
    })
    .filter((row) => query.completion === 'all' || row.completion === query.completion)
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

export type IncidentSortKey = 'time' | 'student' | 'complaint' | 'status'
export const INCIDENT_SORT_KEYS: readonly IncidentSortKey[] = [
  'time',
  'student',
  'complaint',
  'status',
]
/** The Incident Log's filters; the search box and the page travel beside them (ADR-082). */
export type IncidentLogFilters = Omit<IncidentLogQuery, 'search'>

/** The screen's sort rule, kept for the mock's page so mock mode orders rows as before. */
function incidentLogValue(row: IncidentLogRow, key: IncidentSortKey): string {
  if (key === 'time') return row.time
  if (key === 'student') return `${row.patient.kind}|${row.patient.number}`
  if (key === 'complaint') return row.complaint
  return row.completion === 'needs_completion' ? 'Needs completion' : 'Complete'
}

async function mockIncidentLogPage(
  request: PageRequest<IncidentLogFilters, IncidentSortKey>,
  viewer?: SessionUser,
  signal?: AbortSignal,
): Promise<Page<IncidentLogRow>> {
  const rows = await fetchIncidentLog({ ...request.filters, search: request.search }, viewer)
  signal?.throwIfAborted() // a page no longer wanted is not cut
  return pageInMemory(rows, request, incidentLogValue)
}

/** `GET /api/incidents/log`: one page; the server leaves staff incidents out for the Admin (ADR-043). */
async function httpIncidentLogPage(
  request: PageRequest<IncidentLogFilters, IncidentSortKey>,
  _viewer?: SessionUser,
  signal?: AbortSignal,
): Promise<Page<IncidentLogRow>> {
  const { filters } = request
  const result = await requestPage<IncidentLogRow[]>('/incidents/log', {
    query: {
      from: filters.from,
      to: filters.to,
      completion: filters.completion,
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

/** One page of the Incident Log (ADR-082). */
export const fetchIncidentLogPage = routed('INCIDENTS', mockIncidentLogPage, httpIncidentLogPage)
