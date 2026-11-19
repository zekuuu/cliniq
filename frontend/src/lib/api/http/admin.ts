import {
  AccountPermissionError,
  type BackupDrive,
  type BackupLocation,
  type BackupLocationInput,
  type BackupLocationSettings,
  type BackupStatusView,
  type ComplaintType,
  type IssueReport,
  type IssueReportInput,
  type UserInput,
  type VitalsWarningRanges,
} from '../../mock-db'
import type { User } from '../../../types/entities'
import { http } from '../client'
import { queryClient } from '../../queryClient'
import { mapped } from '../errors'

/**
 * USERS, BACKUP, ISSUE_REPORTS and REFERENCE in API mode (S7; API-Contract.md "User Management",
 * "Backup Verification", "Audit and shared actions", "Reference data"). SETTINGS (the idle limits)
 * is in `auth.ts`, AUDIT in `audit.ts`.
 */

// --- Accounts (ADR-033): the Admin writes, Staff read names ---

const ADMIN_ONLY = { forbidden: () => new AccountPermissionError() }

export function listUsers(): Promise<User[]> {
  return http.get('/users')
}

export function getPrincipalName(): Promise<string | null> {
  return http.get('/users/principal-name')
}

export function getUser(id: string): Promise<User> {
  return http.get(`/users/${encodeURIComponent(id)}`)
}

export function saveUser(input: UserInput, options: { userId?: string } = {}): Promise<User> {
  const save = options.userId
    ? http.put<User>(`/users/${encodeURIComponent(options.userId)}`, input)
    : http.post<User>('/users', input)
  return mapped(save, ADMIN_ONLY)
}

export function setUserActive(userId: string, active: boolean): Promise<User> {
  return mapped(http.put(`/users/${encodeURIComponent(userId)}/active`, { active }), ADMIN_ONLY)
}

export async function resetUserPassword(userId: string, temporaryPassword: string): Promise<void> {
  await mapped(
    http.post(`/users/${encodeURIComponent(userId)}/reset-password`, { temporaryPassword }),
    ADMIN_ONLY,
  )
}

// --- Backup (ADR-037, ADR-052): both roles ---

export function getBackupStatus(): Promise<BackupStatusView> {
  return http.get('/backups/status')
}

export function verifyLatestBackup(): Promise<BackupStatusView> {
  return http.post('/backups/verify-latest')
}

export function recordBackupNow(): Promise<BackupStatusView> {
  return http.post('/backups/run')
}

export function listBackupFolders(
  path: string,
): Promise<{ drives: BackupDrive[]; folders: string[] }> {
  return http.get('/backups/folders', { query: { path } })
}

export function listBackupLocations(): Promise<BackupLocationSettings> {
  return http.get('/backups/locations')
}

export function saveBackupLocation(input: BackupLocationInput): Promise<BackupLocation> {
  return http.post('/backups/locations', { label: input.label, path: input.path })
}

export function setBackupLocationEnabled(id: string, enabled: boolean): Promise<BackupLocation> {
  return http.put(`/backups/locations/${encodeURIComponent(id)}/enabled`, { enabled })
}

// --- Issue reports ---

export function createIssueReport(input: IssueReportInput): Promise<IssueReport> {
  return http.post('/issue-reports', input)
}

export function listIssueReports(): Promise<IssueReport[]> {
  return http.get('/issue-reports')
}

// --- Reference lists: the screens stop reading the mock's constants on the API ---

export function getVisitComplaintTypes(): Promise<ComplaintType[]> {
  return visitComplaintTypes<ComplaintType>()
}

/**
 * One read of the visit complaint types shared by every caller for a minute (the inventory adapter
 * reads them too). A fixed reference list; two reads on one screen were a waste (ADR-082).
 */
export function visitComplaintTypes<T>(): Promise<T[]> {
  return queryClient.fetchQuery({
    queryKey: ['reference', 'visit-complaint-types'],
    queryFn: () => http.get<T[]>('/reference/visit-complaint-types'),
    staleTime: 60_000,
  })
}

export function getVisitComplaintSuggestions(): Promise<string[]> {
  return http.get('/reference/visit-complaint-suggestions')
}

export function getIncidentComplaintTypes(): Promise<string[]> {
  return http.get('/reference/incident-complaint-types')
}

export function getVitalsWarningRanges(): Promise<VitalsWarningRanges> {
  return http.get('/reference/vitals-ranges')
}

export function getMedicalCertificateAfterDays(): Promise<number> {
  return http.get('/reference/medical-certificate-after-days')
}

export function getUnusualAgeYears(): Promise<number> {
  return http.get('/reference/unusual-age-years')
}

export function getLargeWriteOffPercent(): Promise<number> {
  return http.get('/reference/large-write-off-percent')
}

export function getGradeLevels(): Promise<string[]> {
  return http.get('/reference/grade-levels')
}

export function getPersonnelTypes(): Promise<string[]> {
  return http.get('/reference/personnel-types')
}

export function getPersonnelDepartments(): Promise<Record<string, string[]>> {
  return http.get('/reference/personnel-departments')
}
