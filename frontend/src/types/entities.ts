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
  /** Learner Reference Number: 12 digits, text, unique, entered by Staff (ADR-028). Masked on lists (`lib/lrn.ts`). */
  lrn: string
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
export type StudentListRef = Pick<Student, 'id' | 'lrn'>

/**
 * One result of a deliberate student search (a single lookup, so the name is shown): enough to
 * tell similar names apart, and nothing medical.
 */
export type StudentSearchResult = Pick<Student, 'id' | 'lrn' | 'fullName' | 'gradeLevel'>

/**
 * A teacher, non-teaching staff member or utility worker seen at the clinic (ADR-043). Called
 * "personnel" in code because "staff" already names the clinician role; labelled "Staff" on screen.
 * No LRN, grade, section or sex, and no record-completeness status. PROVISIONAL, pending the ERD.
 */
export interface Personnel {
  id: string
  /** System-assigned, unique, `STF-0001`. Stands in for the masked LRN on lists (ADR-004). PROVISIONAL: the school may have its own employee number. */
  staffNumber: string
  fullName: string
  /** One of `config.personnelTypes`. PROVISIONAL: the clinic and registrar give the real groups. */
  type: string
  /** Optional department or role, free text, at most 60 characters. */
  department: string | null
  contactInfo: string
  /** Optional; empty means none recorded, as on a student. */
  allergies: string[]
  medicalConditions: string[]
  /** Ordered; the first is the primary. May be empty: staff need none to be saved. */
  emergencyContacts: EmergencyContact[]
  archived: boolean
}

/** One result of a deliberate staff search: enough to tell people apart, nothing medical. */
export type PersonnelSearchResult = Pick<Personnel, 'id' | 'staffNumber' | 'fullName' | 'type'>

/** One result of the combined patient search (ADR-043 item 5), labelled by kind. */
export type PatientSearchResult =
  | ({ kind: 'student' } & StudentSearchResult)
  | ({ kind: 'personnel' } & PersonnelSearchResult)

/**
 * Who a visit, incident, follow-up or medicine given is about: a student or a staff member, exactly
 * one of the two (ADR-043 item 4). The other is null. PROVISIONAL, pending the ERD.
 */
export interface PatientRef {
  studentId: string | null
  personnelId: string | null
}

export type UserRole = 'staff' | 'admin'

export interface User {
  id: string
  name: string
  username: string
  role: UserRole
  /** Optional staff-account avatar, stored as a resized data URL by the mock layer. Never a student image. */
  profilePicture?: string | null
  lastLogin: ISODateTime | null
  /** Set when the Admin/Principal disables the account; it then can't sign in. Never deleted. */
  deactivatedAt?: ISODateTime | null
}

/**
 * `resting_in_clinic` (panel review VS-1): kept in the clinic for observation. With no Time out on a
 * visit dated today, the student is "in the clinic now". PROVISIONAL, pending the ERD.
 */
export type Disposition = 'returned_to_class' | 'sent_home' | 'referred_to_hospital' | 'resting_in_clinic'

/** Who marked a record "Entered in error", when and why. The record is kept, never deleted. PROVISIONAL, pending the ERD. */
export interface EnteredInError {
  reason: string
  at: ISODateTime
  byUserId: string
}

export interface Visit extends PatientRef {
  id: string
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
  /*
   * Panel review part 2. All optional and absent on older records. PROVISIONAL, pending the ERD.
   */
  /** True when the visit's date and time was set more than 30 minutes before it was saved (ADR-029: entered afterwards). */
  lateEntry?: boolean
  /** Optional reason given for a late entry, such as "system was down". */
  lateEntryReason?: string | null
  /** Set when the visit was marked "Entered in error": hidden from lists and counts, stock returned, letter voided. */
  enteredInError?: EnteredInError | null
  /** The incident this visit was escalated to (ADR-036). The event then counts once, as the incident. */
  escalatedIncidentId?: string | null
  /** Sent home or Referred to hospital only: who collected the student (ADR-049, D4). Absent on older records. PROVISIONAL, pending the ERD. */
  collectedBy?: CollectedBy | null
  /** Up to 3 more complaints as tags (ADR-053). Reports and the Dashboard count `complaint` only. Absent on older records. PROVISIONAL. */
  extraComplaints?: string[]
  /**
   * The student's grade level when the visit was saved (ADR-047), so an old Grade 7 visit stays Grade 7
   * after promotion. Student records have no section, so none is kept. Staff visits have none. PROVISIONAL.
   */
  gradeLevelAtTime?: string | null
}

/** Who collected a student who was sent home or referred. Every part is optional. PROVISIONAL, pending the ERD. */
export interface CollectedBy {
  name: string | null
  /** Parent, Guardian, Relative, Other, or typed. */
  relationship: string | null
  /** "HH:MM" on the visit's date, never in the future. */
  time: string | null
}

