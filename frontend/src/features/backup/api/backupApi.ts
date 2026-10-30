import {
  getBackupStatus,
  listBackupLocations,
  recordBackupNow,
  saveBackupLocation,
  setBackupLocationEnabled,
  verifyLatestBackup,
  type BackupLocation,
  type BackupLocationInput,
  type BackupLocationSettings,
  type BackupStatusView,
  type SessionUser,
} from '../../../lib/mock-db'

/**
 * Backup Verification (#32). Which run is latest, and whether it still needs checking, are derived
 * from the backup log on every read.
 */
export type { BackupStatusView }

/** Fired after a backup is recorded or verified, so the sidebar's warning badge refreshes. */
export const BACKUP_CHANGED_EVENT = 'cliniq:backup-changed'

async function announce(change: Promise<BackupStatusView>): Promise<BackupStatusView> {
  const status = await change
  window.dispatchEvent(new CustomEvent(BACKUP_CHANGED_EVENT))
  return status
}

export function fetchBackupStatus(): Promise<BackupStatusView> {
  return getBackupStatus()
}

/** Recording a verification is an audited update. */
export function verifyBackup(actor?: SessionUser): Promise<BackupStatusView> {
  return announce(verifyLatestBackup(actor))
}

/** "Back up now" to every enabled location. In the mock layer it records the run; the real job is backend-phase work. */
export function backUpNow(actor?: SessionUser): Promise<BackupStatusView> {
  return announce(recordBackupNow(actor))
}

/** Backup locations (ADR-052). */
export function fetchBackupLocations(): Promise<BackupLocationSettings> {
  return listBackupLocations()
}

export function saveLocation(input: BackupLocationInput, options: { id?: string; actor?: SessionUser }): Promise<BackupLocation> {
  return saveBackupLocation(input, options)
}

/** Disabling or enabling changes which backup the stale warning reads, so the sidebar refreshes too. */
export async function setLocationEnabled(id: string, enabled: boolean, actor?: SessionUser): Promise<BackupLocation> {
  const location = await setBackupLocationEnabled(id, enabled, actor)
  window.dispatchEvent(new CustomEvent(BACKUP_CHANGED_EVENT))
  return location
}
