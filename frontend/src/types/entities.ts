/**
 * Shared data entities, following CLINIQ_Frontend_Context_Brief.md §5 ("Data Entities the Frontend
 * Should Expect"). These are the frontend's contract with the future Laravel API. The ERD is a
 * proposed draft, not final or approved (see 02-Architecture/Database/ERD.md), so where §5 names a field without giving it a shape,
 * that field is marked PROVISIONAL below. Don't treat a PROVISIONAL field as a schema decision.
 */

/** Calendar date, `YYYY-MM-DD`. */
export type ISODate = string
/** Full timestamp, ISO 8601. */
export type ISODateTime = string
/** `YYYY-NNNNN` (enrollment year + zero-padded sequence). System-generated; see ADR-005. */
export type StudentNumber = string
/** Sex as recorded by the school; the agreed field is deliberately not a free-text identity question. */
export type StudentSex = 'male' | 'female'

export interface EmergencyContact {
  name: string
  /** PROVISIONAL: §5 only says "emergency contact". */
  relationship: string
  phone: string
  /** Module 2: a contact number can be marked verified/unverified. */
  verified: boolean
}

export interface Student {
  id: string
  studentNumber: StudentNumber
  fullName: string
  gradeLevel: string
  sex: StudentSex
  contactInfo: string
  allergies: string[]
  medicalConditions: string[]
  /** Ordered contacts; the first is the student's primary emergency contact. */
  emergencyContacts: EmergencyContact[]
  /** False when a required field is missing. This feeds the Incomplete Records Review Queue (#9). */
  recordComplete: boolean
  /** Archived students stay in the database but are excluded from active lists by default. */
  archived: boolean
}

/**
 * The only student fields a multi-student, glanceable list may carry (display-privacy rule,
 * ADR-004). There's no `fullName` here on purpose, so a list row can't render a name by accident.
 */
export type StudentListRef = Pick<Student, 'id' | 'studentNumber'>

/**
 * One result of a deliberate student search (a single lookup, so the name is shown): enough to
 * tell similar names apart, and nothing medical.
 */
export type StudentSearchResult = Pick<Student, 'id' | 'studentNumber' | 'fullName' | 'gradeLevel'>

export type UserRole = 'staff' | 'admin'

export interface User {
  id: string
  name: string
  username: string
  role: UserRole
  /** Optional staff-account avatar, stored as a resized data URL by the mock layer. Never a student image. */
  profilePicture?: string | null
  lastLogin: ISODateTime | null
}

export type Disposition = 'returned_to_class' | 'sent_home' | 'referred_to_hospital'

export interface Visit {
  id: string
  studentId: string
  dateTime: ISODateTime
  complaint: string
  treatment: string
  disposition: Disposition
  loggedByUserId: string
  /** Optional free text, e.g. "MCA Dance Program". This isn't a managed entity. */
  eventTag: string | null
  /**
   * Medicines and supplies given, each one backed by an inventory transaction. `treatment` stays
   * the free-text notes for care that isn't stock. PROVISIONAL: §5 gives Visit only `treatment`.
   */
  itemsGiven: ItemGivenLine[]
  /** Sent home or referred only: the excuse-letter values entered with the visit, until a letter is
   * approved. Approval moves them onto the letter and clears this. PROVISIONAL, pending the ERD. */
  excuseLetterDraft: ExcuseLetterDraft | null
  /** Referred to hospital only: where the student was referred. PROVISIONAL, pending the ERD. */
  referredTo: string | null
  /*
   * The clinic's daily logbook columns the Visit lacked (Issues-and-TODOs, "The clinic's two
   * logbooks"). All optional. PROVISIONAL, pending the ERD.
   */
  /** Body temperature in °C; the logbook says it can be left blank. */
  temperatureC: number | null
  /** "HH:MM" the student left the clinic, on the visit's date, never earlier than `dateTime`. */
  timeOut: string | null
  /** Free-text name of whoever assisted (may be a teacher with no account); `loggedByUserId` stays the signed-in user. */
  assistedBy: string | null
  /** Free-text name of the parent or guardian (Zean's reading of the logbook column; not yet confirmed by the clinician). */
  parentGuardian: string | null
  /** Free-text notes, "can be anything"; separate from `treatment`. */
  remarks: string | null
}

/** Excuse-letter values entered on a visit before approval. PROVISIONAL, pending the ERD. */
export interface ExcuseLetterDraft<D = ISODate> {
  excusedFrom: D
  excusedUntil: D
  /** Optional note for the teacher, printed on the letter. */
  note: string | null
}