/** Excuse-letter values entered on a visit before approval. PROVISIONAL, pending the ERD. */
export interface ExcuseLetterDraft<D = ISODate> {
  excusedFrom: D
  excusedUntil: D
  /** Optional note for the teacher, printed on the letter. */
  note: string | null
  /** The clinician's "Stay home until cleared" (ADR-049, D5). Absent on older drafts. PROVISIONAL. */
  stayHomeUntilCleared?: boolean
  /** Optional one-line note with it. PROVISIONAL. */
  stayHomeNote?: string | null
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

/** Panel review IN-6 (D6): one list. Older saved values are migrated in `lib/mock-db/store.ts`. */
export type ParentNotificationOutcome = 'reached' | 'no_answer' | 'left_message_or_voicemail' | 'wrong_number'

/**
 * Who was called on one attempt: a snapshot of the student's emergency contact at the time, or a
 * person typed in as "Other". The ERD keeps `contact_id` plus `phone_dialed`; the mock layer has no
 * contact ids, so it keeps the snapshot. PROVISIONAL, pending the ERD.
 */
export interface CalledContact {
  name: string
  relationship: string | null
  phone: string
  source: 'emergency_contact' | 'other'
}

export interface ParentNotificationAttempt {
  outcome: ParentNotificationOutcome
  timestamp: ISODateTime
  /** Absent on attempts saved before the field existed. PROVISIONAL, pending the ERD. */
  calledContact?: CalledContact | null
}

export interface HospitalReferral {
  destination: string
  transportMode: string
  departureTime: ISODateTime
}

export interface Incident extends PatientRef {
  id: string
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
  /** The visit this incident was escalated from (ADR-036). Absent on other incidents. PROVISIONAL, pending the ERD. */
  sourceVisitId?: string | null
  /** The student's grade level when Stage 1 was saved (ADR-047). Staff incidents have none. PROVISIONAL, pending the ERD. */
  gradeLevelAtTime?: string | null
  /** The Admin's Acknowledge on an approved report (ADR-048): who and when. Never undone. PROVISIONAL, pending the ERD. */
  acknowledged?: { byUserId: string; at: ISODateTime } | null
  /** Optional free text with suggestions, Stage 2 only (D11). Absent on older records. PROVISIONAL, pending the ERD. */
  bodyPart?: string | null
  /**
   * Set only when the nurse ticked "Nothing further was needed or done": the one-line reason that lets
   * an incident with no treatment, medicine, notification or referral be completed and approved
   * (panel review IN-3). PROVISIONAL, pending the ERD.
   */
  noFurtherActionReason?: string | null
}

export type FollowUpStatus = 'pending' | 'completed' | 'missed' | 'cancelled'

export interface FollowUp extends PatientRef {
  id: string
  relatedRecord: { type: 'visit' | 'incident'; id: string }
  followUpDate: ISODate
  reason: string
  status: FollowUpStatus
  notes: string | null
  createdByUserId: string
  /** Required when the status became Missed or Cancelled (panel review FU-4). Absent on older records. PROVISIONAL, pending the ERD. */
  statusReason?: string | null
  /** The clinician's "Stay home until cleared" (ADR-049, D5). Absent on older records. PROVISIONAL, pending the ERD. */
  stayHomeUntilCleared?: boolean
  /** Optional one-line note with it. PROVISIONAL, pending the ERD. */
  stayHomeNote?: string | null
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

export type ItemBrand = 'generic' | 'branded'

export const ITEM_BRAND_LABELS: Record<ItemBrand, string> = { generic: 'Generic', branded: 'Branded' }

export interface InventoryItem {
  id: string
  name: string
  category: InventoryCategory
  unit: string
  /** Raw stock is held per received batch. Totals are derived by the data layer. */
  batches: InventoryBatch[]
  lowStockThreshold: number
  /**
   * PROVISIONAL (pending the ERD): generic or branded (Sir Rey, October 25, 2026; a student who wants
   * branded pays for it). Optional: missing or `null` reads "Not specified".
   */
  brand?: ItemBrand | null
  /**
   * Optional words such as "penicillin" (ADR-049, D8). A patient whose allergies mention one gets a
   * warning at the medicine pickers; it never blocks (ADR-018). PROVISIONAL, pending the ERD.
   */
  avoidIfAllergicTo?: string[]
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

/**
 * `view` (PROVISIONAL, pending the ERD): someone opened a student or staff profile or an incident
 * report (ADR-038 item 4 for the Admin, ADR-048 for the clinician). Written once per record per
 * sign-in session; lists and searches are not logged.
 */
export type AuditActionType =
  'login' | 'logout' | 'submit' | 'approve' | 'create' | 'update' | 'delete' | 'archive' | 'print' | 'view'

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
