import { isLrn, normalizeLrn } from '../lrn'
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
  InventoryBatch,
  InventoryBatchAllocation,
  InventoryItem,
  ISODate,
  ISODateTime,
  ItemGivenLine,
  ParentNotificationAttempt,
  CalledContact,
  ParentNotificationOutcome,
  Report,
  ReportType,
  Student,
  StudentSearchResult,
  User,
  UserRole,
  Visit,
} from '../../types/entities'
import { normalizeComplaint } from '../complaints'
import { incidentCompletionBlocker } from '../itemsGiven'
import { DISPOSITION_LABELS } from '../dispositions'
import { addDays, parseISODate, toISODate } from '../dates'
import type { BackupAlert, CalendarDay, CalendarDayEvent, DashboardQuery, DashboardSummary, Holiday, HolidayFeed } from '../../types/dashboard'
import holidayData from './holidays-ph.json'
import type { FollowUpDueState } from '../../components/status/followUp'
import { buildCalendarDays, buildDashboardSummary } from './dashboard'
import { isEmptied, simulateRequest } from './devToggles'
import {
  backupStatus,
  auditLogList,
  complaintSuggestions,
  countedVisits,
  dateOf,
  followUpDueState,
  gradeLevels,
  incompleteRecordQueue,
  inventoryStatusFor,
  missingRequiredFields,
  monthlyCounts,
  searchStudents as searchStudentRecords,
  studentsById,
  toStudent,
  type BackupStatus,
  type AuditLogList,
  type AuditLogQuery,
  type IncompleteRecordRow,
  type InventoryStatus,
} from './selectors'
import { clearMockSession, firstViewThisSession, getMockSessionUser, type SessionUser } from './session'
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
  SportsReport,
  SportsReportWindow,
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

/**
 * A read-only view of the store with any `?mock=empty` / `?mockEmpty=` collections emptied. Visits
 * marked "Entered in error" are left out of every list, count and report (panel review part 2) unless
 * `includeEnteredInError` is set: one deliberately opened visit, or the Visit Log's filter.
 */
function view(includeEnteredInError = false): DbState {
  const s = db()
  return {
    ...s,
    users: isEmptied('users') ? [] : s.users,
    students: isEmptied('students') ? [] : s.students,
    visits: isEmptied('visits') ? [] : includeEnteredInError ? s.visits : s.visits.filter((v) => !v.enteredInError),
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
      sportsReports: isEmptied('sportsReports') ? [] : s.frontendOnly.sportsReports,
    },
  }
}

