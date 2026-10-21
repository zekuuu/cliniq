import type { FollowUpDueState } from '../../components/status/followUp'
import type { InventoryFlag } from '../../components/status/inventory'
import { addDays, diffDays, formatDateTime, isWithin } from '../dates'
import { maskLrn, STUDENT_SEARCH_MIN_LENGTH } from '../lrn'
import type {
  AuditActionType,
  AuditLogEntry,
  BackupLog,
  FollowUp,
  ISODate,
  InventoryItem,
  Student,
  StudentListRef,
  StudentSearchResult,
  UserRole,
} from '../../types/entities'
import type { DbState, RecordReview, SeedStudent } from './types'

/**
 * SELECTORS: every derived value the screens show is computed here, from raw records, on every
 * read. Nothing below is stored in `mock-db.json`, and no component recomputes any of it. That's
 * what keeps every screen in sync: change a raw record and every count, flag, and status follows.
 *
 * All pure functions of (state, today, config), so they're unit-testable with a hand-built state.
 */

export const dateOf = (timestamp: string): ISODate => timestamp.slice(0, 10)

// ---- Audit log ------------------------------------------------------------------------------

export const auditTargetTypes = [
  'student',
  'visit',
  'incident',
  'inventory',
  'user',
  'report',
  'backup',
  'follow-up',
  'calendar-event',
  'sports-report',
] as const

export type AuditTargetType = (typeof auditTargetTypes)[number]

export interface AuditLogQuery {
  from: ISODate
  to: ISODate
  userId: string
  actionTypes: ReadonlyArray<AuditActionType>
  targetTypes: ReadonlyArray<AuditTargetType>
}

export interface AuditLogRow {
  id: string
  timestamp: ISODate
  dateTime: string
  userId: string
  userName: string
  userRole: UserRole | null
  actionType: AuditActionType
  /** What changed, by field name only (never values); absent when the action and target say it all. */
  summary?: string
  target: {
    /** Filter/module bucket. */
    type: AuditTargetType
    /** The exact record kind as recorded, e.g. `incident-stage-2` or `excuse-letter`. */
    recordType: string
    /** Display word for the kind of record, e.g. "Incident" or "Excuse letter". */
    kind: string
    id: string
    /** Short identifier shown beside the kind (masked LRN, item or report name); may be empty. */
    label: string
    /** Set for a student-related record: links to that student's profile (by internal id). */
    studentId?: string
  } | null
}

export interface AuditLogList {
  rows: AuditLogRow[]
  users: Array<{ id: string; name: string }>
}

function auditTargetType(target: NonNullable<AuditLogEntry['targetRecord']>): AuditTargetType {
  if (target.type.startsWith('inventory')) return 'inventory'
  if (target.type === 'followup') return 'follow-up'
  // Incident stage saves and sign-offs are recorded against the incident itself.
  if (target.type.startsWith('incident-stage') || target.type === 'incident-report') return 'incident'
  if (auditTargetTypes.includes(target.type as AuditTargetType)) return target.type as AuditTargetType
  return 'report'
}

const AUDIT_RECORD_KINDS: Record<string, string> = {
  student: 'Student',
  visit: 'Visit',
  incident: 'Incident',
  'incident-stage-1': 'Incident',
  'incident-stage-2': 'Incident',
  'incident-report': 'Incident report',
  'incident-escalation': 'Incident escalation',
  'parent-notification': 'Parent notification',
  'excuse-letter': 'Excuse letter',
  'pe-sports-referral': 'PE/Sports referral',
  inventory: 'Inventory',
  'inventory-restock': 'Inventory',
  'inventory-dispense': 'Inventory',
  'inventory-dispensation': 'Inventory',
  'inventory-adjustment': 'Inventory',
  user: 'User',
  'follow-up': 'Follow-up',
  followup: 'Follow-up',
  report: 'Report',
  backup: 'Backup',
  'issue-report': 'Issue report',
  'calendar-event': 'Calendar event',
  'sports-report': 'Sports Report',
  'print-document': 'Printed document',
}

