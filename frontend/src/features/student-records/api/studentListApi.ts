import { getGradeLevels, getIncompleteRecordQueue, listStudents } from '../../../lib/data'
import type { StudentListRow } from '../../../types/entities'

export interface StudentListQuery {
  search: string
  gradeLevel: string
  includeArchived: boolean
  recordStatus?: '' | 'complete' | 'incomplete'
}

/** Every student matching the search and filters, uncapped: the screen pages them (Zean, November 17, 2026). */
export function fetchStudentList(query: StudentListQuery): Promise<StudentListRow[]> {
  return listStudents(query)
}

export function fetchGradeLevels(): Promise<string[]> {
  return getGradeLevels()
}

/** Open entries of the Incomplete Records Queue: the same count as the Dashboard's (R11). */
export async function fetchIncompleteCount(): Promise<number> {
  return (await getIncompleteRecordQueue()).filter((row) => row.status === 'open').length
}