async function read<T>(label: string, select: (state: DbState) => T, includeEnteredInError = false): Promise<T> {
  await simulateRequest(label)
  return structuredClone(select(view(includeEnteredInError)))
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
  lrn: 'LRN',
  gradeLevel: 'grade level',
  contactInfo: 'contact info',
  medicalConditions: 'medical conditions',
  emergencyContacts: 'emergency contacts',
  currentStock: 'stock',
  expirationDate: 'expiration date',
  lowStockThreshold: 'low-stock threshold',
  dateTime: 'date and time',
  eventTag: 'event tag',
  treatment: 'treatment notes',
  itemsGiven: 'medicines and supplies',
  temperatureC: 'body temperature',
  timeOut: 'time out',
  assistedBy: 'assisted by',
  parentGuardian: 'parent or guardian',
  profilePicture: 'profile picture',
  brand: 'generic or branded',
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

/** What a print's audit entry names when it is about a record rather than a document title. */
export interface PrintAuditRecord {
  type: string
  id: string
  /** Counts or field names only, never student values (ADR-017). */
  summary?: string
}

/** Records one completed print request. The document title is display-safe audit metadata. */
export function recordPrint(documentTitle: string, actor?: SessionUser, record?: PrintAuditRecord): Promise<void> {
  return write('print document', (s) => {
    if (record) audit(s, actorOr(actor), 'print', { type: record.type, id: record.id }, record.summary)
    else audit(s, actorOr(actor), 'print', { type: 'print-document', id: documentTitle })
  })
}

/**
 * ADR-038 item 4: the Admin opening a student profile or an incident report is logged (who, what,
 * when), once per record per sign-in session. Staff views are not logged (open DECIDE).
 */
export async function recordAdminView(target: { type: 'student' | 'incident'; id: string }, actor: SessionUser): Promise<void> {
  if (actor.role !== 'admin' || !firstViewThisSession(`${actor.id}|${target.type}|${target.id}`)) return
  await write('record view', (s) => {
    audit(s, actor, 'view', target, target.type === 'student' ? 'Opened student profile' : 'Opened incident report')
  })
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

/** Audit entry for a lockout: 5 wrong passwords in a row, locked for 30 minutes. Never the passwords. */
function logLockout(user: Pick<SessionUser, 'id' | 'name' | 'role'>, where: string): Promise<void> {
  return write('lockout', (s) => {
    audit(s, { id: user.id, name: user.name, role: user.role }, 'login', { type: 'user', id: user.id }, `Account locked for 30 minutes after 5 wrong passwords (${where})`)
  })
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
  if (!user || !account || user.deactivatedAt || currentPassword !== password) {
    attempt.failures += 1
    if (attempt.failures >= 5) {
      attempt.failures = 0
      attempt.lockedUntil = Date.now() + 30 * 60 * 1000
      // A lockout is a security event, so it is logged against the account (Zean, Friday, October 23,
      // 2026). An unknown username has no account to attribute it to; a single wrong password isn't logged.
      if (user) await logLockout(user, 'sign-in')
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
  profilePicture?: string | null
  /** Required for a new account; the person must change it at first sign-in. */
  temporaryPassword?: string
}

/** Only the Admin/Principal manages accounts (ADR-033). */
export class AccountPermissionError extends Error {
  constructor() {
    super('Only the Admin/Principal can manage accounts.')
  }
}

/** The last active Admin/Principal can never be disabled or demoted (ADR-033). */
export class LastAdminError extends Error {
  constructor() {
    super('This is the only active Admin/Principal account. Add or enable another Admin first.')
  }
}

const MIN_PASSWORD_LENGTH = 8

function requireAdmin(actor: SessionUser) {
  if (actor.role !== 'admin') throw new AccountPermissionError()
}

function isLastActiveAdmin(state: DbState, user: User): boolean {
  return (
    user.role === 'admin' &&
    !user.deactivatedAt &&
    !state.users.some((u) => u.id !== user.id && u.role === 'admin' && !u.deactivatedAt)
  )
}

/** Sets a temporary password that must be changed at the next sign-in (Force Password Change). */
function setTemporaryPassword(state: DbState, userId: string, password: string) {
  const trimmed = password.trim()
  if (trimmed.length < MIN_PASSWORD_LENGTH) throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  const account = state.frontendOnly.devAccounts.find((candidate) => candidate.userId === userId)
  if (account) Object.assign(account, { password: trimmed, mustChangePassword: true })
  else state.frontendOnly.devAccounts.push({ userId, password: trimmed, mustChangePassword: true })
  passwordHistory.delete(userId)
  changedPasswordUsers.delete(userId)
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
    const actor = actorOr(options.actor)
    requireAdmin(actor)
    const username = input.username.trim().toLowerCase()
    if (s.users.some((u) => u.id !== options.userId && u.username.toLowerCase() === username)) {
      throw new DuplicateUsernameError()
    }
    const existing = options.userId ? must(s.users.find((u) => u.id === options.userId), 'User') : null
    if (existing && input.role !== 'admin' && isLastActiveAdmin(s, existing)) throw new LastAdminError()
    const next = {
      name: input.name.trim(),
      username: input.username.trim(),
      role: input.role,
      profilePicture: input.profilePicture ?? null,
    }
    const summary = existing ? changedSummary(existing, next) : undefined
    const user: User = existing
      ? Object.assign(existing, next)
      : {
          id: nextUserId(s, input.role),
          ...next,
          lastLogin: null,
        }
    if (!existing) {
      setTemporaryPassword(s, user.id, input.temporaryPassword ?? '')
      s.users.push(user)
    }
    audit(s, actor, existing ? 'update' : 'create', { type: 'user', id: user.id }, summary)
    return user
  })
}

/** Disables or re-enables an account. Disabled accounts stay listed and in the audit history. */
export function setUserActive(userId: string, active: boolean, actor?: SessionUser): Promise<User> {
  return write(active ? 'enable user' : 'disable user', (s) => {
    const by = actorOr(actor)
    requireAdmin(by)
    const user = must(s.users.find((u) => u.id === userId), 'User')
    if (!active && isLastActiveAdmin(s, user)) throw new LastAdminError()
    if (active === !user.deactivatedAt) return user
    user.deactivatedAt = active ? null : now(s)
    audit(s, by, 'update', { type: 'user', id: user.id }, active ? 'Enabled account' : 'Disabled account')
    return user
  })
}

/** Gives the account a temporary password that must be changed at the next sign-in. No recovery flow. */
export function resetUserPassword(userId: string, temporaryPassword: string, actor?: SessionUser): Promise<void> {
  return write('reset password', (s) => {
    const by = actorOr(actor)
    requireAdmin(by)
    const user = must(s.users.find((u) => u.id === userId), 'User')
    setTemporaryPassword(s, user.id, temporaryPassword)
    audit(s, by, 'update', { type: 'user', id: user.id }, 'Reset password')
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
          !search || st.fullName.toLowerCase().includes(search) || (/^\d+$/.test(search) && st.lrn.startsWith(search)),
      )
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .slice(0, query.limit ?? Infinity)
      .map(toStudent)
  })
}

/**
 * Student lookup by name or LRN prefix: active students only, at most `limit` results, no medical
 * fields (see `searchStudents` in selectors.ts).
 */
export function searchStudents(query: string, limit = 8): Promise<StudentSearchResult[]> {
  return read('student search', (s) => searchStudentRecords(s, query, limit))
}

/** By the internal id, which addresses carry; the LRN never goes in a URL (ADR-028). */
export function getStudent(id: string): Promise<Student> {
  return read('student', (s) => toStudent(studentOf(s, id)))
}

/**
 * A default student for screens opened without one (demo convenience until real navigation always
 * supplies a student): the first active, complete record, preferring one with history.
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

export type StudentInput = Pick<
  Student,
  'lrn' | 'fullName' | 'gradeLevel' | 'sex' | 'contactInfo' | 'allergies' | 'medicalConditions' | 'emergencyContacts'
>

export interface DuplicateMatch {
  id: string
  fullName: string
  lrn: string
  gradeLevel: string
}

/** The LRN is unique; the message never names the other student (ADR-028). */
export class DuplicateLrnError extends Error {
  constructor() {
    super('This LRN is already used by another student record.')
  }
}

/** The LRN is the student's identifier: set on create, never changed afterwards (ADR-028, Sir Rey). */
export class LrnLockedError extends Error {
  constructor() {
    super("The LRN is the student's identifier and can't be changed.")
  }
}

/** A name correction is allowed, but needs a reason of at least 3 characters (Sir Rey, October 25, 2026). */
export class NameCorrectionReasonError extends Error {
  constructor() {
    super('Enter a reason for the name correction (at least 3 characters).')
  }
}

export const NAME_CORRECTION_REASON_MIN = 3

export type SaveStudentResult =
  | { status: 'duplicate'; matches: DuplicateMatch[] }
  | { status: 'saved'; student: Student; action: 'create' | 'update' }

/**
 * Create or update a student. On create, a name + grade-level match against an active record blocks
 * the save until `confirmDuplicate` is passed (Frontend Context Brief §6, duplicate detection).
 * On update the LRN can't change, and a changed name needs `nameCorrectionReason`; the audit entry
 * records that the name was corrected and why, never the old or new name.
 */
export function saveStudent(
  input: StudentInput,
  options: { studentId?: string; confirmDuplicate?: boolean; actor?: SessionUser; nameCorrectionReason?: string } = {},
): Promise<SaveStudentResult> {
  return write('save student', (s): SaveStudentResult => {
    const lrn = normalizeLrn(input.lrn)
    if (!isLrn(lrn)) throw new Error('The LRN must be exactly 12 digits.')
    const current = options.studentId ? studentOf(s, options.studentId) : null
    if (current && current.lrn !== lrn) throw new LrnLockedError()
    const nameChanged = current !== null && current.fullName !== input.fullName.trim()
    const reason = options.nameCorrectionReason?.trim() ?? ''
    if (nameChanged && reason.length < NAME_CORRECTION_REASON_MIN) throw new NameCorrectionReasonError()
    if (s.students.some((st) => st.id !== options.studentId && st.lrn === lrn)) throw new DuplicateLrnError()
    const name = input.fullName.trim().toLowerCase()
    const matches = s.students
      .filter((st) => st.id !== options.studentId && !st.archived)
      .filter((st) => st.fullName.trim().toLowerCase() === name && st.gradeLevel === input.gradeLevel)
      .map((st) => ({ id: st.id, fullName: st.fullName, lrn: st.lrn, gradeLevel: st.gradeLevel }))
    if (!options.studentId && matches.length && !options.confirmDuplicate) return { status: 'duplicate', matches }

    const existing = options.studentId ? studentOf(s, options.studentId) : null
    const fields = {
      lrn,
      fullName: input.fullName.trim(),
      gradeLevel: input.gradeLevel,
      sex: input.sex,
      contactInfo: input.contactInfo.trim(),
      allergies: input.allergies,
      medicalConditions: input.medicalConditions,
      emergencyContacts: input.emergencyContacts,
    }
    const changed = existing ? changedSummary(existing, fields) : undefined
    const summary = nameChanged ? `${changed}. Name corrected; reason: ${reason}` : changed
    const wasIncomplete = existing ? missingRequiredFields(existing).length > 0 : false
    let record: SeedStudent
    if (existing) record = Object.assign(existing, fields)
    else {
      record = { id: nextId('student', s.students), archived: false, ...fields }
      s.students.push(record)
    }
    const action = existing ? 'update' : 'create'
    const by = actorOr(options.actor)
    audit(s, by, action, { type: 'student', id: record.id }, summary)
    // Completing a flagged record resolves it in the Incomplete Records queue, crediting whoever saved it.
    if (wasIncomplete && !missingRequiredFields(record).length) {
      let review = s.frontendOnly.recordReviews.find((r) => r.studentId === record.id)
      if (!review) {
        review = { studentId: record.id, importedAt: s.today, importedBy: 'Flagged in CLINIQ', resolvedByUserId: null, resolvedAt: null }
        s.frontendOnly.recordReviews.push(review)
      }
      review.resolvedByUserId = by.id
      review.resolvedAt = now(s)
    }
    return { status: 'saved', student: toStudent(record), action }
  })
}

/** Archive, never delete (data retention policy): hidden from active lists, kept for 5 years. */
export function archiveStudent(studentId: string, actor?: SessionUser): Promise<Student> {
  return write('archive student', (s) => {
    const record = studentOf(s, studentId)
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

// ---- visits --------------------------------------------------------------------------------

/** Visits marked "Entered in error" are left out unless `includeEnteredInError` is set (the Visit Log's filter). */
export function listVisits(
  range?: { from: ISODate; to: ISODate },
  options: { includeEnteredInError?: boolean } = {},
): Promise<Visit[]> {
  return read(
    'visits',
    (s) =>
      s.visits
        .filter((v) => !range || (dateOf(v.dateTime) >= range.from && dateOf(v.dateTime) <= range.to))
        .sort((a, b) => b.dateTime.localeCompare(a.dateTime)),
    options.includeEnteredInError,
  )
}

/** One deliberately opened visit, including one marked "Entered in error". */
export function getVisit(id: string): Promise<Visit> {
  return read('visit', (s) => must(s.visits.find((v) => v.id === id), 'Visit'), true)
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

export interface RecordVisitInput extends Partial<VisitLogbookFields> {
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
  /**
   * "YYYY-MM-DDTHH:MM" when the visit happened, if not now (a late entry, ADR-029). Never in the future.
   * Omitted, the visit is dated when it is saved.
   */
  dateTime?: string
  /** Optional reason for a late entry, such as "system was down". */
  lateEntryReason?: string | null
}

/** A visit dated more than this many minutes before it is saved is a late entry (D1 of the panel-review prompt). */
export const LATE_ENTRY_MINUTES = 30

/** The visit's date and time from "YYYY-MM-DDTHH:MM", checked against now, and whether it is a late entry. */
function visitTime(s: DbState, input: Pick<RecordVisitInput, 'dateTime' | 'lateEntryReason'>) {
  const saved = now(s)
  if (!input.dateTime) return { dateTime: saved, lateEntry: false, lateEntryReason: null }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.dateTime)) throw new Error('Enter the visit date and time.')
  const dateTime = `${input.dateTime}:00+08:00`
  if (dateTime > saved) throw new Error("The visit date and time can't be in the future.")
  const lateEntry = Date.parse(saved) - Date.parse(dateTime) > LATE_ENTRY_MINUTES * 60_000
  return { dateTime, lateEntry, lateEntryReason: lateEntry ? input.lateEntryReason?.trim() || null : null }
}

/** The visit's optional logbook fields (body temperature, time out, assisted by, parent/guardian, remarks). */
export type VisitLogbookFields = Pick<Visit, 'temperatureC' | 'timeOut' | 'assistedBy' | 'parentGuardian' | 'remarks'>

/** Blank text is stored as null; a time out must be "HH:MM" and not earlier than the time in. */
function logbookFields(input: Partial<VisitLogbookFields>, timeIn: ISODateTime): VisitLogbookFields {
  const text = (value: string | null | undefined) => value?.trim() || null
  const timeOut = text(input.timeOut)
  if (timeOut && !/^\d{2}:\d{2}$/.test(timeOut)) throw new Error('Time out must be HH:MM.')
  if (timeOut && timeOut < timeIn.slice(11, 16)) throw new Error("Time out can't be earlier than the time in.")
  const temperatureC = input.temperatureC ?? null
  if (temperatureC !== null && !Number.isFinite(temperatureC)) throw new Error('Body temperature must be a number.')
  return {
    temperatureC,
    timeOut,
    assistedBy: text(input.assistedBy),
    parentGuardian: text(input.parentGuardian),
    remarks: text(input.remarks),
  }
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
    if (visitId && activeApproval(s, visitId))
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
    const { dateTime, lateEntry, lateEntryReason } = visitTime(s, input)
    const visit: Visit = {
      id: nextId('visit', s.visits),
      studentId: input.studentId,
      dateTime,
      // Stored in a known suggestion's spelling, so counts never split by case.
      complaint: normalizeComplaint(input.complaint, complaintSuggestions(s)),
      treatment: input.treatment,
      disposition: input.disposition,
      loggedByUserId: by.id,
      eventTag: input.eventTag?.trim() || null,
      itemsGiven: [],
      ...extra,
      ...logbookFields(input, dateTime),
      ...(lateEntry && { lateEntry, lateEntryReason }),
    }
    s.visits.push(visit)
    // The summary says "late entry", never the reason text (ADR-017).
    audit(s, by, 'submit', { type: 'visit', id: visit.id }, lateEntry ? 'Late entry' : undefined)
    const given = applyItemLines(s, by, { studentId: student.id, visitId: visit.id }, [], itemLines, 'dispense')
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
  /** "YYYY-MM-DDTHH:MM" to correct when the visit happened; never in the future. Omitted, it stays. */
  dateTime?: string
} & Partial<Pick<Visit, 'excuseLetterDraft' | 'referredTo'> & VisitLogbookFields>

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
    if (visit.enteredInError) throw new Error('This visit was marked entered in error and can no longer be edited.')
    const { itemsGiven, excuseLetterDraft, referredTo, temperatureC, timeOut, assistedBy, parentGuardian, remarks, dateTime: correctedTime, ...rest } = patch
    // A corrected time is checked like a new visit's (never in the future); the audit names the field.
    // Callers that pass the whole visit back send its saved timestamp; same minute means unchanged.
    const dateTime =
      correctedTime && correctedTime.slice(0, 16) !== visit.dateTime.slice(0, 16)
        ? visitTime(s, { dateTime: correctedTime.slice(0, 16) }).dateTime
        : visit.dateTime
    // Omitted disposition fields stay as they are; checked against the (possibly new) disposition.
    const extra = dispositionFields(s, id, rest.disposition, excuseLetterDraft === undefined ? visit.excuseLetterDraft : excuseLetterDraft, referredTo === undefined ? visit.referredTo : referredTo)
    // Same normalization as a new visit, so an edit can't reintroduce a spelling or case variant.
    // Omitted logbook fields stay as they are.
    const logbook = logbookFields(
      {
        temperatureC: temperatureC === undefined ? visit.temperatureC : temperatureC,
        timeOut: timeOut === undefined ? visit.timeOut : timeOut,
        assistedBy: assistedBy === undefined ? visit.assistedBy : assistedBy,
        parentGuardian: parentGuardian === undefined ? visit.parentGuardian : parentGuardian,
        remarks: remarks === undefined ? visit.remarks : remarks,
      },
      dateTime,
    )
    const fields = { ...rest, dateTime, complaint: normalizeComplaint(rest.complaint, complaintSuggestions(s)), ...extra, ...logbook }
    const given = itemsGiven
      ? applyItemLines(s, by, { studentId: visit.studentId, visitId: id }, visit.itemsGiven, itemsGiven, 'adjust')
      : { lines: visit.itemsGiven, belowZero: [] }
    const summary = changedSummary(visit, { ...fields, itemsGiven: given.lines })
    Object.assign(visit, fields, { itemsGiven: given.lines })
    audit(s, by, 'update', { type: 'visit', id }, summary)
    return { visit, belowZero: given.belowZero }
  })
}

