import { getBackupStatus, recordBackupNow, verifyLatestBackup, type BackupStatusView, type SessionUser } from '../../../lib/mock-db'

/**
 * Backup Verification (#32). Which run is latest, and whether it still needs checking, are derived
 * from the backup log on every read.
 */
export type { BackupStatusView }

export function fetchBackupStatus(): Promise<BackupStatusView> {
  return getBackupStatus()
}

/** Recording a verification is an audited update. */
export function verifyBackup(actor?: SessionUser): Promise<BackupStatusView> {
  return verifyLatestBackup(actor)
}

/** "Back up now". In the mock layer it records a successful run; the real job is backend-phase work. */
export function backUpNow(actor?: SessionUser): Promise<BackupStatusView> {
  return recordBackupNow(actor)
}
