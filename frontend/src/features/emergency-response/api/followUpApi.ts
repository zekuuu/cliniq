import {
  listFollowUps,
  rescheduleFollowUp,
  setFollowUpStatus,
  type FollowUpView,
  type SessionUser,
} from '../../../lib/data'
import type { FollowUpStatus } from '../../../types/entities'
import { requestPage } from '../../../lib/api/client'
import { routed } from '../../../lib/api/routed'
import { pageInMemory, sortParam, toPage, type Page, type PageRequest } from '../../../lib/paging'
import { matchesPatientFilter, type PatientFilter } from '../../../lib/patients'

/** Follow-Up List (#18c). Rows carry the LRN only (multi-student list, ADR-004). */
export type FollowUpRow = FollowUpView

export function fetchFollowUps(status: '' | FollowUpStatus): Promise<FollowUpRow[]> {
  return listFollowUps({ status })
}

export type FollowUpSortKey = 'student' | 'reason' | 'due' | 'status'
export const FOLLOW_UP_SORT_KEYS: readonly FollowUpSortKey[] = [
  'student',
  'reason',
  'due',
  'status',
]
export interface FollowUpFilters {
  status: '' | FollowUpStatus
  patient: PatientFilter
}

/** The screen's sort rule, kept for the mock's page so mock mode orders rows as before. */
function followUpValue(row: FollowUpRow, key: FollowUpSortKey): string {
  if (key === 'student') return `${row.patient.kind}|${row.patient.number}`
  if (key === 'reason') return row.reason
  if (key === 'due') return row.followUpDate
  return row.status
}

async function mockFollowUpPage(
  request: PageRequest<FollowUpFilters, FollowUpSortKey>,
): Promise<Page<FollowUpRow>> {
  const rows = (await listFollowUps({ status: request.filters.status })).filter((row) =>
    matchesPatientFilter(row.patient.kind, request.filters.patient),
  )
  return pageInMemory(rows, request, followUpValue)
}

/** `GET /api/follow-ups` with `page`: filtered and sorted by the server in one query (ADR-082). */
async function httpFollowUpPage(
  request: PageRequest<FollowUpFilters, FollowUpSortKey>,
  signal?: AbortSignal,
): Promise<Page<FollowUpRow>> {
  const result = await requestPage<FollowUpRow[]>('/follow-ups', {
    query: {
      status: request.filters.status,
      patient: request.filters.patient,
      sort: sortParam(request.sort),
      page: request.page,
      perPage: request.perPage,
    },
    signal,
  })
  return toPage(result, request)
}

/** One page of the Follow-Up List (ADR-082). */
export const fetchFollowUpPage = routed('VISITS', mockFollowUpPage, httpFollowUpPage)

/** Status changes are audited updates; the Dashboard's due list reflects them on its next load. */
export async function updateFollowUpStatus(
  id: string,
  status: FollowUpStatus,
  actor?: SessionUser,
  reason?: string,
): Promise<void> {
  await setFollowUpStatus(id, status, actor, reason)
}

/** A new pending follow-up for the same student and reason (after Missed or Cancelled). */
export async function setNewFollowUpDate(
  id: string,
  followUpDate: string,
  actor?: SessionUser,
): Promise<void> {
  await rescheduleFollowUp(id, followUpDate, actor)
}
