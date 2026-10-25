import { listIncidents, listPersonnel, listStudents, type SessionUser } from '../../../lib/mock-db'
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
export async function fetchIncidentLog(query: IncidentLogQuery, viewer?: SessionUser): Promise<IncidentLogRow[]> {
  const [incidents, students, personnel] = await Promise.all([
    listIncidents({ from: query.from, to: query.to }, viewer),
    listStudents({ includeArchived: true }),
    listPersonnel({ includeArchived: true }),
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
          gradeLevel: student?.gradeLevel ?? person?.type ?? '',
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
          ? row.patient.number.startsWith(search.replace(/[\s-]/g, ''))
          : row.patient.number.toLowerCase().startsWith(search.replace(/\s/g, ''))) ||
        row.gradeLevel.toLowerCase().includes(search) ||
        row.complaint.toLowerCase().includes(search) ||
        (row.eventTag?.toLowerCase().includes(search) ?? false)
      )
    })
}
