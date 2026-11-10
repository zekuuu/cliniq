import { listAuditLog, type AuditLogList, type AuditLogQuery } from '../../../lib/mock-db'

/** Screen #35 reads only through the mock data-access layer (ADR-014). */
export type { AuditLogList, AuditLogQuery }

export function fetchAuditLog(query: AuditLogQuery): Promise<AuditLogList> {
  return listAuditLog(query)
}
