import {
  listAuditLog,
  listAuditLogForPrint,
  type AuditLogList,
  type AuditLogQuery,
} from '../../../lib/data'

/** Screen #35 reads only through the mock data-access layer (ADR-014). */
export type { AuditLogList, AuditLogQuery }

export function fetchAuditLog(query: AuditLogQuery): Promise<AuditLogList> {
  return listAuditLog(query)
}

/** The same entries with full LRNs, for the Staff printout only (ADR-044, ADR-080). */
export function fetchAuditLogForPrint(query: AuditLogQuery): Promise<AuditLogList> {
  return listAuditLogForPrint(query)
}
