import { http, requestPage } from '../../lib/api/client'
import { routed } from '../../lib/api/routed'
import { getArchive, type SessionUser } from '../../lib/data'
import { rowsInNewestYear } from './newestArchivedYear'

/**
 * The count on a list's Archive button: the archived rows of the newest school year that has any,
 * the year the Archive opens on (Zean, November 8, 2026).
 */
async function mockArchiveCount(viewer: SessionUser, list: 'students' | 'staff'): Promise<number> {
  return rowsInNewestYear((await getArchive(viewer))[list]).length
}

/**
 * On the API: one row per year, newest first, until a year has archived rows (`totalInYear`).
 * The whole Archive (every year, both lists) is no longer read just for this number (ADR-082).
 */
async function httpArchiveCount(_viewer: SessionUser, list: 'students' | 'staff'): Promise<number> {
  const { years } = await http.get<{ years: Array<{ label: string }> }>('/archive/years')
  for (const { label } of years) {
    const result = await requestPage<unknown[]>(`/archive/${list}`, {
      query: { year: label, page: 1, perPage: 1 },
    })
    const inYear = (result.meta as { totalInYear?: number } | undefined)?.totalInYear ?? 0
    if (inYear > 0) return inYear
  }
  return 0
}

export const fetchArchiveCount = routed('SCHOOL_YEARS', mockArchiveCount, httpArchiveCount)
