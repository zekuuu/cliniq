import { getGradeLevels, listStudents } from '../../../lib/mock-db'
import type { StudentListRow } from '../../../types/entities'

export interface StudentListQuery {
  search: string
  gradeLevel: string
  includeArchived: boolean
}

export function fetchStudentList(query: StudentListQuery): Promise<StudentListRow[]> {
  return listStudents({ ...query, limit: 80 })
}

export function fetchGradeLevels(): Promise<string[]> {
  return getGradeLevels()
}
