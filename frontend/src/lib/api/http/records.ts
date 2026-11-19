import {
  PersonnelPermissionError,
  SchoolYearSettingsError,
  type ArchivedRecordRow,
  type ArchiveView,
  type IncompleteRecord,
  type PersonnelHistory,
  type PersonnelInput,
  type PersonnelQuery,
  type SaveStudentResult,
  type SessionUser,
  type StaffImportPreview,
  type StaffImportResult,
  type StaffIncompleteRecord,
  type StudentDuplicateCheck,
  type StudentHistory,
  type StudentImportPreview,
  type StudentImportResult,
  type StudentInput,
  type StudentQuery,
} from '../../mock-db'
import type { SchoolYear, SchoolYearSettings } from '../../schoolYear'
import type { SchoolYearReminder } from '../../../types/dashboard'
import type { Patient } from '../../patients'
import type { ImportRow } from '../../studentImport'
import type { StaffImportRow } from '../../staffImport'
import type {
  PatientRef,
  PersonnelSearchResult,
  PatientSearchResult,
  Personnel,
  Student,
  StudentListRow,
  StudentSearchResult,
} from '../../../types/entities'
import { ApiError, http, requestPage } from '../client'
import { mapped, type ErrorMap } from '../errors'

/**
 * STUDENTS, STAFF_PATIENTS and SCHOOL_YEARS in API mode (S2; API-Contract.md "Student Records",
 * "Staff Patients", "School years and the Archive"). Shapes match the mock's; the adapters below
 * bridge only where the API splits or names things differently. Lists carry the masked LRN.
 */

const STAFF_ONLY: ErrorMap = { forbidden: () => new PersonnelPermissionError() }
const SCHOOL_YEAR: ErrorMap = {
  forbidden: (message) => new SchoolYearSettingsError(message),
  validation: (message) => new SchoolYearSettingsError(message),
}

/**
 * The screens pass `Infinity` for "all"; the history routes take at most 200 (and read a missing
 * limit as 8). ponytail: 200 visits per person covers years of records; page if one ever exceeds it.
 */
function finite(limit: number): number {
  return Number.isFinite(limit) ? limit : 200
}

// --- Students ---

export function listStudents(query: StudentQuery = {}): Promise<StudentListRow[]> {
  return http.post('/students/query', {
    search: query.search ?? '',
    gradeLevel: query.gradeLevel || null,
    includeArchived: Boolean(query.includeArchived),
    recordStatus: query.recordStatus || null,
    limit: query.limit ?? null,
  })
}

export function searchStudents(query: string, limit = 8): Promise<StudentSearchResult[]> {
  return http.post('/students/search', { q: query, limit })
}

export function getStudent(id: string): Promise<Student> {
  return http.get(`/students/${encodeURIComponent(id)}`)
}

/** The mock's demo default for a profile opened without an id; the API has none. */
export function getDemoStudent(): Promise<Student> {
  return Promise.reject(new Error('Student not found'))
}

export function getStudentHistory(studentId: string, limit = 8): Promise<StudentHistory> {
  return http.get(`/students/${encodeURIComponent(studentId)}/history`, {
    query: { limit: finite(limit) },
  })
}

/**
 * The API takes the name parts and joins them itself before comparing; the form sends the joined
 * name, so it goes as `firstName` and compares the same (ADR-064).
 */
export function checkStudentDuplicates(
  lrn: string,
  fullName: string,
): Promise<StudentDuplicateCheck> {
  return http.post('/students/check-duplicates', { lrn, firstName: fullName })
}

export function saveStudent(
  input: StudentInput,
  options: {
    studentId?: string
    confirmDuplicate?: boolean
    actor?: SessionUser
    nameCorrectionReason?: string
  } = {},
): Promise<SaveStudentResult> {
  if (options.studentId)
    return http.put(`/students/${encodeURIComponent(options.studentId)}`, {
      ...input,
      nameCorrectionReason: options.nameCorrectionReason ?? null,
    })
  return http.post('/students', { ...input, confirmDuplicate: Boolean(options.confirmDuplicate) })
}

export function archiveStudent(
  studentId: string,
  _actor: SessionUser | undefined,
  reason: string,
): Promise<Student> {
  return http.post(`/students/${encodeURIComponent(studentId)}/archive`, { reason })
}