/**
 * Marks a visit "Entered in error" (panel review VS-9, D2). The record is kept, never deleted: it leaves
 * every list and count, its medicines go back to stock through the same `visit_edited` adjustment
 * transactions an edit uses (ADR-018), and its excuse letter, draft or approved, is voided.
 */
export function markVisitEnteredInError(id: string, reason: string, actor?: SessionUser): Promise<Visit> {
  return write('mark visit entered in error', (s) => {
    const by = actorOr(actor)
    const visit = must(s.visits.find((v) => v.id === id), 'Visit')
    const why = reason.trim()
    if (!why) throw new Error('Give the reason this visit was entered in error.')
    if (visit.enteredInError) throw new Error('This visit is already marked entered in error.')
    const marked = { reason: why, at: now(s), byUserId: by.id }
    applyItemLines(s, by, { studentId: visit.studentId, visitId: id }, visit.itemsGiven, [], 'adjust')
    visit.enteredInError = marked
    // The reason stays on the record, not in the audit trail (ADR-017).
    audit(s, by, 'update', { type: 'visit', id }, 'Marked entered in error')
    const approval = activeApproval(s, id)
    if (approval) {
      approval.voided = marked
      audit(s, by, 'update', { type: 'excuse-letter', id: approval.id }, 'Voided: visit entered in error')
    } else if (visit.excuseLetterDraft) audit(s, by, 'update', { type: 'excuse-letter', id: `draft-${id}` }, 'Voided: visit entered in error')
    // Its pending follow-ups are cancelled with the same reason (Zean, Thursday, October 22, 2026).
    for (const followUp of s.followUps)
      if (followUp.status === 'pending' && followUp.relatedRecord.type === 'visit' && followUp.relatedRecord.id === id) {
        followUp.status = 'cancelled'
        followUp.statusReason = `Visit entered in error: ${why}`
        audit(s, by, 'update', { type: 'follow-up', id: followUp.id }, 'Marked cancelled: visit entered in error')
      }
    return visit
  })
}

// ---- excuse letters & PE referrals (frontendOnly) ------------------------------------------

/** The visit's current letter: approved (or voided), never one that a replacement superseded. */
function activeApproval(s: DbState, visitId: string): ExcuseLetterApproval | undefined {
  return s.frontendOnly.excuseLetterApprovals.find((a) => a.visitId === visitId && !a.superseded)
}

export function getExcuseLetterApproval(visitId: string): Promise<ExcuseLetterApproval | null> {
  return read('excuse letter', (s) => activeApproval(s, visitId) ?? null, true)
}

/**
 * One stored letter by its id, whatever its state (current, superseded, or voided with its visit), so
 * an old letter can be opened and reprinted from the student's record, clearly marked not valid.
 */
export function getExcuseLetterById(letterId: string): Promise<ExcuseLetterApproval> {
  return read('excuse letter by id', (s) => must(s.frontendOnly.excuseLetterApprovals.find((a) => a.id === letterId), 'Excuse letter'), true)
}

/**
 * "Issue a replacement" (panel review EX-3): the approved letter of a still-valid visit is marked
 * Superseded with a reason and kept; a new draft with the same period and note opens on the visit.
 */
export function issueReplacementExcuseLetter(visitId: string, reason: string, actor?: SessionUser): Promise<void> {
  return write('issue replacement excuse letter', (s) => {
    const by = actorOr(actor)
    const visit = must(s.visits.find((v) => v.id === visitId), 'Visit')
    const old = activeApproval(s, visitId)
    const why = reason.trim()
    if (!why) throw new Error('Give the reason for the replacement.')
    if (!old) throw new Error('Only an approved letter can be replaced.')
    if (old.voided || visit.enteredInError) throw new Error('A voided letter cannot be replaced.')
    old.superseded = { reason: why, at: now(s), byUserId: by.id }
    visit.excuseLetterDraft = { excusedFrom: old.excusedFrom, excusedUntil: old.excusedUntil, note: old.note }
    audit(s, by, 'update', { type: 'excuse-letter', id: old.id }, 'Superseded; replacement draft opened')
  })
}

