import { getRecordedAuditEntries } from '../lib/mock-db'

/**
 * Audit entries written since the reset, without the record views. Opening a profile or an incident
 * report is logged for both roles (ADR-048), so a test about what a screen wrote leaves views out.
 */
export function recordedWrites() {
  return getRecordedAuditEntries().filter((entry) => entry.actionType !== 'view')
}