const REPORT_NAMES: Record<string, string> = {
  monthly: 'Monthly report',
  incident: 'Incident report archive',
  health_summary: 'Health summary',
}

/**
 * A short, privacy-safe identifier for an audited record, shown beside its kind ("Visit · ••••••••0009").
 * Internal ids (`visit-0001`) never reach the screen, and students appear only by masked LRN (ADR-028).
 * A human-facing reference number is a backend-phase follow-up (Issues-and-TODOs.md).
 */
function auditTargetIdentifier(state: DbState, target: NonNullable<AuditLogEntry['targetRecord']>, type: AuditTargetType): { label: string; studentId?: string } {
  const students = studentsById(state)
  const studentId =
    type === 'student'
      ? target.id
      : type === 'visit'
        ? state.visits.find((item) => item.id === target.id)?.studentId
        : type === 'incident'
          ? state.incidents.find((item) => item.id === target.id)?.studentId
          : type === 'follow-up'
            ? state.followUps.find((item) => item.id === target.id)?.studentId
            : undefined
  if (studentId !== undefined) {
    const student = students.get(studentId)
    return student ? { label: maskLrn(student.lrn), studentId } : { label: '' }
  }
  if (type === 'inventory') return { label: state.inventoryItems.find((item) => item.id === target.id)?.name ?? '' }
  if (type === 'user') return { label: state.users.find((user) => user.id === target.id)?.name ?? '' }
  if (type === 'sports-report') return { label: state.frontendOnly.sportsReports.find((report) => report.id === target.id)?.title ?? '' }
  if (type === 'calendar-event') return { label: state.frontendOnly.calendarEvents.find((event) => event.id === target.id)?.title ?? '' }
  if (target.type === 'report') return { label: REPORT_NAMES[target.id] ?? '' }
  if (target.type === 'print-document') return { label: target.id }
  if (target.type === 'backup') return { label: /^\d{4}-\d{2}-\d{2}T/.test(target.id) ? formatDateTime(target.id) : '' }
  return { label: '' }
}

function auditTarget(state: DbState, target: NonNullable<AuditLogEntry['targetRecord']>): NonNullable<AuditLogRow['target']> {
  const type = auditTargetType(target)
  return { type, recordType: target.type, kind: AUDIT_RECORD_KINDS[target.type] ?? 'Record', id: target.id, ...auditTargetIdentifier(state, target, type) }
}

/** Resolves audit actors and privacy-safe targets before a screen can render them. */
export function auditLogList(state: DbState, query: AuditLogQuery): AuditLogList {
  const usersById = new Map(state.users.map((user) => [user.id, user]))
  const rows = state.auditLog
    .map((entry, index): AuditLogRow => ({
      id: `${entry.timestamp}|${entry.userId}|${entry.actionType}|${index}`,
      timestamp: dateOf(entry.timestamp),
      dateTime: entry.timestamp,
      userId: entry.userId,
      userName: usersById.get(entry.userId)?.name ?? 'Unknown user',
      userRole: usersById.get(entry.userId)?.role ?? null,
      actionType: entry.actionType,
      ...(entry.summary ? { summary: entry.summary } : {}),
      target: entry.targetRecord ? auditTarget(state, entry.targetRecord) : null,
    }))
    .filter((row) => row.timestamp >= query.from && row.timestamp <= query.to)
    .filter((row) => !query.userId || row.userId === query.userId)
    .filter((row) => query.actionTypes.length === 0 || query.actionTypes.includes(row.actionType))
    .filter((row) => query.targetTypes.length === 0 || (row.target && query.targetTypes.includes(row.target.type)))
    .sort((a, b) => b.dateTime.localeCompare(a.dateTime))
  return { rows, users: state.users.map((user) => ({ id: user.id, name: user.name })).sort((a, b) => a.name.localeCompare(b.name)) }
}

// ---- Students ------------------------------------------------------------------------------

