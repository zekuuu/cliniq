import { getGradeLevels, getIncompleteRecordQueue, listStudents } from '../../../lib/data'
import { requestPage } from '../../../lib/api/client'
import { routed } from '../../../lib/api/routed'
import { pageInMemory, sortParam, toPage, type Page, type PageRequest } from '../../../lib/paging'
import type { StudentListRow } from '../../../types/entities'

export interface StudentListQuery {
  search: string
  gradeLevel: string
  includeArchived: boolean
  recordStatus?: '' | 'complete' | 'incomplete'
}

/** Every student matching the search and filters, uncapped (Zean, November 17, 2026). */
export function fetchStudentList(query: StudentListQuery): Promise<StudentListRow[]> {
  return listStudents(query)
}

export type StudentSortKey = 'name' | 'number' | 'grade' | 'status'
export const STUDENT_SORT_KEYS: readonly StudentSortKey[] = ['name', 'number', 'grade', 'status']
export type StudentListFilters = Omit<StudentListQuery, 'search'>

async function mockStudentPage(
  request: PageRequest<StudentListFilters, StudentSortKey>,
): Promise<Page<StudentListRow>> {
  const rows = await listStudents({ ...request.filters, search: request.search })
  // The list arrives in school-list order, last name then first name (ADR-064); Name sorts by that order.
  const nameOrder = new Map(rows.map((student, index) => [student.id, index]))
  return pageInMemory(rows, request, (student, key) => {
    if (key === 'name') return nameOrder.get(student.id)
    if (key === 'number') return student.lrn
    if (key === 'grade') return student.gradeLevel
    return student.recordComplete
      ? student.archived
        ? 'Complete Archived'
        : 'Complete'
      : 'Incomplete'
  })
}

/** `POST /api/students/query` with `page`: one page of the masterlist (ADR-082). */
async function httpStudentPage(
  request: PageRequest<StudentListFilters, StudentSortKey>,
  signal?: AbortSignal,
): Promise<Page<StudentListRow>> {
  const { filters } = request
  const result = await requestPage<StudentListRow[]>('/students/query', {
    method: 'POST',
    body: {
      search: request.search,
      gradeLevel: filters.gradeLevel || null,
      includeArchived: filters.includeArchived,
      recordStatus: filters.recordStatus || null,
      sort: sortParam(request.sort),
      page: request.page,
      perPage: request.perPage,
    },
    signal,
  })
  return toPage(result, request)
}

/** One page of the Student List (ADR-082). */
export const fetchStudentPage = routed('STUDENTS', mockStudentPage, httpStudentPage)

export function fetchGradeLevels(): Promise<string[]> {
  return getGradeLevels()
}

/** Open entries of the Incomplete Records Queue: the same count as the Dashboard's (R11). */
async function mockIncompleteCount(): Promise<number> {
  return (await getIncompleteRecordQueue()).filter((row) => row.status === 'open').length
}

/** On the API, a one-row page of the open queue: its `total`, not the whole queue (ADR-082). */
async function httpIncompleteCount(): Promise<number> {
  const result = await requestPage<unknown[]>('/students/incomplete', {
    query: { status: 'open', page: 1, perPage: 1 },
  })
  return result.meta?.total ?? 0
}

export const fetchIncompleteCount = routed('STUDENTS', mockIncompleteCount, httpIncompleteCount)
