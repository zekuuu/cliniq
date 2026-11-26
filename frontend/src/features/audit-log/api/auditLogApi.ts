import {
  listAuditLog,
  listAuditLogForPrint,
  ROLE_LABELS,
  type AuditLogList,
  type AuditLogQuery,
  type AuditLogRow,
} from '../../../lib/data'
import { apiBaseUrl, requestPage } from '../../../lib/api/client'
import { routed } from '../../../lib/api/routed'
import { pageInMemory, sortParam, toPage, type Page, type PageRequest } from '../../../lib/paging'
import { sortTableRows, type TableSortState } from '../../../lib/tableSort'
import type { AuditActionType } from '../../../types/entities'

/** Screen #35 reads only through the mock data-access layer (ADR-014). */
export type { AuditLogList, AuditLogQuery }

export function fetchAuditLog(query: AuditLogQuery): Promise<AuditLogList> {
  return listAuditLog(query)
}

/** The same entries with full LRNs, for the Staff printout only (ADR-044, ADR-080). */
export function fetchAuditLogForPrint(query: AuditLogQuery): Promise<AuditLogList> {
  return listAuditLogForPrint(query)
}

/** One Staff-only HTML stream: the server writes a complete A4 document in bounded chunks. */
export function auditLogPrintUrl(
  query: AuditLogQuery,
  search: string,
  sort: TableSortState<AuditSortKey>,
): string {
  const params = new URLSearchParams({ from: query.from, to: query.to, sort: sortParam(sort) })
  if (query.userId) params.set('userId', query.userId)
  if (search.trim()) params.set('search', search.trim())
  query.actionTypes.forEach((value) => params.append('actionTypes[]', value))
  query.targetTypes.forEach((value) => params.append('targetTypes[]', value))
  return `${apiBaseUrl()}/audit-log/print?${params.toString()}`
}

/** The Action column's words; the server's search and sort use the same ones (ADR-082). */
export const AUDIT_ACTION_LABELS: Record<AuditActionType, string> = {
  login: 'Login',
  logout: 'Logout',
  submit: 'Submit',
  approve: 'Approve',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  archive: 'Archive',
  print: 'Print / Save as PDF',
  view: 'Viewed a record',
}

export type AuditSortKey = 'timestamp' | 'user' | 'action' | 'module' | 'record'
export const AUDIT_SORT_KEYS: readonly AuditSortKey[] = [
  'timestamp',
  'user',
  'action',
  'module',
  'record',
]

/** Search matches only what the table already shows, so it never surfaces hidden student details. */
export function matchesAuditSearch(row: AuditLogRow, search: string): boolean {
  const needle = search.trim().toLowerCase()
  if (!needle) return true
  return [
    row.userName,
    row.userRole ? ROLE_LABELS[row.userRole] : '',
    AUDIT_ACTION_LABELS[row.actionType],
    row.summary ?? '',
    row.target?.kind ?? 'No record',
    row.target?.label ?? '',
  ].some((text) => text.toLowerCase().includes(needle))
}

export function auditSortValue(row: AuditLogRow, key: AuditSortKey): string {
  if (key === 'timestamp') return row.dateTime
  if (key === 'user') return row.userName
  if (key === 'action') return AUDIT_ACTION_LABELS[row.actionType]
  if (key === 'module') return row.target?.kind ?? ''
  return row.target?.label ?? ''
}

/** Every matching entry in the screen's order: the printout prints all of them, not one page. */
export function filterAndSortAudit(
  rows: AuditLogRow[],
  search: string,
  sort: TableSortState<AuditSortKey>,
): AuditLogRow[] {
  return sortTableRows(
    rows.filter((row) => matchesAuditSearch(row, search)),
    sort,
    auditSortValue,
  )
}

export type AuditLogFiltersQuery = AuditLogQuery
/** One page of entries, with every account for the User filter. */
export type AuditLogPage = Page<AuditLogRow> & { users: AuditLogList['users'] }

async function mockAuditLogPage(
  request: PageRequest<AuditLogQuery, AuditSortKey>,
): Promise<AuditLogPage> {
  const list = await listAuditLog(request.filters)
  const rows = list.rows.filter((row) => matchesAuditSearch(row, request.search))
  return { ...pageInMemory(rows, request, auditSortValue), users: list.users }
}

/** `GET /api/audit-log` with `page`: filtered, searched and sorted in SQL (ADR-082). */
async function httpAuditLogPage(
  request: PageRequest<AuditLogQuery, AuditSortKey>,
  signal?: AbortSignal,
): Promise<AuditLogPage> {
  const { filters } = request
  const result = await requestPage<AuditLogList>('/audit-log', {
    query: {
      from: filters.from,
      to: filters.to,
      userId: filters.userId || undefined,
      actionTypes: [...filters.actionTypes],
      targetTypes: [...filters.targetTypes],
      search: request.search,
      sort: sortParam(request.sort),
      page: request.page,
      perPage: request.perPage,
    },
    signal,
  })
  return {
    ...toPage({ data: result.data.rows, meta: result.meta }, request),
    users: result.data.users,
  }
}

/** One page of the Audit Log (ADR-082). */
export const fetchAuditLogPage = routed('AUDIT', mockAuditLogPage, httpAuditLogPage)
