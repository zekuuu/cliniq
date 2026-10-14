import type {
  AuditActionType,
  AuditLogEntry,
  Disposition,
  ExcuseLetterDraft,
  FollowUp,
  FollowUpStatus,
  HospitalReferral,
  Incident,
  InventoryCategory,
  InventoryItem,
  ISODate,
  ISODateTime,
  ItemGivenLine,
  ParentNotificationAttempt,
  ParentNotificationOutcome,
  Report,
  ReportType,
  Student,
  StudentNumber,
  StudentSearchResult,
  User,
  UserRole,
  Visit,
} from '../../types/entities'
import { normalizeComplaint } from '../complaints'
import { parseISODate, toISODate } from '../dates'
import type { CalendarDay, DashboardQuery, DashboardSummary, Holiday, HolidayFeed } from '../../types/dashboard'
import holidayData from './holidays-ph.json'
import type { FollowUpDueState } from '../../components/status/followUp'
import { buildCalendarDays, buildDashboardSummary } from './dashboard'
import { isEmptied, simulateRequest } from './devToggles'
import {
  backupStatus,
  auditLogList,
  complaintSuggestions,
  dateOf,
  followUpDueState,
  gradeLevels,
  incompleteRecordQueue,
  inventoryStatusFor,
  monthlyCounts,
  nextStudentNumber,
  searchStudents as searchStudentRecords,
  studentsById,
  toStudent,
  type BackupStatus,
  type AuditLogList,
  type AuditLogQuery,
  type IncompleteRecordRow,
  type InventoryStatus,
} from './selectors'
import { clearMockSession, getMockSessionUser, type SessionUser } from './session'
import { commit, db, restoreDb } from './store'
import { CALENDAR_EVENT_TITLE_MAX } from './integrity'
import type {
  AdjustmentReason,
  CalendarEvent,
  ComplaintType,
  DbState,
  ExcuseLetterApproval,
  InventoryTransaction,
  IssueReport,
  PeReferral,
  SeedStudent,
  VitalsWarningRanges,
} from './types'

/**
 * THE DATA-ACCESS LAYER. Every screen reads and writes CLINIQ data through these functions (via
 * its feature `api/` module). They're async on purpose: when the Laravel API lands (Phase B9),
 * this file is what gets replaced with HTTP calls, and nothing above it has to change.
 *
 * - Reads return copies, with derived values computed by `selectors.ts` on every call.
 * - Writes update the in-memory store (seeded from `mock-db.json`) and append to the audit log in
 *   the same call (`.claude/skills/cliniq-audit-trail/`).
 * - Latency and the error/empty preview switches live in `devToggles.ts`.
 */

// ---- plumbing ------------------------------------------------------------------------------

/** A read-only view of the store with any `?mock=empty` / `?mockEmpty=` collections emptied. */
function view(): DbState {
  const s = db()
  return {
    ...s,
    users: isEmptied('users') ? [] : s.users,
    students: isEmptied('students') ? [] : s.students,
    visits: isEmptied('visits') ? [] : s.visits,
    incidents: isEmptied('incidents') ? [] : s.incidents,
    followUps: isEmptied('followUps') ? [] : s.followUps,
    inventoryItems: isEmptied('inventoryItems') ? [] : s.inventoryItems,
    reports: isEmptied('reports') ? [] : s.reports,
    backupLogs: isEmptied('backupLogs') ? [] : s.backupLogs,
    auditLog: isEmptied('auditLog') ? [] : s.auditLog,
    frontendOnly: {
      ...s.frontendOnly,
      issueReports: isEmptied('issueReports') ? [] : s.frontendOnly.issueReports,
      calendarEvents: isEmptied('calendarEvents') ? [] : s.frontendOnly.calendarEvents,
    },
  }
}

async function read<T>(label: string, select: (state: DbState) => T): Promise<T> {
  await simulateRequest(label)
  return structuredClone(select(view()))
}

/**
 * One write is all-or-nothing: if `mutate` throws partway (a rejected medicine line after the visit
 * was already pushed, say), the store is put back exactly as it was and nothing is persisted.
 */
async function write<T>(label: string, mutate: (state: DbState) => T): Promise<T> {
  await simulateRequest(label)
  const state = db()
  const before = structuredClone(state)
  try {
    const result = mutate(state)
    commit()
    return structuredClone(result)
  } catch (error) {
    restoreDb(before)
    throw error
  }
}

class NotFoundError extends Error {}

function must<T>(value: T | undefined | null, what: string): T {
  if (value === undefined || value === null) throw new NotFoundError(`${what} not found`)
  return value
}

/**
 * "Now" on the store's today, at the current wall-clock time, in Philippine time. Anchoring to the
 * store's today (not `toISOString()`, which is UTC) keeps a record written at 7 a.m. from landing on
 * yesterday's date, and keeps writes consistent with a pinned test "today".
 */
function now(state: DbState): ISODateTime {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${state.today}T${hh}:${mm}:${ss}+08:00`
}

/** Next readable id in a collection, e.g. "visit-0160". */
function nextId(prefix: string, existing: Array<{ id: string }>): string {
  const max = existing.reduce((m, r) => {
    const n = Number(r.id.slice(prefix.length + 1))
    return r.id.startsWith(`${prefix}-`) && Number.isFinite(n) ? Math.max(m, n) : m
  }, 0)
  return `${prefix}-${String(max + 1).padStart(4, '0')}`
}

/** User ids follow the seed's "user-<role>-NN" pattern. */
function nextUserId(state: DbState, role: UserRole): string {
  for (let n = 1; ; n++) {
    const id = `user-${role}-${String(n).padStart(2, '0')}`
    if (!state.users.some((u) => u.id === id)) return id
  }
}

function audit(
  state: DbState,
  actor: SessionUser,
  actionType: AuditActionType,
  targetRecord: AuditLogEntry['targetRecord'],
  summary?: string,
) {
  state.auditLog.push({ userId: actor.id, actionType, targetRecord, timestamp: now(state), ...(summary ? { summary } : {}) })
}

const FIELD_LABELS: Record<string, string> = {
  fullName: 'name',
  gradeLevel: 'grade level',
  contactInfo: 'contact info',
  medicalConditions: 'medical conditions',
  emergencyContact: 'emergency contact',
  currentStock: 'stock',
  expirationDate: 'expiration date',
  lowStockThreshold: 'low-stock threshold',
  dateTime: 'date and time',
  eventTag: 'event tag',
  treatment: 'treatment notes',
  itemsGiven: 'medicines and supplies',
}

/** "Updated allergies and grade level" — names the changed fields for the audit summary, never their values. */
function changedSummary(before: object, after: object): string | undefined {
  const old = before as Record<string, unknown>
  const changed = Object.entries(after)
    .filter(([key, value]) => JSON.stringify(old[key]) !== JSON.stringify(value))
    .map(([key]) => FIELD_LABELS[key] ?? key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`))
  if (!changed.length) return undefined
  const list = changed.length === 1 ? changed[0] : `${changed.slice(0, -1).join(', ')} and ${changed[changed.length - 1]}`
  return `Updated ${list}`
}

function actorOr(actor?: SessionUser): SessionUser {
  return actor ?? getMockSessionUser()
}

/**
 * Development stand-in for Sanctum's logout endpoint. It keeps logout accountable even while the
 * frontend uses the mock session, then clears the selected mock role from this browser tab.
 */
export async function logoutMockSession(actor: SessionUser): Promise<void> {
  await write('logout', (s) => {
    audit(s, actor, 'logout', null)
  })
  clearMockSession()
}

// ---- authentication (frontend-first mock only) --------------------------------------------

export interface MockAuthResult {
  user: SessionUser
  mustChangePassword: boolean
}

export type MockAuthFailure = 'invalid_credentials' | 'locked'

export class MockAuthError extends Error {
  readonly reason: MockAuthFailure
  readonly lockedUntil?: number

