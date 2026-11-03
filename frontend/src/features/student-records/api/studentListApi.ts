import { getGradeLevels, getIncompleteRecordQueue, listStudents } from '../../../lib/mock-db'
import type { StudentListRow } from '../../../types/entities'

export interface StudentListQuery {
  search: string
  gradeLevel: string
  includeArchived: boolean
  recordStatus?: '' | 'complete' | 'incomplete'
}

export function fetchStudentList(query: StudentListQuery): Promise<StudentListRow[]> {
  return listStudents({ ...query, limit: 80 })
}

export function fetchGradeLevels(): Promise<string[]> {
  return getGradeLevels()
}

/** Open entries of the Incomplete Records Queue: the same count as the Dashboard's (R11). */
export async function fetchIncompleteCount(): Promise<number> {
  return (await getIncompleteRecordQueue()).filter((row) => row.status === 'open').length
}
