import type {
  AuditLogEntry,
  BackupLog,
  Disposition,
  ExcuseLetterDraft,
  FollowUp,
  HospitalReferral,
  Incident,
  InventoryItem,
  InventoryBatchAllocation,
  ISODate,
  ISODateTime,
  ParentNotificationAttempt,
  Report,
  Student,
  StudentNumber,
  User,
  UserRole,
  Visit,
} from '../../types/entities'

/**
 * Types for `mock-db.json` (the seed) and for the resolved in-memory store.
 *
 * The seed is the §5 entity shapes from `types/entities.ts` with exactly three kinds of change:
 * 1. Dates are relative to "today" (`{ daysAgo }` / `{ daysFromNow }`, plus `time` for timestamps),
 *    so the seed never goes stale. The data layer resolves them.
 * 2. Records point at students by `studentNumber` (ADR-005), not the internal `id`.
 * 3. Derived values are left out (`Student.recordComplete`, `Report.data`). Selectors compute them.
 * Everything else is the entity type itself, so a shape change in `types/entities.ts` breaks here.
 */

export type RelativeDate = { daysAgo: number } | { daysFromNow: number }
/** `time` is "HH:MM", Philippine time (UTC+8). */
export type RelativeDateTime = RelativeDate & { time: string }

type Replace<T, R> = Omit<T, keyof R> & R

export type SeedUser = Replace<User, { lastLogin: RelativeDateTime | null }>

export type SeedStudent = Omit<Student, 'recordComplete'>

export type SeedVisit = Omit<
  Replace<Visit, { dateTime: RelativeDateTime; excuseLetterDraft: ExcuseLetterDraft<RelativeDate> | null }>,
  'studentId'
> & {
  studentNumber: StudentNumber
}

export type SeedIncident = Omit<
  Replace<
    Incident,
    {
      time: RelativeDateTime
      hospitalReferral: Replace<HospitalReferral, { departureTime: RelativeDateTime }> | null
      parentNotifications: Array<Replace<ParentNotificationAttempt, { timestamp: RelativeDateTime }>>
    }
  >,
  'studentId'
> & { studentNumber: StudentNumber }

export type SeedFollowUp = Omit<Replace<FollowUp, { followUpDate: RelativeDate }>, 'studentId'> & {
  studentNumber: StudentNumber
}

/**
 * The JSON seed predates batch tracking. It is deliberately accepted in its old one-stock/one-date
 * shape and migrated to one batch by `resolveSeed`; persisted mock state follows the same path.
 */
export type SeedInventoryItem = Omit<InventoryItem, 'batches' | 'currentStock' | 'expirationDate'> & {
  currentStock: number
  expirationDate: RelativeDate | null
}

/** `data` is generated on read, so only the request (type + range) is stored. */
export type SeedReport = Omit<Report, 'data' | 'dateRange'> & {
  dateRange: { from: RelativeDate; to: RelativeDate }
}

export type SeedBackupLog = Replace<BackupLog, { lastRun: RelativeDateTime }>

export type SeedAuditLogEntry = Replace<AuditLogEntry, { timestamp: RelativeDateTime }>

/**
 * OPEN PRODUCT DECISIONS: thresholds and windows. None is defined in the requirements; the values
 * were carried over from the Dashboard mock. See ADR-014.
 */
export interface MockDbConfig {
  /** Visits within the window that raise the frequent-visitor warning. */
  frequentVisitorMinVisits: number
  /** Default window when a caller doesn't pass a date range (the Dashboard passes its own). */
  frequentVisitorWindowDays: number
  /** How many days ahead a pending follow-up counts as "upcoming". */
  upcomingFollowUpDays: number
  /** Days before the expiration date that an item counts as "nearing expiration". */
  expiryWarningDays: number
  /** Complaint count in one trend bucket that can count as a possible symptom cluster... */
  clusterMinCount: number
  /** ...when it's at least this multiple of that complaint's average in the other buckets. */
  clusterRatio: number
  /** How many top complaints the trend chart draws (the rest go in its table). */
  topComplaints: number
  /**
   * Incident vitals outside these ranges get a "please check" warning that never blocks saving.
   * PLACEHOLDER sanity bounds, not clinical thresholds: the nurse sets the real ones.
   */
  vitalsWarningRanges: VitalsWarningRanges
}

export interface VitalRange {
  min: number
  max: number
}

export interface VitalsWarningRanges {
  temperatureC: VitalRange
  pulseBpm: VitalRange
}

// ---- frontendOnly: MOCK-ONLY data that §5 doesn't define. Not a schema. ----------------------

export interface DevAccount {
  userId: string
  /** Dev-only, obviously fake. Never a real credential. */
  password: string
  /** Exercises the Force Password Change screen (#2). */
  mustChangePassword: boolean
}

export interface ComplaintType {
  label: string
  /** Smart Triage checklist (#27). Empty = no checklist for this complaint. Guidance only. */
  triageSteps: string[]
}

export type InventoryTransactionType = 'dispense' | 'restock' | 'adjustment'