/** `index` is the contact's place in the list, 0 being the primary. */
export function verifyStudentContact(
  studentId: string,
  index: number,
  verified: boolean,
): Promise<Student> {
  return http.post(
    `/students/${encodeURIComponent(studentId)}/emergency-contacts/${index}/verify`,
    {
      verified,
    },
  )
}

export function previewStudentImport(rows: ImportRow[]): Promise<StudentImportPreview> {
  return http.post('/students/import/preview', { rows })
}

export function applyStudentImport(
  rows: ImportRow[],
  options: { fileName: string; archiveIds: string[]; actor?: SessionUser },
): Promise<StudentImportResult> {
  return http.post('/students/import', {
    rows,
    fileName: options.fileName,
    archiveIds: options.archiveIds,
  })
}

/** Masked LRN on every row: the API never sends the full one on a list (ADR-040). */
export function getIncompleteRecordQueue(): Promise<IncompleteRecord[]> {
  return http.get('/students/incomplete')
}

// --- Staff patients (Staff only, ADR-043) ---

export function listPersonnel(query: PersonnelQuery = {}): Promise<Personnel[]> {
  return mapped(
    http.get('/personnel', {
      query: {
        search: query.search,
        type: query.type,
        includeArchived: query.includeArchived ? 1 : undefined,
      },
    }),
    STAFF_ONLY,
  )
}

export function getPersonnel(id: string): Promise<Personnel> {
  return mapped(http.get(`/personnel/${encodeURIComponent(id)}`), STAFF_ONLY)
}

export function searchPersonnel(query: string, limit = 8): Promise<PersonnelSearchResult[]> {
  return mapped(http.get('/personnel/search', { query: { q: query, limit } }), STAFF_ONLY)
}

export function getPersonnelHistory(personnelId: string, limit = 8): Promise<PersonnelHistory> {
  return mapped(
    http.get(`/personnel/${encodeURIComponent(personnelId)}/history`, {
      query: { limit: finite(limit) },
    }),
    STAFF_ONLY,
  )
}

export function savePersonnel(
  input: PersonnelInput,
  options: { personnelId?: string; actor?: SessionUser } = {},
): Promise<{ personnel: Personnel; action: 'create' | 'update' }> {
  const save = options.personnelId
    ? http.put<{ personnel: Personnel; action: 'create' | 'update' }>(
        `/personnel/${encodeURIComponent(options.personnelId)}`,
        input,
      )
    : http.post<{ personnel: Personnel; action: 'create' | 'update' }>('/personnel', input)
  return mapped(save, STAFF_ONLY)
}

export function archivePersonnel(
  personnelId: string,
  _actor: SessionUser | undefined,
  reason: string,
): Promise<Personnel> {
  return mapped(
    http.post(`/personnel/${encodeURIComponent(personnelId)}/archive`, { reason }),
    STAFF_ONLY,
  )
}

export function verifyPersonnelContact(
  personnelId: string,
  index: number,
  verified: boolean,
): Promise<Personnel> {
  return mapped(
    http.post(`/personnel/${encodeURIComponent(personnelId)}/emergency-contacts/${index}/verify`, {
      verified,
    }),
    STAFF_ONLY,
  )
}

export function previewStaffImport(rows: StaffImportRow[]): Promise<StaffImportPreview> {
  return mapped(http.post('/personnel/import/preview', { rows }), STAFF_ONLY)
}

export function applyStaffImport(
  rows: StaffImportRow[],
  options: { fileName: string; actor?: SessionUser },
): Promise<StaffImportResult> {
  return mapped(http.post('/personnel/import', { rows, fileName: options.fileName }), STAFF_ONLY)
}

export function getStaffIncompleteQueue(): Promise<StaffIncompleteRecord[]> {
  return mapped(http.get('/personnel/incomplete'), STAFF_ONLY)
}

// --- Patients (students and staff in one box, ADR-043) ---

export function searchPatients(query: string, limit = 8): Promise<PatientSearchResult[]> {
  return http.post('/patients/search', { q: query, limit })
}

export function getPatient(ref: PatientRef): Promise<Patient> {
  const path = ref.studentId
    ? `/patients/student/${encodeURIComponent(ref.studentId)}`
    : `/patients/personnel/${encodeURIComponent(ref.personnelId ?? '')}`
  return http.get(path)
}

// --- School years and the Archive (ADR-072, ADR-075) ---

interface SchoolYearsResponse {
  current: {
    label: string
    from: string
    to: string
    endedOn: string | null
    startedBy: string | null
    endedBy: string | null
  }
  step: ArchiveView['step']
  settings: SchoolYearSettings
  years: Array<{ label: string; startedOn: string; endedOn: string | null }>
}

