import type { ArchivedRecordRow } from '../../lib/mock-db'

/** The newest school year with an archived row, or null. The Archive opens on it from a list's Archive button. */
export function newestArchivedYear(rows: ArchivedRecordRow[]): string | null {
  return rows.reduce<string | null>((newest, row) => (newest && newest >= row.archivedSchoolYear ? newest : row.archivedSchoolYear), null)
}

/** The rows the Archive shows when a list's Archive button opens it, so the button's count matches (Zean, November 8, 2026). */
export function rowsInNewestYear(rows: ArchivedRecordRow[]): ArchivedRecordRow[] {
  const year = newestArchivedYear(rows)
  return rows.filter((row) => row.archivedSchoolYear === year)
}