export interface StudentExcuseLetter extends ExcusedPeriod {
  id: string
  visitId: string
  disposition: Disposition
  /**
   * `pending`: a draft saved with the visit, not yet approved. `superseded`: replaced by a newer letter.
   * `voided`: its visit was entered in error. Both stay in the record (panel review EX-3).
   */
  status: 'approved' | 'pending' | 'superseded' | 'voided'
}

/** A student's excuse letters, approved and pending, newest period first. */
export function getStudentExcuseLetters(studentId: string): Promise<StudentExcuseLetter[]> {
  return read('student excuse letters', (s) => {
    const approved = s.frontendOnly.excuseLetterApprovals.flatMap((a) => {
      const visit = s.visits.find((v) => v.id === a.visitId && v.studentId === studentId)
      return visit
        ? [{ id: a.id, visitId: a.visitId, disposition: visit.disposition, excusedFrom: a.excusedFrom, excusedUntil: a.excusedUntil, status: a.superseded ? ('superseded' as const) : a.voided || visit.enteredInError ? ('voided' as const) : ('approved' as const) }]
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
  /** Multi-student list: the LRN only (masked on screen), never the name (ADR-004, ADR-028). */
  lrn: string
}

/** Every excuse-letter draft still awaiting approval, oldest visit first, for active students. */
export function listPendingExcuseLetters(): Promise<PendingExcuseLetter[]> {
  return read('pending excuse letters', (s) =>
    s.visits
      .flatMap((v) => {
        const student = s.students.find((st) => st.id === v.studentId)
        return v.excuseLetterDraft && student && !student.archived
          ? [{ visitId: v.id, visitDateTime: v.dateTime, lrn: student.lrn, excusedFrom: v.excuseLetterDraft.excusedFrom, excusedUntil: v.excuseLetterDraft.excusedUntil }]
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
    if (visit.enteredInError) throw new Error('This visit was entered in error, so its excuse letter is void.')
    const invalid = excusedPeriodError(period)
    if (invalid) throw new Error(invalid)
    // Approved letters are permanent: the period is fixed once stored. A superseded one makes room for its replacement.
    if (activeApproval(s, visitId)) throw new Error('This excuse letter is already approved and stored.')
    const earlier = s.frontendOnly.excuseLetterApprovals.filter((a) => a.visitId === visitId).length
    const approval: ExcuseLetterApproval = {
      id: earlier ? `excuse-${visitId}-${earlier + 1}` : `excuse-${visitId}`,
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

export type PeReferralInput = Omit<PeReferral, 'id' | 'createdAt'>

export function submitPeReferral(input: PeReferralInput, actor?: SessionUser): Promise<PeReferral> {
  return write('submit PE referral', (s) => {
    const by = actorOr(actor)
    studentOf(s, input.studentId)
    const referral: PeReferral = {
      ...input,
      id: nextId('pe-referral', s.frontendOnly.peReferrals),
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
  /** When it happened, if not now: the escalated visit's time (ADR-036). ISO, never in the future. */
  time?: ISODateTime
  /** The saved visit being escalated (ADR-036); linked both ways. Omitted for the New Visit shortcut. */
  sourceVisitId?: string
}

/** Stage 1 fast capture: saves with only the complaint plus whichever readings were taken (Activity Diagram 2). */
export function saveIncidentStageOne(input: StageOneInput, actor?: SessionUser): Promise<Incident> {
  return write('save incident stage 1', (s) => {
    const by = actorOr(actor)
    studentOf(s, input.studentId)
    const saved = now(s)
    if (input.time && input.time > saved) throw new Error("The incident time can't be in the future.")
    const source = input.sourceVisitId ? must(s.visits.find((v) => v.id === input.sourceVisitId), 'Visit') : null
    if (source) {
      if (source.studentId !== input.studentId) throw new Error('The escalated visit belongs to another student.')
      if (source.enteredInError) throw new Error('A visit entered in error cannot be escalated.')
      if (source.escalatedIncidentId) throw new Error('This visit was already escalated to an incident.')
    }
    const incident: Incident = {
      id: nextId('incident', s.incidents),
      studentId: input.studentId,
      time: input.time ?? saved,
      complaint: input.complaint,
      vitals: input.vitals,
      hospitalReferral: null,
      parentNotifications: [],
      stage: 1,
      eventTag: null,
      itemsGiven: [],
      generalNotes: input.generalNotes?.trim() || null,
      ...(source && { sourceVisitId: source.id }),
    }
    s.incidents.push(incident)
    if (source) {
      source.escalatedIncidentId = incident.id
      audit(s, by, 'update', { type: 'visit', id: source.id }, 'Escalated to incident')
    }
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
  /** Optional; blank is saved as null. PROVISIONAL (Incident.bodyPart). */
  bodyPart?: string
  /** The reason given with "Nothing further was needed or done"; blank is saved as null. PROVISIONAL. */
  noFurtherActionReason?: string
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
    const noFurtherActionReason = input.noFurtherActionReason?.trim() || null
    // An empty record can't be completed (panel review IN-3); checked before any stock moves.
    const blocker = incidentCompletionBlocker({
      vitals: input.vitals,
      itemsGiven: incident.stage === 2 ? incident.itemsGiven : lines,
      parentNotifications: [...incident.parentNotifications, ...input.newParentNotifications],
      hospitalReferral: input.hospitalReferral,
      noFurtherActionReason,
    })
    if (blocker) throw new Error(blocker)
    let belowZero: string[] = []
    // ponytail: medicines are fixed once Stage 2 is complete; changing them later needs an
    // incident-edit adjustment rule that hasn't been decided (Issues-and-TODOs).
    if (incident.stage === 2) {
      const same = (a: ItemLineInput[], b: ItemGivenLine[]) =>
        a.length === b.length && a.every((line) => b.some((old) => old.itemId === line.itemId && old.quantity === line.quantity))
      if (input.itemsGiven && !same(lines, incident.itemsGiven))
        throw new StockRuleError("Medicines on a completed incident can't be changed.")
    } else {
      const given = applyItemLines(s, by, { studentId: incident.studentId, incidentId: incident.id }, [], lines, 'dispense')
      incident.itemsGiven = given.lines
      belowZero = given.belowZero
    }
    Object.assign(incident, {
      complaint: input.complaint,
      vitals: input.vitals,
      hospitalReferral: input.hospitalReferral,
      stage: 2 as const,
      bodyPart: input.bodyPart?.trim() || null,
      noFurtherActionReason,
    })
    // The summary names the optional fields, never their values (ADR-017).
    const named = [incident.bodyPart && 'body part affected', noFurtherActionReason && 'nothing further was needed or done']
      .filter(Boolean)
      .join(' and ')
    audit(s, by, 'update', { type: 'incident-stage-2', id: incident.id }, `Completed Stage 2 details${named ? `; included ${named}` : ''}`)
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
  calledContact: CalledContact | null = null,
): Promise<ParentNotificationAttempt> {
  return write('add parent notification', (s) => {
    const incident = must(s.incidents.find((i) => i.id === incidentId), 'Incident')
    const attempt: ParentNotificationAttempt = { outcome, timestamp: now(s), calledContact }
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

export interface IncidentTrail {
  recorded: { by: string; at: ISODateTime } | null
  completed: { by: string; at: ISODateTime } | null
  approved: { by: string; at: ISODateTime } | null
}

/**
 * Who recorded, completed, and signed off an incident, read from the audit log (the only place these
 * are kept). `null` when the log has no such entry, e.g. a record from before the log existed.
 */
export function getIncidentTrail(incidentId: string): Promise<IncidentTrail> {
  return read('incident trail', (s) => {
    const find = (action: AuditActionType, types: string[]) => {
      const entry = s.auditLog.find(
        (e) => e.actionType === action && e.targetRecord?.id === incidentId && types.includes(e.targetRecord.type),
      )
      return entry ? { by: userName(s, entry.userId) ?? 'Unknown user', at: entry.timestamp } : null
    }
    return {
      recorded: find('submit', ['incident', 'incident-stage-1']),
      completed: find('update', ['incident-stage-2']),
      approved: find('approve', ['incident-report']),
    }
  })
}

export function approveIncidentReport(incidentId: string, actor?: SessionUser): Promise<void> {
  return write('approve incident report', (s) => {
    const incident = must(s.incidents.find((i) => i.id === incidentId), 'Incident')
    // Only a completed (Stage 2) record is signed off (Zean, Thursday, October 22, 2026).
    if (incident.stage === 1) throw new Error('Complete Stage 2 before approving this report.')
    const blocker = incidentCompletionBlocker(incident)
    if (blocker) throw new Error(blocker)
    audit(s, actorOr(actor), 'approve', { type: 'incident-report', id: incidentId })
  })
}

// ---- follow-ups ------------------------------------------------------------------------------

export type FollowUpView = FollowUp & { lrn: string; dueState: FollowUpDueState | null }

export function listFollowUps(query: { status?: FollowUpStatus | '' } = {}): Promise<FollowUpView[]> {
  return read('follow-ups', (s) => {
    const byId = studentsById(s)
    return s.followUps
      .filter((f) => !query.status || f.status === query.status)
      .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate))
      .map((f) => ({
        ...f,
        lrn: byId.get(f.studentId)?.lrn ?? '',
        dueState: followUpDueState(f, s.today),
      }))
  })
}

/** Missed and Cancelled need a reason (panel review FU-4); it stays on the follow-up, not in the audit trail. */
export function setFollowUpStatus(id: string, status: FollowUpStatus, actor?: SessionUser, reason?: string): Promise<FollowUp> {
  return write('update follow-up', (s) => {
    const followUp = must(s.followUps.find((f) => f.id === id), 'Follow-up')
    const why = reason?.trim() || null
    if ((status === 'missed' || status === 'cancelled') && !why) throw new Error(`Give the reason this follow-up is ${status}.`)
    const summary = followUp.status === status ? undefined : `Marked ${status}`
    followUp.status = status
    if (status === 'missed' || status === 'cancelled') followUp.statusReason = why
    audit(s, actorOr(actor), 'update', { type: 'follow-up', id }, summary)
    return followUp
  })
}

/** "Set a new date" after Missed or Cancelled: a new pending follow-up for the same student, record and reason. */
export function rescheduleFollowUp(id: string, followUpDate: ISODate, actor?: SessionUser): Promise<FollowUp> {
  return write('reschedule follow-up', (s) => {
    const old = must(s.followUps.find((f) => f.id === id), 'Follow-up')
    if (old.status !== 'missed' && old.status !== 'cancelled') throw new Error('Only a missed or cancelled follow-up gets a new date.')
    if (!followUpDate || followUpDate < s.today) throw new Error("The new date can't be in the past.")
    return createFollowUp(s, actorOr(actor), old.studentId, old.relatedRecord, { followUpDate, reason: old.reason, notes: old.notes })
  })
}

// ---- inventory -------------------------------------------------------------------------------

export type InventoryItemView = InventoryItem & InventoryStatus

function inventoryView(s: DbState, item: InventoryItem): InventoryItemView {
  return { ...item, ...inventoryStatusFor(s, item) }
}

export function listInventory(query: { search?: string; category?: InventoryCategory | ''; hasExpiredStock?: boolean; attention?: '' | 'low_stock' | 'expiry' } = {}): Promise<InventoryItemView[]> {
  return read('inventory', (s) => {
    const search = query.search?.trim().toLowerCase() ?? ''
    return s.inventoryItems
      .filter((i) => !search || i.name.toLowerCase().includes(search))
      .filter((i) => !query.category || i.category === query.category)
      .map((i) => inventoryView(s, i))
      .filter((i) => !query.hasExpiredStock || i.expiredStock > 0)
      .filter((i) => !query.attention || (query.attention === 'low_stock' ? i.flags.includes('low_stock') : i.flags.some((flag) => flag !== 'low_stock')))
  })
}

export function getInventoryItem(id: string): Promise<InventoryItemView> {
  return read('inventory item', (s) => {
    const item = must(s.inventoryItems.find((i) => i.id === id), 'Inventory item')
    return inventoryView(s, item)
  })
}

export interface InventoryHistoryRow {
  id: string
  type: InventoryTransaction['type']
  quantity: number
  timestamp: ISODateTime
  reason?: AdjustmentReason
  note?: string | null
  batchAllocations: InventoryBatchAllocation[]
}

/** Immutable inventory movement history, including the batches affected by each movement. */
export function listInventoryHistory(itemId: string): Promise<InventoryHistoryRow[]> {
  return read('inventory history', (s) =>
    s.frontendOnly.inventoryTransactions
      .filter((transaction) => transaction.itemId === itemId)
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .map((transaction) => ({ ...transaction, batchAllocations: transaction.batchAllocations ?? [] })),
  )
}

export type InventoryInput = Omit<InventoryItem, 'id' | 'batches'> & {
  currentStock: number
  expirationDate: ISODate | null
  /** New items only: the clinician's explicit "This item has no expiration date" (ADR-035, panel review IV-2). */
  noExpirationConfirmed?: boolean
}

/**
 * Adds an item, or edits one's name, category, unit, and threshold. An existing item keeps its stock
 * and expiration date: stock moves only through dispense, restock, and adjustment transactions, and
 * the expiration date only through Restock (ADR-018).
 */
export function saveInventoryItem(input: InventoryInput, options: { itemId?: string; actor?: SessionUser } = {}): Promise<InventoryItem> {
  return write('save inventory item', (s) => {
    const existing = options.itemId ? must(s.inventoryItems.find((i) => i.id === options.itemId), 'Inventory item') : null
    const { currentStock, expirationDate, noExpirationConfirmed, ...fields } = input
    // The first batch follows Restock's rule (ADR-035): a date, or an explicit "no expiration". A blank
    // date alone is never read as "no expiration". An existing item's expiry changes only through Restock.
    if (!existing && expirationDate === null && !noExpirationConfirmed)
      throw new StockRuleError('Choose an expiration date, or confirm this item has no expiration date.')
    if (!existing && expirationDate !== null && noExpirationConfirmed)
      throw new StockRuleError('Choose either an expiration date or no expiration date for this item.')
    const summary = existing ? changedSummary(existing, fields) : undefined
    const item = existing
      ? Object.assign(existing, fields)
      : {
          id: nextId('item', s.inventoryItems),
          ...fields,
          batches: [{ id: 'batch-0001', quantity: currentStock, expirationDate, receivedDate: s.today }],
        }
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
  link: { studentId?: string; visitId?: string } = {},
  actor?: SessionUser,
): Promise<DispenseResult> {
  return write('dispense', (s) => {
    const by = actorOr(actor)
    const item = must(s.inventoryItems.find((i) => i.id === itemId), 'Inventory item')
    if (!Number.isInteger(quantity) || quantity < 1) throw new StockRuleError(QUANTITY_RULE)
    if (link.studentId && !s.students.some((st) => st.id === link.studentId))
      throw new StockRuleError('This student record was not found.')
    if (link.visitId && !s.visits.some((v) => v.id === link.visitId)) throw new StockRuleError('That visit no longer exists.')
    const batchAllocations = takeUsableBatches(s, item, quantity)
    const txn = {
      id: nextId('txn', s.frontendOnly.inventoryTransactions),
      itemId,
      type: 'dispense' as const,
      quantity,
      timestamp: now(s),
      userId: by.id,
      studentId: link.studentId ?? null,
      visitId: link.visitId ?? null,
      batchAllocations,
    }
    s.frontendOnly.inventoryTransactions.push(txn)
    audit(s, by, 'submit', { type: 'inventory-dispensation', id: txn.id })
    const status = inventoryStatusFor(s, item)
    return { item: { ...item, ...status }, remainingStock: status.currentStock, belowZero: status.belowZero }
  })
}

/** Restock adds a distinct batch; it never overwrites a prior batch's expiry or quantity. */
export function restockInventoryItem(
  itemId: string,
  quantity: number,
  expirationDate: ISODate | null,
  options: { noExpirationConfirmed?: boolean; actor?: SessionUser } = {},
): Promise<InventoryItemView> {
  return write('restock', (s) => {
    const by = actorOr(options.actor)
    const item = must(s.inventoryItems.find((i) => i.id === itemId), 'Inventory item')
    if (!Number.isInteger(quantity) || quantity < 1) throw new StockRuleError(QUANTITY_RULE)
    if (expirationDate === null && !options.noExpirationConfirmed)
      throw new StockRuleError('Choose an expiration date, or confirm this batch has no expiration date.')
    if (expirationDate !== null && options.noExpirationConfirmed)
      throw new StockRuleError('Choose either an expiration date or no expiration date for this batch.')
    const batch: InventoryBatch = {
      id: nextBatchId(item),
      quantity,
      expirationDate,
      receivedDate: s.today,
    }
    item.batches.push(batch)
    const id = nextId('txn', s.frontendOnly.inventoryTransactions)
    s.frontendOnly.inventoryTransactions.push({
      id, itemId, type: 'restock', quantity, timestamp: now(s), userId: by.id, studentId: null, visitId: null,
      batchAllocations: [{ batchId: batch.id, quantity }],
    })
    audit(s, by, 'submit', { type: 'inventory-restock', id })
    return inventoryView(s, item)
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
  /** The batch being counted, corrected, or explicitly disposed. */
  batchId?: string
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
    const batch = must(item.batches.find((candidate) => candidate.id === input.batchId) ?? item.batches[0], 'Batch')
    const counted = input.countedQuantity
    if (counted !== undefined && (!Number.isInteger(counted) || counted < 0))
      throw new StockRuleError('The counted quantity must be a whole number of 0 or more.')
    const change = counted !== undefined ? counted - batch.quantity : (input.change ?? 0)
    if (!Number.isInteger(change) || change === 0) throw new StockRuleError('Enter a whole-number change other than 0.')
    if (batch.quantity + change < 0)
      throw new StockRuleError(`Stock can't go below 0. ${batch.quantity} ${item.unit} in this batch.`)
    if (input.reason === 'expired_disposed' && !(batch.expirationDate && batch.expirationDate < s.today))
      throw new StockRuleError('Choose an expired batch to record expired stock disposal.')
    batch.quantity += change
    const txn: InventoryTransaction = {
      id: nextId('txn', s.frontendOnly.inventoryTransactions),
      itemId,
      type: 'adjustment',
      quantity: change,
      timestamp: now(s),
      userId: by.id,
      studentId: null,
      visitId: null,
      reason: input.reason,
      note,
      batchAllocations: [{ batchId: batch.id, quantity: change }],
    }
    s.frontendOnly.inventoryTransactions.push(txn)
    audit(s, by, 'submit', { type: 'inventory-adjustment', id: txn.id }, ADJUSTMENT_REASON_LABELS[input.reason])
    return inventoryView(s, item)
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

function nextBatchId(item: InventoryItem): string {
  const maximum = item.batches.reduce((max, batch) => Math.max(max, Number(batch.id.match(/(\d+)$/)?.[1]) || 0), 0)
  return `batch-${String(maximum + 1).padStart(4, '0')}`
}

function usableBatches(s: DbState, item: InventoryItem): InventoryBatch[] {
  return item.batches
    .filter((batch) => batch.expirationDate === null || batch.expirationDate >= s.today)
    .sort((left, right) => (left.expirationDate ?? '9999-12-31').localeCompare(right.expirationDate ?? '9999-12-31'))
}

/** Takes earliest-expiring usable stock first. A shortfall stays a visible negative on the last usable batch. */
function takeUsableBatches(s: DbState, item: InventoryItem, quantity: number): InventoryBatchAllocation[] {
  const batches = usableBatches(s, item)
  if (!batches.length) throw new StockRuleError(`${item.name} has no usable batch and can't be given. Dispose of expired stock before restocking.`)
  let left = quantity
  const allocations: InventoryBatchAllocation[] = []
  for (const batch of batches) {
    if (!left) break
    const taken = Math.min(Math.max(batch.quantity, 0), left)
    if (taken) {
      batch.quantity -= taken
      allocations.push({ batchId: batch.id, quantity: taken })
      left -= taken
    }
  }
  if (left) {
    const last = batches[batches.length - 1]
    last.quantity -= left
    allocations.push({ batchId: last.id, quantity: left })
  }
  return allocations
}

function returnToBatches(item: InventoryItem, allocations: ReadonlyArray<InventoryBatchAllocation>) {
  for (const allocation of allocations) {
    const batch = must(item.batches.find((candidate) => candidate.id === allocation.batchId), 'Original batch')
    batch.quantity += allocation.quantity
  }
}

function splitAllocations(allocations: ReadonlyArray<InventoryBatchAllocation>, quantity: number) {
  let left = quantity
  const returned: InventoryBatchAllocation[] = []
  const kept: InventoryBatchAllocation[] = []
  for (const allocation of [...allocations].reverse()) {
    const amount = Math.min(allocation.quantity, left)
    if (amount) returned.push({ batchId: allocation.batchId, quantity: amount })
    if (allocation.quantity > amount) kept.push({ batchId: allocation.batchId, quantity: allocation.quantity - amount })
    left -= amount
  }
  return { returned, kept: kept.reverse() }
}

/**
 * Moves a record's medicine lines from `before` to `next`. Every line is validated first; then each
 * changed item moves stock and gets one transaction and one audit entry, linked by LRN
 * and visit. A new record dispenses; an edit writes `visit_edited` adjustments instead of rewriting
 * history. The expired rule covers only added or increased quantity. New lines snapshot the item's
 * current name and unit; kept lines keep theirs. Returns the lines and the items now below zero.
 */
function applyItemLines(
  s: DbState,
  by: SessionUser,
  link: { studentId: string; visitId?: string; incidentId?: string },
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
      return { ...change, item }
    })

  for (const { itemId, delta, item } of changes) {
    const beforeLine = before.find((line) => line.itemId === itemId)
    const prior = beforeLine?.batchAllocations ?? (beforeLine ? [{ batchId: item.batches[0]?.id ?? '', quantity: beforeLine.quantity }] : [])
    let batchAllocations: InventoryBatchAllocation[]
    if (delta > 0) batchAllocations = takeUsableBatches(s, item, delta)
    else {
      const split = splitAllocations(prior, -delta)
      returnToBatches(item, split.returned)
      batchAllocations = split.returned.map((allocation) => ({ ...allocation, quantity: -allocation.quantity }))
    }
    const base = {
      id: nextId('txn', s.frontendOnly.inventoryTransactions),
      itemId,
      timestamp: now(s),
      userId: by.id,
      studentId: link.studentId,
      visitId: link.visitId ?? null,
      ...(link.incidentId ? { incidentId: link.incidentId } : {}),
    }
    const txn: InventoryTransaction =
      mode === 'dispense'
        ? { ...base, type: 'dispense', quantity: delta, batchAllocations }
        : { ...base, type: 'adjustment', quantity: -delta, reason: 'visit_edited', note: null, batchAllocations }
    s.frontendOnly.inventoryTransactions.push(txn)
    if (mode === 'dispense') audit(s, by, 'submit', { type: 'inventory-dispensation', id: txn.id })
    else audit(s, by, 'submit', { type: 'inventory-adjustment', id: txn.id }, ADJUSTMENT_REASON_LABELS.visit_edited)
  }

  const kept = new Map(before.map((line) => [line.itemId, line]))
  const lines = next.map((line): ItemGivenLine => {
    const old = kept.get(line.itemId)
    const change = changes.find((candidate) => candidate.itemId === line.itemId)
    const item = change?.item
    const oldAllocations = old?.batchAllocations ?? (old ? [{ batchId: item?.batches[0]?.id ?? '', quantity: old.quantity }] : [])
    const allocations = change && change.delta > 0
      ? [...oldAllocations, ...takeAllocationsFromLastTransaction(s, change.itemId, link, change.delta)]
      : change && change.delta < 0
        ? splitAllocations(oldAllocations, -change.delta).kept
        : oldAllocations
    return {
      itemId: line.itemId,
      itemName: old?.itemName ?? item!.name,
      unit: old?.unit ?? item!.unit,
      quantity: line.quantity,
      instructions: line.instructions?.trim() || null,
      batchAllocations: allocations,
    }
  })
  return { lines, belowZero: changes.filter((change) => change.item.batches.some((batch) => batch.quantity < 0)).map((change) => change.item.name) }
}

function takeAllocationsFromLastTransaction(s: DbState, itemId: string, link: { visitId?: string; incidentId?: string }, quantity: number) {
  const transaction = [...s.frontendOnly.inventoryTransactions].reverse().find((candidate) =>
    candidate.itemId === itemId && candidate.type === 'dispense' && candidate.quantity === quantity &&
    candidate.visitId === (link.visitId ?? null) && candidate.incidentId === link.incidentId,
  )
  return transaction?.batchAllocations ?? []
}

// ---- reports ---------------------------------------------------------------------------------

export interface ComplaintCount {
  complaint: string
  count: number
}

export interface MonthlyReportData {
  month: string
  counts: { visits: number; incidents: number; followUps: number }
  /** The same counts for the month before, so the printout can show the change. */
  previousCounts: { visits: number; incidents: number; followUps: number }
  /** What happened after the month's visits, every disposition listed (0 included). */
  dispositions: Array<{ disposition: Disposition; count: number }>
  /** Follow-ups dated in the month, by status (0 included). */
  followUpsByStatus: Array<{ status: FollowUpStatus; count: number }>
  /**
   * Medicines and supplies given in the month, per item: dispensed quantity minus what visit edits
   * returned (`visit_edited` adjustments), from the recorded stock movements. Totals only, no students.
   */
  itemsGiven: Array<{ itemName: string; unit: string; quantity: number }>
  /** Incident archive rows carry the LRN only, masked when shown (multi-student list, ADR-004). */
  incidents: Array<Incident & { lrn: string }>
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

function itemsGivenInMonth(s: DbState, month: string): MonthlyReportData['itemsGiven'] {
  const given = new Map<string, number>()
  for (const t of s.frontendOnly.inventoryTransactions) {
    if (!t.timestamp.startsWith(month)) continue
    // An adjustment's quantity is the change to stock, so a visit edit that returns 2 gives 2 fewer.
    const change = t.type === 'dispense' ? t.quantity : t.type === 'adjustment' && t.reason === 'visit_edited' ? -t.quantity : 0
    if (change) given.set(t.itemId, (given.get(t.itemId) ?? 0) + change)
  }
  return [...given]
    .filter(([, quantity]) => quantity > 0)
    .map(([itemId, quantity]) => {
      const item = s.inventoryItems.find((i) => i.id === itemId)
      return { itemName: item?.name ?? 'Unknown item', unit: item?.unit ?? '', quantity }
    })
    .sort((a, b) => a.itemName.localeCompare(b.itemName))
}

/** `month` is "YYYY-MM". Everything is generated from raw records on each call. */
export function getMonthlyReport(month: string): Promise<MonthlyReportData> {
  return read('monthly report', (s) => {
    const byId = studentsById(s)
    return {
      month,
      counts: monthlyCounts(s, month),
      previousCounts: monthlyCounts(s, toISODate(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 2, 1)).slice(0, 7)),
      dispositions: (['returned_to_class', 'resting_in_clinic', 'sent_home', 'referred_to_hospital'] as const).map((disposition) => ({
        disposition,
        count: countedVisits(s).filter((v) => v.dateTime.startsWith(month) && v.disposition === disposition).length,
      })),
      followUpsByStatus: (['pending', 'completed', 'missed', 'cancelled'] as const).map((status) => ({
        status,
        count: s.followUps.filter((f) => f.followUpDate.startsWith(month) && f.status === status).length,
      })),
      itemsGiven: itemsGivenInMonth(s, month),
      incidents: s.incidents
        .filter((i) => i.time.startsWith(month))
        .sort((a, b) => b.time.localeCompare(a.time))
        .map((i) => ({ ...i, lrn: byId.get(i.studentId)?.lrn ?? '' })),
      complaintCounts: complaintCounts(countedVisits(s).filter((v) => v.dateTime.startsWith(month))),
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
  const visits = countedVisits(s).filter((v) => inRange(dateOf(v.dateTime)))
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

/**
 * "Back up now" (panel review BK-2). MOCK ONLY: it writes a successful backup record with a size close
 * to the last one. The real job (copying the database to the external drive) belongs to the backend
 * phase; until then this only records that a backup was asked for and "ran".
 */
export function recordBackupNow(actor?: SessionUser): Promise<BackupStatusView> {
  return write('back up now', (s) => {
    const by = actorOr(actor)
    const lastOk = backupStatus(s).history.find((b) => b.status === 'ok')
    const record = { lastRun: now(s), fileSizeBytes: Math.round((lastOk?.fileSizeBytes ?? 18_000_000) * 1.002), status: 'ok' as const, verifiedByUserId: null }
    s.backupLogs.push(record)
    audit(s, by, 'create', { type: 'backup', id: record.lastRun }, 'Backup started from the Backup page')
    return { ...backupStatus(s), verifiedByName: null }
  })
}

// ---- dashboard -----------------------------------------------------------------------------

export function getDashboardSummary(query: DashboardQuery): Promise<DashboardSummary> {
  return read('dashboard summary', (s) => ({ ...buildDashboardSummary(s, query, new Date().toISOString()), backupAlert: backupAlertFor(s) }))
}

/** No successful backup, a failed latest run, or a last success older than `config.staleBackupHours` (BK-2, D5). */
function backupAlertFor(s: DbState): BackupAlert | null {
  const { latest, history } = backupStatus(s)
  const lastSuccess = history.find((b) => b.status === 'ok') ?? null
  const base = { lastSuccessAt: lastSuccess?.lastRun ?? null, staleAfterHours: s.config.staleBackupHours }
  if (!lastSuccess) return { kind: 'never', ...base }
  if (latest?.status === 'failed') return { kind: 'failed', ...base }
  const hours = (Date.parse(now(s)) - Date.parse(lastSuccess.lastRun)) / 3_600_000
  return hours > s.config.staleBackupHours ? { kind: 'stale', ...base } : null
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

/** Calendar events overlapping a period, earliest first: what the Dashboard printout lists. */
export function listCalendarEvents(from: ISODate, to: ISODate): Promise<CalendarDayEvent[]> {
  return read('calendar events', (s) =>
    s.frontendOnly.calendarEvents
      .filter((e) => e.startDate <= to && (e.endDate ?? e.startDate) >= from)
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title))
      .map(({ id, title, startDate, endDate }) => ({ id, title, startDate, endDate })),
  )
}


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

// ---- Sports Reports (ADR-034; Staff only; PROVISIONAL pending the ERD) ----------------------

export const SPORTS_REPORT_TEXT_MAX = 120
export const SPORTS_REPORT_NOTE_MAX = 500
export const SPORTS_REPORT_WINDOWS: SportsReportWindow[] = [30, 60, 90, 'school_year']
/** The school year runs June 15 to April 14 (the Principal, October 2026; Issues-and-TODOs "The school and its master list"). */
const SCHOOL_YEAR_START = '06-15'

/** Sports Reports belong to the clinician (ADR-034): the Admin/Principal can't open them, and there is no instructor account. */
export class SportsReportPermissionError extends Error {
  constructor() {
    super('Only the clinic staff can open Sports Reports.')
  }
}

function requireStaff(actor: SessionUser) {
  if (actor.role !== 'staff') throw new SportsReportPermissionError()
}

/** First day of the look-back window ending today: the last N days including today, or June 15 of the current school year. */
export function sportsReportWindowStart(window: SportsReportWindow, today: ISODate): ISODate {
  if (window !== 'school_year') return addDays(today, -(window - 1))
  const year = Number(today.slice(0, 4))
  return today.slice(5) >= SCHOOL_YEAR_START ? `${year}-${SCHOOL_YEAR_START}` : `${year - 1}-${SCHOOL_YEAR_START}`
}

export interface SportsReportInput {
  title: string
  activity: string
  requestedBy: string
  window: SportsReportWindow
  includeConditions: boolean
  students: Array<{ studentId: string; note: string }>
}

export type SportsReportErrors = Partial<Record<'title' | 'activity' | 'requestedBy' | 'window' | 'students', string>>

/** Field messages for the builder; empty when the input is valid. The writes below enforce the same rules. */
export function validateSportsReport(input: SportsReportInput): SportsReportErrors {
  const errors: SportsReportErrors = {}
  const title = input.title.trim()
  const requestedBy = input.requestedBy.trim()
  if (!title) errors.title = 'Enter a title for the report.'
  else if (title.length > SPORTS_REPORT_TEXT_MAX) errors.title = `Keep the title to ${SPORTS_REPORT_TEXT_MAX} characters or fewer.`
  if (input.activity.trim().length > SPORTS_REPORT_TEXT_MAX) errors.activity = `Keep the activity to ${SPORTS_REPORT_TEXT_MAX} characters or fewer.`
  if (!requestedBy) errors.requestedBy = 'Enter the name of the instructor who asked for the report.'
  else if (requestedBy.length > SPORTS_REPORT_TEXT_MAX) errors.requestedBy = `Keep the name to ${SPORTS_REPORT_TEXT_MAX} characters or fewer.`
  if (!SPORTS_REPORT_WINDOWS.includes(input.window)) errors.window = 'Choose a look-back window.'
  if (input.students.some((student) => student.note.trim().length > SPORTS_REPORT_NOTE_MAX))
    errors.students = `Keep each note to ${SPORTS_REPORT_NOTE_MAX} characters or fewer.`
  return errors
}

export class SportsReportValidationError extends Error {
  readonly errors: SportsReportErrors
  constructor(errors: SportsReportErrors) {
    super(Object.values(errors).join(' '))
    this.errors = errors
  }
}

/** Only the list and the notes are kept (ADR-034): never a copy of anything from a student's record. */
function cleanSportsReport(input: SportsReportInput): Pick<SportsReport, 'title' | 'activity' | 'requestedBy' | 'window' | 'includeConditions' | 'students'> {
  const errors = validateSportsReport(input)
  if (Object.keys(errors).length) throw new SportsReportValidationError(errors)
  const seen = new Set<string>()
  const students = input.students
    .filter((student) => !seen.has(student.studentId) && seen.add(student.studentId))
    .map((student) => ({ studentId: student.studentId, note: student.note.trim() || null }))
  return {
    title: input.title.trim(),
    activity: input.activity.trim() || null,
    requestedBy: input.requestedBy.trim(),
    window: input.window,
    includeConditions: input.includeConditions === true,
    students,
  }
}

export interface SportsReportSummary {
  id: string
  title: string
  activity: string | null
  requestedBy: string
  studentCount: number
  updatedAt: ISODateTime
  archived: boolean
}

export function listSportsReports(actor?: SessionUser): Promise<SportsReportSummary[]> {
  return read('sports reports', (s) => {
    requireStaff(actorOr(actor))
    return s.frontendOnly.sportsReports
      .map(({ id, title, activity, requestedBy, students, updatedAt, archived }) => ({ id, title, activity, requestedBy, studentCount: students.length, updatedAt, archived }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  })
}

/** A student on a report as the builder shows it: the name for recognition (ADR-034's exception), never medical fields. */
export interface SportsReportStudentRow {
  studentId: string
  note: string | null
  /** Null when the record is no longer in CLINIQ. */
  fullName: string | null
  gradeLevel: string | null
  status: 'active' | 'archived' | 'missing'
}

export interface SportsReportDetail extends Omit<SportsReport, 'students'> {
  students: SportsReportStudentRow[]
}

function sportsReportStudents(s: DbState, report: SportsReport): SportsReportStudentRow[] {
  const students = studentsById(s)
  return report.students.map(({ studentId, note }) => {
    const student = students.get(studentId)
    if (!student) return { studentId, note, fullName: null, gradeLevel: null, status: 'missing' as const }
    return { studentId, note, fullName: student.fullName, gradeLevel: student.gradeLevel, status: student.archived ? ('archived' as const) : ('active' as const) }
  })
}

export function getSportsReport(id: string, actor?: SessionUser): Promise<SportsReportDetail> {
  return read('sports report', (s) => {
    requireStaff(actorOr(actor))
    const report = must(s.frontendOnly.sportsReports.find((r) => r.id === id), 'Sports Report')
    return { ...report, students: sportsReportStudents(s, report) }
  })
}

/** One visit or incident as the Sports Report prints it: never notes, vitals, medicines, contacts or letters. */
export interface SportsReportEntry {
  id: string
  dateTime: ISODateTime
  kind: 'Visit' | 'Incident'
  /** The complaint as recorded. */
  what: string
  outcome: string
}

export interface SportsReportContentRow {
  studentId: string
  fullName: string
  gradeLevel: string
  /** Newest first. */
  entries: SportsReportEntry[]
  note: string | null
  /** Only when the report includes conditions. */
  conditions?: { medicalConditions: string[]; allergies: string[] }
}

export interface SportsReportContent {
  report: Pick<SportsReport, 'id' | 'title' | 'activity' | 'requestedBy' | 'window' | 'includeConditions' | 'archived'>
  from: ISODate
  to: ISODate
  asOf: ISODateTime
  /** Active students, alphabetical by name. */
  rows: SportsReportContentRow[]
  /** Students on the list who are left out: archived, or no longer in CLINIQ. Counts only. */
  leftOut: { archived: number; missing: number }
}

const SPORTS_REPORT_OUTCOMES = DISPOSITION_LABELS

/**
 * The report's content, computed from the visits and incidents at the moment it is asked for, so a
 * reprint is current and nothing medical is ever stored with the report (ADR-034).
 */
export function getSportsReportContent(id: string, actor?: SessionUser): Promise<SportsReportContent> {
  return read('sports report content', (s) => {
    requireStaff(actorOr(actor))
    const report = must(s.frontendOnly.sportsReports.find((r) => r.id === id), 'Sports Report')
    const from = sportsReportWindowStart(report.window, s.today)
    const to = s.today
    const inWindow = (value: ISODateTime) => value.slice(0, 10) >= from && value.slice(0, 10) <= to
    const students = studentsById(s)
    const leftOut = { archived: 0, missing: 0 }
    const rows: SportsReportContentRow[] = []
    for (const { studentId, note } of report.students) {
      const student = students.get(studentId)
      if (!student) leftOut.missing += 1
      else if (student.archived) leftOut.archived += 1
      if (!student || student.archived) continue
      const entries: SportsReportEntry[] = [
        ...s.visits
          .filter((v) => v.studentId === studentId && inWindow(v.dateTime))
          .map((v) => ({ id: v.id, dateTime: v.dateTime, kind: 'Visit' as const, what: v.complaint, outcome: SPORTS_REPORT_OUTCOMES[v.disposition] })),
        ...s.incidents
          .filter((i) => i.studentId === studentId && inWindow(i.time))
          .map((i) => ({ id: i.id, dateTime: i.time, kind: 'Incident' as const, what: i.complaint, outcome: i.hospitalReferral ? 'Referred to hospital' : 'No hospital referral recorded' })),
      ].sort((a, b) => b.dateTime.localeCompare(a.dateTime))
      rows.push({
        studentId,
        fullName: student.fullName,
        gradeLevel: student.gradeLevel,
        entries,
        note,
        ...(report.includeConditions ? { conditions: { medicalConditions: student.medicalConditions, allergies: student.allergies } } : {}),
      })
    }
    rows.sort((a, b) => a.fullName.localeCompare(b.fullName))
    const { title, activity, requestedBy, window, includeConditions, archived } = report
    return { report: { id, title, activity, requestedBy, window, includeConditions, archived }, from, to, asOf: now(s), rows, leftOut }
  })
}

export function createSportsReport(input: SportsReportInput, actor?: SessionUser): Promise<SportsReport> {
  return write('add sports report', (s) => {
    const by = actorOr(actor)
    requireStaff(by)
    const at = now(s)
    const report: SportsReport = {
      id: nextId('sports-report', s.frontendOnly.sportsReports),
      ...cleanSportsReport(input),
      archived: false,
      createdByUserId: by.id,
      createdAt: at,
      updatedAt: at,
    }
    s.frontendOnly.sportsReports.push(report)
    audit(s, by, 'create', { type: 'sports-report', id: report.id })
    return report
  })
}

export function updateSportsReport(id: string, input: SportsReportInput, actor?: SessionUser): Promise<SportsReport> {
  return write('edit sports report', (s) => {
    const by = actorOr(actor)
    requireStaff(by)
    const report = must(s.frontendOnly.sportsReports.find((r) => r.id === id), 'Sports Report')
    const next = cleanSportsReport(input)
    const summary = changedSummary(report, next)
    Object.assign(report, next, { updatedAt: now(s) })
    audit(s, by, 'update', { type: 'sports-report', id }, summary)
    return report
  })
}

/** A copy to reuse for the next event; the copy is a new, active report. */
export function duplicateSportsReport(id: string, actor?: SessionUser): Promise<SportsReport> {
  return write('duplicate sports report', (s) => {
    const by = actorOr(actor)
    requireStaff(by)
    const source = must(s.frontendOnly.sportsReports.find((r) => r.id === id), 'Sports Report')
    const at = now(s)
    const copy: SportsReport = {
      ...structuredClone(source),
      id: nextId('sports-report', s.frontendOnly.sportsReports),
      title: `Copy of ${source.title}`.slice(0, SPORTS_REPORT_TEXT_MAX),
      archived: false,
      createdByUserId: by.id,
      createdAt: at,
      updatedAt: at,
    }
    s.frontendOnly.sportsReports.push(copy)
    audit(s, by, 'create', { type: 'sports-report', id: copy.id }, 'Duplicated from another Sports Report')
    return copy
  })
}

/** Archived reports are hidden from the list by default and can be restored; nothing is deleted. */
export function setSportsReportArchived(id: string, archived: boolean, actor?: SessionUser): Promise<SportsReport> {
  return write(archived ? 'archive sports report' : 'restore sports report', (s) => {
    const by = actorOr(actor)
    requireStaff(by)
    const report = must(s.frontendOnly.sportsReports.find((r) => r.id === id), 'Sports Report')
    Object.assign(report, { archived, updatedAt: now(s) })
    if (archived) audit(s, by, 'archive', { type: 'sports-report', id })
    else audit(s, by, 'update', { type: 'sports-report', id }, 'Restored from the archive')
    return report
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
