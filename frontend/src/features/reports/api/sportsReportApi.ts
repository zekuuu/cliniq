import {
  createSportsReport,
  duplicateSportsReport,
  getGradeLevels,
  getSportsReport,
  getSportsReportContent,
  listSportsReports,
  listStudents,
  searchStudents,
  setSportsReportArchived,
  updateSportsReport,
  type SessionUser,
  type SportsReportContent,
  type SportsReportDetail,
  type SportsReportInput,
  type SportsReportSummary,
} from '../../../lib/mock-db'
import type { StudentSearchResult } from '../../../types/entities'

/*
 * The Sports Report (ADR-034): Staff only. The data layer refuses every call from another role, and
 * saves only the list and the notes; the visits and incidents are read when the report is shown or printed.
 */

export function fetchSportsReports(viewer: SessionUser): Promise<SportsReportSummary[]> {
  return listSportsReports(viewer)
}

export function fetchSportsReport(reportId: string, viewer: SessionUser): Promise<SportsReportDetail> {
  return getSportsReport(reportId, viewer)
}

/** Computed now from the visits and incidents, for the preview and again for each print. */
export function fetchSportsReportContent(reportId: string, viewer: SessionUser): Promise<SportsReportContent> {
  return getSportsReportContent(reportId, viewer)
}

export function saveSportsReport(input: SportsReportInput, options: { reportId?: string; viewer: SessionUser }) {
  return options.reportId ? updateSportsReport(options.reportId, input, options.viewer) : createSportsReport(input, options.viewer)
}

export function copySportsReport(reportId: string, viewer: SessionUser) {
  return duplicateSportsReport(reportId, viewer)
}

export function archiveSportsReport(reportId: string, archived: boolean, viewer: SessionUser) {
  return setSportsReportArchived(reportId, archived, viewer)
}

export function searchSportsReportStudents(query: string): Promise<StudentSearchResult[]> {
  return searchStudents(query)
}

export function fetchGradeLevels(): Promise<string[]> {
  return getGradeLevels()
}

/** Active students of one grade level, for "add a whole grade". Names and grade only. */
export async function fetchGradeStudents(gradeLevel: string): Promise<StudentSearchResult[]> {
  const students = await listStudents({ gradeLevel })
  return students.map(({ id, lrn, fullName, gradeLevel: grade }) => ({ id, lrn, fullName, gradeLevel: grade }))
}
