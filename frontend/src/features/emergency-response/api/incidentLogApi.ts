import { listIncidents, listStudents } from '../../../lib/mock-db'
import { todayISO } from '../../../lib/dates'
import { rangeForPreset } from '../../../lib/dateRange'
import type { ISODate, ISODateTime } from '../../../types/entities'

export type IncidentCompletion = 'needs_completion' | 'complete'

export interface IncidentLogQuery {
  from: ISODate
  to: ISODate
  search: string
  completion: IncidentCompletion | 'all'
}

export interface IncidentLogRow {
  id: string
  /** Shown masked (`lib/lrn.ts`), never the name (ADR-004, ADR-028). */
  lrn: string
  gradeLevel: string
  time: ISODateTime
  complaint: string
  completion: IncidentCompletion
  eventTag: string | null
}

export function defaultIncidentLogRange(today = todayISO()): { from: ISODate; to: ISODate } {
  return rangeForPreset('today', today)
}

export async function fetchIncidentLog(query: IncidentLogQuery): Promise<IncidentLogRow[]> {
  const [incidents, students] = await Promise.all([
    listIncidents({ from: query.from, to: query.to }),
    listStudents({ includeArchived: true }),
  ])
  const studentsById = new Map(students.map((student) => [student.id, student]))
  const search = query.search.trim().toLowerCase()

  return incidents
    .flatMap((incident): IncidentLogRow[] => {
      const student = studentsById.get(incident.studentId)
      if (!student) return []
      return [
        {
          id: incident.id,
          lrn: student.lrn,
          gradeLevel: student.gradeLevel,
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
        row.lrn.startsWith(search.replace(/[\s-]/g, '')) ||
        row.gradeLevel.toLowerCase().includes(search) ||
        row.complaint.toLowerCase().includes(search) ||
        (row.eventTag?.toLowerCase().includes(search) ?? false)
      )
    })
}