  constructor(reason: MockAuthFailure, lockedUntil?: number) {
    super(reason)
    this.reason = reason
    this.lockedUntil = lockedUntil
  }
}

interface LoginAttemptState {
  failures: number
  lockedUntil: number | null
}

const loginAttempts = new Map<string, LoginAttemptState>()
const passwordHistory = new Map<string, string[]>()
const changedPasswordUsers = new Set<string>()

/** Test/demo reset for the frontend-only authentication state. The backend will own this later. */
export function resetMockAuth() {
  loginAttempts.clear()
  passwordHistory.clear()
  changedPasswordUsers.clear()
}

function attemptFor(username: string): LoginAttemptState {
  const current = loginAttempts.get(username)
  if (current) return current
  const created = { failures: 0, lockedUntil: null }
  loginAttempts.set(username, created)
  return created
}

function fakePasswordHistory(state: DbState, userId: string): string[] {
  const existing = passwordHistory.get(userId)
  if (existing) return existing
  const current = state.frontendOnly.devAccounts.find((account) => account.userId === userId)?.password
  const history = current ? [current] : []
  passwordHistory.set(userId, history)
  return history
}

/**
 * Development stand-in for the future Sanctum login endpoint. It intentionally never returns a
 * password or token. Lockout and password history live in memory until the real backend exists.
 */
export async function authenticateMockUser(username: string, password: string): Promise<MockAuthResult> {
  await simulateRequest('login')
  const normalized = username.trim().toLowerCase()
  const attempt = attemptFor(normalized)
  if (attempt.lockedUntil && attempt.lockedUntil > Date.now()) {
    throw new MockAuthError('locked', attempt.lockedUntil)
  }
  if (attempt.lockedUntil && attempt.lockedUntil <= Date.now()) {
    attempt.failures = 0
    attempt.lockedUntil = null
  }

  const state = view()
  const user = state.users.find((candidate) => candidate.username.toLowerCase() === normalized)
  const account = user && state.frontendOnly.devAccounts.find((candidate) => candidate.userId === user.id)
  const currentPassword = account ? fakePasswordHistory(state, user.id)[0] : null
  if (!user || !account || currentPassword !== password) {
    attempt.failures += 1
    if (attempt.failures >= 5) {
      attempt.failures = 0
      attempt.lockedUntil = Date.now() + 30 * 60 * 1000
      throw new MockAuthError('locked', attempt.lockedUntil)
    }
    throw new MockAuthError('invalid_credentials')
  }

  attempt.failures = 0
  attempt.lockedUntil = null
  const actor = { id: user.id, name: user.name, role: user.role }
  await write('login', (current) => {
    audit(current, actor, 'login', { type: 'user', id: user.id })
    return actor
  })
  return {
    user: actor,
    mustChangePassword: Boolean(account.mustChangePassword && !changedPasswordUsers.has(user.id)),
  }
}

export async function changeMockPassword(userId: string, nextPassword: string): Promise<void> {
  const trimmed = nextPassword.trim()
  await write('change password', (state) => {
    const user = must(state.users.find((candidate) => candidate.id === userId), 'User')
    must(
      state.frontendOnly.devAccounts.find((candidate) => candidate.userId === userId),
      'Development account',
    )
    const history = fakePasswordHistory(state, userId)
    if (trimmed.length < 8) throw new Error('Password must be at least 8 characters.')
    if (history.includes(trimmed)) throw new Error('Choose a password that was not used recently.')
    passwordHistory.set(userId, [trimmed, ...history].slice(0, 5))
    changedPasswordUsers.add(userId)
    audit(state, { id: user.id, name: user.name, role: user.role }, 'update', {
      type: 'user',
      id: userId,
    }, 'Changed password')
  })
}

function userName(state: DbState, id: string | null): string | null {
  if (!id) return null
  return state.users.find((u) => u.id === id)?.name ?? 'Unknown user'
}

function studentOf(state: DbState, studentId: string): SeedStudent {
  return must(studentsById(state).get(studentId), 'Student')
}

// ---- reference vocabularies (frontendOnly, mock-only) ---------------------------------------

export function getVisitComplaintTypes(): Promise<ComplaintType[]> {
  return read('visit complaint types', (s) => s.frontendOnly.visitComplaintTypes)
}

/** New Visit complaint suggestions, most used and most recent first (see `complaintSuggestions`). */
export function getVisitComplaintSuggestions(): Promise<string[]> {
  return read('visit complaint suggestions', complaintSuggestions)
}

export function getIncidentComplaintTypes(): Promise<string[]> {
  return read('incident complaint types', (s) => s.frontendOnly.incidentComplaintTypes)
}

/** Placeholder sanity bounds for the incident vitals warning (config; nurse to confirm). */
export function getVitalsWarningRanges(): Promise<VitalsWarningRanges> {
  return read('vitals warning ranges', (s) => s.config.vitalsWarningRanges)
}

export function getGradeLevels(): Promise<string[]> {
  return read('grade levels', gradeLevels)
}

// ---- users ---------------------------------------------------------------------------------

export function listUsers(): Promise<User[]> {
  return read('users', (s) => [...s.users].sort((a, b) => a.name.localeCompare(b.name)))
}

export function getUser(id: string): Promise<User> {
  return read('user', (s) => must(s.users.find((u) => u.id === id), 'User'))
}

export interface UserInput {
  name: string
  username: string
  role: UserRole
}

/**
 * Login matches usernames case-insensitively and takes the first match, so a second account with the
 * same username could never sign in. Saving one is rejected before anything is written.
 */
export class DuplicateUsernameError extends Error {
  constructor() {
    super('duplicate_username')
  }
}

export function saveUser(input: UserInput, options: { userId?: string; actor?: SessionUser } = {}): Promise<User> {
  return write('save user', (s) => {
    const username = input.username.trim().toLowerCase()
    if (s.users.some((u) => u.id !== options.userId && u.username.toLowerCase() === username)) {
      throw new DuplicateUsernameError()
    }
    const existing = options.userId ? must(s.users.find((u) => u.id === options.userId), 'User') : null
    const summary = existing ? changedSummary(existing, { name: input.name.trim(), username: input.username.trim(), role: input.role }) : undefined
    const user: User = existing
      ? Object.assign(existing, { name: input.name.trim(), username: input.username.trim(), role: input.role })
      : {
          id: nextUserId(s, input.role),
          name: input.name.trim(),
          username: input.username.trim(),
          role: input.role,
          lastLogin: null,
        }
    if (!existing) s.users.push(user)
    audit(s, actorOr(options.actor), existing ? 'update' : 'create', { type: 'user', id: user.id }, summary)
    return user
  })
}

// ---- students ------------------------------------------------------------------------------

export interface StudentQuery {
  search?: string
  gradeLevel?: string
  includeArchived?: boolean
  limit?: number
}

