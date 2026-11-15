import type {
  AuditLogList,
  AuditLogQuery,
  MonthlyReportData,
  PrintAuditRecord,
  SessionUser,
} from '../../mock-db'
import { http } from '../client'

/**
 * AUDIT in API mode (S6 and S7; API-Contract.md "Audit and shared actions"). Reading the log writes
 * nothing (ADR-016). A record view is audited once per record per sign-in by the server.
 */

export function listAuditLog(query: AuditLogQuery): Promise<AuditLogList> {
  return http.get('/audit-log', { query: auditQuery(query) })
}

function auditQuery(query: AuditLogQuery) {
  return {
    from: query.from,
    to: query.to,
    userId: query.userId || undefined,
    actionTypes: [...query.actionTypes],
    targetTypes: [...query.targetTypes],
  }
}

export async function recordView(target: {
  type: 'student' | 'staff' | 'incident'
  id: string
}): Promise<void> {
  await http.post('/audit/views', { type: target.type, id: Number(target.id) })
}

/** The screen titles of the printouts, and the server's fixed document keys (contract Q18). */
const PRINT_KEYS: Record<string, string> = {
  'Audit Log': 'audit-log',
  'CLINIQ recovery codes': 'recovery-codes',
  'Clinic Excuse Letter': 'excuse-letter',
  'Incident Report': 'incident-report',
  'Sports Report': 'sports-report',
  'Student Health Record': 'student-health-record',
  'Visit Details': 'visit-details',
  'Student profile': 'student-profile',
  'Symptom summary': 'symptom-summary',
  'Incident register': 'incident-register',
  'Monthly Clinic Report': 'monthly-clinic-report',
  'Monthly Inventory': 'monthly-inventory',
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** "November 2026" to "2026-11"; anything else to undefined. */
function monthKey(label: string | undefined): string | undefined {
  const [name, year] = (label ?? '').split(' ')
  const index = MONTHS.indexOf(name)
  return index >= 0 && /^\d{4}$/.test(year ?? '')
    ? `${year}-${String(index + 1).padStart(2, '0')}`
    : undefined
}

/**
 * A print that already fetched its full LRN (`fullLrn=1`) was audited by that request; the browser's
 * print event must not add a second entry (Zean, Sunday, November 15, 2026, ADR-080).
 */
let printAlreadyAudited = false

export function notePrintAudited(): void {
  printAlreadyAudited = true
}

export async function recordPrint(
  documentTitle: string,
  _actor?: SessionUser,
  record?: PrintAuditRecord,
): Promise<void> {
  if (printAlreadyAudited) {
    printAlreadyAudited = false
    return
  }
  const [base, month] = documentTitle.split(' — ')
  const document = PRINT_KEYS[base] ?? PRINT_KEYS[base.replace(/^\S+ summary$/, 'Symptom summary')]
  if (!document) return
  await http.post('/audit/prints', {
    document,
    month: monthKey(month),
    record: record ? { type: record.type, id: Number(record.id) } : undefined,
  })
}

/** The Monthly report with full LRNs for the Staff printout (ADR-044); the request is the print entry. */
export async function getMonthlyReportForPrint(month: string): Promise<MonthlyReportData> {
  const report = await http.get<MonthlyReportData>('/reports/monthly', {
    query: { month, fullLrn: 1 },
  })
  notePrintAudited()
  return report
}

/** The Audit Log with full LRNs for its printout; the request is the print entry. */
export async function listAuditLogForPrint(query: AuditLogQuery): Promise<AuditLogList> {
  const list = await http.get<AuditLogList>('/audit-log', {
    query: { ...auditQuery(query), fullLrn: 1 },
  })
  notePrintAudited()
  return list
}