/** The mock's settings carry the recorded starts (`schoolYearStarts`); the API lists them as `years`. */
function withStarts(response: SchoolYearsResponse): SchoolYearSettings {
  return {
    ...response.settings,
    schoolYearStarts: response.years.map((year) => ({
      label: year.label,
      startedOn: year.startedOn,
      startedBy: '',
      ...(year.endedOn ? { endedOn: year.endedOn } : {}),
    })),
  }
}

function toSchoolYear(response: SchoolYearsResponse): SchoolYear {
  const { current } = response
  return {
    label: current.label,
    startYear: Number(current.label.slice(0, 4)),
    from: current.from,
    to: current.to,
    // Not shown in API mode; the server owns the dates (ponytail: add a server field if a screen needs it).
    lastClassDay: current.endedOn ?? current.to,
    started: response.years.some((year) => year.label === current.label),
    endedOn: current.endedOn,
  }
}

function schoolYears(): Promise<SchoolYearsResponse> {
  return http.get('/school-years')
}

export async function getSchoolYearSettings(): Promise<SchoolYearSettings> {
  return (await schoolYears()).settings
}

export async function getSchoolYearHistory(): Promise<SchoolYearSettings> {
  return withStarts(await schoolYears())
}

export function getSchoolYearReminder(): Promise<SchoolYearReminder | null> {
  return http.get('/school-years/reminder')
}

export async function saveSchoolYearSettings(
  input: SchoolYearSettings,
): Promise<SchoolYearSettings> {
  await mapped(
    http.put('/school-years/settings', {
      schoolYearStartMonth: input.schoolYearStartMonth,
      schoolYearStartDay: input.schoolYearStartDay,
      schoolYearEndMonth: input.schoolYearEndMonth,
      schoolYearEndDay: input.schoolYearEndDay,
    }),
    SCHOOL_YEAR,
  )
  return getSchoolYearSettings()
}

/** 409 `school_year` refusals read as the mock's `SchoolYearSettingsError`. */
async function schoolYearStep(path: string): Promise<SchoolYear> {
  try {
    await mapped(http.post(path), SCHOOL_YEAR)
  } catch (error) {
    if (error instanceof ApiError && error.status === 409)
      throw new SchoolYearSettingsError(error.message)
    throw error
  }
  return toSchoolYear(await schoolYears())
}

export function endSchoolYear(): Promise<SchoolYear> {
  return schoolYearStep('/school-years/end')
}

export function startSchoolYear(): Promise<SchoolYear> {
  return schoolYearStep('/school-years/start')
}

/** Every archived row of one list in one year; the API pages at 100 at most. */
async function archivedRows(
  list: 'students' | 'staff',
  year: string,
): Promise<ArchivedRecordRow[]> {
  const rows: ArchivedRecordRow[] = []
  for (let page = 1; ; page += 1) {
    const result = await requestPage<ArchivedRecordRow[]>(`/archive/${list}`, {
      query: { year, page, perPage: 100 },
    })
    rows.push(...result.data)
    if (!result.meta || rows.length >= result.meta.total || result.data.length === 0) return rows
  }
}

/**
 * The mock returns the whole Archive at once; the API splits it by year and pages it. This joins
 * the parts back into the mock's `ArchiveView`, so the page keeps filtering on the client.
 * ponytail: one request per year and list; ask the server per year if the archive grows large.
 */
export async function getArchive(viewer?: SessionUser): Promise<ArchiveView> {
  const [years, archive] = await Promise.all([
    schoolYears(),
    http.get<{
      years: Array<{ label: string; from: string; to: string }>
      defaultYear: string | null
    }>('/archive/years'),
  ])
  const labels = archive.years.map((year) => year.label)
  const staffToo = viewer?.role !== 'admin'
  const [students, staff] = await Promise.all([
    Promise.all(labels.map((label) => archivedRows('students', label))),
    staffToo ? Promise.all(labels.map((label) => archivedRows('staff', label))) : [],
  ])
  return {
    settings: withStarts(years),
    current: toSchoolYear(years),
    step: years.step,
    currentStartedBy: years.current.startedBy,
    currentEndedBy: years.current.endedBy,
    years: archive.years.map(({ label, from, to }) => ({ label, from, to })),
    defaultYear: archive.defaultYear,
    students: students.flat(),
    staff: staff.flat(),
  }
}