export function listStudents(query: StudentQuery = {}): Promise<Student[]> {
  return read('students', (s) => {
    const search = query.search?.trim().toLowerCase() ?? ''
    return s.students
      .filter((st) => query.includeArchived || !st.archived)
      .filter((st) => !query.gradeLevel || st.gradeLevel === query.gradeLevel)
      .filter(
        (st) =>
          !search || st.fullName.toLowerCase().includes(search) || st.studentNumber.toLowerCase().includes(search),
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .slice(0, query.limit ?? Infinity)
      .map(toStudent)
  })
}

/**
 * Student lookup by Student Number prefix or name: active students only, nothing under 2
 * characters, at most `limit` results, no medical fields (see `searchStudents` in selectors.ts).
 */
export function searchStudents(query: string, limit = 8): Promise<StudentSearchResult[]> {
  return read('student search', (s) => searchStudentRecords(s, query, limit))
}

export function getStudent(studentNumber: StudentNumber): Promise<Student> {
  return read('student', (s) =>
    toStudent(must(s.students.find((st) => st.studentNumber === studentNumber), 'Student')),
  )
}

export function getStudentById(id: string): Promise<Student> {
  return read('student', (s) => toStudent(studentOf(s, id)))
}

/**
 * A default student for screens opened without one (demo convenience until real navigation always
 * supplies a Student Number): the first active, complete record, preferring one with history.
 */
export function getDemoStudent(options: { withHistory?: boolean } = {}): Promise<Student> {
  return read('demo student', (s) => {
    const active = s.students.filter((st) => !st.archived).map(toStudent)
    const complete = active.filter((st) => st.recordComplete)
    const withHistory = complete.find(
      (st) => s.visits.some((v) => v.studentId === st.id) && s.incidents.some((i) => i.studentId === st.id),
    )
    return must((options.withHistory && withHistory) || complete[0] || active[0], 'Student')
  })
}

export interface StudentHistory {
  visits: Visit[]
  incidents: Incident[]
}

export function getStudentHistory(studentId: string, limit = 8): Promise<StudentHistory> {
  return read('student history', (s) => ({
    visits: s.visits
      .filter((v) => v.studentId === studentId)
      .sort((a, b) => b.dateTime.localeCompare(a.dateTime))
      .slice(0, limit),
    incidents: s.incidents
      .filter((i) => i.studentId === studentId)
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, limit),
  }))
}

export function getNextStudentNumber(): Promise<StudentNumber> {
  return read('next student number', nextStudentNumber)
}

export type StudentInput = Pick<
  Student,
  'fullName' | 'gradeLevel' | 'contactInfo' | 'allergies' | 'medicalConditions' | 'emergencyContact'
>

export interface DuplicateMatch {
  id: string
  fullName: string
  studentNumber: StudentNumber
  gradeLevel: string
}

export type SaveStudentResult =
  | { status: 'duplicate'; matches: DuplicateMatch[] }
  | { status: 'saved'; student: Student; action: 'create' | 'update' }

/**
 * Create or update a student. On create, a name + grade-level match against an active record blocks
 * the save until `confirmDuplicate` is passed (Frontend Context Brief §6, duplicate detection).
 */
export function saveStudent(
  input: StudentInput,
  options: { studentId?: string; confirmDuplicate?: boolean; actor?: SessionUser } = {},
): Promise<SaveStudentResult> {
  return write('save student', (s): SaveStudentResult => {
    const name = input.fullName.trim().toLowerCase()
    const matches = s.students
      .filter((st) => st.id !== options.studentId && !st.archived)
      .filter((st) => st.fullName.trim().toLowerCase() === name && st.gradeLevel === input.gradeLevel)
      .map((st) => ({ id: st.id, fullName: st.fullName, studentNumber: st.studentNumber, gradeLevel: st.gradeLevel }))
    if (!options.studentId && matches.length && !options.confirmDuplicate) return { status: 'duplicate', matches }

    const existing = options.studentId ? studentOf(s, options.studentId) : null
    const fields = {
      fullName: input.fullName.trim(),
      gradeLevel: input.gradeLevel,
      contactInfo: input.contactInfo.trim(),
      allergies: input.allergies,
      medicalConditions: input.medicalConditions,
      emergencyContact: input.emergencyContact,
    }
    const summary = existing ? changedSummary(existing, fields) : undefined
    let record: SeedStudent
    if (existing) record = Object.assign(existing, fields)
    else {
      record = { id: nextId('student', s.students), studentNumber: nextStudentNumber(s), archived: false, ...fields }
      s.students.push(record)
    }
    const action = existing ? 'update' : 'create'
    audit(s, actorOr(options.actor), action, { type: 'student', id: record.id }, summary)
    return { status: 'saved', student: toStudent(record), action }
  })
}

/** Archive, never delete (data retention policy): hidden from active lists, kept for 5 years. */
export function archiveStudent(studentNumber: StudentNumber, actor?: SessionUser): Promise<Student> {
  return write('archive student', (s) => {
    const record = must(s.students.find((st) => st.studentNumber === studentNumber), 'Student')
    record.archived = true
    audit(s, actorOr(actor), 'archive', { type: 'student', id: record.id })
    return toStudent(record)
  })
}

export type IncompleteRecord = IncompleteRecordRow & { resolvedByName: string | null }

export function getIncompleteRecordQueue(): Promise<IncompleteRecord[]> {
  return read('incomplete records', (s) =>
    incompleteRecordQueue(s).map((row) => ({ ...row, resolvedByName: userName(s, row.review?.resolvedByUserId ?? null) })),
  )
}

/** Staff marks a flagged record resolved; who resolved it is recorded (Module 2). */
export function resolveIncompleteRecord(studentNumber: StudentNumber, actor?: SessionUser): Promise<IncompleteRecord> {
  return write('resolve incomplete record', (s) => {
    const by = actorOr(actor)
    const student = must(s.students.find((st) => st.studentNumber === studentNumber), 'Student')
    let review = s.frontendOnly.recordReviews.find((r) => r.studentNumber === studentNumber)
    if (!review) {
      review = { studentNumber, importedAt: s.today, importedBy: 'Flagged in CLINIQ', resolvedByUserId: null, resolvedAt: null }
      s.frontendOnly.recordReviews.push(review)
    }
    review.resolvedByUserId = by.id
    review.resolvedAt = now(s)
    audit(s, by, 'approve', { type: 'student', id: student.id })
    const row = must(incompleteRecordQueue(s).find((r) => r.student.studentNumber === studentNumber), 'Record')
    return { ...row, resolvedByName: userName(s, by.id) }
  })
}

// ---- visits --------------------------------------------------------------------------------

export function listVisits(range?: { from: ISODate; to: ISODate }): Promise<Visit[]> {
  return read('visits', (s) =>
    s.visits
      .filter((v) => !range || (dateOf(v.dateTime) >= range.from && dateOf(v.dateTime) <= range.to))
      .sort((a, b) => b.dateTime.localeCompare(a.dateTime)),
  )
}

export function getVisit(id: string): Promise<Visit> {
  return read('visit', (s) => must(s.visits.find((v) => v.id === id), 'Visit'))
}

/** The most recent visit by an active student (default for detail screens opened without an id). */
export function getLatestVisit(): Promise<Visit> {
  return read('latest visit', (s) => {
    const byId = studentsById(s)
    const sorted = [...s.visits].sort((a, b) => b.dateTime.localeCompare(a.dateTime))
    return must(sorted.find((v) => !byId.get(v.studentId)?.archived), 'Visit')
  })
}

export type FollowUpInput = Pick<FollowUp, 'followUpDate' | 'reason' | 'notes'>

export interface RecordVisitInput {
  studentId: string
  complaint: string
  /** Treatment notes: care that isn't stock (rest, cold compress, advice). */
  treatment: string
  disposition: Disposition
  eventTag?: string | null
  followUp: FollowUpInput | null
  /** Medicines and supplies given. Optional; each line dispenses from inventory (ADR-018). */
  itemsGiven?: ItemLineInput[]
  /** Sent home or referred only; omitted means no letter prepared. */
  excuseLetterDraft?: ExcuseLetterDraft | null
  /** Referred to hospital only. */
  referredTo?: string | null
}

/**
 * The disposition-specific values, cleaned and checked: an excuse-letter draft only on Sent home or
 * Referred, "Referred to" only on Referred, and no draft once the visit's letter is approved (the
 * approved letter then holds the period, so the two can't diverge).
 */
function dispositionFields(
  s: DbState,
  visitId: string | null,
  disposition: Disposition,
  draft: ExcuseLetterDraft | null,
  referredTo: string | null,
): Pick<Visit, 'excuseLetterDraft' | 'referredTo'> {
  if (draft) {
    if (disposition === 'returned_to_class') throw new Error('Only a Sent home or Referred visit has an excuse letter.')
    const invalid = excusedPeriodError(draft)
    if (invalid) throw new Error(invalid)
    if (visitId && s.frontendOnly.excuseLetterApprovals.some((a) => a.visitId === visitId))
      throw new Error('This visit already has an approved excuse letter. Its period is fixed.')
  }
  const referred = referredTo?.trim() || null
  if (referred && disposition !== 'referred_to_hospital') throw new Error('Only a Referred to hospital visit has "Referred to".')
  return {
    excuseLetterDraft: draft ? { excusedFrom: draft.excusedFrom, excusedUntil: draft.excusedUntil, note: draft.note?.trim() || null } : null,
    referredTo: referred,
  }
}