/**
 * Why an adjustment changed stock. `visit_edited` is written by the data layer when a saved visit's
 * medicine lines change; the rest are the Adjust Stock reasons Staff choose. PROVISIONAL (ADR-018).
 */
export type AdjustmentReason = 'visit_edited' | 'expired_disposed' | 'damaged_spilled' | 'miscount_correction' | 'other'

/**
 * Dispense/restock/adjustment history (Module 8, stock flow steps 2 and 4; ADR-018). History only:
 * never re-summed, and never rewritten. A correction is a new `adjustment` row.
 */
export interface InventoryTransaction<D = ISODateTime> {
  id: string
  itemId: string
  type: InventoryTransactionType
  /**
   * Dispense and restock: the amount moved, always positive. Adjustment: the signed change to stock
   * (+3 returns three to the shelf, -5 disposes of five).
   */
  quantity: number
  timestamp: D
  userId: string
  studentNumber: StudentNumber | null
  visitId: string | null
  /** Set when the dispense was part of an incident's Stage 2. PROVISIONAL (ADR-018). */
  incidentId?: string
  /** Adjustment only. PROVISIONAL (ADR-018). */
  reason?: AdjustmentReason
  /** Adjustment only: Staff's note; required when `reason` is `other`. PROVISIONAL (ADR-018). */
  note?: string | null
  /** Batches moved by this transaction. Old seed history has none and is migrated on load. */
  batchAllocations?: InventoryBatchAllocation[]
}

/** Registrar-import review tracking for the Incomplete Records queue (#9). */
export interface RecordReview<D = ISODate, T = ISODateTime> {
  studentNumber: StudentNumber
  importedAt: D
  importedBy: string
  resolvedByUserId: string | null
  resolvedAt: T | null
}

export interface ExcuseLetterApproval<T = ISODateTime, D = ISODate> {
  id: string
  visitId: string
  approvedByUserId: string
  approvedAt: T
  /** Excused period (provisional pending the ERD). Records dates only; no attendance integration. */
  excusedFrom: D
  excusedUntil: D
  /** Note for the teacher, snapshotted at approval (provisional pending the ERD). */
  note: string | null
}

export interface PeReferral<T = ISODateTime> {
  id: string
  studentNumber: StudentNumber
  referredByUserId: string
  activity: string
  injurySummary: string
  clinicalAssessment: string
  treatment: string
  disposition: Disposition
  createdAt: T
}

export interface IssueReport<T = ISODateTime> {
  id: string
  description: string
  route: string
  pageName: string
  role: UserRole
  reportedByUserId: string
  createdAt: T
}

/**
 * A school event Staff keep on the Dashboard calendar (Module 9, ADR-019). PROVISIONAL pending the
 * ERD. `endDate` is null for a one-day event and never before `startDate`.
 */
export interface CalendarEvent<D = ISODate, T = ISODateTime> {
  id: string
  title: string
  startDate: D
  endDate: D | null
  createdByUserId: string
  createdAt: T
  updatedAt: T
}

export interface SeedFrontendOnly {
  _note: string
  devAccounts: DevAccount[]
  visitComplaintTypes: ComplaintType[]
  incidentComplaintTypes: string[]
  inventoryTransactions: Array<InventoryTransaction<RelativeDateTime>>
  recordReviews: Array<RecordReview<RelativeDate, RelativeDateTime>>
  excuseLetterApprovals: Array<ExcuseLetterApproval<RelativeDateTime, RelativeDate>>
  peReferrals: Array<PeReferral<RelativeDateTime>>
  issueReports: Array<IssueReport<RelativeDateTime>>
  calendarEvents: Array<CalendarEvent<RelativeDate, RelativeDateTime>>
}

export interface MockDbSeed {
  meta: Record<string, string>
  config: MockDbConfig & { _note?: string }
  users: SeedUser[]
  students: SeedStudent[]
  visits: SeedVisit[]
  incidents: SeedIncident[]
  followUps: SeedFollowUp[]
  inventoryItems: SeedInventoryItem[]
  reports: SeedReport[]
  backupLogs: SeedBackupLog[]
  auditLog: SeedAuditLogEntry[]
  frontendOnly: SeedFrontendOnly
}

// ---- Resolved store: absolute dates, internal ids, §5 shapes. --------------------------------

export interface FrontendOnlyState {
  devAccounts: DevAccount[]
  visitComplaintTypes: ComplaintType[]
  incidentComplaintTypes: string[]
  inventoryTransactions: InventoryTransaction[]
  recordReviews: RecordReview[]
  excuseLetterApprovals: ExcuseLetterApproval[]
  peReferrals: PeReferral[]
  issueReports: IssueReport[]
  calendarEvents: CalendarEvent[]
}

/** Raw records only. `Student` here never carries `recordComplete`; selectors add it on read. */
export interface DbState {
  today: ISODate
  config: MockDbConfig
  users: User[]
  students: SeedStudent[]
  visits: Visit[]
  incidents: Incident[]
  followUps: FollowUp[]
  inventoryItems: InventoryItem[]
  reports: Array<Omit<Report, 'data'>>
  backupLogs: BackupLog[]
  auditLog: AuditLogEntry[]
  frontendOnly: FrontendOnlyState
}