/**
 * Required fields per Module 2 ("full name, grade level, emergency contact, allergies,
 * conditions"). OPEN QUESTION: `allergies`/`medicalConditions` are string arrays, and an empty
 * array can't tell "none" from "not yet recorded", so those two can't be checked until the API
 * contract distinguishes them. Contact info is checked because the Registrar import can omit it.
 */
export function missingRequiredFields(student: SeedStudent): string[] {
  const missing: string[] = []
  if (!student.fullName.trim()) missing.push('Full name')
  if (!student.gradeLevel.trim()) missing.push('Grade level')
  if (student.sex !== 'male' && student.sex !== 'female') missing.push('Sex')
  if (!student.contactInfo.trim()) missing.push('Student contact information')
  if (!student.emergencyContacts.length) missing.push('Emergency contact')
  student.emergencyContacts.forEach((contact, index) => {
    const prefix = student.emergencyContacts.length === 1 ? 'Emergency contact' : `Emergency contact ${index + 1}`
    if (!contact.name.trim()) missing.push(`${prefix} name`)
    if (!contact.relationship.trim()) missing.push(`${prefix} relationship`)
    if (!contact.phone.trim()) missing.push(`${prefix} phone`)
  })
  return missing
}

/** The §5 `Student` shape, with `recordComplete` derived rather than stored. */
export function toStudent(student: SeedStudent): Student {
  return { ...student, sex: student.sex ?? 'female', recordComplete: missingRequiredFields(student).length === 0 }
}

export function toListRef(student: Pick<Student, 'id' | 'lrn'>): StudentListRef {
  // Only id + LRN leave this function. The name is dropped on purpose (ADR-004).
  return { id: student.id, lrn: student.lrn }
}

export function studentsById(state: DbState): Map<string, SeedStudent> {
  return new Map(state.students.map((s) => [s.id, s]))
}

export function activeStudents(state: DbState): SeedStudent[] {
  return state.students.filter((s) => !s.archived)
}

/**
 * Active students whose LRN starts with the typed digits or whose name contains the query, ignoring
 * case. Spaces and dashes in a typed LRN are ignored. LRN matches come first, then by name. Capped,
 * so a search never reads as a roster (ADR-028).
 */
export function searchStudents(state: DbState, query: string, limit = 8): StudentSearchResult[] {
  const q = query.trim().toLowerCase()
  if (q.length < STUDENT_SEARCH_MIN_LENGTH) return []
  const digits = q.replace(/[\s-]/g, '')
  // Only a query of digits, spaces and dashes can be an LRN; "an-" stays a name search.
  const lrnQuery = /^[\d\s-]+$/.test(q) && digits.length > 0
  return activeStudents(state)
    .map((s) => ({ s, byLrn: lrnQuery && s.lrn.startsWith(digits) }))
    .filter(({ s, byLrn }) => byLrn || s.fullName.toLowerCase().includes(q))
    .sort((a, b) => Number(b.byLrn) - Number(a.byLrn) || a.s.fullName.localeCompare(b.s.fullName))
    .slice(0, limit)
    .map(({ s }) => ({ id: s.id, lrn: s.lrn, fullName: s.fullName, gradeLevel: s.gradeLevel }))
}

/**
 * The New Visit complaint suggestions: the predefined visit complaint types plus every complaint
 * already saved on a visit, merged case-insensitively (a predefined type keeps its own spelling,
 * otherwise the most recent spelling wins). Ranked by how many visits used it, then by how recently;
 * never-used predefined types come last, alphabetically.
 */
export function complaintSuggestions(state: DbState): string[] {
  const pool = new Map<string, { label: string; count: number; last: string; predefined: boolean }>()
  for (const { label } of state.frontendOnly.visitComplaintTypes)
    pool.set(label.toLowerCase(), { label, count: 0, last: '', predefined: true })
  for (const v of state.visits) {
    const label = v.complaint.trim()
    if (!label) continue
    const key = label.toLowerCase()
    const entry = pool.get(key) ?? { label, count: 0, last: '', predefined: false }
    entry.count += 1
    if (v.dateTime > entry.last) {
      entry.last = v.dateTime
      if (!entry.predefined) entry.label = label
    }
    pool.set(key, entry)
  }
  return [...pool.values()]
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last) || a.label.localeCompare(b.label))
    .map((entry) => entry.label)
}