function createFollowUp(
  s: DbState,
  actor: SessionUser,
  studentId: string,
  related: FollowUp['relatedRecord'],
  input: FollowUpInput,
): FollowUp {
  const followUp: FollowUp = {
    id: nextId('followup', s.followUps),
    studentId,
    relatedRecord: related,
    followUpDate: input.followUpDate,
    reason: input.reason,
    status: 'pending',
    notes: input.notes,
    createdByUserId: actor.id,
  }
  s.followUps.push(followUp)
  audit(s, actor, 'create', { type: 'follow-up', id: followUp.id })
  return followUp
}

/**
 * Saves a visit, its medicine lines, and (if requested) its follow-up as one write (Activity
 * Diagram 3, ADR-018): the visit, one dispense transaction per line, the stock decrements, and every
 * audit entry. Any invalid line rejects the whole save.
 */
export function recordVisit(
  input: RecordVisitInput,
  actor?: SessionUser,
): Promise<{ visit: Visit; followUp: FollowUp | null; belowZero: string[] }> {
  return write('record visit', (s) => {
    const by = actorOr(actor)
    const student = studentOf(s, input.studentId)
    const itemLines = input.itemsGiven ?? []
    // Treatment notes and items given are both optional: a visit may record no treatment.
    const extra = dispositionFields(s, null, input.disposition, input.excuseLetterDraft ?? null, input.referredTo ?? null)
    const visit: Visit = {
      id: nextId('visit', s.visits),
      studentId: input.studentId,
      dateTime: now(s),
      // Stored in a known suggestion's spelling, so counts never split by case.
      complaint: normalizeComplaint(input.complaint, complaintSuggestions(s)),
      treatment: input.treatment,
      disposition: input.disposition,
      loggedByUserId: by.id,
      eventTag: input.eventTag?.trim() || null,
      itemsGiven: [],
      ...extra,
    }
    s.visits.push(visit)
    audit(s, by, 'submit', { type: 'visit', id: visit.id })
    const given = applyItemLines(s, by, { studentNumber: student.studentNumber, visitId: visit.id }, [], itemLines, 'dispense')
    visit.itemsGiven = given.lines
    const followUp = input.followUp
      ? createFollowUp(s, by, input.studentId, { type: 'visit', id: visit.id }, input.followUp)
      : null
    return { visit, followUp, belowZero: given.belowZero }
  })
}

export type VisitPatch = Pick<Visit, 'complaint' | 'treatment' | 'disposition' | 'eventTag'> & {
  /** The full new set of lines. Omitted, the lines stay as they are. */
  itemsGiven?: ItemLineInput[]
} & Partial<Pick<Visit, 'excuseLetterDraft' | 'referredTo'>>

/**
 * Edits a saved visit. Changed medicine lines move stock through `visit_edited` adjustment
 * transactions (a removed or lowered line returns stock, an added or raised one takes more); the
 * original dispense transactions are never rewritten (ADR-018).
 */
export function updateVisit(
  id: string,
  patch: VisitPatch,
  actor?: SessionUser,
): Promise<{ visit: Visit; belowZero: string[] }> {
  return write('update visit', (s) => {
    const by = actorOr(actor)
    const visit = must(s.visits.find((v) => v.id === id), 'Visit')
    const { itemsGiven, excuseLetterDraft, referredTo, ...rest } = patch
    // Omitted disposition fields stay as they are; checked against the (possibly new) disposition.
    const extra = dispositionFields(s, id, rest.disposition, excuseLetterDraft === undefined ? visit.excuseLetterDraft : excuseLetterDraft, referredTo === undefined ? visit.referredTo : referredTo)
    // Same normalization as a new visit, so an edit can't reintroduce a spelling or case variant.
    const fields = { ...rest, complaint: normalizeComplaint(rest.complaint, complaintSuggestions(s)), ...extra }
    const given = itemsGiven
      ? applyItemLines(s, by, { studentNumber: studentOf(s, visit.studentId).studentNumber, visitId: id }, visit.itemsGiven, itemsGiven, 'adjust')
      : { lines: visit.itemsGiven, belowZero: [] }
    const summary = changedSummary(visit, { ...fields, itemsGiven: given.lines })
    Object.assign(visit, fields, { itemsGiven: given.lines })
    audit(s, by, 'update', { type: 'visit', id }, summary)
    return { visit, belowZero: given.belowZero }
  })
}

// ---- excuse letters & PE referrals (frontendOnly) ------------------------------------------

export function getExcuseLetterApproval(visitId: string): Promise<ExcuseLetterApproval | null> {
  return read('excuse letter', (s) => s.frontendOnly.excuseLetterApprovals.find((a) => a.visitId === visitId) ?? null)
}

export interface StudentExcuseLetter extends ExcusedPeriod {
  id: string
  visitId: string
  disposition: Disposition
  /** `pending`: a draft saved with the visit, not yet approved. */
  status: 'approved' | 'pending'
}

/** A student's excuse letters, approved and pending, newest period first. */
export function getStudentExcuseLetters(studentId: string): Promise<StudentExcuseLetter[]> {
  return read('student excuse letters', (s) => {
    const approved = s.frontendOnly.excuseLetterApprovals.flatMap((a) => {
      const visit = s.visits.find((v) => v.id === a.visitId && v.studentId === studentId)
      return visit
        ? [{ id: a.id, visitId: a.visitId, disposition: visit.disposition, excusedFrom: a.excusedFrom, excusedUntil: a.excusedUntil, status: 'approved' as const }]
        : []
    })
    // A visit never holds a draft once its letter is approved, so the two lists can't overlap.
    const pending = s.visits.flatMap((v) =>
      v.studentId === studentId && v.excuseLetterDraft
        ? [{ id: `draft-${v.id}`, visitId: v.id, disposition: v.disposition, excusedFrom: v.excuseLetterDraft.excusedFrom, excusedUntil: v.excuseLetterDraft.excusedUntil, status: 'pending' as const }]
        : [],
    )
    return [...approved, ...pending].sort((a, b) => b.excusedFrom.localeCompare(a.excusedFrom))
  })
}

export interface PendingExcuseLetter extends ExcusedPeriod {
  visitId: string
  visitDateTime: ISODateTime
  /** Multi-student list: the Student Number only, never the name (ADR-004). */
  studentNumber: StudentNumber
}

/** Every excuse-letter draft still awaiting approval, oldest visit first, for active students. */
export function listPendingExcuseLetters(): Promise<PendingExcuseLetter[]> {
  return read('pending excuse letters', (s) =>
    s.visits
      .flatMap((v) => {
        const student = s.students.find((st) => st.id === v.studentId)
        return v.excuseLetterDraft && student && !student.archived
          ? [{ visitId: v.id, visitDateTime: v.dateTime, studentNumber: student.studentNumber, excusedFrom: v.excuseLetterDraft.excusedFrom, excusedUntil: v.excuseLetterDraft.excusedUntil }]
          : []
      })
      .sort((a, b) => a.visitDateTime.localeCompare(b.visitDateTime)),
  )
}

export interface ExcusedPeriod {
  excusedFrom: ISODate
  excusedUntil: ISODate
}

/** Both dates required, "until" not before "from". No maximum span is defined. */
export function excusedPeriodError({ excusedFrom, excusedUntil }: ExcusedPeriod): string | null {
  if (!excusedFrom || !excusedUntil) return 'Excused from and Excused until are both required.'
  if (excusedUntil < excusedFrom) return "Excused until can't be before Excused from."
  return null
}