/**
 * One medicine or supply given during a visit or incident. `itemName` and `unit` are a snapshot taken when the
 * line was first added, so renaming the item later doesn't rewrite history. PROVISIONAL, pending
 * the ERD.
 */
export interface ItemGivenLine {
  itemId: string
  itemName: string
  unit: string
  /** Whole number, at least 1. */
  quantity: number
  /** Optional, at most 120 characters, e.g. "1 tablet every 6 hours". */
  instructions: string | null
  /** Stock is taken from one or more non-expired batches. Kept so an edit returns it to the same batch. */
  batchAllocations?: InventoryBatchAllocation[]
}

export type ParentNotificationOutcome = 'reached' | 'not_reached' | 'voicemail' | 'left_message'

export interface ParentNotificationAttempt {
  outcome: ParentNotificationOutcome
  timestamp: ISODateTime
}

export interface HospitalReferral {
  destination: string
  transportMode: string
  departureTime: ISODateTime
}

export interface Incident {
  id: string
  studentId: string
  time: ISODateTime
  complaint: string
  /**
   * PROVISIONAL: §5 says "vitals" without listing fields. Pending the ERD. Every reading is optional
   * ("don't force all 4"); only the ones taken are stored: `temperatureC`, `pulseBpm`, `bloodPressure`,
   * `oxygenSaturationPct` (whole percent, 0 to 100). Stage 2 also keeps `treatmentNotes` here.
   */
  vitals: Record<string, string | number>
  hospitalReferral: HospitalReferral | null
  parentNotifications: ParentNotificationAttempt[]
  /** 1 = fast-capture (incomplete), 2 = complete. */
  stage: 1 | 2
  eventTag: string | null
  /**
   * Medicines and supplies given, recorded at Stage 2 (Stage 1 stays fast and has none). Each line
   * is backed by a dispense transaction that references the incident. PROVISIONAL, pending the ERD.
   */
  itemsGiven: ItemGivenLine[]
  /**
   * Optional free-text notes entered at Stage 1. Never required, so fast capture stays fast. Absent on
   * records saved before the field existed. PROVISIONAL, pending the ERD.
   */
  generalNotes?: string | null
}

export type FollowUpStatus = 'pending' | 'completed' | 'missed' | 'cancelled'

export interface FollowUp {
  id: string
  studentId: string
  relatedRecord: { type: 'visit' | 'incident'; id: string }
  followUpDate: ISODate
  reason: string
  status: FollowUpStatus
  notes: string | null
  createdByUserId: string
}

export type InventoryCategory = 'medicine' | 'supply'

export interface InventoryBatch {
  id: string
  /** Whole-number quantity remaining in this batch. */
  quantity: number
  expirationDate: ISODate | null
  receivedDate: ISODate
}

export interface InventoryBatchAllocation {
  batchId: string
  quantity: number
}

export interface InventoryItem {
  id: string
  name: string
  category: InventoryCategory
  unit: string
  /** Raw stock is held per received batch. Totals are derived by the data layer. */
  batches: InventoryBatch[]
  lowStockThreshold: number
  /** @deprecated Derived on `InventoryItemView`; retained only for transition compatibility. */
  currentStock?: number
  /** @deprecated Derived on `InventoryItemView`; retained only for transition compatibility. */
  expirationDate?: ISODate | null
}

export type ReportType = 'monthly' | 'incident' | 'health_summary'

export interface Report {
  type: ReportType
  dateRange: { from: ISODate; to: ISODate }
  /** PROVISIONAL: §5 says "generated file/data". */
  data: unknown
}

export interface BackupLog {
  lastRun: ISODateTime
  fileSizeBytes: number
  status: 'ok' | 'failed'
  verifiedByUserId: string | null
}

export type AuditActionType =
  'login' | 'logout' | 'submit' | 'approve' | 'create' | 'update' | 'delete' | 'archive' | 'print'

export interface AuditLogEntry {
  userId: string
  actionType: AuditActionType
  targetRecord: { type: string; id: string } | null
  timestamp: ISODateTime
  /**
   * Optional: what changed, naming fields or states only, never their values (e.g. "Updated
   * allergies", not the allergy itself), so the multi-record log stays privacy-safe. Omitted when
   * the action and target already say everything (login, scan, submit). ADR-017.
   */
  summary?: string
}