/** School order: Kinder comes before Grade 1, not alphabetically after Grade 12. */
export function compareGradeLevels(a: string, b: string): number {
  const rank = (level: string) => (level === 'Kinder' ? 0 : 1)
  return rank(a) - rank(b) || a.localeCompare(b, undefined, { numeric: true })
}

export function gradeLevels(state: DbState): string[] {
  const levels = new Set(state.students.map((s) => s.gradeLevel).filter(Boolean))
  return [...levels].sort(compareGradeLevels)
}

// ---- Incomplete Records Review Queue (#9) ---------------------------------------------------

export interface IncompleteRecordRow {
  student: Student
  missingFields: string[]
  review: RecordReview | null
  status: 'open' | 'resolved'
}

/**
 * Queue rows: every active student whose record is currently incomplete, plus records Staff has
 * marked resolved. "Open" = incomplete and not yet resolved. The Dashboard's pending-records card
 * counts exactly these open rows, so the two screens can't disagree.
 */
export function incompleteRecordQueue(state: DbState): IncompleteRecordRow[] {
  const reviews = new Map(state.frontendOnly.recordReviews.map((r) => [r.studentId, r]))
  return activeStudents(state).flatMap((student) => {
    const missingFields = missingRequiredFields(student)
    const review = reviews.get(student.id) ?? null
    const resolved = Boolean(review?.resolvedAt)
    if (!missingFields.length && !resolved) return []
    return [{ student: toStudent(student), missingFields, review, status: resolved ? 'resolved' : 'open' }]
  })
}

export function pendingRecordCount(state: DbState): number {
  return incompleteRecordQueue(state).filter((row) => row.status === 'open').length
}

// ---- Frequent visitors ---------------------------------------------------------------------

export interface FrequentVisitor {
  student: StudentListRef
  visitCount: number
}

/**
 * Students at or over `frequentVisitorMinVisits` in the range. Without a range, the default window
 * is the last `frequentVisitorWindowDays` days. A warning only, never a diagnosis (Module 9).
 */
export function frequentVisitors(state: DbState, range?: { from: ISODate; to: ISODate }): FrequentVisitor[] {
  const { from, to } = range ?? {
    from: addDays(state.today, -(state.config.frequentVisitorWindowDays - 1)),
    to: state.today,
  }
  const byId = studentsById(state)
  const counts = new Map<string, number>()
  for (const v of state.visits)
    if (isWithin(dateOf(v.dateTime), from, to)) counts.set(v.studentId, (counts.get(v.studentId) ?? 0) + 1)
  return [...counts.entries()]
    .filter(([, n]) => n >= state.config.frequentVisitorMinVisits)
    .flatMap(([id, visitCount]) => {
      const student = byId.get(id)
      return student ? [{ student: toListRef(student), visitCount }] : []
    })
    .sort((a, b) => b.visitCount - a.visitCount || a.student.lrn.localeCompare(b.student.lrn))
}

// ---- Follow-ups ------------------------------------------------------------------------------

/** How close a *pending* follow-up is to its date, relative to today. Null once it's resolved. */
export function followUpDueState(followUp: FollowUp, today: ISODate): FollowUpDueState | null {
  if (followUp.status !== 'pending') return null
  const days = diffDays(today, followUp.followUpDate)
  return days < 0 ? 'overdue' : days === 0 ? 'due_today' : 'upcoming'
}

/** Pending follow-ups due on or before today + the upcoming window (overdue ones stay listed). */
export function dueFollowUps(state: DbState): FollowUp[] {
  const horizon = addDays(state.today, state.config.upcomingFollowUpDays)
  return state.followUps
    .filter((f) => f.status === 'pending' && f.followUpDate <= horizon)
    .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate))
}