/**
 * Approves and stores a visit's letter. The period and note are snapshotted onto the letter and the
 * visit's draft is cleared in the same write, so from here on the approved letter is the only record.
 */
export function approveExcuseLetter(
  visitId: string,
  period: ExcusedPeriod & { note?: string | null },
  actor?: SessionUser,
): Promise<ExcuseLetterApproval> {
  return write('approve excuse letter', (s) => {
    const by = actorOr(actor)
    const visit = must(s.visits.find((v) => v.id === visitId), 'Visit')
    const invalid = excusedPeriodError(period)
    if (invalid) throw new Error(invalid)
    // Approved letters are permanent: the period is fixed once stored.
    if (s.frontendOnly.excuseLetterApprovals.some((a) => a.visitId === visitId))
      throw new Error('This excuse letter is already approved and stored.')
    const approval: ExcuseLetterApproval = {
      id: `excuse-${visitId}`,
      visitId,
      approvedByUserId: by.id,
      approvedAt: now(s),
      excusedFrom: period.excusedFrom,
      excusedUntil: period.excusedUntil,
      note: period.note?.trim() || null,
    }
    s.frontendOnly.excuseLetterApprovals = [...s.frontendOnly.excuseLetterApprovals, approval]
    visit.excuseLetterDraft = null
    audit(s, by, 'approve', { type: 'excuse-letter', id: approval.id })
    return approval
  })
}

export type PeReferralInput = Omit<PeReferral, 'id' | 'referredByUserId' | 'createdAt'> & {
  referredByUserId?: string
}

export function submitPeReferral(input: PeReferralInput, actor?: SessionUser): Promise<PeReferral> {
  return write('submit PE referral', (s) => {
    const by = actorOr(actor)
    must(s.students.find((st) => st.studentNumber === input.studentNumber), 'Student')
    const referral: PeReferral = {
      ...input,
      id: nextId('pe-referral', s.frontendOnly.peReferrals),
      referredByUserId: input.referredByUserId ?? by.id,
      createdAt: now(s),
    }
    s.frontendOnly.peReferrals.push(referral)
    audit(s, by, 'submit', { type: 'pe-sports-referral', id: referral.id })
    if (input.disposition === 'referred_to_hospital')
      audit(s, by, 'create', { type: 'incident-escalation', id: referral.id })
    return referral
  })
}

// ---- incidents -------------------------------------------------------------------------------

export function listIncidents(range?: { from: ISODate; to: ISODate }): Promise<Incident[]> {
  return read('incidents', (s) =>
    s.incidents
      .filter((i) => !range || (dateOf(i.time) >= range.from && dateOf(i.time) <= range.to))
      .sort((a, b) => b.time.localeCompare(a.time)),
  )
}

export function getIncident(id: string): Promise<Incident> {
  return read('incident', (s) => must(s.incidents.find((i) => i.id === id), 'Incident'))
}

export interface StageOneInput {
  studentId: string
  complaint: string
  vitals: Incident['vitals']
  /** Optional; blank is saved as null. PROVISIONAL (Incident.generalNotes). */
  generalNotes?: string
}

/** Stage 1 fast capture: saves with only complaint + immediate vitals (Activity Diagram 2). */
export function saveIncidentStageOne(input: StageOneInput, actor?: SessionUser): Promise<Incident> {
  return write('save incident stage 1', (s) => {
    const by = actorOr(actor)
    studentOf(s, input.studentId)
    const incident: Incident = {
      id: nextId('incident', s.incidents),
      studentId: input.studentId,
      time: now(s),
      complaint: input.complaint,
      vitals: input.vitals,
      hospitalReferral: null,
      parentNotifications: [],
      stage: 1,
      eventTag: null,
      itemsGiven: [],
      generalNotes: input.generalNotes?.trim() || null,
    }
    s.incidents.push(incident)
    // The summary names the optional field, never its value (ADR-017).
    audit(s, by, 'submit', { type: 'incident-stage-1', id: incident.id }, incident.generalNotes ? 'Included additional notes' : undefined)
    return incident
  })
}

export interface StageTwoInput {
  incidentId: string
  complaint: string
  vitals: Incident['vitals']
  hospitalReferral: HospitalReferral | null
  /** Attempts logged while completing Stage 2 (appended to the incident's log). */
  newParentNotifications: ParentNotificationAttempt[]
  followUp: FollowUpInput | null
  /** Medicines and supplies given (ADR-018). Dispensed when Stage 2 is first completed. */
  itemsGiven?: ItemLineInput[]
}

/** Stage 2 completion: same record, now complete. Logged separately from Stage 1. */
export function completeIncidentStageTwo(
  input: StageTwoInput,
  actor?: SessionUser,
): Promise<{ incident: Incident; followUp: FollowUp | null; belowZero: string[] }> {
  return write('complete incident stage 2', (s) => {
    const by = actorOr(actor)
    const incident = must(s.incidents.find((i) => i.id === input.incidentId), 'Incident')
    const lines = input.itemsGiven ?? []
    let belowZero: string[] = []
    // ponytail: medicines are fixed once Stage 2 is complete; changing them later needs an
    // incident-edit adjustment rule that hasn't been decided (Issues-and-TODOs).
    if (incident.stage === 2) {
      const same = (a: ItemLineInput[], b: ItemGivenLine[]) =>
        a.length === b.length && a.every((line) => b.some((old) => old.itemId === line.itemId && old.quantity === line.quantity))
      if (input.itemsGiven && !same(lines, incident.itemsGiven))
        throw new StockRuleError("Medicines on a completed incident can't be changed.")
    } else {
      const studentNumber = studentOf(s, incident.studentId).studentNumber
      const given = applyItemLines(s, by, { studentNumber, incidentId: incident.id }, [], lines, 'dispense')
      incident.itemsGiven = given.lines
      belowZero = given.belowZero
    }
    Object.assign(incident, {
      complaint: input.complaint,
      vitals: input.vitals,
      hospitalReferral: input.hospitalReferral,
      stage: 2 as const,
    })
    audit(s, by, 'update', { type: 'incident-stage-2', id: incident.id }, 'Completed Stage 2 details')
    for (const attempt of input.newParentNotifications) {
      incident.parentNotifications.push(attempt)
      audit(s, by, 'create', {
        type: 'parent-notification',
        id: `${incident.id}-${incident.parentNotifications.length}`,
      })
    }
    const followUp = input.followUp
      ? createFollowUp(s, by, incident.studentId, { type: 'incident', id: incident.id }, input.followUp)
      : null
    return { incident, followUp, belowZero }
  })
}

export function addParentNotification(
  incidentId: string,
  outcome: ParentNotificationOutcome,
  actor?: SessionUser,
): Promise<ParentNotificationAttempt> {
  return write('add parent notification', (s) => {
    const incident = must(s.incidents.find((i) => i.id === incidentId), 'Incident')
    const attempt: ParentNotificationAttempt = { outcome, timestamp: now(s) }
    incident.parentNotifications.push(attempt)
    audit(s, actorOr(actor), 'create', {
      type: 'parent-notification',
      id: `${incident.id}-${incident.parentNotifications.length}`,
    })
    return attempt
  })
}

/**
 * Incident reports already signed off. There is no approval field on the §5 Incident shape, so the
 * audit trail is the record of it (each approval writes an `approve` entry for `incident-report`).
 */
export function listApprovedIncidentReportIds(): Promise<string[]> {
  return read('approved incident reports', (s) =>
    s.auditLog
      .filter((entry) => entry.actionType === 'approve' && entry.targetRecord?.type === 'incident-report')
      .map((entry) => entry.targetRecord!.id),
  )
}

export function approveIncidentReport(incidentId: string, actor?: SessionUser): Promise<void> {
  return write('approve incident report', (s) => {
    must(s.incidents.find((i) => i.id === incidentId), 'Incident')
    audit(s, actorOr(actor), 'approve', { type: 'incident-report', id: incidentId })
  })
}

