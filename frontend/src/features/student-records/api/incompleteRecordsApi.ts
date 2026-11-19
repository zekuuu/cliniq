import { getIncompleteRecordQueue, type IncompleteRecord as QueueRow } from '../../../lib/data'
import type { ISODate, ISODateTime } from '../../../types/entities'
import { requestPage } from '../../../lib/api/client'
import { routed } from '../../../lib/api/routed'
import { pageInMemory, sortParam, toPage, type Page, type PageRequest } from '../../../lib/paging'
import { nameMatches } from '../../../lib/personName'

/**
 * Incomplete Records Review Queue (#9). Which fields are missing is computed by the data layer from
 * the student record itself. Saving Edit Student with every required field filled resolves the record
 * (who and when are recorded), which also removes it from the Dashboard's pending-records count.
 */
export interface IncompleteRecord {
  id: string
  studentId: string
  lrn: string
  fullName: string
  gradeLevel: string
  missingFields: string[]
  importedBy: string
  importedAt: ISODate | null
  resolvedBy: string | null
  resolvedAt: ISODateTime | null
}

function toRecord(row: QueueRow): IncompleteRecord {
  return {
    id: `incomplete-${row.student.id}`,
    studentId: row.student.id,
    lrn: row.student.lrn,
    fullName: row.student.fullName,
    gradeLevel: row.student.gradeLevel,
    missingFields: row.missingFields,
    importedBy: row.review?.importedBy ?? 'Flagged in CLINIQ',
    importedAt: row.review?.importedAt ?? null,
    resolvedBy: row.resolvedByName,
    resolvedAt: row.review?.resolvedAt ?? null,
  }
}

export async function fetchIncompleteRecords(): Promise<IncompleteRecord[]> {
  const rows = await getIncompleteRecordQueue({ fullLrn: true })
  return rows
    .map(toRecord)
    .sort(
      (a, b) =>
        (b.importedAt ?? '').localeCompare(a.importedAt ?? '') ||
        a.fullName.localeCompare(b.fullName),
    )
}

export type QueueFilter = 'open' | 'resolved' | 'all'
export type IncompleteSortKey = 'student' | 'grade' | 'missing' | 'imported' | 'status'
export const INCOMPLETE_SORT_KEYS: readonly IncompleteSortKey[] = [
  'student',
  'grade',
  'missing',
  'imported',
  'status',
]
/** One page of the queue, with the Open and Resolved counts of the whole queue (ADR-082). */
export type IncompleteRecordsPage = Page<IncompleteRecord> & {
  counts: { open: number; resolved: number }
}

async function mockIncompletePage(
  request: PageRequest<{ status: QueueFilter }, IncompleteSortKey>,
): Promise<IncompleteRecordsPage> {
  const all = await fetchIncompleteRecords()
  const open = all.filter((record) => !record.resolvedAt).length
  const term = request.search.trim().toLowerCase()
  const rows = all
    .filter((record) =>
      request.filters.status === 'open'
        ? !record.resolvedAt
        : request.filters.status === 'resolved'
          ? Boolean(record.resolvedAt)
          : true,
    )
    .filter(
      (record) =>
        !term ||
        nameMatches(record.fullName, term) ||
        record.lrn.startsWith(term.replace(/[\s-]/g, '')) ||
        record.gradeLevel.toLowerCase().includes(term),
    )
  // The queue arrives by import date, then name; the Student column sorts by that order.
  const nameOrder = new Map(all.map((record, index) => [record.id, index]))
  return {
    ...pageInMemory(rows, request, (record, key) => {
      if (key === 'student') return nameOrder.get(record.id)
      if (key === 'grade') return record.gradeLevel
      if (key === 'missing') return record.missingFields.join(', ')
      if (key === 'imported') return record.importedAt
      return record.resolvedAt ? 'Resolved' : 'Open'
    }),
    counts: { open, resolved: all.length - open },
  }
}

/** `GET /api/students/incomplete` with `page`: filtered, searched and sorted by the server. */
async function httpIncompletePage(
  request: PageRequest<{ status: QueueFilter }, IncompleteSortKey>,
  signal?: AbortSignal,
): Promise<IncompleteRecordsPage> {
  const result = await requestPage<QueueRow[]>('/students/incomplete', {
    query: {
      status: request.filters.status,
      search: request.search,
      sort: sortParam(request.sort),
      page: request.page,
      perPage: request.perPage,
    },
    signal,
  })
  const counts = result.meta?.counts ?? {}
  return {
    ...toPage({ data: result.data.map(toRecord), meta: result.meta }, request),
    counts: { open: counts.open ?? 0, resolved: counts.resolved ?? 0 },
  }
}

/** One page of the Incomplete Records Queue (ADR-082). */
export const fetchIncompletePage = routed('STUDENTS', mockIncompletePage, httpIncompletePage)