// ---- Inventory -------------------------------------------------------------------------------

export interface InventoryStatus {
  flags: InventoryFlag[]
  /** Usable, non-expired stock. Kept as `currentStock` for existing screen consumers. */
  currentStock: number
  expiredStock: number
  totalOnHand: number
  /** Earliest usable expiry, or null for a non-expiring item/no usable stock. */
  expirationDate: ISODate | null
  oldestExpiredDate: ISODate | null
  /** Negative = already expired; null if no usable batch expires. */
  daysUntilExpiry: number | null
  belowZero: boolean
}

/**
 * Low stock = strictly below the threshold (OPEN QUESTION: "at" the threshold isn't specified).
 * Low-stock and expiry flags are independent and can both apply (Module 8, stock flow step 5).
 */
export function inventoryStatus(item: InventoryItem, today: ISODate, expiryWarningDays: number): InventoryStatus {
  const expired = item.batches.filter((batch) => batch.quantity > 0 && batch.expirationDate !== null && batch.expirationDate < today)
  const usable = item.batches.filter((batch) => !(batch.expirationDate !== null && batch.expirationDate < today))
  const datedUsable = usable.filter((batch) => batch.quantity > 0 && batch.expirationDate !== null)
  const expirationDate = datedUsable.map((batch) => batch.expirationDate!).sort()[0] ?? null
  const oldestExpiredDate = expired.map((batch) => batch.expirationDate!).sort()[0] ?? null
  const daysUntilExpiry = expirationDate ? diffDays(today, expirationDate) : null
  const currentStock = usable.reduce((sum, batch) => sum + batch.quantity, 0)
  const expiredStock = expired.reduce((sum, batch) => sum + batch.quantity, 0)
  const flags: InventoryFlag[] = []
  if (currentStock < item.lowStockThreshold) flags.push('low_stock')
  if (expiredStock > 0) flags.push('expired')
  else if (daysUntilExpiry !== null && daysUntilExpiry <= expiryWarningDays) flags.push('nearing_expiration')
  return {
    flags,
    currentStock,
    expiredStock,
    totalOnHand: item.batches.reduce((sum, batch) => sum + batch.quantity, 0),
    expirationDate,
    oldestExpiredDate,
    daysUntilExpiry,
    belowZero: item.batches.some((batch) => batch.quantity < 0),
  }
}

export function inventoryStatusFor(state: DbState, item: InventoryItem): InventoryStatus {
  return inventoryStatus(item, state.today, state.config.expiryWarningDays)
}

export function lowStockCount(state: DbState): number {
  return state.inventoryItems.filter((i) => inventoryStatusFor(state, i).flags.includes('low_stock')).length
}

// ---- Backups -------------------------------------------------------------------------------

export interface BackupStatus {
  latest: BackupLog | null
  /** The latest run succeeded but nobody has checked it yet. */
  needsVerification: boolean
  /** The most recent failed run, if the latest run isn't it. */
  recentFailure: BackupLog | null
  history: BackupLog[]
}

export function backupStatus(state: DbState): BackupStatus {
  const history = [...state.backupLogs].sort((a, b) => b.lastRun.localeCompare(a.lastRun))
  const latest = history[0] ?? null
  return {
    latest,
    needsVerification: Boolean(latest && latest.status === 'ok' && !latest.verifiedByUserId),
    recentFailure: history.find((b) => b.status === 'failed') ?? null,
    history,
  }
}

// ---- Reports ---------------------------------------------------------------------------------

/** `month` is "YYYY-MM". */
export function monthlyCounts(state: DbState, month: string) {
  return {
    visits: state.visits.filter((v) => v.dateTime.startsWith(month)).length,
    incidents: state.incidents.filter((i) => i.time.startsWith(month)).length,
    followUps: state.followUps.filter((f) => f.followUpDate.startsWith(month)).length,
  }
}