// ---- follow-ups ------------------------------------------------------------------------------

export type FollowUpView = FollowUp & { studentNumber: StudentNumber; dueState: FollowUpDueState | null }

export function listFollowUps(query: { status?: FollowUpStatus | '' } = {}): Promise<FollowUpView[]> {
  return read('follow-ups', (s) => {
    const byId = studentsById(s)
    return s.followUps
      .filter((f) => !query.status || f.status === query.status)
      .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate))
      .map((f) => ({
        ...f,
        studentNumber: byId.get(f.studentId)?.studentNumber ?? 'Unknown student',
        dueState: followUpDueState(f, s.today),
      }))
  })
}

export function setFollowUpStatus(id: string, status: FollowUpStatus, actor?: SessionUser): Promise<FollowUp> {
  return write('update follow-up', (s) => {
    const followUp = must(s.followUps.find((f) => f.id === id), 'Follow-up')
    const summary = followUp.status === status ? undefined : `Marked ${status}`
    followUp.status = status
    audit(s, actorOr(actor), 'update', { type: 'follow-up', id }, summary)
    return followUp
  })
}

// ---- inventory -------------------------------------------------------------------------------

export type InventoryItemView = InventoryItem & InventoryStatus

export function listInventory(query: { search?: string; category?: InventoryCategory | '' } = {}): Promise<InventoryItemView[]> {
  return read('inventory', (s) => {
    const search = query.search?.trim().toLowerCase() ?? ''
    return s.inventoryItems
      .filter((i) => !search || i.name.toLowerCase().includes(search))
      .filter((i) => !query.category || i.category === query.category)
      .map((i) => ({ ...i, ...inventoryStatusFor(s, i) }))
  })
}

export function getInventoryItem(id: string): Promise<InventoryItemView> {
  return read('inventory item', (s) => {
    const item = must(s.inventoryItems.find((i) => i.id === id), 'Inventory item')
    return { ...item, ...inventoryStatusFor(s, item) }
  })
}

export type InventoryInput = Omit<InventoryItem, 'id'>

/**
 * Adds an item, or edits one's name, category, unit, and threshold. An existing item keeps its stock
 * and expiration date: stock moves only through dispense, restock, and adjustment transactions, and
 * the expiration date only through Restock (ADR-018).
 */
export function saveInventoryItem(input: InventoryInput, options: { itemId?: string; actor?: SessionUser } = {}): Promise<InventoryItem> {
  return write('save inventory item', (s) => {
    const existing = options.itemId ? must(s.inventoryItems.find((i) => i.id === options.itemId), 'Inventory item') : null
    const fields = existing ? { ...input, currentStock: existing.currentStock, expirationDate: existing.expirationDate } : input
    const summary = existing ? changedSummary(existing, fields) : undefined
    const item = existing ? Object.assign(existing, fields) : { id: nextId('item', s.inventoryItems), ...fields }
    if (!existing) s.inventoryItems.push(item)
    audit(s, actorOr(options.actor), existing ? 'update' : 'create', { type: 'inventory', id: item.id }, summary)
    return item
  })
}

export interface DispenseResult {
  item: InventoryItemView
  remainingStock: number
  /** Module 8: dispensing below zero warns but never blocks recording that care was given. */
  belowZero: boolean
}

export function dispenseInventoryItem(
  itemId: string,
  quantity: number,
  link: { studentNumber?: StudentNumber; visitId?: string } = {},
  actor?: SessionUser,
): Promise<DispenseResult> {
  return write('dispense', (s) => {
    const by = actorOr(actor)
    const item = must(s.inventoryItems.find((i) => i.id === itemId), 'Inventory item')
    if (!Number.isInteger(quantity) || quantity < 1) throw new StockRuleError(QUANTITY_RULE)
    if (isExpired(s, item)) throw new StockRuleError(expiredMessage(item))
    if (link.studentNumber && !s.students.some((st) => st.studentNumber === link.studentNumber))
      throw new StockRuleError('No student has this Student Number.')
    if (link.visitId && !s.visits.some((v) => v.id === link.visitId)) throw new StockRuleError('That visit no longer exists.')
    item.currentStock -= quantity
    const txn = {
      id: nextId('txn', s.frontendOnly.inventoryTransactions),
      itemId,
      type: 'dispense' as const,
      quantity,
      timestamp: now(s),
      userId: by.id,
      studentNumber: link.studentNumber ?? null,
      visitId: link.visitId ?? null,
    }
    s.frontendOnly.inventoryTransactions.push(txn)
    audit(s, by, 'submit', { type: 'inventory-dispensation', id: txn.id })
    const status = inventoryStatusFor(s, item)
    return { item: { ...item, ...status }, remainingStock: item.currentStock, belowZero: status.belowZero }
  })
}

/** Restock (Module 8, stock flow step 4): increments stock and confirms the expiration date. */
export function restockInventoryItem(
  itemId: string,
  quantity: number,
  expirationDate: ISODate | null,
  actor?: SessionUser,
): Promise<InventoryItemView> {
  return write('restock', (s) => {
    const by = actorOr(actor)
    const item = must(s.inventoryItems.find((i) => i.id === itemId), 'Inventory item')
    if (!Number.isInteger(quantity) || quantity < 1) throw new StockRuleError(QUANTITY_RULE)
    item.currentStock += quantity
    item.expirationDate = expirationDate
    const id = nextId('txn', s.frontendOnly.inventoryTransactions)
    s.frontendOnly.inventoryTransactions.push({
      id, itemId, type: 'restock', quantity, timestamp: now(s), userId: by.id, studentNumber: null, visitId: null,
    })
    audit(s, by, 'submit', { type: 'inventory-restock', id })
    return { ...item, ...inventoryStatusFor(s, item) }
  })
}

export const ADJUSTMENT_REASON_LABELS: Record<AdjustmentReason, string> = {
  visit_edited: 'Visit edited',
  expired_disposed: 'Expired - disposed',
  damaged_spilled: 'Damaged or spilled',
  miscount_correction: 'Miscount correction',
  other: 'Other',
}

/** The reasons Staff can pick on Adjust Stock. `visit_edited` is written only by a visit edit. */
export type StaffAdjustmentReason = Exclude<AdjustmentReason, 'visit_edited'>
export const STAFF_ADJUSTMENT_REASONS: StaffAdjustmentReason[] = ['expired_disposed', 'damaged_spilled', 'miscount_correction', 'other']

export interface StockAdjustmentInput {
  /** Signed change (+/-). Ignored when `countedQuantity` is given. */
  change?: number
  /** "Set to counted quantity": the change becomes counted minus current stock. */
  countedQuantity?: number
  reason: StaffAdjustmentReason
  /** Optional, except required when `reason` is `other`. */
  note?: string
}

/**
 * Adjust Stock (Staff, ADR-018): disposal, damage, or a recount. Writes one adjustment transaction
 * and its audit entry; the result can't go below 0. Low-stock and expiry flags are recomputed on
 * the next read like every derived value. The expiration date is left alone: to replace an expired
 * batch, dispose of it here and Restock with the new date.
 */
export function adjustInventoryStock(itemId: string, input: StockAdjustmentInput, actor?: SessionUser): Promise<InventoryItemView> {
  return write('adjust stock', (s) => {
    const by = actorOr(actor)
    const item = must(s.inventoryItems.find((i) => i.id === itemId), 'Inventory item')
    if (!STAFF_ADJUSTMENT_REASONS.includes(input.reason)) throw new StockRuleError('Choose a reason for the adjustment.')
    const note = input.note?.trim() || null
    if (input.reason === 'other' && !note) throw new StockRuleError('Add a note explaining the adjustment.')
    const counted = input.countedQuantity
    if (counted !== undefined && (!Number.isInteger(counted) || counted < 0))
      throw new StockRuleError('The counted quantity must be a whole number of 0 or more.')
    const change = counted !== undefined ? counted - item.currentStock : (input.change ?? 0)
    if (!Number.isInteger(change) || change === 0) throw new StockRuleError('Enter a whole-number change other than 0.')
    if (item.currentStock + change < 0)
      throw new StockRuleError(`Stock can't go below 0. ${item.currentStock} ${item.unit} on hand.`)
    item.currentStock += change
    const txn: InventoryTransaction = {
      id: nextId('txn', s.frontendOnly.inventoryTransactions),
      itemId,
      type: 'adjustment',
      quantity: change,
      timestamp: now(s),
      userId: by.id,
      studentNumber: null,
      visitId: null,
      reason: input.reason,
      note,
    }
    s.frontendOnly.inventoryTransactions.push(txn)
    audit(s, by, 'submit', { type: 'inventory-adjustment', id: txn.id }, ADJUSTMENT_REASON_LABELS[input.reason])
    return { ...item, ...inventoryStatusFor(s, item) }
  })
}

// ---- medicines & supplies given (ADR-018) ---------------------------------------------------

export interface ItemLineInput {
  itemId: string
  quantity: number
  instructions?: string | null
}

export const INSTRUCTIONS_MAX_LENGTH = 120

/** A stock rule was broken (expired or unknown item, bad quantity). The write is rolled back. */
export class StockRuleError extends Error {}

const QUANTITY_RULE = 'Quantities must be whole numbers of at least 1.'

function isExpired(s: DbState, item: InventoryItem): boolean {
  return inventoryStatusFor(s, item).flags.includes('expired')
}

function expiredMessage(item: InventoryItem): string {
  return `${item.name} is expired and can't be given. Dispose of it with Adjust Stock.`
}

/**
 * Moves a record's medicine lines from `before` to `next`. Every line is validated first; then each
 * changed item moves stock and gets one transaction and one audit entry, linked by Student Number
 * and visit. A new record dispenses; an edit writes `visit_edited` adjustments instead of rewriting
 * history. The expired rule covers only added or increased quantity. New lines snapshot the item's
 * current name and unit; kept lines keep theirs. Returns the lines and the items now below zero.
 */
function applyItemLines(
  s: DbState,
  by: SessionUser,
  link: { studentNumber: StudentNumber; visitId?: string; incidentId?: string },
  before: ItemGivenLine[],
  next: ItemLineInput[],
  mode: 'dispense' | 'adjust',
): { lines: ItemGivenLine[]; belowZero: string[] } {
  const seen = new Set<string>()
  for (const line of next) {
    if (seen.has(line.itemId)) throw new StockRuleError('Each item can appear on only one line.')
    seen.add(line.itemId)
    if (!Number.isInteger(line.quantity) || line.quantity < 1) throw new StockRuleError(QUANTITY_RULE)
    if ((line.instructions?.trim().length ?? 0) > INSTRUCTIONS_MAX_LENGTH)
      throw new StockRuleError(`Instructions can be at most ${INSTRUCTIONS_MAX_LENGTH} characters.`)
  }
  const oldQuantity = new Map(before.map((line) => [line.itemId, line.quantity]))
  const newQuantity = new Map(next.map((line) => [line.itemId, line.quantity]))
  const changes = [...new Set([...oldQuantity.keys(), ...newQuantity.keys()])]
    .map((itemId) => ({ itemId, delta: (newQuantity.get(itemId) ?? 0) - (oldQuantity.get(itemId) ?? 0) }))
    .filter((change) => change.delta !== 0)
    .map((change) => {
      const item = s.inventoryItems.find((i) => i.id === change.itemId)
      if (!item) throw new StockRuleError('One of the items no longer exists in inventory.')
      if (change.delta > 0 && isExpired(s, item)) throw new StockRuleError(expiredMessage(item))
      return { ...change, item }
    })

  for (const { itemId, delta, item } of changes) {
    item.currentStock -= delta
    const base = {
      id: nextId('txn', s.frontendOnly.inventoryTransactions),
      itemId,
      timestamp: now(s),
      userId: by.id,
      studentNumber: link.studentNumber,
      visitId: link.visitId ?? null,
      ...(link.incidentId ? { incidentId: link.incidentId } : {}),
    }
    const txn: InventoryTransaction =
      mode === 'dispense'
        ? { ...base, type: 'dispense', quantity: delta }
        : { ...base, type: 'adjustment', quantity: -delta, reason: 'visit_edited', note: null }
    s.frontendOnly.inventoryTransactions.push(txn)
    if (mode === 'dispense') audit(s, by, 'submit', { type: 'inventory-dispensation', id: txn.id })
    else audit(s, by, 'submit', { type: 'inventory-adjustment', id: txn.id }, ADJUSTMENT_REASON_LABELS.visit_edited)
  }

  const kept = new Map(before.map((line) => [line.itemId, line]))
  const lines = next.map((line): ItemGivenLine => {
    const old = kept.get(line.itemId)
    const item = changes.find((change) => change.itemId === line.itemId)?.item
    return {
      itemId: line.itemId,
      itemName: old?.itemName ?? item!.name,
      unit: old?.unit ?? item!.unit,
      quantity: line.quantity,
      instructions: line.instructions?.trim() || null,
    }
  })
  return { lines, belowZero: changes.filter((change) => change.item.currentStock < 0).map((change) => change.item.name) }
}

// ---- reports ---------------------------------------------------------------------------------

export interface ComplaintCount {
  complaint: string
  count: number
}

export interface MonthlyReportData {
  month: string
  counts: { visits: number; incidents: number; followUps: number }
  /** Incident archive rows carry the Student Number only (multi-student list, ADR-004). */
  incidents: Array<Incident & { studentNumber: StudentNumber }>
  /** Visits per complaint, most frequent first (ties alphabetical, so the order is stable). */
  complaintCounts: ComplaintCount[]
}

function complaintCounts(visits: Visit[]): ComplaintCount[] {
  const counts = new Map<string, number>()
  for (const v of visits) counts.set(v.complaint, (counts.get(v.complaint) ?? 0) + 1)
  return [...counts]
    .map(([complaint, count]) => ({ complaint, count }))
    .sort((a, b) => b.count - a.count || a.complaint.localeCompare(b.complaint))
}

/** `month` is "YYYY-MM". Everything is generated from raw records on each call. */
export function getMonthlyReport(month: string): Promise<MonthlyReportData> {
  return read('monthly report', (s) => {
    const byId = studentsById(s)
    return {
      month,
      counts: monthlyCounts(s, month),
      incidents: s.incidents
        .filter((i) => i.time.startsWith(month))
        .sort((a, b) => b.time.localeCompare(a.time))
        .map((i) => ({ ...i, studentNumber: byId.get(i.studentId)?.studentNumber ?? 'Unknown student' })),
      complaintCounts: complaintCounts(s.visits.filter((v) => v.dateTime.startsWith(month))),
    }
  })
}

/** Previously generated reports, with `data` regenerated from current records (never stored). */
export function listReports(): Promise<Report[]> {
  return read('reports', (s) =>
    s.reports.map((r) => ({ ...r, data: reportData(s, r.type, r.dateRange) })),
  )
}

function reportData(s: DbState, type: ReportType, range: { from: ISODate; to: ISODate }) {
  const inRange = (d: string) => d >= range.from && d <= range.to
  const visits = s.visits.filter((v) => inRange(dateOf(v.dateTime)))
  const incidents = s.incidents.filter((i) => inRange(dateOf(i.time)))
  if (type === 'incident') return { incidents: incidents.length }
  if (type === 'health_summary') return { complaintCounts: complaintCounts(visits) }
  return { visits: visits.length, incidents: incidents.length }
}

// ---- backups -------------------------------------------------------------------------------

export type BackupStatusView = BackupStatus & { verifiedByName: string | null }

export function getBackupStatus(): Promise<BackupStatusView> {
  return read('backup status', (s) => {
    const status = backupStatus(s)
    return { ...status, verifiedByName: userName(s, status.latest?.verifiedByUserId ?? null) }
  })
}

/** Staff confirms the latest backup file exists and looks right (Backup Verification #32). */
export function verifyLatestBackup(actor?: SessionUser): Promise<BackupStatusView> {
  return write('verify backup', (s) => {
    const by = actorOr(actor)
    const latest = must(backupStatus(s).latest, 'Backup')
    const record = must(s.backupLogs.find((b) => b.lastRun === latest.lastRun), 'Backup')
    record.verifiedByUserId = by.id
    audit(s, by, 'update', { type: 'backup', id: record.lastRun }, 'Verified backup')
    return { ...backupStatus(s), verifiedByName: userName(s, by.id) }
  })
}

// ---- dashboard -----------------------------------------------------------------------------

export function getDashboardSummary(query: DashboardQuery): Promise<DashboardSummary> {
  return read('dashboard summary', (s) => buildDashboardSummary(s, query, new Date().toISOString()))
}

export function getCalendarDays(from: ISODate, to: ISODate): Promise<CalendarDay[]> {
  return read('calendar', (s) => buildCalendarDays(s, from, to))
}

// ---- holidays (Module 9, ADR-020; read-only reference data) --------------------------------

/**
 * Nationwide holidays from the bundled `holidays-ph.json`. Phase B replaces this with the
 * backend's synced copy; the shape stays the same, and the frontend never fetches it itself.
 */
export function getHolidays(from: ISODate, to: ISODate): Promise<HolidayFeed> {
  return read('holidays', () => {
    const all = isEmptied('holidays') ? [] : (holidayData.holidays as Holiday[])
    return {
      holidays: all.filter((h) => h.date >= from && h.date <= to),
      years: [...new Set(all.map((h) => Number(h.date.slice(0, 4))))],
      lastUpdated: holidayData.meta.lastUpdated,
      source: holidayData.meta.source,
    }
  })
}

// ---- calendar events (Module 9, ADR-019; PROVISIONAL pending the ERD) ----------------------

export { CALENDAR_EVENT_TITLE_MAX }

export interface CalendarEventInput {
  title: string
  startDate: ISODate
  /** '' or null for a one-day event. */
  endDate: ISODate | '' | null
}

export type CalendarEventErrors = Partial<Record<keyof CalendarEventInput, string>>

const isRealDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && toISODate(parseISODate(value)) === value

/** Field messages for an event form; empty when the input is valid. The writes below enforce the same rules. */
export function validateCalendarEvent(input: CalendarEventInput): CalendarEventErrors {
  const errors: CalendarEventErrors = {}
  const title = input.title.trim()
  if (!title) errors.title = 'Enter a title for the event.'
  else if (title.length > CALENDAR_EVENT_TITLE_MAX) errors.title = `Keep the title to ${CALENDAR_EVENT_TITLE_MAX} characters or fewer.`
  if (!input.startDate) errors.startDate = 'Choose the date the event starts.'
  else if (!isRealDate(input.startDate)) errors.startDate = 'Enter a valid start date.'
  if (input.endDate) {
    if (!isRealDate(input.endDate)) errors.endDate = 'Enter a valid end date.'
    else if (!errors.startDate && input.endDate < input.startDate) errors.endDate = "The end date can't be before the start date."
  }
  return errors
}

export class CalendarEventValidationError extends Error {
  readonly errors: CalendarEventErrors
  constructor(errors: CalendarEventErrors) {
    super(Object.values(errors).join(' '))
    this.errors = errors
  }
}

function cleanEvent(input: CalendarEventInput): Pick<CalendarEvent, 'title' | 'startDate' | 'endDate'> {
  const errors = validateCalendarEvent(input)
  if (Object.keys(errors).length) throw new CalendarEventValidationError(errors)
  // An end date on the start date is a one-day event.
  const endDate = input.endDate && input.endDate !== input.startDate ? input.endDate : null
  return { title: input.title.trim(), startDate: input.startDate, endDate }
}

export function createCalendarEvent(input: CalendarEventInput, actor?: SessionUser): Promise<CalendarEvent> {
  return write('add calendar event', (s) => {
    const by = actorOr(actor)
    const at = now(s)
    const event: CalendarEvent = {
      id: nextId('calendar-event', s.frontendOnly.calendarEvents),
      ...cleanEvent(input),
      createdByUserId: by.id,
      createdAt: at,
      updatedAt: at,
    }
    s.frontendOnly.calendarEvents.push(event)
    audit(s, by, 'create', { type: 'calendar-event', id: event.id })
    return event
  })
}

export function updateCalendarEvent(id: string, input: CalendarEventInput, actor?: SessionUser): Promise<CalendarEvent> {
  return write('edit calendar event', (s) => {
    const by = actorOr(actor)
    const event = must(s.frontendOnly.calendarEvents.find((e) => e.id === id), 'Calendar event')
    const next = cleanEvent(input)
    const summary = changedSummary(event, next)
    Object.assign(event, next, { updatedAt: now(s) })
    audit(s, by, 'update', { type: 'calendar-event', id }, summary)
    return event
  })
}

export function deleteCalendarEvent(id: string, actor?: SessionUser): Promise<void> {
  return write('delete calendar event', (s) => {
    const by = actorOr(actor)
    const index = s.frontendOnly.calendarEvents.findIndex((e) => e.id === id)
    must(index >= 0 ? s.frontendOnly.calendarEvents[index] : undefined, 'Calendar event')
    s.frontendOnly.calendarEvents.splice(index, 1)
    audit(s, by, 'delete', { type: 'calendar-event', id })
  })
}

// ---- QR lookup & audit ---------------------------------------------------------------------

/** A QR scan (or manual Student Number entry) is itself audited: who looked up whom, when. */
export function lookupStudentByScan(
  studentNumber: StudentNumber,
  actor?: SessionUser,
): Promise<{ student: Student } & StudentHistory> {
  return write('QR lookup', (s) => {
    const student = must(view().students.find((st) => st.studentNumber === studentNumber), 'Student')
    audit(s, actorOr(actor), 'scan', { type: 'student', id: student.id })
    const history = (list: Array<{ studentId: string }>) => list.filter((r) => r.studentId === student.id)
    const v = view()
    return {
      student: toStudent(student),
      visits: (history(v.visits) as Visit[]).sort((a, b) => b.dateTime.localeCompare(a.dateTime)).slice(0, 4),
      incidents: (history(v.incidents) as Incident[]).sort((a, b) => b.time.localeCompare(a.time)).slice(0, 4),
    }
  })
}

export function getAuditLog(): Promise<AuditLogEntry[]> {
  return read('audit log', (s) => [...s.auditLog].sort((a, b) => b.timestamp.localeCompare(a.timestamp)))
}

export interface IssueReportInput {
  description: string
  route: string
  pageName: string
}

export function createIssueReport(input: IssueReportInput, actor?: SessionUser): Promise<IssueReport> {
  return write('report issue', (s) => {
    const by = actorOr(actor)
    const description = input.description.trim()
    if (!description) throw new Error('Issue description is required.')
    const report: IssueReport = {
      id: nextId('issue-report', s.frontendOnly.issueReports),
      description,
      route: input.route,
      pageName: input.pageName,
      role: by.role,
      reportedByUserId: by.id,
      createdAt: now(s),
    }
    s.frontendOnly.issueReports.push(report)
    audit(s, by, 'create', { type: 'issue-report', id: report.id })
    return report
  })
}

export function listIssueReports(): Promise<IssueReport[]> {
  return read('issue reports', (s) =>
    [...s.frontendOnly.issueReports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  )
}

/** Privacy-safe, resolved Audit Log Viewer data. Reading it intentionally creates no audit entry (ADR-016). */
export function listAuditLog(query: AuditLogQuery): Promise<AuditLogList> {
  return read('audit log', (s) => auditLogList(s, query))
}
