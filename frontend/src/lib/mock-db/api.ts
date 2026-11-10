import { emit, IDLE_SETTINGS_CHANGED_EVENT } from '../sessionActivity'
import { isLrn, maskLrn, normalizeLrn } from '../lrn'
import type {
  AuditActionType,
  AuditLogEntry,
  CollectedBy,
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
  PatientRef,
  PatientSearchResult,
  Personnel,
  PersonnelSearchResult,
  CalledContact,
  ParentNotificationOutcome,
  Report,
  ReportType,
  Student,
  StudentListRow,
  StudentSearchResult,
  User,
  UserRole,
  Visit,
} from '../../types/entities'
import { normalizeComplaint, reportComplaint } from '../complaints'
import type { Patient, PatientNumber } from '../patients'
import type { ImportRow } from '../studentImport'
import type { StudentSex } from '../../types/entities'
import { DISPOSITION_LABELS } from '../dispositions'
import { EXCUSE_LETTER_RECIPIENT, excuseLetterBody } from '../excuseLetter'
import { addDays, endOfMonth, isRealDate, monthWeeks, toISODate, type MonthWeek } from '../dates'
import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  otpauthUri,
  verifyTotp,
} from '../totp'
import {
  currentSchoolYear,
  schoolYearStep,
  schoolYearOf,
  schoolYearSettingsError,
  type SchoolYear,
  type SchoolYearSettings,
} from '../schoolYear'
import type {
  BackupAlert,
  CalendarDay,
  CalendarDayEvent,
  DashboardQuery,
  DashboardSummary,
  Holiday,
  SchoolYearReminder,
  HolidayFeed,
} from '../../types/dashboard'
import holidayData from './holidays-ph.json'
import type { FollowUpDueState } from '../../components/status/followUp'
import { buildCalendarDays, buildDashboardSummary } from './dashboard'
import { isEmptied, simulateRequest } from './devToggles'
import {
  backupStatus,
  auditLogList,
  clusterAlerts,
  type ClusterAlert,
  complaintSuggestions,
  countedVisits,
  dateOf,
  followUpDueState,
  gradeLevels,
  hasLaterFollowUp,
  withAutoClosedFollowUps,
  incompleteRecordQueue,
  inventoryStatusFor,
  missingRequiredFields,
  monthlyCounts,
  missingStaffFields,
  staffIncompleteQueue,
  type StaffIncompleteRow,
  personnelDepartments,
  searchPatients as searchPatientRecords,
  searchPersonnel as searchPersonnelRecords,
  searchStudents as searchStudentRecords,
  studentsById,
  toPersonnel,
  toStudent,
  toStudentRow,
  type BackupStatus,
  type AuditLogList,
  type AuditLogQuery,
  type IncompleteRecordRow,
  type InventoryStatus,
} from './selectors'
import {
  clearMockSession,
  firstViewThisSession,
  getMockSessionUser,
  type SessionUser,
} from './session'
import { commit, db, restoreDb } from './store'
import { CALENDAR_EVENT_TITLE_MAX, PERSONNEL_DEPARTMENT_MAX } from './integrity'
import {
  cleanNamePart,
  compareByLastName,
  formatPersonName,
  NAME_PART_MAX,
  nameKey,
  nameMatches,
  type NameParts,
} from '../personName'
import { isPhilippinePhone } from '../phone'
import type { StaffImportRow } from '../staffImport'
import type {
  AdjustmentReason,
  BackupLocation,
  CalendarEvent,
  ComplaintType,
  DbState,
  ExcuseLetterApproval,
  InventoryTransaction,
  IssueReport,
  PeReferral,
  SeedPersonnel,
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
    personnel: isEmptied('personnel') ? [] : s.personnel,
    visits: isEmptied('visits')
      ? []
      : includeEnteredInError
        ? s.visits
        : s.visits.filter((v) => !v.enteredInError),
    incidents: isEmptied('incidents') ? [] : s.incidents,
    // Pending follow-ups long past their date read as Missed (ADR-051); the stored record is untouched.
    followUps: isEmptied('followUps')
      ? []
      : withAutoClosedFollowUps(s.followUps, s.today, s.config.followUpAutoCloseDays),
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

async function read<T>(
  label: string,
  select: (state: DbState) => T,
  includeEnteredInError = false,
): Promise<T> {
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
  state.auditLog.push({
    userId: actor.id,
    actionType,
    targetRecord,
    timestamp: now(state),
    ...(summary ? { summary } : {}),
  })
}

const FIELD_LABELS: Record<string, string> = {
  idleSignoutMinutesStaff: 'Staff idle sign-out minutes',
  idleSignoutMinutesAdmin: 'Admin idle sign-out minutes',
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
  department: 'department or role',
  avoidIfAllergicTo: 'avoid if allergic to',
  schoolYearStartMonth: 'start month',
  schoolYearStartDay: 'start day',
  schoolYearEndMonth: 'end month',
  schoolYearEndDay: 'end day',
  usedFor: 'commonly used for',
  generalNotes: 'additional notes',
}

/** "Updated allergies and grade level" — names the changed fields for the audit summary, never their values. */
function changedSummary(before: object, after: object): string | undefined {
  const old = before as Record<string, unknown>
  const changed = Object.entries(after)
    .filter(([key, value]) => JSON.stringify(old[key]) !== JSON.stringify(value))
    .map(
      ([key]) => FIELD_LABELS[key] ?? key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`),
    )
  if (!changed.length) return undefined
  const list =
    changed.length === 1
      ? changed[0]
      : `${changed.slice(0, -1).join(', ')} and ${changed[changed.length - 1]}`
  return `Updated ${list}`
}

function actorOr(actor?: SessionUser): SessionUser {
  return actor ?? getMockSessionUser()
}

/**
 * Development stand-in for Sanctum's logout endpoint. It keeps logout accountable even while the
 * frontend uses the mock session, then clears the selected mock role from this browser tab.
 */
export async function logoutMockSession(actor: SessionUser, summary?: string): Promise<void> {
  await write('logout', (s) => {
    audit(s, actor, 'logout', null, summary)
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
export function recordPrint(
  documentTitle: string,
  actor?: SessionUser,
  record?: PrintAuditRecord,
): Promise<void> {
  return write('print document', (s) => {
    if (record)
      audit(s, actorOr(actor), 'print', { type: record.type, id: record.id }, record.summary)
    else audit(s, actorOr(actor), 'print', { type: 'print-document', id: documentTitle })
  })
}

const VIEW_SUMMARIES = {
  student: 'Opened student profile',
  staff: 'Opened staff profile',
  incident: 'Opened incident report',
} as const

/**
 * Opening a student or staff profile or an incident report is logged (who, what, when), once per
 * record per sign-in session: the Admin's views (ADR-038 item 4) and the clinician's (ADR-048).
 * Lists and searches are not logged.
 */
export async function recordView(
  target: { type: keyof typeof VIEW_SUMMARIES; id: string },
  actor: SessionUser,
): Promise<void> {
  if (!firstViewThisSession(`${actor.id}|${target.type}|${target.id}`)) return
  await write('record view', (s) => {
    audit(s, actor, 'view', target, VIEW_SUMMARIES[target.type])
  })
}

/** The two idle sign-out settings (ADR-078): Staff default 60, Admin default 30, each 10 to 240 minutes. */
export interface IdleSignoutSettings {
  idleSignoutMinutesStaff: number
  idleSignoutMinutesAdmin: number
}

export const IDLE_SIGNOUT_MIN = 10
export const IDLE_SIGNOUT_MAX = 240

export class IdleSignoutSettingsError extends Error {}

function idleSettingsOf(s: DbState): IdleSignoutSettings {
  return {
    idleSignoutMinutesStaff: s.config.idleSignoutMinutesStaff,
    idleSignoutMinutesAdmin: s.config.idleSignoutMinutesAdmin,
  }
}

/** Whole minutes from 10 to 240 (ADR-078). */
export function validIdleMinutes(value: number): boolean {
  return Number.isInteger(value) && value >= IDLE_SIGNOUT_MIN && value <= IDLE_SIGNOUT_MAX
}

export function getIdleSignoutSettings(): Promise<IdleSignoutSettings> {
  return read('idle sign-out settings', idleSettingsOf)
}

/** Minutes of inactivity before this role is signed out (ADR-048, ADR-078). */
export function getIdleSignoutMinutes(role: SessionUser['role']): Promise<number> {
  return read('idle sign-out minutes', (s) =>
    role === 'admin' ? s.config.idleSignoutMinutesAdmin : s.config.idleSignoutMinutesStaff,
  )
}

/** Staff only; audited by field name, never the minutes. The shell reads them again for the next countdown. */
export async function saveIdleSignoutSettings(
  input: IdleSignoutSettings,
  actor?: SessionUser,
): Promise<IdleSignoutSettings> {
  const saved = await write('save idle sign-out settings', (s) => {
    const by = actorOr(actor)
    if (by.role !== 'staff')
      throw new IdleSignoutSettingsError('Only the clinic staff can change the sign-out times.')
    const values = {
      idleSignoutMinutesStaff: input.idleSignoutMinutesStaff,
      idleSignoutMinutesAdmin: input.idleSignoutMinutesAdmin,
    }
    if (
      !validIdleMinutes(values.idleSignoutMinutesStaff) ||
      !validIdleMinutes(values.idleSignoutMinutesAdmin)
    )
      throw new IdleSignoutSettingsError(
        `Enter whole minutes from ${IDLE_SIGNOUT_MIN} to ${IDLE_SIGNOUT_MAX}.`,
      )
    const summary = changedSummary(idleSettingsOf(s), values)
    Object.assign(s.config, values)
    if (summary) audit(s, by, 'update', { type: 'settings', id: 'idle-signout' }, summary)
    return idleSettingsOf(s)
  })
  emit(IDLE_SETTINGS_CHANGED_EVENT)
  return saved
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
  /** Failed attempts left before the lockout, on `invalid_credentials`. */
  readonly remaining?: number

  constructor(reason: MockAuthFailure, lockedUntil?: number, remaining?: number) {
    super(reason)
    this.reason = reason
    this.lockedUntil = lockedUntil
    this.remaining = remaining
  }
}

/** Sign-in and password recovery share one lockout: 5 failures in a row, locked for 5 minutes (ADR-015). */
export const LOCKOUT_ATTEMPTS = 5
export const LOCKOUT_MINUTES = 5

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
  pendingAuthenticators.clear()
  recoveryTokens.clear()
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
  const current = state.frontendOnly.devAccounts.find(
    (account) => account.userId === userId,
  )?.password
  const history = current ? [current] : []
  passwordHistory.set(userId, history)
  return history
}

/** Audit entry for a lockout. Never the passwords. */
function logLockout(user: Pick<SessionUser, 'id' | 'name' | 'role'>, where: string): Promise<void> {
  return write('lockout', (s) => {
    audit(
      s,
      { id: user.id, name: user.name, role: user.role },
      'login',
      { type: 'user', id: user.id },
      `Account locked for ${LOCKOUT_MINUTES} minutes after ${LOCKOUT_ATTEMPTS} wrong passwords (${where})`,
    )
  })
}

/**
 * Counts one failure. Locks the account (and logs it) on the last one, throwing `locked`; otherwise
 * returns how many attempts are left. A lockout is a security event, so it is logged against the
 * account (Zean, Friday, October 23, 2026). An unknown username has no account to attribute it to.
 */
async function recordFailure(
  attempt: LoginAttemptState,
  user: Pick<SessionUser, 'id' | 'name' | 'role'> | undefined,
  where: string,
): Promise<number> {
  attempt.failures += 1
  if (attempt.failures < LOCKOUT_ATTEMPTS) return LOCKOUT_ATTEMPTS - attempt.failures
  attempt.failures = 0
  attempt.lockedUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000
  if (user) await logLockout(user, where)
  throw new MockAuthError('locked', attempt.lockedUntil)
}

/**
 * Development stand-in for the future Sanctum login endpoint. It intentionally never returns a
 * password or token. Lockout and password history live in memory until the real backend exists.
 */
export async function authenticateMockUser(
  username: string,
  password: string,
): Promise<MockAuthResult> {
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
  const account =
    user && state.frontendOnly.devAccounts.find((candidate) => candidate.userId === user.id)
  const currentPassword = account ? fakePasswordHistory(state, user.id)[0] : null
  if (!user || !account || user.deactivatedAt || currentPassword !== password) {
    const remaining = await recordFailure(attempt, user, 'sign-in')
    throw new MockAuthError('invalid_credentials', undefined, remaining)
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
    const user = must(
      state.users.find((candidate) => candidate.id === userId),
      'User',
    )
    must(
      state.frontendOnly.devAccounts.find((candidate) => candidate.userId === userId),
      'Development account',
    )
    const history = fakePasswordHistory(state, userId)
    if (trimmed.length < 8) throw new Error('Password must be at least 8 characters.')
    if (history.includes(trimmed)) throw new Error('Choose a password that was not used recently.')
    passwordHistory.set(userId, [trimmed, ...history].slice(0, 5))
    changedPasswordUsers.add(userId)
    audit(
      state,
      { id: user.id, name: user.name, role: user.role },
      'update',
      {
        type: 'user',
        id: userId,
      },
      'Changed password',
    )
  })
}

/** Self-service change: the signed-in user proves the current password first. */
export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  nextPassword: string,
): Promise<void> {
  if (fakePasswordHistory(view(), userId)[0] !== currentPassword)
    throw new Error('Your current password is incorrect.')
  await changeMockPassword(userId, nextPassword)
}

// ---- password recovery with an authenticator app (ADR-072) ---------------------------------

/** A secret shown for setup but not yet confirmed with a first code; kept in memory only. */
const pendingAuthenticators = new Map<string, string>()
/** One-time permissions to set a new password after a good code, valid 10 minutes. */
const recoveryTokens = new Map<string, { userId: string; expires: number }>()

/**
 * One message for every failed recovery: an unknown username, a wrong or old code, an account with no
 * authenticator, a disabled account. The screen never reveals which usernames exist.
 */
export const RECOVERY_FAILED_MESSAGE =
  'The code did not work, or the account is not set up for recovery. Ask the Administrator to reset your password.'

export class RecoveryError extends Error {
  /** Failed attempts left before the lockout, when the failure counts toward it. */
  readonly remaining?: number

  constructor(message: string, remaining?: number) {
    super(message)
    this.remaining = remaining
  }
}

function devAccountOf(state: DbState, userId: string) {
  return state.frontendOnly.devAccounts.find((account) => account.userId === userId)
}

function actorOf(user: User): SessionUser {
  return { id: user.id, name: user.name, role: user.role }
}

/** Checks a 6-digit code, else a recovery code (spent on use). Writes into `state`; true when either worked. */
async function proveFactor(
  state: DbState,
  user: User,
  proof: string,
): Promise<'code' | 'recovery' | null> {
  const record = devAccountOf(state, user.id)?.authenticator
  if (!record) return null
  if (await verifyTotp(record.secret, proof, Date.now())) return 'code'
  const hash = await hashRecoveryCode(proof)
  if (!record.recoveryCodeHashes.includes(hash)) return null
  record.recoveryCodeHashes = record.recoveryCodeHashes.filter((other) => other !== hash)
  audit(state, actorOf(user), 'update', { type: 'user', id: user.id }, 'Used a recovery code')
  return 'recovery'
}

/** The signed-in account's recovery status (the account menu). Never the secret. */
export function getAuthenticatorStatus(): Promise<{ enabled: boolean; recoveryCodesLeft: number }> {
  return read('authenticator status', (s) => {
    const record = devAccountOf(s, ownAccount(s).id)?.authenticator
    return { enabled: Boolean(record), recoveryCodesLeft: record?.recoveryCodeHashes.length ?? 0 }
  })
}

/**
 * Step 1 of setup: a new secret for the signed-in account and its QR link. Replacing an existing one
 * needs the current code or a recovery code first. Nothing is saved until `confirmAuthenticatorSetup`.
 */
export async function startAuthenticatorSetup(
  proof?: string,
): Promise<{ secret: string; uri: string }> {
  await simulateRequest('start authenticator setup')
  const state = db()
  const user = ownAccount(state)
  if (devAccountOf(state, user.id)?.authenticator) {
    if (!proof || !(await proveFactor(state, user, proof)))
      throw new RecoveryError(
        'That code did not work. Enter the 6-digit code from the app, or a recovery code.',
      )
    commit()
  }
  const secret = generateTotpSecret()
  pendingAuthenticators.set(user.id, secret)
  return { secret, uri: otpauthUri(user.username, secret) }
}

/** Step 2: the first code from the app proves it was set up. Returns 8 recovery codes, shown once. */
export async function confirmAuthenticatorSetup(
  code: string,
): Promise<{ recoveryCodes: string[] }> {
  await simulateRequest('confirm authenticator setup')
  const state = db()
  const user = ownAccount(state)
  const secret = pendingAuthenticators.get(user.id)
  if (!secret) throw new RecoveryError('Start the setup again.')
  if (!(await verifyTotp(secret, code, Date.now())))
    throw new RecoveryError(
      "That code did not work. If codes do not work, check that the phone's date and time are set automatically.",
    )
  const recoveryCodes = generateRecoveryCodes()
  const recoveryCodeHashes = await Promise.all(recoveryCodes.map(hashRecoveryCode))
  return write('confirm authenticator setup', (s) => {
    const account = must(devAccountOf(s, user.id), 'Account')
    const replacing = Boolean(account.authenticator)
    account.authenticator = { secret, confirmedAt: now(s), recoveryCodeHashes }
    pendingAuthenticators.delete(user.id)
    audit(
      s,
      actorOf(user),
      'update',
      { type: 'user', id: user.id },
      replacing ? 'Replaced authenticator' : 'Set up authenticator',
    )
    return { recoveryCodes }
  })
}

/** Turns recovery off for the signed-in account, after the current code or a recovery code. */
export async function turnOffAuthenticator(proof: string): Promise<void> {
  await simulateRequest('turn off authenticator')
  const state = db()
  const user = ownAccount(state)
  if (!(await proveFactor(state, user, proof))) {
    commit()
    throw new RecoveryError(
      'That code did not work. Enter the 6-digit code from the app, or a recovery code.',
    )
  }
  await write('turn off authenticator', (s) => {
    must(devAccountOf(s, user.id), 'Account').authenticator = null
    audit(s, actorOf(user), 'update', { type: 'user', id: user.id }, 'Turned off authenticator')
  })
}

export const RECOVERY_NO_ACCOUNT_MESSAGE = 'No account with that username.'
export const RECOVERY_DISABLED_MESSAGE = 'This account is disabled. Ask the Administrator.'
export const RECOVERY_NOT_SET_UP_MESSAGE =
  'This account has no authenticator app set up. Ask the Administrator to reset your password.'

/** The recovery attempt for a username, unlocked if its lock has run out; throws while it is locked. */
function openRecoveryAttempt(normalized: string) {
  const attempt = attemptFor(normalized)
  if (attempt.lockedUntil && attempt.lockedUntil > Date.now())
    throw new MockAuthError('locked', attempt.lockedUntil)
  if (attempt.lockedUntil && attempt.lockedUntil <= Date.now()) {
    attempt.failures = 0
    attempt.lockedUntil = null
  }
  return attempt
}

/** Counts a failed recovery step toward the sign-in lockout (ADR-015), then throws `message`. */
async function failRecovery(
  attempt: LoginAttemptState,
  user: User | undefined,
  message: string,
): Promise<never> {
  const remaining = await recordFailure(attempt, user, 'password recovery')
  throw new RecoveryError(message, remaining)
}

/**
 * Forgot password, step 1 (Login): is the username an active account with an authenticator? Says
 * which it is not (Zean, November 7, 2026, choosing this over ADR-073's single message; it tells a
 * person at the clinic computer which usernames exist). Each failure counts toward the lockout.
 */
export async function checkRecoveryAccount(username: string): Promise<void> {
  await simulateRequest('check recovery account')
  const normalized = username.trim().toLowerCase()
  const attempt = openRecoveryAttempt(normalized)
  const state = db()
  const user = state.users.find((candidate) => candidate.username.toLowerCase() === normalized)
  if (!user) return failRecovery(attempt, undefined, RECOVERY_NO_ACCOUNT_MESSAGE)
  if (user.deactivatedAt) return failRecovery(attempt, user, RECOVERY_DISABLED_MESSAGE)
  if (!devAccountOf(state, user.id)?.authenticator)
    return failRecovery(attempt, user, RECOVERY_NOT_SET_UP_MESSAGE)
}

/**
 * Forgot password, step 2 (Login): the username and a 6-digit code or a recovery code. A failed code
 * keeps the general message and counts toward the sign-in lockout (ADR-015).
 * Returns a one-time token for the new password.
 */
export async function verifyPasswordRecovery(username: string, proof: string): Promise<string> {
  await simulateRequest('verify password recovery')
  const normalized = username.trim().toLowerCase()
  const attempt = openRecoveryAttempt(normalized)
  const state = db()
  const user = state.users.find((candidate) => candidate.username.toLowerCase() === normalized)
  const ok = user && !user.deactivatedAt ? await proveFactor(state, user, proof) : null
  if (!user || !ok) return failRecovery(attempt, user, RECOVERY_FAILED_MESSAGE)
  commit()
  attempt.failures = 0
  const token = generateTotpSecret()
  recoveryTokens.set(token, { userId: user.id, expires: Date.now() + 10 * 60 * 1000 })
  return token
}

/**
 * Forgot password, step 2: the new password, by the same rules as Change Password (8 characters, not
 * one of the last 5). Clears a pending forced change. Audited by action only, never a code or password.
 */
export async function resetPasswordWithRecovery(
  token: string,
  nextPassword: string,
): Promise<void> {
  const grant = recoveryTokens.get(token)
  if (!grant || grant.expires < Date.now()) {
    recoveryTokens.delete(token)
    throw new RecoveryError('This reset has expired. Start again with a new code.')
  }
  await changeMockPassword(grant.userId, nextPassword)
  recoveryTokens.delete(token)
  await write('reset password with authenticator', (s) => {
    const user = must(
      s.users.find((candidate) => candidate.id === grant.userId),
      'User',
    )
    audit(
      s,
      actorOf(user),
      'update',
      { type: 'user', id: user.id },
      'Reset password with authenticator',
    )
  })
}

/** The approved `users.name` length (Reference-Schema: VARCHAR(120)); the Edit profile dialog uses it too. */
export const USER_NAME_MAX = 120

/** The signed-in account as the account menu and the Edit profile dialog show it (ADR-066). */
export interface OwnAccount {
  name: string
  username: string
  role: UserRole
  profilePicture: string | null
  lastLogin: ISODateTime | null
}

/** The signed-in, active account. Never takes a user id from the caller (ADR-066). */
function ownAccount(state: DbState): User {
  const session = getMockSessionUser()
  const user = must(
    state.users.find((u) => u.id === session.id),
    'Account',
  )
  if (user.deactivatedAt) throw new Error('This account is disabled.')
  return user
}

export function getOwnAccount(): Promise<OwnAccount> {
  return read('own account', (s) => {
    const user = ownAccount(s)
    return {
      name: user.name,
      username: user.username,
      role: user.role,
      profilePicture: user.profilePicture ?? null,
      lastLogin: user.lastLogin,
    }
  })
}

/**
 * Self-service Edit profile (ADR-066): the signed-in user changes their own display name and picture.
 * The username and role stay with the Admin. Each change is audited by field name only, never the old
 * or new name and never image data (ADR-016, ADR-017).
 */
export function updateOwnProfile(input: {
  name: string
  profilePicture: string | null
}): Promise<OwnAccount> {
  return write('update own profile', (s) => {
    const user = ownAccount(s)
    const name = input.name.trim().replace(/\s+/g, ' ')
    if (!name) throw new Error('Enter your full name.')
    if (name.length > USER_NAME_MAX)
      throw new Error(`Keep your name to ${USER_NAME_MAX} characters or fewer.`)
    const picture = input.profilePicture ?? null
    if (picture !== null && !picture.startsWith('data:image/'))
      throw new Error('Choose a JPEG, PNG, or WebP image.')
    const actor: SessionUser = { id: user.id, name: user.name, role: user.role }
    if (name !== user.name) {
      user.name = name
      audit(s, actor, 'update', { type: 'user', id: user.id }, 'Changed own name')
    }
    if (picture !== (user.profilePicture ?? null)) {
      user.profilePicture = picture
      audit(s, actor, 'update', { type: 'user', id: user.id }, 'Changed own profile picture')
    }
    return {
      name: user.name,
      username: user.username,
      role: user.role,
      profilePicture: user.profilePicture ?? null,
      lastLogin: user.lastLogin,
    }
  })
}

function userName(state: DbState, id: string | null): string | null {
  if (!id) return null
  return state.users.find((u) => u.id === id)?.name ?? 'Unknown user'
}

function studentOf(state: DbState, studentId: string): SeedStudent {
  return must(studentsById(state).get(studentId), 'Student')
}

function personnelOf(state: DbState, personnelId: string): SeedPersonnel {
  return must(
    state.personnel.find((p) => p.id === personnelId),
    'Staff member',
  )
}

/** A student or a staff member, exactly one, and it exists (ADR-043 item 4). */
function patientOf(
  state: DbState,
  input: { studentId?: string | null; personnelId?: string | null },
): PatientRef {
  const patient = { studentId: input.studentId || null, personnelId: input.personnelId || null }
  if ((patient.studentId === null) === (patient.personnelId === null))
    throw new Error('Choose one patient: a student or a staff member.')
  if (patient.studentId) studentOf(state, patient.studentId)
  else personnelOf(state, patient.personnelId!)
  return patient
}

const samePatient = (a: PatientRef, b: PatientRef) =>
  a.studentId === b.studentId && a.personnelId === b.personnelId

/** ADR-047: a student's visit or incident keeps the grade they were in when it was saved. Staff have none. */
function gradeAtTime(
  s: DbState,
  patient: PatientRef,
): Pick<Visit, 'gradeLevelAtTime' | 'sectionAtTime'> {
  if (!patient.studentId) return {}
  const student = studentOf(s, patient.studentId)
  return {
    gradeLevelAtTime: student.gradeLevel,
    ...(student.section ? { sectionAtTime: student.section } : {}),
  }
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

/** Sanity bounds for the vitals warning, with the usual ranges by age group (ADR-051; config, nurse to confirm). */
export function getVitalsWarningRanges(): Promise<VitalsWarningRanges> {
  return read('vitals warning ranges', (s) => ({
    ...s.config.vitalsWarningRanges,
    usual: s.config.vitalsUsualRanges,
  }))
}

/** Days an excused period may run before the letter warns that a medical certificate is usually needed (ADR-049). */
export function getMedicalCertificateAfterDays(): Promise<number> {
  return read('medical certificate limit', (s) => s.config.medicalCertificateAfterDays)
}

/** How far from the usual age for the grade the form's soft note starts (ADR-054). */
export function getUnusualAgeYears(): Promise<number> {
  return read('unusual age', (s) => s.config.unusualAgeYears)
}

/** The share of an item on hand at which a stock removal needs a written note (panel review IV-7). */
export function getLargeWriteOffPercent(): Promise<number> {
  return read('large write-off percent', (s) => s.config.largeWriteOffPercent)
}

export function getGradeLevels(): Promise<string[]> {
  return read('grade levels', gradeLevels)
}

// ---- users ---------------------------------------------------------------------------------

export function listUsers(): Promise<User[]> {
  return read('users', (s) => [...s.users].sort((a, b) => a.name.localeCompare(b.name)))
}

/** The active Admin/Principal account's name, for a printout's Principal signature line; null if none. */
function principalNameOf(s: DbState): string | null {
  return s.users.find((u) => u.role === 'admin' && !u.deactivatedAt)?.name ?? null
}

export function getPrincipalName(): Promise<string | null> {
  return read('principal name', principalNameOf)
}

export function getUser(id: string): Promise<User> {
  return read('user', (s) =>
    must(
      s.users.find((u) => u.id === id),
      'User',
    ),
  )
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
  if (trimmed.length < MIN_PASSWORD_LENGTH)
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
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

export function saveUser(
  input: UserInput,
  options: { userId?: string; actor?: SessionUser } = {},
): Promise<User> {
  return write('save user', (s) => {
    const actor = actorOr(options.actor)
    requireAdmin(actor)
    const username = input.username.trim().toLowerCase()
    if (s.users.some((u) => u.id !== options.userId && u.username.toLowerCase() === username)) {
      throw new DuplicateUsernameError()
    }
    const existing = options.userId
      ? must(
          s.users.find((u) => u.id === options.userId),
          'User',
        )
      : null
    if (existing && input.role !== 'admin' && isLastActiveAdmin(s, existing))
      throw new LastAdminError()
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
    const user = must(
      s.users.find((u) => u.id === userId),
      'User',
    )
    if (!active && isLastActiveAdmin(s, user)) throw new LastAdminError()
    if (active === !user.deactivatedAt) return user
    user.deactivatedAt = active ? null : now(s)
    audit(
      s,
      by,
      'update',
      { type: 'user', id: user.id },
      active ? 'Enabled account' : 'Disabled account',
    )
    return user
  })
}

/** Gives the account a temporary password that must be changed at the next sign-in. No recovery flow. */
export function resetUserPassword(
  userId: string,
  temporaryPassword: string,
  actor?: SessionUser,
): Promise<void> {
  return write('reset password', (s) => {
    const by = actorOr(actor)
    requireAdmin(by)
    const user = must(
      s.users.find((u) => u.id === userId),
      'User',
    )
    setTemporaryPassword(s, user.id, temporaryPassword)
    audit(s, by, 'update', { type: 'user', id: user.id }, 'Reset password')
  })
}

// ---- students ------------------------------------------------------------------------------

export interface StudentQuery {
  search?: string
  gradeLevel?: string
  includeArchived?: boolean
  recordStatus?: '' | 'complete' | 'incomplete'
  limit?: number
  /** Mock only: for the screens that join or search on the client. The backend does that work itself. */
  fullLrn?: boolean
}

export function listStudents(query: StudentQuery = {}): Promise<StudentListRow[]> {
  return read('students', (s) => {
    const search = query.search?.trim().toLowerCase() ?? ''
    return (
      s.students
        .filter((st) => query.includeArchived || !st.archived)
        .filter((st) => !query.gradeLevel || st.gradeLevel === query.gradeLevel)
        .filter(
          (st) =>
            !query.recordStatus ||
            (missingRequiredFields(st).length === 0) === (query.recordStatus === 'complete'),
        )
        .filter(
          (st) =>
            !search ||
            nameMatches(formatPersonName(st), search) ||
            (/^\d+$/.test(search) && st.lrn.startsWith(search)),
        )
        // School-list order: last name, then first name (Zean, November 4, 2026).
        .sort(compareByLastName)
        .slice(0, query.limit ?? Infinity)
        .map((st) => toStudentRow(st, query.fullLrn))
    )
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
      (st) =>
        s.visits.some((v) => v.studentId === st.id) &&
        s.incidents.some((i) => i.studentId === st.id),
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
  | 'lrn'
  | 'firstName'
  | 'lastName'
  | 'middleName'
  | 'gradeLevel'
  | 'section'
  | 'sex'
  | 'birthDate'
  | 'allergies'
  | 'medicalConditions'
  | 'emergencyContacts'
>

export interface DuplicateMatch {
  id: string
  fullName: string
  lrn: string
  gradeLevel: string
}

export const DUPLICATE_LRN_MESSAGE = 'This LRN is already used by another student record.'

/** The LRN is unique; the message never names the other student (ADR-028). */
export class DuplicateLrnError extends Error {
  constructor() {
    super(DUPLICATE_LRN_MESSAGE)
  }
}

export interface StudentDuplicateCheck {
  /** Never says which student has it (ADR-028). */
  lrnTaken: boolean
  /** Active students with the same name, in any grade. */
  nameMatches: DuplicateMatch[]
}

/** Add Student's live check while typing; the save itself still enforces both rules. Names compare case-, accent- and space-insensitively. */
export function checkStudentDuplicates(
  lrn: string,
  fullName: string,
): Promise<StudentDuplicateCheck> {
  return read('check student duplicates', (s) => {
    const normalized = normalizeLrn(lrn)
    const name = nameKey(fullName)
    return {
      lrnTaken: isLrn(normalized) && s.students.some((st) => st.lrn === normalized),
      nameMatches: name
        ? s.students
            .filter((st) => !st.archived && nameKey(formatPersonName(st)) === name)
            .map((st) => ({
              id: st.id,
              fullName: formatPersonName(st),
              lrn: st.lrn,
              gradeLevel: st.gradeLevel,
            }))
        : [],
    }
  })
}

const NAME_PART_LABELS = {
  firstName: 'first name',
  lastName: 'last name',
  middleName: 'middle name',
} as const

/**
 * Cleans the three name parts (trimmed, single spaces) and enforces the rules the forms show:
 * first and last name required, middle name optional, each within `NAME_PART_MAX` (ADR-064).
 */
function cleanName(input: NameParts, whose: string): NameParts {
  const name = {
    firstName: cleanNamePart(input.firstName),
    lastName: cleanNamePart(input.lastName),
    middleName: cleanNamePart(input.middleName ?? '') || null,
  }
  if (!name.firstName) throw new Error(`Enter ${whose} first name.`)
  if (!name.lastName) throw new Error(`Enter ${whose} last name.`)
  for (const key of ['firstName', 'lastName', 'middleName'] as const)
    if ((name[key]?.length ?? 0) > NAME_PART_MAX[key])
      throw new Error(
        `The ${NAME_PART_LABELS[key]} can be at most ${NAME_PART_MAX[key]} characters.`,
      )
  return name
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
 * records that the name was corrected and why, never the old or new name (ADR-058).
 */
export function saveStudent(
  input: StudentInput,
  options: {
    studentId?: string
    confirmDuplicate?: boolean
    actor?: SessionUser
    nameCorrectionReason?: string
  } = {},
): Promise<SaveStudentResult> {
  return write('save student', (s): SaveStudentResult => {
    const lrn = normalizeLrn(input.lrn)
    if (!isLrn(lrn)) throw new Error('The LRN must be exactly 12 digits.')
    const current = options.studentId ? studentOf(s, options.studentId) : null
    if (current && current.lrn !== lrn) throw new LrnLockedError()
    const name = cleanName(input, "the student's")
    const nameChanged = current !== null && formatPersonName(current) !== formatPersonName(name)
    const reason = options.nameCorrectionReason?.trim() ?? ''
    if (nameChanged && reason.length < NAME_CORRECTION_REASON_MIN)
      throw new NameCorrectionReasonError()
    if (s.students.some((st) => st.id !== options.studentId && st.lrn === lrn))
      throw new DuplicateLrnError()
    const key = nameKey(formatPersonName(name))
    const matches = s.students
      .filter((st) => st.id !== options.studentId && !st.archived)
      .filter((st) => nameKey(formatPersonName(st)) === key && st.gradeLevel === input.gradeLevel)
      .map((st) => ({
        id: st.id,
        fullName: formatPersonName(st),
        lrn: st.lrn,
        gradeLevel: st.gradeLevel,
      }))
    if (!options.studentId && matches.length && !options.confirmDuplicate)
      return { status: 'duplicate', matches }

    const birthDate = input.birthDate || null
    if (birthDate && !isRealDate(birthDate)) throw new Error('Enter a real birthdate.')
    if (birthDate && birthDate > s.today) throw new Error("The birthdate can't be in the future.")

    const existing = options.studentId ? studentOf(s, options.studentId) : null
    const section = input.section?.trim() || null
    const fields = {
      lrn,
      ...name,
      gradeLevel: input.gradeLevel,
      // A record that never had a section stays without the field, so an unrelated edit isn't audited.
      ...(section || existing?.section ? { section } : {}),
      sex: input.sex,
      birthDate,
      allergies: input.allergies,
      medicalConditions: input.medicalConditions,
      emergencyContacts: input.emergencyContacts,
    }
    const changed = existing ? changedSummary(existing, fields) : undefined
    const summary = nameChanged ? `${changed}. Name corrected; reason: ${reason}` : changed
    const wasIncomplete = existing ? missingRequiredFields(existing).length > 0 : false
    let record: SeedStudent
    if (existing)
      record = Object.assign(existing, fields, nameChanged && { nameCorrectionReason: reason })
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
        review = {
          studentId: record.id,
          importedAt: s.today,
          importedBy: 'Flagged in CLINIQ',
          resolvedByUserId: null,
          resolvedAt: null,
        }
        s.frontendOnly.recordReviews.push(review)
      }
      review.resolvedByUserId = by.id
      review.resolvedAt = now(s)
    }
    return { status: 'saved', student: toStudent(record), action }
  })
}

/** The school-year dates in settings (professor's consultation, November 6, 2026). */
function schoolYearSettingsOf(s: DbState): SchoolYearSettings {
  const { schoolYearStartMonth, schoolYearStartDay, schoolYearEndMonth, schoolYearEndDay } =
    s.config
  return {
    schoolYearStartMonth,
    schoolYearStartDay,
    schoolYearEndMonth,
    schoolYearEndDay,
    schoolYearStarts: s.config.schoolYearStarts ?? [],
  }
}

/** The four date settings only, for the settings form and its audit summary. */
function schoolYearDatesOf(s: DbState): SchoolYearSettings {
  const { schoolYearStartMonth, schoolYearStartDay, schoolYearEndMonth, schoolYearEndDay } =
    s.config
  return { schoolYearStartMonth, schoolYearStartDay, schoolYearEndMonth, schoolYearEndDay }
}

/**
 * What an archived record stores: when, why, and the school year's label at that moment, so a later
 * change of the school-year dates never moves it (professor's consultation, November 6, 2026).
 */
function archiveDetails(
  s: DbState,
  reason: string,
): { archived: true; archivedAt: ISODateTime; archiveReason: string; archivedSchoolYear: string } {
  const at = now(s)
  return {
    archived: true,
    archivedAt: at,
    archiveReason: reason,
    archivedSchoolYear: schoolYearOf(at.slice(0, 10), schoolYearSettingsOf(s)).label,
  }
}

/** Longest archive reason ("Other" specified). */
export const ARCHIVE_REASON_MAX = 80

function cleanReason(reason: string): string {
  const cleaned = reason.replace(/\s+/g, ' ').trim().slice(0, ARCHIVE_REASON_MAX)
  if (!cleaned) throw new Error('Give the reason for archiving.')
  return cleaned
}

/**
 * Archive, never delete (data retention policy): hidden from active lists, kept for 5 years. The reason
 * is required (a mid-year transfer is "Transferred" with its date). The audit entry names no reason.
 */
export function archiveStudent(
  studentId: string,
  actor: SessionUser | undefined,
  reason: string,
): Promise<Student> {
  return write('archive student', (s) => {
    const record = studentOf(s, studentId)
    Object.assign(record, archiveDetails(s, cleanReason(reason)))
    audit(s, actorOr(actor), 'archive', { type: 'student', id: record.id })
    return toStudent(record)
  })
}

// ---- yearly student list import (ADR-047, mock level) ----------------------------------------

export interface ImportProblem {
  /** The row in the file, counting the header as row 1. */
  line: number
  lrn: string
  problem: string
}

export interface StudentImportPreview {
  newCount: number
  /** Students in the new list already on record, and how many of those change. */
  continuingCount: number
  changedCount: number
  /** Active students not in the new list. Archived only after review. */
  missing: Array<{ id: string; fullName: string; lrn: string; gradeLevel: string }>
  problems: ImportProblem[]
}

const importSex = (value: string): StudentSex | null =>
  /^m(ale)?$/i.test(value) ? 'male' : /^f(emale)?$/i.test(value) ? 'female' : null

/** Sorts the rows into usable and flagged. A flagged row is left out of the import. */
function checkImportRows(s: DbState, rows: ImportRow[]) {
  const grades = new Set(s.students.map((student) => student.gradeLevel))
  const seen = new Map<string, number>()
  for (const row of rows) seen.set(row.lrn, (seen.get(row.lrn) ?? 0) + 1)
  const problems: ImportProblem[] = []
  const good: ImportRow[] = []
  rows.forEach((row, index) => {
    const line = index + 2
    const problem = !isLrn(row.lrn)
      ? 'The LRN must be exactly 12 digits.'
      : (seen.get(row.lrn) ?? 0) > 1
        ? 'This LRN appears more than once in the file.'
        : !row.firstName || !row.lastName
          ? 'The name is incomplete.'
          : !grades.has(row.gradeLevel)
            ? `"${row.gradeLevel}" is not a grade level.`
            : !importSex(row.sex)
              ? 'Sex must be Male or Female.'
              : row.birthDate && (!isRealDate(row.birthDate) || row.birthDate > s.today)
                ? 'The birth date is not a real past date (use YYYY-MM-DD).'
                : null
    if (problem) problems.push({ line, lrn: isLrn(row.lrn) ? maskLrn(row.lrn) : row.lrn, problem })
    else good.push(row)
  })
  return { good, problems }
}

const importChanges = (record: SeedStudent, row: ImportRow) =>
  record.gradeLevel !== row.gradeLevel || (record.section ?? '') !== row.section

/** The preview before anything is applied. Reads only. */
export function previewStudentImport(
  rows: ImportRow[],
  actor?: SessionUser,
): Promise<StudentImportPreview> {
  return read('student import preview', (s) => {
    if (actorOr(actor).role !== 'staff')
      throw new Error('Only the School Clinician imports the student list.')
    const { good, problems } = checkImportRows(s, rows)
    const listed = new Set(rows.map((row) => row.lrn))
    const known = good.flatMap((row) => {
      const record = s.students.find((student) => student.lrn === row.lrn)
      return record ? [{ record, row }] : []
    })
    return {
      newCount: good.length - known.length,
      continuingCount: known.length,
      changedCount: known.filter(({ record, row }) => importChanges(record, row)).length,
      // By last name, then first name, like the Student List's default order (Zean, November 4, 2026).
      missing: s.students
        .filter((student) => !student.archived && !listed.has(student.lrn))
        .sort(compareByLastName)
        .map((student) => ({
          id: student.id,
          fullName: formatPersonName(student),
          lrn: maskLrn(student.lrn),
          gradeLevel: student.gradeLevel,
        })),
      problems,
    }
  })
}

export interface StudentImportResult {
  created: number
  updated: number
  archived: number
  flagged: number
}

/**
 * Applies a reviewed list: adds new students, updates the grade and section of continuing ones (the
 * LRN stays locked, ADR-028), and archives only the missing students the clinician ticked. A list
 * that changes nothing writes nothing. The audit entry holds counts, never names.
 */
export function applyStudentImport(
  rows: ImportRow[],
  options: { fileName: string; archiveIds: string[]; actor?: SessionUser },
): Promise<StudentImportResult> {
  return write('apply student import', (s) => {
    const by = actorOr(options.actor)
    if (by.role !== 'staff') throw new Error('Only the School Clinician imports the student list.')
    const { good, problems } = checkImportRows(s, rows)
    const result: StudentImportResult = {
      created: 0,
      updated: 0,
      archived: 0,
      flagged: problems.length,
    }
    for (const row of good) {
      const record = s.students.find((student) => student.lrn === row.lrn)
      if (record) {
        if (!importChanges(record, row)) continue
        record.gradeLevel = row.gradeLevel
        record.section = row.section || null
        result.updated += 1
      } else {
        s.students.push({
          id: nextId('student', s.students),
          archived: false,
          lrn: row.lrn,
          firstName: cleanNamePart(row.firstName),
          lastName: cleanNamePart(row.lastName),
          middleName: cleanNamePart(row.middleName) || null,
          gradeLevel: row.gradeLevel,
          ...(row.section ? { section: row.section } : {}),
          sex: importSex(row.sex)!,
          birthDate: row.birthDate || null,
          allergies: [],
          medicalConditions: [],
          emergencyContacts: [],
        })
        result.created += 1
      }
    }
    const listed = new Set(rows.map((row) => row.lrn))
    for (const student of s.students) {
      if (
        options.archiveIds.includes(student.id) &&
        !student.archived &&
        !listed.has(student.lrn)
      ) {
        Object.assign(student, archiveDetails(s, 'Not on the new list'))
        result.archived += 1
      }
    }
    if (!result.created && !result.updated && !result.archived) return result
    const id = nextId('import-batch', s.frontendOnly.studentImportBatches)
    s.frontendOnly.studentImportBatches.push({
      id,
      sourceFileName: options.fileName,
      rowsTotal: rows.length,
      rowsCreated: result.created,
      rowsUpdated: result.updated,
      rowsArchived: result.archived,
      rowsFlagged: result.flagged,
      importedByUserId: by.id,
      importedAt: now(s),
    })
    audit(
      s,
      by,
      'submit',
      { type: 'student-import', id },
      `${result.created} added, ${result.updated} updated, ${result.archived} archived, ${result.flagged} flagged`,
    )
    return result
  })
}

export type IncompleteRecord = IncompleteRecordRow & { resolvedByName: string | null }

export function getIncompleteRecordQueue(
  options: { fullLrn?: boolean } = {},
): Promise<IncompleteRecord[]> {
  return read('incomplete records', (s) =>
    incompleteRecordQueue(s, options.fullLrn).map((row) => ({
      ...row,
      resolvedByName: userName(s, row.review?.resolvedByUserId ?? null),
    })),
  )
}

/** ADR-067: completing an incomplete staff record resolves it on the staff Incomplete Records page, crediting whoever did it. */
function resolveIfCompleted(
  s: DbState,
  record: SeedPersonnel,
  wasIncomplete: boolean,
  by: SessionUser,
) {
  if (!wasIncomplete || missingStaffFields(record).length) return
  const reviews = (s.frontendOnly.personnelReviews ??= [])
  let review = reviews.find((r) => r.personnelId === record.id)
  if (!review) {
    review = { personnelId: record.id, resolvedByUserId: null, resolvedAt: null }
    reviews.push(review)
  }
  review.resolvedByUserId = by.id
  review.resolvedAt = now(s)
}

// ---- staff list import (ADR-069, mock level) -------------------------------------------------

export interface StaffImportProblem {
  /** The row in the file, counting the header as row 1. */
  line: number
  name: string
  problem: string
}

export interface StaffImportPreview {
  newCount: number
  /** Rows that match a staff record already in CLINIQ, and how many of those change. */
  continuingCount: number
  changedCount: number
  problems: StaffImportProblem[]
}

export interface StaffImportResult {
  created: number
  updated: number
  flagged: number
}

interface StaffImportPlan {
  row: StaffImportRow
  record: SeedPersonnel | null
  fields: Pick<
    SeedPersonnel,
    'firstName' | 'lastName' | 'middleName' | 'sex' | 'type' | 'department'
  > &
    Partial<Pick<SeedPersonnel, 'contactInfo' | 'emergencyContacts'>>
}

/**
 * Checks every row and works out what it would do. A row with a Staff No. updates that record; without
 * one it matches a staff member by full name and type, or is added. A flagged row is left out.
 */
function planStaffImport(s: DbState, rows: StaffImportRow[]) {
  const seenNumbers = new Map<string, number>()
  for (const row of rows)
    if (row.staffNumber)
      seenNumbers.set(
        row.staffNumber.toUpperCase(),
        (seenNumbers.get(row.staffNumber.toUpperCase()) ?? 0) + 1,
      )
  const problems: StaffImportProblem[] = []
  const plans: StaffImportPlan[] = []
  const claimed = new Set<string>()
  rows.forEach((row, index) => {
    const line = index + 2
    const name = [row.firstName, row.lastName].filter(Boolean).join(' ')
    const type = s.config.personnelTypes.find(
      (candidate) => candidate.toLowerCase() === row.type.toLowerCase(),
    )
    const contactStarted = Boolean(row.contactName || row.contactRelationship || row.contactPhone)
    const number = row.staffNumber.toUpperCase()
    const byNumber = number ? s.personnel.find((p) => p.staffNumber === number) : undefined
    const byName = number
      ? undefined
      : s.personnel.filter(
          (p) =>
            p.type === type &&
            nameKey(formatPersonName(p)) ===
              nameKey(
                formatPersonName({
                  firstName: row.firstName,
                  lastName: row.lastName,
                  middleName: row.middleName || null,
                }),
              ),
        )
    const problem =
      !row.firstName || !row.lastName
        ? 'The name is incomplete.'
        : !importSex(row.sex)
          ? 'Sex must be Male or Female.'
          : !type
            ? `"${row.type}" is not a staff type (${s.config.personnelTypes.join(', ')}).`
            : number && (seenNumbers.get(number) ?? 0) > 1
              ? 'This Staff No. appears more than once in the file.'
              : number && !byNumber
                ? `No staff record has the Staff No. ${number}. Leave it blank to add a new staff member.`
                : byName && byName.length > 1
                  ? 'More than one staff member has this name and type. Add the Staff No. to this row.'
                  : row.department.length > PERSONNEL_DEPARTMENT_MAX
                    ? `Department or role can be at most ${PERSONNEL_DEPARTMENT_MAX} characters.`
                    : contactStarted &&
                        !(row.contactName && row.contactRelationship && row.contactPhone)
                      ? 'The emergency contact needs a name, relationship and phone.'
                      : contactStarted && !isPhilippinePhone(row.contactPhone)
                        ? 'The emergency contact phone is not a Philippine number.'
                        : null
    const record = byNumber ?? byName?.[0] ?? null
    if (!problem && record && claimed.has(record.id)) {
      problems.push({ line, name, problem: 'Another row in the file is the same staff member.' })
      return
    }
    if (problem) {
      problems.push({ line, name, problem })
      return
    }
    if (record) claimed.add(record.id)
    plans.push({
      row,
      record,
      fields: {
        firstName: cleanNamePart(row.firstName),
        lastName: cleanNamePart(row.lastName),
        middleName: cleanNamePart(row.middleName) || null,
        sex: importSex(row.sex)!,
        type: type!,
        department: row.department || (record?.department ?? null),
        // Blank cells keep what CLINIQ has; a contact from the file is added only when the record has none.
        ...(row.contactInfo ? { contactInfo: row.contactInfo } : {}),
        ...(contactStarted && !record?.emergencyContacts.length
          ? {
              emergencyContacts: [
                {
                  name: row.contactName,
                  relationship: row.contactRelationship,
                  phone: row.contactPhone,
                  verified: false,
                },
              ],
            }
          : {}),
      },
    })
  })
  return { plans, problems }
}

const staffImportChanges = (plan: StaffImportPlan) =>
  !plan.record ||
  plan.record.archived ||
  Object.entries(plan.fields).some(
    ([key, value]) =>
      JSON.stringify(plan.record![key as keyof SeedPersonnel]) !== JSON.stringify(value),
  )

/** The preview before anything is applied. Reads only. */
export function previewStaffImport(
  rows: StaffImportRow[],
  actor?: SessionUser,
): Promise<StaffImportPreview> {
  return read('staff import preview', (s) => {
    requireClinician(actorOr(actor))
    const { plans, problems } = planStaffImport(s, rows)
    const known = plans.filter((plan) => plan.record)
    return {
      newCount: plans.length - known.length,
      continuingCount: known.length,
      changedCount: known.filter(staffImportChanges).length,
      problems,
    }
  })
}

/**
 * Applies a reviewed staff list (ADR-069): adds new staff with a new Staff No., updates the matched
 * ones and restores a matched archived record. Staff missing from the file are left alone. A list
 * that changes nothing writes nothing. The audit entry holds counts, never names.
 */
export function applyStaffImport(
  rows: StaffImportRow[],
  options: { fileName: string; actor?: SessionUser },
): Promise<StaffImportResult> {
  return write('apply staff import', (s) => {
    const by = actorOr(options.actor)
    requireClinician(by)
    const { plans, problems } = planStaffImport(s, rows)
    const result: StaffImportResult = { created: 0, updated: 0, flagged: problems.length }
    for (const plan of plans) {
      if (plan.record) {
        if (!staffImportChanges(plan)) continue
        const wasIncomplete = missingStaffFields(plan.record).length > 0
        Object.assign(plan.record, plan.fields, { archived: false })
        resolveIfCompleted(s, plan.record, wasIncomplete, by)
        result.updated += 1
      } else {
        s.personnel.push({
          id: nextId('personnel', s.personnel),
          staffNumber: nextStaffNumber(s),
          contactInfo: '',
          allergies: [],
          medicalConditions: [],
          emergencyContacts: [],
          archived: false,
          ...plan.fields,
        })
        result.created += 1
      }
    }
    if (!result.created && !result.updated) return result
    const id = `staff-import-${s.auditLog.filter((entry) => entry.targetRecord?.type === 'staff-import').length + 1}`
    audit(
      s,
      by,
      'submit',
      { type: 'staff-import', id },
      `${result.created} added, ${result.updated} updated, ${result.flagged} flagged`,
    )
    return result
  })
}

export type StaffIncompleteRecord = StaffIncompleteRow & { resolvedByName: string | null }

/** The staff Incomplete Records page (ADR-067). */
export function getStaffIncompleteQueue(): Promise<StaffIncompleteRecord[]> {
  return read('staff incomplete records', (s) =>
    staffIncompleteQueue(s).map((row) => ({
      ...row,
      resolvedByName: userName(s, row.review?.resolvedByUserId ?? null),
    })),
  )
}

// ---- personnel: staff patients (ADR-043) -------------------------------------------------------

export interface PersonnelQuery {
  /** Name or Staff No. */
  search?: string
  type?: string
  includeArchived?: boolean
}

/** The Staff List: a deliberate masterlist, so names are shown, as on the Student List (D7). */
export function listPersonnel(query: PersonnelQuery = {}): Promise<Personnel[]> {
  return read('staff', (s) => {
    const search = query.search?.trim().toLowerCase() ?? ''
    return s.personnel
      .filter((p) => query.includeArchived || !p.archived)
      .filter((p) => !query.type || p.type === query.type)
      .filter(
        (p) =>
          !search ||
          nameMatches(formatPersonName(p), search) ||
          p.staffNumber.toLowerCase().includes(search),
      )
      .sort(compareByLastName)
      .map(toPersonnel)
  })
}

export function getPersonnel(id: string): Promise<Personnel> {
  return read('staff member', (s) => toPersonnel(personnelOf(s, id)))
}

/** One patient in full (allergies included), for a form or a single-person screen (ADR-043). */
export function getPatient(ref: PatientRef): Promise<Patient> {
  return read('patient', (s): Patient =>
    ref.studentId
      ? { kind: 'student', ...toStudent(studentOf(s, ref.studentId)) }
      : { kind: 'personnel', ...toPersonnel(personnelOf(s, ref.personnelId ?? '')) },
  )
}

/** Staff lookup by name or Staff No.: active staff only, capped, nothing medical. */
export function searchPersonnel(query: string, limit = 8): Promise<PersonnelSearchResult[]> {
  return read('staff search', (s) => searchPersonnelRecords(s, query, limit))
}

/** The one patient box (ADR-043 item 5): students and staff, each result labelled by kind. */
export function searchPatients(query: string, limit = 8): Promise<PatientSearchResult[]> {
  return read('patient search', (s) => searchPatientRecords(s, query, limit))
}

/** The staff types the form offers (config; PROVISIONAL until the clinic and registrar answer). */
export function getPersonnelTypes(): Promise<string[]> {
  return read('staff types', (s) => s.config.personnelTypes)
}

/** Department or role values already in use, as suggestions (D4). */
export function getPersonnelDepartments(): Promise<Record<string, string[]>> {
  return read('staff departments', personnelDepartments)
}

export interface PersonnelHistory extends StudentHistory {
  followUps: FollowUp[]
}

/** A staff member's visits, incidents and follow-ups, newest first (D8). */
export function getPersonnelHistory(personnelId: string, limit = 8): Promise<PersonnelHistory> {
  return read('staff history', (s) => ({
    visits: s.visits
      .filter((v) => v.personnelId === personnelId)
      .sort((a, b) => b.dateTime.localeCompare(a.dateTime))
      .slice(0, limit),
    incidents: s.incidents
      .filter((i) => i.personnelId === personnelId)
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, limit),
    followUps: s.followUps
      .filter((f) => f.personnelId === personnelId)
      .sort((a, b) => b.followUpDate.localeCompare(a.followUpDate))
      .slice(0, limit),
  }))
}

export type PersonnelInput = Pick<
  Personnel,
  | 'firstName'
  | 'lastName'
  | 'middleName'
  | 'sex'
  | 'type'
  | 'department'
  | 'contactInfo'
  | 'allergies'
  | 'medicalConditions'
  | 'emergencyContacts'
>

/** Staff records belong to the School Clinician (ADR-043 item 9). */
export class PersonnelPermissionError extends Error {
  constructor() {
    super('Only the clinic staff can manage staff records.')
  }
}

function requireClinician(actor: SessionUser) {
  if (actor.role !== 'staff') throw new PersonnelPermissionError()
}

/** The next free Staff No., e.g. "STF-0013". Never reused, archived records included (D2). */
function nextStaffNumber(state: DbState): string {
  const max = state.personnel.reduce((m, p) => Math.max(m, Number(p.staffNumber.slice(4)) || 0), 0)
  return `STF-${String(max + 1).padStart(4, '0')}`
}

/**
 * Create or update a staff record. The Staff No. is assigned on create and never edited. No field
 * beyond the name, sex and type is required: emergency contacts, allergies and conditions are optional (D5, D6).
 */
export function savePersonnel(
  input: PersonnelInput,
  options: { personnelId?: string; actor?: SessionUser } = {},
): Promise<{ personnel: Personnel; action: 'create' | 'update' }> {
  return write('save staff', (s) => {
    const by = actorOr(options.actor)
    requireClinician(by)
    const name = cleanName(input, "the staff member's")
    if (input.sex !== 'female' && input.sex !== 'male') throw new Error('Choose the sex.')
    if (!s.config.personnelTypes.includes(input.type)) throw new Error('Choose the staff type.')
    const department = input.department?.trim() || null
    if (department && department.length > PERSONNEL_DEPARTMENT_MAX)
      throw new Error(`Department or role can be at most ${PERSONNEL_DEPARTMENT_MAX} characters.`)
    const fields = {
      ...name,
      sex: input.sex,
      type: input.type,
      department,
      contactInfo: input.contactInfo.trim(),
      allergies: input.allergies,
      medicalConditions: input.medicalConditions,
      emergencyContacts: input.emergencyContacts,
    }
    if (options.personnelId) {
      const record = personnelOf(s, options.personnelId)
      const summary = changedSummary(record, fields)
      const wasIncomplete = missingStaffFields(record).length > 0
      Object.assign(record, fields)
      audit(s, by, 'update', { type: 'staff', id: record.id }, summary)
      resolveIfCompleted(s, record, wasIncomplete, by)
      return { personnel: toPersonnel(record), action: 'update' as const }
    }
    const record: SeedPersonnel = {
      id: nextId('personnel', s.personnel),
      staffNumber: nextStaffNumber(s),
      ...fields,
      archived: false,
    }
    s.personnel.push(record)
    audit(s, by, 'create', { type: 'staff', id: record.id })
    return { personnel: toPersonnel(record), action: 'create' as const }
  })
}

/** Archive, never delete (D9): hidden from active lists and the patient search, kept in history. */
export function archivePersonnel(
  personnelId: string,
  actor: SessionUser | undefined,
  reason: string,
): Promise<Personnel> {
  return write('archive staff', (s) => {
    const by = actorOr(actor)
    requireClinician(by)
    const record = personnelOf(s, personnelId)
    Object.assign(record, archiveDetails(s, cleanReason(reason)))
    audit(s, by, 'archive', { type: 'staff', id: record.id })
    return toPersonnel(record)
  })
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
        .filter(
          (v) => !range || (dateOf(v.dateTime) >= range.from && dateOf(v.dateTime) <= range.to),
        )
        .sort((a, b) => b.dateTime.localeCompare(a.dateTime)),
    options.includeEnteredInError,
  )
}

/** One deliberately opened visit, including one marked "Entered in error". */
export function getVisit(id: string): Promise<Visit> {
  return read(
    'visit',
    (s) =>
      must(
        s.visits.find((v) => v.id === id),
        'Visit',
      ),
    true,
  )
}

/** The most recent visit by an active student (default for detail screens opened without an id). */
export function getLatestVisit(): Promise<Visit> {
  return read('latest visit', (s) => {
    const byId = studentsById(s)
    const sorted = [...s.visits].sort((a, b) => b.dateTime.localeCompare(a.dateTime))
    // A student's visit: the screens opened without an id (the excuse letter) are student screens.
    return must(
      sorted.find((v) => v.studentId && byId.get(v.studentId)?.archived === false),
      'Visit',
    )
  })
}

export type FollowUpInput = Pick<FollowUp, 'followUpDate' | 'reason' | 'notes'> &
  Partial<Pick<FollowUp, 'stayHomeUntilCleared' | 'stayHomeNote'>>

export interface RecordVisitInput extends Partial<VisitLogbookFields> {
  /** The patient: a student or a staff member, exactly one (ADR-043). */
  studentId?: string | null
  personnelId?: string | null
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
  /** Sent home or Referred only: who collected the student (ADR-049, D4). */
  collectedBy?: CollectedBy | null
  /** "Save and approve now" (ADR-049, D3): the draft letter is approved in the same write. */
  approveExcuseLetterNow?: boolean
  /** Up to 3 more complaints as tags (ADR-053); the reports count only `complaint`. */
  extraComplaints?: string[]
}

export const EXTRA_COMPLAINTS_MAX = 3

export class ExtraComplaintsError extends Error {
  constructor() {
    super(`Add at most ${EXTRA_COMPLAINTS_MAX} extra complaints.`)
  }
}

/** Cleaned like the main complaint, without repeats or the main one; more than 3 is refused (ADR-053). */
function cleanExtraComplaints(s: DbState, main: string, extras: ReadonlyArray<string>): string[] {
  const known = complaintSuggestions(s)
  const mainKey = normalizeComplaint(main, known).toLowerCase()
  const cleaned = extras
    .map((text) => normalizeComplaint(text, known))
    .filter(
      (text, index, all) =>
        text &&
        text.toLowerCase() !== mainKey &&
        all.findIndex((other) => other.toLowerCase() === text.toLowerCase()) === index,
    )
  if (cleaned.length > EXTRA_COMPLAINTS_MAX) throw new ExtraComplaintsError()
  return cleaned
}

/** A new visit carries the field only when it has extra complaints. */
function extraComplaintsField(
  s: DbState,
  main: string,
  extras: ReadonlyArray<string> | undefined,
): Pick<Visit, 'extraComplaints'> {
  const cleaned = cleanExtraComplaints(s, main, extras ?? [])
  return cleaned.length ? { extraComplaints: cleaned } : {}
}

/** A visit dated more than this many minutes before it is saved is a late entry (D1 of the panel-review prompt). */
export const LATE_ENTRY_MINUTES = 30

/** The visit's date and time from "YYYY-MM-DDTHH:MM", checked against now, and whether it is a late entry. */
function visitTime(s: DbState, input: Pick<RecordVisitInput, 'dateTime' | 'lateEntryReason'>) {
  const saved = now(s)
  if (!input.dateTime) return { dateTime: saved, lateEntry: false, lateEntryReason: null }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.dateTime))
    throw new Error('Enter the visit date and time.')
  const dateTime = `${input.dateTime}:00+08:00`
  if (dateTime > saved) throw new Error("The visit date and time can't be in the future.")
  const lateEntry = Date.parse(saved) - Date.parse(dateTime) > LATE_ENTRY_MINUTES * 60_000
  return {
    dateTime,
    lateEntry,
    lateEntryReason: lateEntry ? input.lateEntryReason?.trim() || null : null,
  }
}

/** The visit's optional logbook fields (body temperature, time out, assisted by, parent/guardian, remarks). */
export type VisitLogbookFields = Pick<
  Visit,
  'temperatureC' | 'timeOut' | 'assistedBy' | 'parentGuardian' | 'remarks'
>

/** Blank text is stored as null; a time out must be "HH:MM" and not earlier than the time in. */
function logbookFields(
  input: Partial<VisitLogbookFields>,
  timeIn: ISODateTime,
): VisitLogbookFields {
  const text = (value: string | null | undefined) => value?.trim() || null
  const timeOut = text(input.timeOut)
  if (timeOut && !/^\d{2}:\d{2}$/.test(timeOut)) throw new Error('Time out must be HH:MM.')
  if (timeOut && timeOut < timeIn.slice(11, 16))
    throw new Error("Time out can't be earlier than the time in.")
  const temperatureC = input.temperatureC ?? null
  if (temperatureC !== null && !Number.isFinite(temperatureC))
    throw new Error('Body temperature must be a number.')
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
 * approved letter then holds the period, so the two can't diverge). Who collected the student is
 * kept only on Sent home or Referred, and its time is never in the future (ADR-049, D4).
 */
function dispositionFields(
  s: DbState,
  visitId: string | null,
  disposition: Disposition,
  draft: ExcuseLetterDraft | null,
  referredTo: string | null,
  collected: CollectedBy | null,
  dateTime: ISODateTime,
): Pick<Visit, 'excuseLetterDraft' | 'referredTo' | 'collectedBy'> {
  if (draft) {
    if (disposition === 'returned_to_class')
      throw new Error('Only a Sent home or Referred visit has an excuse letter.')
    const invalid = excusedPeriodError(draft)
    if (invalid) throw new Error(invalid)
    if (visitId && activeApproval(s, visitId))
      throw new Error('This visit already has an approved excuse letter. Its period is fixed.')
  }
  const referred = referredTo?.trim() || null
  if (referred && disposition !== 'referred_to_hospital')
    throw new Error('Only a Referred to hospital visit has "Referred to".')
  const leftClinic = disposition === 'sent_home' || disposition === 'referred_to_hospital'
  const name = collected?.name?.trim() || null
  const relationship = collected?.relationship?.trim() || null
  const time = collected?.time?.trim() || null
  if (time && !/^\d{2}:\d{2}$/.test(time)) throw new Error('The collection time must be HH:MM.')
  if (time && `${dateTime.slice(0, 10)}T${time}:00+08:00` > now(s))
    throw new Error("The collection time can't be in the future.")
  return {
    excuseLetterDraft: draft
      ? {
          excusedFrom: draft.excusedFrom,
          excusedUntil: draft.excusedUntil,
          note: draft.note?.trim() || null,
          ...(draft.stayHomeUntilCleared && {
            stayHomeUntilCleared: true,
            stayHomeNote: draft.stayHomeNote?.trim() || null,
          }),
        }
      : null,
    referredTo: referred,
    // Nobody named means nobody recorded, whatever the time field says.
    collectedBy: leftClinic && (name || relationship) ? { name, relationship, time } : null,
  }
}

function createFollowUp(
  s: DbState,
  actor: SessionUser,
  patient: PatientRef,
  related: FollowUp['relatedRecord'],
  input: FollowUpInput,
): FollowUp {
  const followUp: FollowUp = {
    id: nextId('followup', s.followUps),
    studentId: patient.studentId,
    personnelId: patient.personnelId,
    relatedRecord: related,
    followUpDate: input.followUpDate,
    reason: input.reason,
    status: 'pending',
    notes: input.notes,
    createdByUserId: actor.id,
    ...(input.stayHomeUntilCleared && {
      stayHomeUntilCleared: true,
      stayHomeNote: input.stayHomeNote?.trim() || null,
    }),
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
    const patient = patientOf(s, input)
    // A staff member sent home gets the disposition and no letter (ADR-043 item 7).
    if (patient.personnelId && input.excuseLetterDraft)
      throw new Error('An excuse letter is only for a student.')
    const itemLines = input.itemsGiven ?? []
    const { dateTime, lateEntry, lateEntryReason } = visitTime(s, input)
    // Treatment notes and items given are both optional: a visit may record no treatment.
    const extra = dispositionFields(
      s,
      null,
      input.disposition,
      input.excuseLetterDraft ?? null,
      input.referredTo ?? null,
      input.collectedBy ?? null,
      dateTime,
    )
    const visit: Visit = {
      id: nextId('visit', s.visits),
      ...patient,
      ...gradeAtTime(s, patient),
      dateTime,
      // Stored in a known suggestion's spelling, so counts never split by case.
      complaint: normalizeComplaint(input.complaint, complaintSuggestions(s)),
      ...extraComplaintsField(s, input.complaint, input.extraComplaints),
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
    const given = applyItemLines(
      s,
      by,
      { ...patient, visitId: visit.id },
      [],
      itemLines,
      'dispense',
    )
    visit.itemsGiven = given.lines
    const followUp = input.followUp
      ? createFollowUp(s, by, patient, { type: 'visit', id: visit.id }, input.followUp)
      : null
    if (input.approveExcuseLetterNow) approveDraftNow(s, by, visit)
    return { visit, followUp, belowZero: given.belowZero }
  })
}

export type VisitPatch = Pick<Visit, 'complaint' | 'treatment' | 'disposition' | 'eventTag'> & {
  /** The full new set of lines. Omitted, the lines stay as they are. */
  itemsGiven?: ItemLineInput[]
  /** "YYYY-MM-DDTHH:MM" to correct when the visit happened; never in the future. Omitted, it stays. */
  dateTime?: string
} & Partial<
    Pick<Visit, 'excuseLetterDraft' | 'referredTo' | 'collectedBy'> & VisitLogbookFields
  > & {
    /** "Save and approve now" (ADR-049, D3): the edited draft letter is approved in the same write. */
    approveExcuseLetterNow?: boolean
    /** The full new set of extra complaints (ADR-053). Omitted, they stay. */
    extraComplaints?: string[]
  }

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
    const visit = must(
      s.visits.find((v) => v.id === id),
      'Visit',
    )
    if (visit.enteredInError)
      throw new Error('This visit was marked entered in error and can no longer be edited.')
    const {
      itemsGiven,
      excuseLetterDraft,
      referredTo,
      collectedBy,
      approveExcuseLetterNow,
      extraComplaints,
      temperatureC,
      timeOut,
      assistedBy,
      parentGuardian,
      remarks,
      dateTime: correctedTime,
      ...rest
    } = patch
    // A corrected time is checked like a new visit's (never in the future); the audit names the field.
    // Callers that pass the whole visit back send its saved timestamp; same minute means unchanged.
    const dateTime =
      correctedTime && correctedTime.slice(0, 16) !== visit.dateTime.slice(0, 16)
        ? visitTime(s, { dateTime: correctedTime.slice(0, 16) }).dateTime
        : visit.dateTime
    // Omitted disposition fields stay as they are; checked against the (possibly new) disposition.
    const extra = dispositionFields(
      s,
      id,
      rest.disposition,
      excuseLetterDraft === undefined ? visit.excuseLetterDraft : excuseLetterDraft,
      referredTo === undefined ? visit.referredTo : referredTo,
      collectedBy === undefined ? (visit.collectedBy ?? null) : collectedBy,
      dateTime,
    )
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
    const fields = {
      ...rest,
      dateTime,
      complaint: normalizeComplaint(rest.complaint, complaintSuggestions(s)),
      // Set only when they change, so an edit that leaves them alone isn't audited as one.
      ...(() => {
        const cleaned =
          extraComplaints === undefined
            ? undefined
            : cleanExtraComplaints(s, rest.complaint, extraComplaints)
        return cleaned && JSON.stringify(cleaned) !== JSON.stringify(visit.extraComplaints ?? [])
          ? { extraComplaints: cleaned }
          : {}
      })(),
      ...extra,
      ...logbook,
    }
    const given = itemsGiven
      ? applyItemLines(
          s,
          by,
          { studentId: visit.studentId, personnelId: visit.personnelId, visitId: id },
          visit.itemsGiven,
          itemsGiven,
          'adjust',
        )
      : { lines: visit.itemsGiven, belowZero: [] }
    const summary = changedSummary(
      { ...visit, collectedBy: visit.collectedBy ?? null },
      { ...fields, itemsGiven: given.lines },
    )
    Object.assign(visit, fields, { itemsGiven: given.lines })
    audit(s, by, 'update', { type: 'visit', id }, summary)
    if (approveExcuseLetterNow) approveDraftNow(s, by, visit)
    return { visit, belowZero: given.belowZero }
  })
}

/**
 * Marks a visit "Entered in error" (panel review VS-9, D2). The record is kept, never deleted: it leaves
 * every list and count, its medicines go back to stock through the same `visit_edited` adjustment
 * transactions an edit uses (ADR-018), and its excuse letter, draft or approved, is voided.
 */
export function markVisitEnteredInError(
  id: string,
  reason: string,
  actor?: SessionUser,
): Promise<Visit> {
  return write('mark visit entered in error', (s) => {
    const by = actorOr(actor)
    const visit = must(
      s.visits.find((v) => v.id === id),
      'Visit',
    )
    const why = reason.trim()
    if (!why) throw new Error('Give the reason this visit was entered in error.')
    if (visit.enteredInError) throw new Error('This visit is already marked entered in error.')
    const marked = { reason: why, at: now(s), byUserId: by.id }
    applyItemLines(
      s,
      by,
      { studentId: visit.studentId, personnelId: visit.personnelId, visitId: id },
      visit.itemsGiven,
      [],
      'adjust',
    )
    visit.enteredInError = marked
    // The reason stays on the record, not in the audit trail (ADR-017).
    audit(s, by, 'update', { type: 'visit', id }, 'Marked entered in error')
    const approval = activeApproval(s, id)
    if (approval) {
      approval.voided = marked
      audit(
        s,
        by,
        'update',
        { type: 'excuse-letter', id: approval.id },
        'Voided: visit entered in error',
      )
    } else if (visit.excuseLetterDraft)
      audit(
        s,
        by,
        'update',
        { type: 'excuse-letter', id: `draft-${id}` },
        'Voided: visit entered in error',
      )
    // Its pending follow-ups are cancelled with the same reason (Zean, Thursday, October 22, 2026).
    for (const followUp of s.followUps)
      if (
        followUp.status === 'pending' &&
        followUp.relatedRecord.type === 'visit' &&
        followUp.relatedRecord.id === id
      ) {
        followUp.status = 'cancelled'
        followUp.statusReason = `Visit entered in error: ${why}`
        audit(
          s,
          by,
          'update',
          { type: 'follow-up', id: followUp.id },
          'Marked cancelled: visit entered in error',
        )
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
  return read(
    'excuse letter by id',
    (s) =>
      must(
        s.frontendOnly.excuseLetterApprovals.find((a) => a.id === letterId),
        'Excuse letter',
      ),
    true,
  )
}

/**
 * "Issue a replacement" (panel review EX-3): the approved letter of a still-valid visit is marked
 * Superseded with a reason and kept; a new draft with the same period and note opens on the visit.
 */
export function issueReplacementExcuseLetter(
  visitId: string,
  reason: string,
  actor?: SessionUser,
): Promise<void> {
  return write('issue replacement excuse letter', (s) => {
    const by = actorOr(actor)
    const visit = must(
      s.visits.find((v) => v.id === visitId),
      'Visit',
    )
    const old = activeApproval(s, visitId)
    const why = reason.trim()
    if (!why) throw new Error('Give the reason for the replacement.')
    if (!old) throw new Error('Only an approved letter can be replaced.')
    if (old.voided || visit.enteredInError) throw new Error('A voided letter cannot be replaced.')
    old.superseded = { reason: why, at: now(s), byUserId: by.id }
    visit.excuseLetterDraft = {
      excusedFrom: old.excusedFrom,
      excusedUntil: old.excusedUntil,
      note: old.note,
      ...(old.stayHomeUntilCleared && {
        stayHomeUntilCleared: true,
        stayHomeNote: old.stayHomeNote ?? null,
      }),
    }
    audit(
      s,
      by,
      'update',
      { type: 'excuse-letter', id: old.id },
      'Superseded; replacement draft opened',
    )
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
  /**
   * An approved letter whose visit no longer sends the student out (edited to "Returned to class",
   * say): the letter still stands, flagged "Outcome changed since approval" (ADR-049, D7).
   */
  outcomeChanged: boolean
}

/** A student's excuse letters, approved and pending, newest period first. */
export function getStudentExcuseLetters(studentId: string): Promise<StudentExcuseLetter[]> {
  return read('student excuse letters', (s) => {
    const approved = s.frontendOnly.excuseLetterApprovals.flatMap((a) => {
      const visit = s.visits.find((v) => v.id === a.visitId && v.studentId === studentId)
      return visit
        ? [
            (() => {
              const status = a.superseded
                ? ('superseded' as const)
                : a.voided || visit.enteredInError
                  ? ('voided' as const)
                  : ('approved' as const)
              return {
                id: a.id,
                visitId: a.visitId,
                disposition: visit.disposition,
                excusedFrom: a.excusedFrom,
                excusedUntil: a.excusedUntil,
                status,
                outcomeChanged: status === 'approved' && outcomeChangedSinceApproval(visit),
              }
            })(),
          ]
        : []
    })
    // A visit never holds a draft once its letter is approved, so the two lists can't overlap.
    const pending = s.visits.flatMap((v) =>
      v.studentId === studentId && v.excuseLetterDraft
        ? [
            {
              id: `draft-${v.id}`,
              visitId: v.id,
              disposition: v.disposition,
              excusedFrom: v.excuseLetterDraft.excusedFrom,
              excusedUntil: v.excuseLetterDraft.excusedUntil,
              status: 'pending' as const,
              outcomeChanged: false,
            },
          ]
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
          ? [
              {
                visitId: v.id,
                visitDateTime: v.dateTime,
                lrn: student.lrn,
                excusedFrom: v.excuseLetterDraft.excusedFrom,
                excusedUntil: v.excuseLetterDraft.excusedUntil,
              },
            ]
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

/** ADR-049 (D7): the visit no longer sends the student out, so an approved letter's outcome changed. */
export function outcomeChangedSinceApproval(visit: Pick<Visit, 'disposition'>): boolean {
  return visit.disposition !== 'sent_home' && visit.disposition !== 'referred_to_hospital'
}

export interface ExcuseLetterApprovalInput extends ExcusedPeriod {
  note?: string | null
  /** The final wording (ADR-049, D6). Omitted, the template's wording for this visit is stored. */
  recipient?: string
  body?: string
  stayHomeUntilCleared?: boolean
  stayHomeNote?: string | null
}

/** One approval inside a write: the checks, the letter with its final wording, the cleared draft and the audit entry. */
function storeApproval(
  s: DbState,
  by: SessionUser,
  visit: Visit,
  input: ExcuseLetterApprovalInput,
): ExcuseLetterApproval {
  if (visit.personnelId) throw new Error('An excuse letter is only for a student.')
  if (visit.enteredInError)
    throw new Error('This visit was entered in error, so its excuse letter is void.')
  const invalid = excusedPeriodError(input)
  if (invalid) throw new Error(invalid)
  // Approved letters are permanent: the period is fixed once stored. A superseded one makes room for its replacement.
  if (activeApproval(s, visit.id))
    throw new Error('This excuse letter is already approved and stored.')
  const earlier = s.frontendOnly.excuseLetterApprovals.filter((a) => a.visitId === visit.id).length
  const period = { excusedFrom: input.excusedFrom, excusedUntil: input.excusedUntil }
  const approval: ExcuseLetterApproval = {
    id: earlier ? `excuse-${visit.id}-${earlier + 1}` : `excuse-${visit.id}`,
    visitId: visit.id,
    approvedByUserId: by.id,
    approvedAt: now(s),
    ...period,
    note: input.note?.trim() || null,
    recipient: input.recipient?.trim() || EXCUSE_LETTER_RECIPIENT,
    body:
      input.body?.trim() ||
      excuseLetterBody(
        formatPersonName(studentOf(s, visit.studentId ?? '')),
        visit.dateTime.slice(0, 10),
        period,
      ),
    ...(input.stayHomeUntilCleared && {
      stayHomeUntilCleared: true,
      stayHomeNote: input.stayHomeNote?.trim() || null,
    }),
  }
  s.frontendOnly.excuseLetterApprovals = [...s.frontendOnly.excuseLetterApprovals, approval]
  visit.excuseLetterDraft = null
  audit(s, by, 'approve', { type: 'excuse-letter', id: approval.id })
  return approval
}

/** "Save and approve now" (ADR-049, D3): the draft just saved with the visit, approved with the template's wording. */
function approveDraftNow(s: DbState, by: SessionUser, visit: Visit) {
  if (!visit.excuseLetterDraft) throw new Error('Prepare the excuse letter before approving it.')
  storeApproval(s, by, visit, visit.excuseLetterDraft)
}

/**
 * Approves and stores a visit's letter. The period, note and final wording are snapshotted onto the
 * letter and the visit's draft is cleared in the same write, so from here on the approved letter is the
 * only record, and it prints from the stored text (ADR-049, D6).
 */
export function approveExcuseLetter(
  visitId: string,
  input: ExcuseLetterApprovalInput,
  actor?: SessionUser,
): Promise<ExcuseLetterApproval> {
  return write('approve excuse letter', (s) =>
    storeApproval(
      s,
      actorOr(actor),
      must(
        s.visits.find((v) => v.id === visitId),
        'Visit',
      ),
      input,
    ),
  )
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

/** ADR-043 item 9 (D15): the Admin's read-only incident screens leave out staff patients' incidents. */
const visibleTo = (viewer?: SessionUser) => (incident: Incident) =>
  viewer?.role !== 'admin' || incident.personnelId === null

export function listIncidents(
  range?: { from: ISODate; to: ISODate },
  viewer?: SessionUser,
): Promise<Incident[]> {
  return read('incidents', (s) =>
    s.incidents
      .filter(visibleTo(viewer))
      .filter((i) => !range || (dateOf(i.time) >= range.from && dateOf(i.time) <= range.to))
      .sort((a, b) => b.time.localeCompare(a.time)),
  )
}

export function getIncident(id: string, viewer?: SessionUser): Promise<Incident> {
  return read('incident', (s) =>
    must(
      s.incidents.find((i) => i.id === id && visibleTo(viewer)(i)),
      'Incident',
    ),
  )
}

export interface StageOneInput {
  /** The patient: a student or a staff member, exactly one (ADR-043). */
  studentId?: string | null
  personnelId?: string | null
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
    const patient = patientOf(s, input)
    const saved = now(s)
    if (input.time && input.time > saved)
      throw new Error("The incident time can't be in the future.")
    const source = input.sourceVisitId
      ? must(
          s.visits.find((v) => v.id === input.sourceVisitId),
          'Visit',
        )
      : null
    if (source) {
      if (!samePatient(source, patient))
        throw new Error('The escalated visit belongs to another patient.')
      if (source.enteredInError) throw new Error('A visit entered in error cannot be escalated.')
      if (source.escalatedIncidentId)
        throw new Error('This visit was already escalated to an incident.')
    }
    const incident: Incident = {
      id: nextId('incident', s.incidents),
      ...patient,
      ...gradeAtTime(s, patient),
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
    audit(
      s,
      by,
      'submit',
      { type: 'incident-stage-1', id: incident.id },
      incident.generalNotes ? 'Included additional notes' : undefined,
    )
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
  /** Corrected Additional notes (ADR-049); accepted until the incident report is approved. Omitted, they stay. */
  generalNotes?: string
}

/** ADR-049: Additional notes can be corrected until the incident report is approved. */
export class IncidentApprovedError extends Error {
  constructor() {
    super('This incident report is approved, so its Additional notes can no longer be changed.')
  }
}

function incidentApproved(s: DbState, incidentId: string): boolean {
  return s.auditLog.some(
    (entry) =>
      entry.actionType === 'approve' &&
      entry.targetRecord?.type === 'incident-report' &&
      entry.targetRecord.id === incidentId,
  )
}

/** Stage 2 completion: same record, now complete. Logged separately from Stage 1. */
export function completeIncidentStageTwo(
  input: StageTwoInput,
  actor?: SessionUser,
): Promise<{ incident: Incident; followUp: FollowUp | null; belowZero: string[] }> {
  return write('complete incident stage 2', (s) => {
    const by = actorOr(actor)
    const incident = must(
      s.incidents.find((i) => i.id === input.incidentId),
      'Incident',
    )
    const lines = input.itemsGiven ?? []
    const noFurtherActionReason = input.noFurtherActionReason?.trim() || null
    // Care, a call and a referral are all optional (ADR-065 reverses panel review IN-3).
    const notes =
      input.generalNotes === undefined
        ? (incident.generalNotes ?? null)
        : input.generalNotes.trim() || null
    const notesChanged = notes !== (incident.generalNotes ?? null)
    if (notesChanged && incidentApproved(s, incident.id)) throw new IncidentApprovedError()
    let belowZero: string[] = []
    // ponytail: medicines are fixed once Stage 2 is complete; changing them later needs an
    // incident-edit adjustment rule that hasn't been decided (Frontend-Issues-and-TODOs).
    if (incident.stage === 2) {
      const same = (a: ItemLineInput[], b: ItemGivenLine[]) =>
        a.length === b.length &&
        a.every((line) =>
          b.some((old) => old.itemId === line.itemId && old.quantity === line.quantity),
        )
      if (input.itemsGiven && !same(lines, incident.itemsGiven))
        throw new StockRuleError("Medicines on a completed incident can't be changed.")
    } else {
      const given = applyItemLines(
        s,
        by,
        {
          studentId: incident.studentId,
          personnelId: incident.personnelId,
          incidentId: incident.id,
        },
        [],
        lines,
        'dispense',
      )
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
      generalNotes: notes,
    })
    // The summary names the optional fields, never their values (ADR-017).
    const named = [
      incident.bodyPart && 'body part affected',
      noFurtherActionReason && 'nothing further was needed or done',
      notesChanged && 'corrected additional notes',
    ]
      .filter(Boolean)
      .join(' and ')
    audit(
      s,
      by,
      'update',
      { type: 'incident-stage-2', id: incident.id },
      `Completed Stage 2 details${named ? `; included ${named}` : ''}`,
    )
    for (const attempt of input.newParentNotifications) {
      incident.parentNotifications.push(attempt)
      audit(s, by, 'create', {
        type: 'parent-notification',
        id: `${incident.id}-${incident.parentNotifications.length}`,
      })
    }
    const followUp = input.followUp
      ? createFollowUp(s, by, incident, { type: 'incident', id: incident.id }, input.followUp)
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
    const incident = must(
      s.incidents.find((i) => i.id === incidentId),
      'Incident',
    )
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
      .filter(
        (entry) => entry.actionType === 'approve' && entry.targetRecord?.type === 'incident-report',
      )
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
        (e) =>
          e.actionType === action &&
          e.targetRecord?.id === incidentId &&
          types.includes(e.targetRecord.type),
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
    const incident = must(
      s.incidents.find((i) => i.id === incidentId),
      'Incident',
    )
    // Only a completed (Stage 2) record is signed off (Zean, Thursday, October 22, 2026).
    if (incident.stage === 1) throw new Error('Complete Stage 2 before approving this report.')
    audit(s, actorOr(actor), 'approve', { type: 'incident-report', id: incidentId })
  })
}

// ---- follow-ups ------------------------------------------------------------------------------

/** `patient`: the LRN or the Staff No. a multi-person list may show (ADR-004, ADR-043). */
export type FollowUpView = FollowUp & { patient: PatientNumber; dueState: FollowUpDueState | null }

/** The masked-list identifier of a record's patient: LRN or Staff No. */
function patientNumberOf(s: DbState, ref: PatientRef): PatientNumber {
  if (ref.studentId)
    return { kind: 'student', number: studentsById(s).get(ref.studentId)?.lrn ?? '' }
  return {
    kind: 'personnel',
    number: s.personnel.find((p) => p.id === ref.personnelId)?.staffNumber ?? '',
  }
}

export function listFollowUps(
  query: { status?: FollowUpStatus | '' } = {},
): Promise<FollowUpView[]> {
  return read('follow-ups', (s) => {
    return (
      s.followUps
        .filter((f) => !query.status || f.status === query.status)
        // A Missed follow-up given a new date leaves the list; the record stays (Zean, November 1, 2026).
        .filter((f) => !(f.status === 'missed' && hasLaterFollowUp(s.followUps, f)))
        .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate))
        .map((f) => ({
          ...f,
          patient: patientNumberOf(s, f),
          dueState: followUpDueState(f, s.today, s.config.followUpOverdueAfterDays),
        }))
    )
  })
}

/** Cancelled needs a reason (panel review FU-4); Missed's is optional (Zean, November 8, 2026). It stays on the follow-up, not in the audit trail. */
export function setFollowUpStatus(
  id: string,
  status: FollowUpStatus,
  actor?: SessionUser,
  reason?: string,
): Promise<FollowUp> {
  return write('update follow-up', (s) => {
    const followUp = must(
      s.followUps.find((f) => f.id === id),
      'Follow-up',
    )
    const why = reason?.trim() || null
    if (status === 'cancelled' && !why)
      throw new Error(`Give the reason this follow-up is ${status}.`)
    const summary = followUp.status === status ? undefined : `Marked ${status}`
    followUp.status = status
    if (status === 'missed' || status === 'cancelled') followUp.statusReason = why
    audit(s, actorOr(actor), 'update', { type: 'follow-up', id }, summary)
    return followUp
  })
}

/**
 * "Set a new date" after Missed, or once a pending follow-up reads as Missed (ADR-051): a new pending
 * follow-up for the same patient, record and reason. A stay-home instruction carries over until the
 * clinician clears it (ADR-049). A follow-up that only read as Missed is closed for good here.
 */
export function rescheduleFollowUp(
  id: string,
  followUpDate: ISODate,
  actor?: SessionUser,
): Promise<FollowUp> {
  return write('reschedule follow-up', (s) => {
    const old = must(
      s.followUps.find((f) => f.id === id),
      'Follow-up',
    )
    const [effective] = withAutoClosedFollowUps([old], s.today, s.config.followUpAutoCloseDays)
    if (effective.status !== 'missed') throw new Error('Only a missed follow-up gets a new date.')
    if (hasLaterFollowUp(s.followUps, old))
      throw new Error('This follow-up already has a new date.')
    if (!followUpDate || followUpDate < s.today)
      throw new Error("The new date can't be in the past.")
    Object.assign(old, { status: effective.status, statusReason: effective.statusReason })
    return createFollowUp(s, actorOr(actor), old, old.relatedRecord, {
      followUpDate,
      reason: old.reason,
      notes: old.notes,
      stayHomeUntilCleared: old.stayHomeUntilCleared,
      stayHomeNote: old.stayHomeNote,
    })
  })
}

// ---- inventory -------------------------------------------------------------------------------

export type InventoryItemView = InventoryItem & InventoryStatus

function inventoryView(s: DbState, item: InventoryItem): InventoryItemView {
  return { ...item, ...inventoryStatusFor(s, item) }
}

/** New stock can't arrive already expired; an expiry of today is still usable (see `usableBatches`). */
const PAST_EXPIRY_RULE = "The expiration date can't be in the past."

export function listInventory(
  query: {
    search?: string
    category?: InventoryCategory | ''
    hasExpiredStock?: boolean
    attention?: '' | 'low_stock' | 'expiry'
  } = {},
): Promise<InventoryItemView[]> {
  return read('inventory', (s) => {
    const search = query.search?.trim().toLowerCase() ?? ''
    return s.inventoryItems
      .filter((i) => !search || i.name.toLowerCase().includes(search))
      .filter((i) => !query.category || i.category === query.category)
      .map((i) => inventoryView(s, i))
      .filter((i) => !query.hasExpiredStock || i.expiredStock > 0)
      .filter(
        (i) =>
          !query.attention ||
          (query.attention === 'low_stock'
            ? i.flags.includes('low_stock')
            : i.flags.some((flag) => flag !== 'low_stock')),
      )
  })
}

export function getInventoryItem(id: string): Promise<InventoryItemView> {
  return read('inventory item', (s) => {
    const item = must(
      s.inventoryItems.find((i) => i.id === id),
      'Inventory item',
    )
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
      .map((transaction) => ({
        ...transaction,
        batchAllocations: transaction.batchAllocations ?? [],
      })),
  )
}

/** One stock movement on Inventory Usage History (Module 8). The patient is a masked number, never a name (ADR-004, ADR-018). */
export interface InventoryMovementRow {
  id: string
  timestamp: ISODateTime
  itemId: string
  itemName: string
  unit: string
  type: InventoryTransaction['type']
  reason: AdjustmentReason | null
  /** The change to stock: negative when stock left. */
  change: number
  /** The batches taken from, by expiry date; `null` for a batch with no expiration. */
  batches: Array<{ expirationDate: ISODate | null; quantity: number }>
  patientNumber: string | null
  by: string
}

/** Every stock movement, newest first, for Staff (the Admin has no Inventory, ADR-038). */
export function listInventoryMovements(
  query: {
    from?: ISODate
    to?: ISODate
    itemId?: string
    type?: InventoryTransaction['type'] | ''
  } = {},
  actor?: SessionUser,
): Promise<InventoryMovementRow[]> {
  return read('inventory movements', (s) => {
    if (actorOr(actor).role !== 'staff')
      throw new StockRuleError('Only the School Clinician sees stock movements.')
    return s.frontendOnly.inventoryTransactions
      .filter(
        (t) =>
          (!query.itemId || t.itemId === query.itemId) &&
          (!query.type || t.type === query.type) &&
          (!query.from || t.timestamp.slice(0, 10) >= query.from) &&
          (!query.to || t.timestamp.slice(0, 10) <= query.to),
      )
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .map((t) => {
        const item = s.inventoryItems.find((candidate) => candidate.id === t.itemId)
        const student = t.studentId
          ? s.students.find((candidate) => candidate.id === t.studentId)
          : null
        const staff = t.personnelId
          ? s.personnel.find((candidate) => candidate.id === t.personnelId)
          : null
        return {
          id: t.id,
          timestamp: t.timestamp,
          itemId: t.itemId,
          itemName: item?.name ?? 'Unknown item',
          unit: item?.unit ?? '',
          type: t.type,
          reason: t.reason ?? null,
          // A dispense's quantity is the amount taken; an adjustment's is already signed.
          change: t.type === 'dispense' ? -t.quantity : t.quantity,
          batches: (t.batchAllocations ?? []).map((allocation) => ({
            expirationDate:
              item?.batches.find((batch) => batch.id === allocation.batchId)?.expirationDate ??
              null,
            quantity: Math.abs(allocation.quantity),
          })),
          patientNumber: student ? maskLrn(student.lrn) : (staff?.staffNumber ?? null),
          by: userName(s, t.userId) ?? 'Unknown user',
        }
      })
  })
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
export const USED_FOR_REQUIRED = 'Choose at least one symptom this item is commonly used for.'

/** Trimmed, non-blank words, first spelling kept, none repeating each other or `taken` (any case). */
function distinctWords(words: string[], taken: string[] = []): string[] {
  const seen = new Set(taken.map((word) => word.toLowerCase()))
  return words
    .map((word) => word.trim())
    .filter((word) => {
      if (!word || seen.has(word.toLowerCase())) return false
      seen.add(word.toLowerCase())
      return true
    })
}

export function saveInventoryItem(
  input: InventoryInput,
  options: { itemId?: string; actor?: SessionUser } = {},
): Promise<InventoryItem> {
  return write('save inventory item', (s) => {
    const existing = options.itemId
      ? must(
          s.inventoryItems.find((i) => i.id === options.itemId),
          'Inventory item',
        )
      : null
    const {
      currentStock,
      expirationDate,
      noExpirationConfirmed,
      avoidIfAllergicTo,
      usedFor,
      ...rest
    } = input
    // Distinct words (first spelling kept), blanks dropped.
    const tags = (avoidIfAllergicTo ?? [])
      .map((tag) => tag.trim())
      .filter(
        (tag, index, all) =>
          tag && all.findIndex((other) => other.toLowerCase() === tag.toLowerCase()) === index,
      )
    // An item that never had tags stays without the field, so an unrelated edit isn't audited as a tag change.
    // "Commonly used for" (consultation, November 6, 2026): the list's options in its order, then any
    // "Other" symptoms typed in, distinct and trimmed. At least one when given (Zean, November 8, 2026).
    const known = s.frontendOnly.visitComplaintTypes.map((type) => type.label)
    const symptoms = [
      ...known.filter((label) => (usedFor ?? []).includes(label)),
      ...distinctWords(
        (usedFor ?? []).filter((tag) => !known.includes(tag.trim())),
        known,
      ),
    ]
    if (usedFor !== undefined && !symptoms.length) throw new StockRuleError(USED_FOR_REQUIRED)
    const fields = {
      ...rest,
      ...((tags.length || existing?.avoidIfAllergicTo?.length) && { avoidIfAllergicTo: tags }),
      // Omitted (an older caller) leaves the tags alone; an item that never had any stays without the field.
      ...(usedFor !== undefined &&
        (symptoms.length || existing?.usedFor?.length) && { usedFor: symptoms }),
    }
    // The first batch follows Restock's rule (ADR-035): a date, or an explicit "no expiration". A blank
    // date alone is never read as "no expiration". An existing item's expiry changes only through Restock.
    if (!existing && expirationDate === null && !noExpirationConfirmed)
      throw new StockRuleError(
        'Choose an expiration date, or confirm this item has no expiration date.',
      )
    if (!existing && expirationDate !== null && noExpirationConfirmed)
      throw new StockRuleError(
        'Choose either an expiration date or no expiration date for this item.',
      )
    if (!existing && expirationDate !== null && expirationDate < s.today)
      throw new StockRuleError(PAST_EXPIRY_RULE)
    // API contract Q11: two items of one name split the stock and confuse dispensing.
    const name = fields.name.trim().toLowerCase()
    if (s.inventoryItems.some((i) => i !== existing && i.name.trim().toLowerCase() === name))
      throw new DuplicateItemNameError()
    const summary = existing ? changedSummary(existing, fields) : undefined
    const item = existing
      ? Object.assign(existing, fields)
      : {
          id: nextId('item', s.inventoryItems),
          ...fields,
          batches: [
            { id: 'batch-0001', quantity: currentStock, expirationDate, receivedDate: s.today },
          ],
        }
    if (!existing) s.inventoryItems.push(item)
    audit(
      s,
      actorOr(options.actor),
      existing ? 'update' : 'create',
      { type: 'inventory', id: item.id },
      summary,
    )
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
  link: { studentId?: string; personnelId?: string; visitId?: string } = {},
  actor?: SessionUser,
): Promise<DispenseResult> {
  return write('dispense', (s) => {
    const by = actorOr(actor)
    const item = must(
      s.inventoryItems.find((i) => i.id === itemId),
      'Inventory item',
    )
    if (!Number.isInteger(quantity) || quantity < 1) throw new StockRuleError(QUANTITY_RULE)
    if (link.studentId && link.personnelId)
      throw new StockRuleError('Choose one patient: a student or a staff member.')
    if (link.studentId && !s.students.some((st) => st.id === link.studentId))
      throw new StockRuleError('This student record was not found.')
    if (link.personnelId && !s.personnel.some((p) => p.id === link.personnelId))
      throw new StockRuleError('This staff record was not found.')
    if (link.visitId && !s.visits.some((v) => v.id === link.visitId))
      throw new StockRuleError('That visit no longer exists.')
    const batchAllocations = takeUsableBatches(s, item, quantity)
    const txn = {
      id: nextId('txn', s.frontendOnly.inventoryTransactions),
      itemId,
      type: 'dispense' as const,
      quantity,
      timestamp: now(s),
      userId: by.id,
      studentId: link.studentId ?? null,
      personnelId: link.personnelId ?? null,
      visitId: link.visitId ?? null,
      batchAllocations,
    }
    s.frontendOnly.inventoryTransactions.push(txn)
    audit(s, by, 'submit', { type: 'inventory-dispensation', id: txn.id })
    const status = inventoryStatusFor(s, item)
    return {
      item: { ...item, ...status },
      remainingStock: status.currentStock,
      belowZero: status.belowZero,
    }
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
    const item = must(
      s.inventoryItems.find((i) => i.id === itemId),
      'Inventory item',
    )
    if (!Number.isInteger(quantity) || quantity < 1) throw new StockRuleError(QUANTITY_RULE)
    if (expirationDate === null && !options.noExpirationConfirmed)
      throw new StockRuleError(
        'Choose an expiration date, or confirm this batch has no expiration date.',
      )
    if (expirationDate !== null && options.noExpirationConfirmed)
      throw new StockRuleError(
        'Choose either an expiration date or no expiration date for this batch.',
      )
    if (expirationDate !== null && expirationDate < s.today)
      throw new StockRuleError(PAST_EXPIRY_RULE)
    const batch: InventoryBatch = {
      id: nextBatchId(item),
      quantity,
      expirationDate,
      receivedDate: s.today,
    }
    item.batches.push(batch)
    const id = nextId('txn', s.frontendOnly.inventoryTransactions)
    s.frontendOnly.inventoryTransactions.push({
      id,
      itemId,
      type: 'restock',
      quantity,
      timestamp: now(s),
      userId: by.id,
      studentId: null,
      personnelId: null,
      visitId: null,
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
export const STAFF_ADJUSTMENT_REASONS: StaffAdjustmentReason[] = [
  'expired_disposed',
  'damaged_spilled',
  'miscount_correction',
  'other',
]

/**
 * Panel review IV-7: a removal of `percent` or more of the item on hand, or one that empties the
 * item, is a large write-off. `onHand` is the whole item before the change, all batches.
 */
export function isLargeWriteOff(change: number, onHand: number, percent: number): boolean {
  if (change >= 0) return false
  return onHand + change <= 0 || -change * 100 >= onHand * percent
}

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
export function adjustInventoryStock(
  itemId: string,
  input: StockAdjustmentInput,
  actor?: SessionUser,
): Promise<InventoryItemView> {
  return write('adjust stock', (s) => {
    const by = actorOr(actor)
    if (by.role !== 'staff') throw new StockRuleError('Only the School Clinician adjusts stock.')
    const item = must(
      s.inventoryItems.find((i) => i.id === itemId),
      'Inventory item',
    )
    if (!STAFF_ADJUSTMENT_REASONS.includes(input.reason))
      throw new StockRuleError('Choose a reason for the adjustment.')
    const note = input.note?.trim() || null
    const batch = must(
      item.batches.find((candidate) => candidate.id === input.batchId) ?? item.batches[0],
      'Batch',
    )
    const counted = input.countedQuantity
    if (counted !== undefined && (!Number.isInteger(counted) || counted < 0))
      throw new StockRuleError('The counted quantity must be a whole number of 0 or more.')
    const change = counted !== undefined ? counted - batch.quantity : (input.change ?? 0)
    if (!Number.isInteger(change) || change === 0)
      throw new StockRuleError('Enter a whole-number change other than 0.')
    if (batch.quantity + change < 0)
      throw new StockRuleError(
        `Stock can't go below 0. ${batch.quantity} ${item.unit} in this batch.`,
      )
    if (
      input.reason === 'expired_disposed' &&
      !(batch.expirationDate && batch.expirationDate < s.today)
    )
      throw new StockRuleError('Choose an expired batch to record expired stock disposal.')
    const onHand = item.batches.reduce((total, candidate) => total + candidate.quantity, 0)
    const large = isLargeWriteOff(change, onHand, s.config.largeWriteOffPercent)
    batch.quantity += change
    const txn: InventoryTransaction = {
      id: nextId('txn', s.frontendOnly.inventoryTransactions),
      itemId,
      type: 'adjustment',
      quantity: change,
      timestamp: now(s),
      userId: by.id,
      studentId: null,
      personnelId: null,
      visitId: null,
      reason: input.reason,
      note,
      batchAllocations: [{ batchId: batch.id, quantity: change }],
    }
    s.frontendOnly.inventoryTransactions.push(txn)
    audit(
      s,
      by,
      'submit',
      { type: 'inventory-adjustment', id: txn.id },
      `${ADJUSTMENT_REASON_LABELS[input.reason]}${large ? ' · Large write-off' : ''}`,
    )
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

export class DuplicateItemNameError extends StockRuleError {
  constructor() {
    super('An item with this name already exists. Restock it instead.')
  }
}

const QUANTITY_RULE = 'Quantities must be whole numbers of at least 1.'

function nextBatchId(item: InventoryItem): string {
  const maximum = item.batches.reduce(
    (max, batch) => Math.max(max, Number(batch.id.match(/(\d+)$/)?.[1]) || 0),
    0,
  )
  return `batch-${String(maximum + 1).padStart(4, '0')}`
}

function usableBatches(s: DbState, item: InventoryItem): InventoryBatch[] {
  return item.batches
    .filter((batch) => batch.expirationDate === null || batch.expirationDate >= s.today)
    .sort((left, right) =>
      (left.expirationDate ?? '9999-12-31').localeCompare(right.expirationDate ?? '9999-12-31'),
    )
}

/** Takes earliest-expiring usable stock first. A shortfall stays a visible negative on the last usable batch. */
function takeUsableBatches(
  s: DbState,
  item: InventoryItem,
  quantity: number,
): InventoryBatchAllocation[] {
  const batches = usableBatches(s, item)
  if (!batches.length)
    throw new StockRuleError(
      `${item.name} has no usable batch and can't be given. Dispose of expired stock before restocking.`,
    )
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

function returnToBatches(
  item: InventoryItem,
  allocations: ReadonlyArray<InventoryBatchAllocation>,
) {
  for (const allocation of allocations) {
    const batch = must(
      item.batches.find((candidate) => candidate.id === allocation.batchId),
      'Original batch',
    )
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
    if (allocation.quantity > amount)
      kept.push({ batchId: allocation.batchId, quantity: allocation.quantity - amount })
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
  link: PatientRef & { visitId?: string; incidentId?: string },
  before: ItemGivenLine[],
  next: ItemLineInput[],
  mode: 'dispense' | 'adjust',
): { lines: ItemGivenLine[]; belowZero: string[] } {
  const seen = new Set<string>()
  for (const line of next) {
    if (seen.has(line.itemId)) throw new StockRuleError('Each item can appear on only one line.')
    seen.add(line.itemId)
    if (!Number.isInteger(line.quantity) || line.quantity < 1)
      throw new StockRuleError(QUANTITY_RULE)
    if ((line.instructions?.trim().length ?? 0) > INSTRUCTIONS_MAX_LENGTH)
      throw new StockRuleError(`Instructions can be at most ${INSTRUCTIONS_MAX_LENGTH} characters.`)
  }
  const oldQuantity = new Map(before.map((line) => [line.itemId, line.quantity]))
  const newQuantity = new Map(next.map((line) => [line.itemId, line.quantity]))
  const changes = [...new Set([...oldQuantity.keys(), ...newQuantity.keys()])]
    .map((itemId) => ({
      itemId,
      delta: (newQuantity.get(itemId) ?? 0) - (oldQuantity.get(itemId) ?? 0),
    }))
    .filter((change) => change.delta !== 0)
    .map((change) => {
      const item = s.inventoryItems.find((i) => i.id === change.itemId)
      if (!item) throw new StockRuleError('One of the items no longer exists in inventory.')
      return { ...change, item }
    })

  for (const { itemId, delta, item } of changes) {
    const beforeLine = before.find((line) => line.itemId === itemId)
    const prior =
      beforeLine?.batchAllocations ??
      (beforeLine ? [{ batchId: item.batches[0]?.id ?? '', quantity: beforeLine.quantity }] : [])
    let batchAllocations: InventoryBatchAllocation[]
    if (delta > 0) batchAllocations = takeUsableBatches(s, item, delta)
    else {
      const split = splitAllocations(prior, -delta)
      returnToBatches(item, split.returned)
      batchAllocations = split.returned.map((allocation) => ({
        ...allocation,
        quantity: -allocation.quantity,
      }))
    }
    const base = {
      id: nextId('txn', s.frontendOnly.inventoryTransactions),
      itemId,
      timestamp: now(s),
      userId: by.id,
      studentId: link.studentId,
      personnelId: link.personnelId,
      visitId: link.visitId ?? null,
      ...(link.incidentId ? { incidentId: link.incidentId } : {}),
    }
    const txn: InventoryTransaction =
      mode === 'dispense'
        ? { ...base, type: 'dispense', quantity: delta, batchAllocations }
        : {
            ...base,
            type: 'adjustment',
            quantity: -delta,
            reason: 'visit_edited',
            note: null,
            batchAllocations,
          }
    s.frontendOnly.inventoryTransactions.push(txn)
    if (mode === 'dispense') audit(s, by, 'submit', { type: 'inventory-dispensation', id: txn.id })
    else
      audit(
        s,
        by,
        'submit',
        { type: 'inventory-adjustment', id: txn.id },
        ADJUSTMENT_REASON_LABELS.visit_edited,
      )
  }

  const kept = new Map(before.map((line) => [line.itemId, line]))
  const lines = next.map((line): ItemGivenLine => {
    const old = kept.get(line.itemId)
    const change = changes.find((candidate) => candidate.itemId === line.itemId)
    const item = change?.item
    const oldAllocations =
      old?.batchAllocations ??
      (old ? [{ batchId: item?.batches[0]?.id ?? '', quantity: old.quantity }] : [])
    const allocations =
      change && change.delta > 0
        ? [
            ...oldAllocations,
            ...takeAllocationsFromLastTransaction(s, change.itemId, link, change.delta),
          ]
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
  return {
    lines,
    belowZero: changes
      .filter((change) => change.item.batches.some((batch) => batch.quantity < 0))
      .map((change) => change.item.name),
  }
}

function takeAllocationsFromLastTransaction(
  s: DbState,
  itemId: string,
  link: { visitId?: string; incidentId?: string },
  quantity: number,
) {
  const transaction = [...s.frontendOnly.inventoryTransactions]
    .reverse()
    .find(
      (candidate) =>
        candidate.itemId === itemId &&
        candidate.type === 'dispense' &&
        candidate.quantity === quantity &&
        candidate.visitId === (link.visitId ?? null) &&
        candidate.incidentId === link.incidentId,
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
  /** `patient`: the LRN or Staff No. the register prints (ADR-043). */
  incidents: Array<Incident & { patient: PatientNumber }>
  /** Visits per complaint, most frequent first (ties alphabetical, so the order is stable). */
  complaintCounts: ComplaintCount[]
  /**
   * The same visits by week (ADR-050, D16): one row per complaint group in `complaintCounts` order,
   * one count per week in `weeks`. Every week column sums with the others to the monthly total.
   */
  weeklyComplaints: {
    weeks: MonthWeek[]
    rows: Array<{ complaint: string; counts: number[]; total: number }>
    totals: number[]
  }
  /** The monthly inventory sheet (ADR-050, D17), computed from the stock movements. */
  inventory: MonthlyInventoryRow[]
  /** The month's visits by sex (ADR-051, ADR-063), with students and staff as the two parts. */
  visitsBySex: {
    female: { students: number; staff: number }
    male: { students: number; staff: number }
    noSexRecorded: number
  }
  /** The active Admin/Principal account's name for the "Reviewed by" signature line, or null if none. */
  principalName: string | null
}

/**
 * Visits per complaint group (ADR-050, D15): a typed variant ("head ache", "Headache.") is counted
 * under the matching complaint type; anything else under its own cleaned text. Nothing is merged by hand.
 */
function complaintCounts(s: DbState, visits: Visit[]): ComplaintCount[] {
  const known = s.frontendOnly.visitComplaintTypes.map((type) => type.label)
  const counts = new Map<string, number>()
  for (const v of visits) {
    const group = reportComplaint(v.complaint, known)
    counts.set(group, (counts.get(group) ?? 0) + 1)
  }
  return [...counts]
    .map(([complaint, count]) => ({ complaint, count }))
    .sort((a, b) => b.count - a.count || a.complaint.localeCompare(b.complaint))
}

function weeklyComplaints(
  s: DbState,
  month: string,
  visits: Visit[],
  groups: ComplaintCount[],
): MonthlyReportData['weeklyComplaints'] {
  const known = s.frontendOnly.visitComplaintTypes.map((type) => type.label)
  const weeks = monthWeeks(month)
  const week = (date: ISODate) => weeks.findIndex((w) => date >= w.from && date <= w.to)
  const rows = groups.map((group) => ({
    complaint: group.complaint,
    counts: weeks.map(() => 0),
    total: group.count,
  }))
  const byComplaint = new Map(rows.map((row) => [row.complaint, row]))
  for (const v of visits)
    byComplaint.get(reportComplaint(v.complaint, known))!.counts[week(dateOf(v.dateTime))] += 1
  return {
    weeks,
    rows,
    totals: weeks.map((_, index) => rows.reduce((sum, row) => sum + row.counts[index], 0)),
  }
}

/** One item on the monthly inventory sheet (ADR-050, D17). Nothing here is stored; it all comes from the stock movements. */
export interface MonthlyInventoryRow {
  itemId: string
  itemName: string
  unit: string
  /** Restocked in the month. */
  newPurchase: number
  /** Stock at the start of the month plus New Purchase. */
  totalAvailable: number
  /** Stock at the end of the month, after dispensing, adjustments and expiry write-offs. */
  endingInventory: number
}

/** What a movement did to the stock: a dispense takes, a restock adds, an adjustment is already signed. */
const stockEffect = (t: InventoryTransaction) => (t.type === 'dispense' ? -t.quantity : t.quantity)

function monthlyInventory(s: DbState, month: string): MonthlyInventoryRow[] {
  const first = `${month}-01`
  const last = endOfMonth(first)
  return s.inventoryItems
    .map((item) => {
      const moves = s.frontendOnly.inventoryTransactions.filter((t) => t.itemId === item.id)
      const sum = (keep: (t: InventoryTransaction) => boolean, value = stockEffect) =>
        moves.filter(keep).reduce((total, t) => total + value(t), 0)
      const inMonth = (t: InventoryTransaction) =>
        dateOf(t.timestamp) >= first && dateOf(t.timestamp) <= last
      // Today's stock, wound back over the movements after the month: the stock at its end.
      const endingInventory =
        item.batches.reduce((total, batch) => total + batch.quantity, 0) -
        sum((t) => dateOf(t.timestamp) > last)
      const newPurchase = sum((t) => inMonth(t) && t.type === 'restock')
      const startOfMonth = endingInventory - sum(inMonth)
      return {
        itemId: item.id,
        itemName: item.name,
        unit: item.unit,
        newPurchase,
        totalAvailable: startOfMonth + newPurchase,
        endingInventory,
      }
    })
    .sort((a, b) => a.itemName.localeCompare(b.itemName))
}

function itemsGivenInMonth(s: DbState, month: string): MonthlyReportData['itemsGiven'] {
  const given = new Map<string, number>()
  for (const t of s.frontendOnly.inventoryTransactions) {
    if (!t.timestamp.startsWith(month)) continue
    // An adjustment's quantity is the change to stock, so a visit edit that returns 2 gives 2 fewer.
    const change =
      t.type === 'dispense'
        ? t.quantity
        : t.type === 'adjustment' && t.reason === 'visit_edited'
          ? -t.quantity
          : 0
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

/** "YYYY-MM" of the newest visit or incident up to today, else today's month: the Admin Reports page's default (ADR-077). */
export function getLatestRecordedMonth(): Promise<string> {
  return read('latest report month', (s) => {
    const dates = [
      ...countedVisits(s).map((v) => v.dateTime),
      ...s.incidents.map((i) => i.time),
    ].filter((d) => d.slice(0, 10) <= s.today)
    return (
      dates.reduce((latest, d) => (d > latest ? d : latest), '').slice(0, 7) || s.today.slice(0, 7)
    )
  })
}

/** `month` is "YYYY-MM". Everything is generated from raw records on each call. */
export function getMonthlyReport(month: string): Promise<MonthlyReportData> {
  return read('monthly report', (s) => {
    return {
      month,
      counts: monthlyCounts(s, month),
      previousCounts: monthlyCounts(
        s,
        toISODate(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 2, 1)).slice(
          0,
          7,
        ),
      ),
      dispositions: (
        ['returned_to_class', 'resting_in_clinic', 'sent_home', 'referred_to_hospital'] as const
      ).map((disposition) => ({
        disposition,
        count: countedVisits(s).filter(
          (v) => v.dateTime.startsWith(month) && v.disposition === disposition,
        ).length,
      })),
      followUpsByStatus: (['pending', 'completed', 'missed', 'cancelled'] as const).map(
        (status) => ({
          status,
          count: s.followUps.filter((f) => f.followUpDate.startsWith(month) && f.status === status)
            .length,
        }),
      ),
      itemsGiven: itemsGivenInMonth(s, month),
      incidents: s.incidents
        .filter((i) => i.time.startsWith(month))
        .sort((a, b) => b.time.localeCompare(a.time))
        .map((i) => ({ ...i, patient: patientNumberOf(s, i) })),
      ...(() => {
        const visits = countedVisits(s).filter((v) => v.dateTime.startsWith(month))
        const groups = complaintCounts(s, visits)
        const students = studentsById(s)
        const personnel = new Map(s.personnel.map((p) => [p.id, p]))
        const parts = (sex: StudentSex) => ({
          students: visits.filter(
            (v) => v.studentId && (students.get(v.studentId)?.sex ?? 'female') === sex,
          ).length,
          staff: visits.filter((v) => v.personnelId && personnel.get(v.personnelId)?.sex === sex)
            .length,
        })
        return {
          complaintCounts: groups,
          weeklyComplaints: weeklyComplaints(s, month, visits, groups),
          visitsBySex: {
            female: parts('female'),
            male: parts('male'),
            noSexRecorded: visits.filter((v) => v.personnelId && !personnel.get(v.personnelId)?.sex)
              .length,
          },
        }
      })(),
      inventory: monthlyInventory(s, month),
      principalName: principalNameOf(s),
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
  if (type === 'health_summary') return { complaintCounts: complaintCounts(s, visits) }
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
    if (latest.status === 'failed') throw new BackupFailedError()
    const record = must(
      s.backupLogs.find((b) => b.lastRun === latest.lastRun),
      'Backup',
    )
    record.verifiedByUserId = by.id
    audit(s, by, 'update', { type: 'backup', id: record.lastRun }, 'Verified backup')
    return { ...backupStatus(s), verifiedByName: userName(s, by.id) }
  })
}

export class BackupFailedError extends Error {
  constructor() {
    super('The latest backup failed, so it cannot be verified.')
  }
}

export class NoBackupLocationError extends Error {
  constructor() {
    super('Enable at least one backup location first.')
  }
}

/**
 * "Back up now" (panel review BK-2, ADR-052). MOCK ONLY: it "runs" to every enabled location, each
 * succeeding when its drive was found, and records one backup log that succeeded when any location
 * did. The real job (writing the zip into `<location>\.cliniq\backups\…`) is backend-phase work.
 */
export function recordBackupNow(actor?: SessionUser): Promise<BackupStatusView> {
  return write('back up now', (s) => {
    const by = actorOr(actor)
    const enabled = s.frontendOnly.backupLocations.filter((l) => l.enabled)
    if (s.frontendOnly.backupLocations.length && !enabled.length) throw new NoBackupLocationError()
    const at = now(s)
    for (const location of enabled)
      Object.assign(location, {
        lastBackupAt: at,
        lastResult: location.status === 'found' ? 'ok' : 'failed',
      })
    const ok = !enabled.length || enabled.some((l) => l.lastResult === 'ok')
    const lastOk = backupStatus(s).history.find((b) => b.status === 'ok')
    // The names are copied, so the history still reads them after a location is disabled.
    const record = {
      lastRun: at,
      fileSizeBytes: ok ? Math.round((lastOk?.fileSizeBytes ?? 18_000_000) * 1.002) : 0,
      status: ok ? ('ok' as const) : ('failed' as const),
      verifiedByUserId: null,
      locationNames: enabled.map((l) => l.label),
    }
    s.backupLogs.push(record)
    audit(
      s,
      by,
      'create',
      { type: 'backup', id: record.lastRun },
      `Backup started from the Backup page (${enabled.length} ${enabled.length === 1 ? 'location' : 'locations'})`,
    )
    return { ...backupStatus(s), verifiedByName: null }
  })
}

// ---- dashboard -----------------------------------------------------------------------------

/** ADR-053 (ADR-043 item 9): the Admin's incident totals leave staff incidents out, matching the Admin's Incident Log. */
export function getDashboardSummary(
  query: DashboardQuery,
  viewer?: SessionUser,
): Promise<DashboardSummary> {
  return read('dashboard summary', (s) => {
    const seen =
      viewer?.role === 'admin' ? { ...s, incidents: s.incidents.filter(visibleTo(viewer)) } : s
    return {
      ...buildDashboardSummary(seen, query, new Date().toISOString()),
      backupAlert: backupAlertFor(s),
      schoolYearReminder: schoolYearReminderOf(s, viewer),
    }
  })
}

/**
 * Staff end and start school years by hand; from a week before the next step is due, the Dashboard
 * reminds them (Zean, November 7, 2026). Due today or overdue is a warning, also on the sidebar's
 * Archive item (Zean, November 8, 2026). The Admin gets none.
 */
function schoolYearReminderOf(s: DbState, viewer?: SessionUser): SchoolYearReminder | null {
  const step = schoolYearStep(schoolYearSettingsOf(s), s.today)
  if (viewer?.role === 'admin' || !(step.due || step.soon)) return null
  return {
    kind: step.kind,
    label: step.label,
    dueOn: step.dueOn,
    overdue: s.today > step.dueOn,
    dueToday: s.today === step.dueOn,
  }
}

export function getSchoolYearReminder(viewer?: SessionUser): Promise<SchoolYearReminder | null> {
  return read('school year reminder', (s) => schoolYearReminderOf(s, viewer))
}

/**
 * No successful backup, a failed latest run, or a last success older than `config.staleBackupHours`
 * (BK-2, D5). The last success is the newest successful backup on an enabled location (ADR-052); with no
 * location recorded yet, the backup log's.
 */
function backupAlertFor(s: DbState): BackupAlert | null {
  const { latest, history } = backupStatus(s)
  const located = s.frontendOnly.backupLocations
    .filter((l) => l.enabled && l.lastResult === 'ok' && l.lastBackupAt)
    .map((l) => l.lastBackupAt!)
    .sort()
    .at(-1)
  const lastSuccessAt = s.frontendOnly.backupLocations.length
    ? (located ?? null)
    : (history.find((b) => b.status === 'ok')?.lastRun ?? null)
  const base = { lastSuccessAt, staleAfterHours: s.config.staleBackupHours }
  if (!lastSuccessAt) return { kind: 'never', ...base }
  if (latest?.status === 'failed') return { kind: 'failed', ...base }
  const hours = (Date.parse(now(s)) - Date.parse(lastSuccessAt)) / 3_600_000
  return hours > s.config.staleBackupHours ? { kind: 'stale', ...base } : null
}

// ---- backup locations (ADR-052; PROVISIONAL pending the ERD) ----------------------------

export interface BackupLocationSettings {
  locations: BackupLocation[]
  /** Backups kept per location (`config.backupKeepLast`). */
  keepLast: number
}

export function listBackupLocations(): Promise<BackupLocationSettings> {
  return read('backup locations', (s) => ({
    locations: s.frontendOnly.backupLocations,
    keepLast: s.config.backupKeepLast,
  }))
}

export interface BackupLocationInput {
  label: string
  path: string
}

function cleanLocation(input: BackupLocationInput): BackupLocationInput {
  const label = input.label.trim()
  const path = input.path.trim()
  if (!label) throw new Error('Enter a label for the location.')
  if (!path) throw new Error('Enter the folder or drive path.')
  return { label, path }
}

/**
 * Adds or edits a backup location (ADR-052), audited. A browser can't reach a drive, so a new location
 * reads "found" until the backend checks it.
 */
/**
 * Adds a backup location. A location is never edited (professor's consultation, November 6, 2026):
 * to change one, add a new location and disable the old one, so old backups stay where they were and
 * each run keeps the names it used.
 */
export function saveBackupLocation(
  input: BackupLocationInput,
  options: { actor?: SessionUser } = {},
): Promise<BackupLocation> {
  return write('save backup location', (s) => {
    const by = actorOr(options.actor)
    const fields = cleanLocation(input)
    const location: BackupLocation = {
      id: nextId('backup-location', s.frontendOnly.backupLocations),
      ...fields,
      enabled: true,
      status: 'found',
      lastBackupAt: null,
      lastResult: null,
    }
    s.frontendOnly.backupLocations.push(location)
    audit(s, by, 'create', { type: 'backup-location', id: location.id })
    return location
  })
}

/** A drive the clinic computer can back up to (ADR-052: the backend lists them). */
export interface BackupDrive {
  /** The drive's root, e.g. `E:\`. */
  root: string
  name: string
  kind: 'internal' | 'removable'
  freeSpace: string
}

/**
 * PROVISIONAL (ADR-052): a browser can't see the clinic computer's drives, so the mock lists a fixed set
 * of drives and folders. The backend replaces this with the real drives and folders of the computer it
 * runs on; nothing here is ever written.
 */
const MOCK_DRIVES: BackupDrive[] = [
  { root: 'C:\\', name: 'Local Disk', kind: 'internal', freeSpace: '86 GB free' },
  { root: 'D:\\', name: 'Data', kind: 'internal', freeSpace: '412 GB free' },
  { root: 'E:\\', name: 'USB Drive', kind: 'removable', freeSpace: '58 GB free' },
]
const MOCK_FOLDERS: Record<string, string[]> = {
  'C:\\': ['CLINIQ', 'ProgramData', 'Users'],
  'C:\\Users': ['Clinic'],
  'C:\\Users\\Clinic': ['Documents', 'Desktop'],
  'D:\\': ['Backups', 'Shared'],
  'D:\\Backups': ['Clinic'],
  'E:\\': ['Backups', 'School files'],
}

/** The drives, and the folders directly inside `path` (none when `path` is empty or unknown). */
export function listBackupFolders(
  path: string,
): Promise<{ drives: BackupDrive[]; folders: string[] }> {
  return read('backup folders', () => ({ drives: MOCK_DRIVES, folders: MOCK_FOLDERS[path] ?? [] }))
}

/** Locations are never deleted, only disabled and enabled again (ADR-052). */
export function setBackupLocationEnabled(
  id: string,
  enabled: boolean,
  actor?: SessionUser,
): Promise<BackupLocation> {
  return write(enabled ? 'enable backup location' : 'disable backup location', (s) => {
    const location = must(
      s.frontendOnly.backupLocations.find((l) => l.id === id),
      'Backup location',
    )
    // Review round 2, R32 (ADR-052 note): one location always stays enabled, so a backup always has somewhere to go.
    if (
      !enabled &&
      location.enabled &&
      s.frontendOnly.backupLocations.filter((l) => l.enabled).length === 1
    )
      throw new Error('Enable another backup location before disabling the last one.')
    if (location.enabled !== enabled) {
      location.enabled = enabled
      audit(
        s,
        actorOr(actor),
        'update',
        { type: 'backup-location', id },
        enabled ? 'Enabled' : 'Disabled',
      )
    }
    return location
  })
}

/**
 * Possible clusters for the clinician's Dashboard Overview (ADR-050): students only, read by the grade
 * at the time. Nothing for the Admin, and nothing is sent to anyone.
 */
export function listClusterAlerts(viewer?: SessionUser): Promise<ClusterAlert[]> {
  return read('cluster alerts', (s) => (actorOr(viewer).role === 'staff' ? clusterAlerts(s) : []))
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

/** Field messages for an event form; empty when the input is valid. The writes below enforce the same rules. */
export function validateCalendarEvent(input: CalendarEventInput): CalendarEventErrors {
  const errors: CalendarEventErrors = {}
  const title = input.title.trim()
  if (!title) errors.title = 'Enter a title for the event.'
  else if (title.length > CALENDAR_EVENT_TITLE_MAX)
    errors.title = `Keep the title to ${CALENDAR_EVENT_TITLE_MAX} characters or fewer.`
  if (!input.startDate) errors.startDate = 'Choose the date the event starts.'
  else if (!isRealDate(input.startDate)) errors.startDate = 'Enter a valid start date.'
  if (input.endDate) {
    if (!isRealDate(input.endDate)) errors.endDate = 'Enter a valid end date.'
    else if (!errors.startDate && input.endDate < input.startDate)
      errors.endDate = "The end date can't be before the start date."
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

function cleanEvent(
  input: CalendarEventInput,
): Pick<CalendarEvent, 'title' | 'startDate' | 'endDate'> {
  const errors = validateCalendarEvent(input)
  if (Object.keys(errors).length) throw new CalendarEventValidationError(errors)
  // An end date on the start date is a one-day event.
  const endDate = input.endDate && input.endDate !== input.startDate ? input.endDate : null
  return { title: input.title.trim(), startDate: input.startDate, endDate }
}

export function createCalendarEvent(
  input: CalendarEventInput,
  actor?: SessionUser,
): Promise<CalendarEvent> {
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

export function updateCalendarEvent(
  id: string,
  input: CalendarEventInput,
  actor?: SessionUser,
): Promise<CalendarEvent> {
  return write('edit calendar event', (s) => {
    const by = actorOr(actor)
    const event = must(
      s.frontendOnly.calendarEvents.find((e) => e.id === id),
      'Calendar event',
    )
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
export const SPORTS_REPORT_WINDOWS: SportsReportWindow[] = [30, 60, 90, 'school_year']

/** Sports Reports belong to the clinician (ADR-034): the Admin/Principal can't open them, and there is no instructor account. */
export class SportsReportPermissionError extends Error {
  constructor() {
    super('Only the clinic staff can open Sports Reports.')
  }
}

function requireStaff(actor: SessionUser) {
  if (actor.role !== 'staff') throw new SportsReportPermissionError()
}

/** First day of the look-back window ending today: the last N days including today, or the start of the current school year (from settings). */
export function sportsReportWindowStart(
  window: SportsReportWindow,
  today: ISODate,
  settings?: SchoolYearSettings,
): ISODate {
  if (window !== 'school_year') return addDays(today, -(window - 1))
  return currentSchoolYear(settings, today).from
}

export interface SportsReportInput {
  title: string
  activity: string
  requestedBy: string
  window: SportsReportWindow
  includeConditions: boolean
  students: Array<{ studentId: string }>
}

export type SportsReportErrors = Partial<
  Record<'title' | 'activity' | 'requestedBy' | 'window', string>
>

/** Field messages for the builder; empty when the input is valid. The writes below enforce the same rules. */
export function validateSportsReport(input: SportsReportInput): SportsReportErrors {
  const errors: SportsReportErrors = {}
  const title = input.title.trim()
  const requestedBy = input.requestedBy.trim()
  if (!title) errors.title = 'Enter a title for the report.'
  else if (title.length > SPORTS_REPORT_TEXT_MAX)
    errors.title = `Keep the title to ${SPORTS_REPORT_TEXT_MAX} characters or fewer.`
  if (input.activity.trim().length > SPORTS_REPORT_TEXT_MAX)
    errors.activity = `Keep the activity to ${SPORTS_REPORT_TEXT_MAX} characters or fewer.`
  if (!requestedBy)
    errors.requestedBy = 'Enter the name of the instructor who asked for the report.'
  else if (requestedBy.length > SPORTS_REPORT_TEXT_MAX)
    errors.requestedBy = `Keep the name to ${SPORTS_REPORT_TEXT_MAX} characters or fewer.`
  if (!SPORTS_REPORT_WINDOWS.includes(input.window)) errors.window = 'Choose a look-back window.'
  return errors
}

export class SportsReportValidationError extends Error {
  readonly errors: SportsReportErrors
  constructor(errors: SportsReportErrors) {
    super(Object.values(errors).join(' '))
    this.errors = errors
  }
}

/** Only the list is kept (ADR-034): never a copy of anything from a student's record. */
function cleanSportsReport(
  input: SportsReportInput,
): Pick<
  SportsReport,
  'title' | 'activity' | 'requestedBy' | 'window' | 'includeConditions' | 'students'
> {
  const errors = validateSportsReport(input)
  if (Object.keys(errors).length) throw new SportsReportValidationError(errors)
  const seen = new Set<string>()
  const students = input.students
    .filter((student) => !seen.has(student.studentId) && seen.add(student.studentId))
    .map((student) => ({ studentId: student.studentId }))
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
      .map(({ id, title, activity, requestedBy, students, updatedAt, archived }) => ({
        id,
        title,
        activity,
        requestedBy,
        studentCount: students.length,
        updatedAt,
        archived,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  })
}

/** A student on a report as the builder shows it: the name for recognition (ADR-034's exception), never medical fields. */
export interface SportsReportStudentRow {
  studentId: string
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
  return report.students.map(({ studentId }) => {
    const student = students.get(studentId)
    if (!student) return { studentId, fullName: null, gradeLevel: null, status: 'missing' as const }
    return {
      studentId,
      fullName: formatPersonName(student),
      gradeLevel: student.gradeLevel,
      status: student.archived ? ('archived' as const) : ('active' as const),
    }
  })
}

export function getSportsReport(id: string, actor?: SessionUser): Promise<SportsReportDetail> {
  return read('sports report', (s) => {
    requireStaff(actorOr(actor))
    const report = must(
      s.frontendOnly.sportsReports.find((r) => r.id === id),
      'Sports Report',
    )
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
  /** Only when the report includes conditions. */
  conditions?: { medicalConditions: string[]; allergies: string[] }
}

export interface SportsReportContent {
  report: Pick<
    SportsReport,
    'id' | 'title' | 'activity' | 'requestedBy' | 'window' | 'includeConditions' | 'archived'
  >
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
export function getSportsReportContent(
  id: string,
  actor?: SessionUser,
): Promise<SportsReportContent> {
  return read('sports report content', (s) => {
    requireStaff(actorOr(actor))
    const report = must(
      s.frontendOnly.sportsReports.find((r) => r.id === id),
      'Sports Report',
    )
    const from = sportsReportWindowStart(report.window, s.today, schoolYearSettingsOf(s))
    const to = s.today
    const inWindow = (value: ISODateTime) => value.slice(0, 10) >= from && value.slice(0, 10) <= to
    const students = studentsById(s)
    const leftOut = { archived: 0, missing: 0 }
    const rows: SportsReportContentRow[] = []
    for (const { studentId } of report.students) {
      const student = students.get(studentId)
      if (!student) leftOut.missing += 1
      else if (student.archived) leftOut.archived += 1
      if (!student || student.archived) continue
      const entries: SportsReportEntry[] = [
        ...s.visits
          .filter((v) => v.studentId === studentId && inWindow(v.dateTime))
          .map((v) => ({
            id: v.id,
            dateTime: v.dateTime,
            kind: 'Visit' as const,
            what: v.complaint,
            outcome: SPORTS_REPORT_OUTCOMES[v.disposition],
          })),
        ...s.incidents
          .filter((i) => i.studentId === studentId && inWindow(i.time))
          .map((i) => ({
            id: i.id,
            dateTime: i.time,
            kind: 'Incident' as const,
            what: i.complaint,
            outcome: i.hospitalReferral ? 'Referred to hospital' : 'No hospital referral recorded',
          })),
      ].sort((a, b) => b.dateTime.localeCompare(a.dateTime))
      rows.push({
        studentId,
        fullName: formatPersonName(student),
        gradeLevel: student.gradeLevel,
        entries,
        ...(report.includeConditions
          ? {
              conditions: {
                medicalConditions: student.medicalConditions,
                allergies: student.allergies,
              },
            }
          : {}),
      })
    }
    // By last name, then first name (Zean, November 4, 2026).
    rows.sort((a, b) => compareByLastName(students.get(a.studentId)!, students.get(b.studentId)!))
    const { title, activity, requestedBy, window, includeConditions, archived } = report
    return {
      report: { id, title, activity, requestedBy, window, includeConditions, archived },
      from,
      to,
      asOf: now(s),
      rows,
      leftOut,
    }
  })
}

export function createSportsReport(
  input: SportsReportInput,
  actor?: SessionUser,
): Promise<SportsReport> {
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

export function updateSportsReport(
  id: string,
  input: SportsReportInput,
  actor?: SessionUser,
): Promise<SportsReport> {
  return write('edit sports report', (s) => {
    const by = actorOr(actor)
    requireStaff(by)
    const report = must(
      s.frontendOnly.sportsReports.find((r) => r.id === id),
      'Sports Report',
    )
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
    const source = must(
      s.frontendOnly.sportsReports.find((r) => r.id === id),
      'Sports Report',
    )
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
    audit(
      s,
      by,
      'create',
      { type: 'sports-report', id: copy.id },
      'Duplicated from another Sports Report',
    )
    return copy
  })
}

/** Archived reports are hidden from the list by default and can be restored; nothing is deleted. */
export function setSportsReportArchived(
  id: string,
  archived: boolean,
  actor?: SessionUser,
): Promise<SportsReport> {
  return write(archived ? 'archive sports report' : 'restore sports report', (s) => {
    const by = actorOr(actor)
    requireStaff(by)
    const report = must(
      s.frontendOnly.sportsReports.find((r) => r.id === id),
      'Sports Report',
    )
    Object.assign(report, { archived, updatedAt: now(s) })
    if (archived) audit(s, by, 'archive', { type: 'sports-report', id })
    else audit(s, by, 'update', { type: 'sports-report', id }, 'Restored from the archive')
    return report
  })
}

export function getAuditLog(): Promise<AuditLogEntry[]> {
  return read('audit log', (s) =>
    [...s.auditLog].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
  )
}

export interface IssueReportInput {
  description: string
  route: string
  pageName: string
}

export function createIssueReport(
  input: IssueReportInput,
  actor?: SessionUser,
): Promise<IssueReport> {
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

// ---- school years and the Archive (professor's consultation, November 6, 2026) --------------

/** The date settings with the school years Staff started (ADR-075): the Admin's Report month drop-down (ADR-077). Read only. */
export function getSchoolYearHistory(): Promise<SchoolYearSettings> {
  return read('school year history', schoolYearSettingsOf)
}

export function getSchoolYearSettings(): Promise<SchoolYearSettings> {
  return read('school year settings', schoolYearDatesOf)
}

export class SchoolYearSettingsError extends Error {}

/** Staff only; audited by field name, never the dates. Stored archive years are not touched. */
export function saveSchoolYearSettings(
  input: SchoolYearSettings,
  actor?: SessionUser,
): Promise<SchoolYearSettings> {
  return write('save school year settings', (s) => {
    const by = actorOr(actor)
    if (by.role !== 'staff')
      throw new SchoolYearSettingsError('Only the clinic staff can change the school year dates.')
    const problem = schoolYearSettingsError(input)
    if (problem) throw new SchoolYearSettingsError(problem)
    const { schoolYearStartMonth, schoolYearStartDay, schoolYearEndMonth, schoolYearEndDay } = input
    const dates = { schoolYearStartMonth, schoolYearStartDay, schoolYearEndMonth, schoolYearEndDay }
    const summary = changedSummary(schoolYearDatesOf(s), dates)
    Object.assign(s.config, dates)
    if (summary) audit(s, by, 'update', { type: 'school-year', id: 'school-year' }, summary)
    return schoolYearDatesOf(s)
  })
}

/**
 * Staff end the current school year by hand (Zean, November 7, 2026): today is its last class day and
 * the break begins tomorrow. Records made in the break stay in this year until the next is started.
 */
export function endSchoolYear(actor?: SessionUser): Promise<SchoolYear> {
  return write('end school year', (s) => {
    const by = actorOr(actor)
    if (by.role !== 'staff')
      throw new SchoolYearSettingsError('Only the clinic staff can end a school year.')
    const current = currentSchoolYear(schoolYearSettingsOf(s), s.today)
    const starts = s.config.schoolYearStarts ?? []
    const record = starts.find((start) => start.label === current.label)
    if (!record) throw new SchoolYearSettingsError('Start a school year before ending one.')
    if (record.endedOn)
      throw new SchoolYearSettingsError(`School year ${current.label} has already ended.`)
    s.config.schoolYearStarts = starts.map((start) =>
      start === record ? { ...start, endedOn: s.today, endedBy: by.id } : start,
    )
    audit(
      s,
      by,
      'update',
      { type: 'school-year', id: 'school-year' },
      `Ended school year ${current.label}`,
    )
    return currentSchoolYear(schoolYearSettingsOf(s), s.today)
  })
}

/**
 * Staff start the next school year by hand, after ending the current one (Zean, November 7, 2026). It
 * begins today; the year before (and its break) ends yesterday. Records keep the year they were filed under.
 */
export function startSchoolYear(actor?: SessionUser): Promise<SchoolYear> {
  return write('start school year', (s) => {
    const by = actorOr(actor)
    if (by.role !== 'staff')
      throw new SchoolYearSettingsError('Only the clinic staff can start a school year.')
    const settings = schoolYearSettingsOf(s)
    const current = currentSchoolYear(settings, s.today)
    if (current.started && !current.endedOn)
      throw new SchoolYearSettingsError(`End school year ${current.label} first.`)
    if (current.from === s.today)
      throw new SchoolYearSettingsError('A school year was already started today.')
    if (current.endedOn === s.today)
      throw new SchoolYearSettingsError(
        `School year ${current.label} ended today. Start the next one from tomorrow.`,
      )
    const { label } = schoolYearStep(settings, s.today)
    s.config.schoolYearStarts = [
      ...(s.config.schoolYearStarts ?? []),
      { label, startedOn: s.today, startedBy: by.id },
    ]
    audit(
      s,
      by,
      'create',
      { type: 'school-year', id: 'school-year' },
      `Started school year ${label}`,
    )
    return currentSchoolYear(schoolYearSettingsOf(s), s.today)
  })
}

export interface ArchivedRecordRow {
  id: string
  kind: 'student' | 'personnel'
  fullName: string
  /** Masked LRN for a student, the Staff No. for staff. */
  number: string
  /** The grade (student) or staff type at the time of archiving. */
  group: string
  archivedAt: ISODateTime | null
  archiveReason: string | null
  archivedSchoolYear: string
}

export interface ArchiveView {
  settings: SchoolYearSettings
  current: SchoolYear
  /** What Staff do next: end the current year, or start the next; when it is due by the dates, and whether that day has come. */
  step: { kind: 'end' | 'start'; label: string; dueOn: string; due: boolean; soon: boolean }
  /** Who started and who ended the current year, by name, or null. */
  currentStartedBy: string | null
  currentEndedBy: string | null
  /** Every school year with archived records or clinic records, plus the current one, newest first. */
  years: Array<Pick<SchoolYear, 'label' | 'from' | 'to'>>
  /** The newest year with an archived record, or null when nothing is archived. */
  defaultYear: string | null
  students: ArchivedRecordRow[]
  /** Staff only (ADR-043): the Admin gets none. */
  staff: ArchivedRecordRow[]
}

/** The Archive page's data: read-only, Staff and Admin (ADR-038). */
export function getArchive(viewer?: SessionUser): Promise<ArchiveView> {
  return read('archive', (s) => {
    const settings = schoolYearSettingsOf(s)
    const current = currentSchoolYear(settings, s.today)
    // A record archived before the school years were stored is filed under its archive date's year.
    const yearOf = (record: { archivedSchoolYear?: string | null; archivedAt?: string | null }) =>
      record.archivedSchoolYear ??
      (record.archivedAt
        ? schoolYearOf(record.archivedAt.slice(0, 10), settings).label
        : current.label)
    const students = s.students
      .filter((st) => st.archived)
      .map((st): ArchivedRecordRow => ({
        id: st.id,
        kind: 'student',
        fullName: formatPersonName(st),
        number: maskLrn(st.lrn),
        group: st.gradeLevel,
        archivedAt: st.archivedAt ?? null,
        archiveReason: st.archiveReason ?? null,
        archivedSchoolYear: yearOf(st),
      }))
    const staff =
      viewer?.role === 'admin'
        ? []
        : s.personnel
            .filter((pe) => pe.archived)
            .map((pe): ArchivedRecordRow => ({
              id: pe.id,
              kind: 'personnel',
              fullName: formatPersonName(pe),
              number: pe.staffNumber,
              group: pe.type,
              archivedAt: pe.archivedAt ?? null,
              archiveReason: pe.archiveReason ?? null,
              archivedSchoolYear: yearOf(pe),
            }))
    const byNewest = (a: ArchivedRecordRow, b: ArchivedRecordRow) =>
      (b.archivedAt ?? '').localeCompare(a.archivedAt ?? '') || a.fullName.localeCompare(b.fullName)
    const archivedYears = [...students, ...staff].map((row) => row.archivedSchoolYear)
    // Reports and the audit log are computed from dates, so every year with a visit, incident or entry is listed.
    const recordYears = [
      ...s.visits.map((v) => v.dateTime),
      ...s.incidents.map((i) => i.time),
      ...s.auditLog.map((a) => a.timestamp),
    ]
      .filter(Boolean)
      .map((at) => schoolYearOf(String(at).slice(0, 10), settings).label)
    const labels = [...new Set([current.label, ...archivedYears, ...recordYears])].sort().reverse()
    const years = labels.map((label) => {
      if (label === current.label) return { label, from: current.from, to: current.to }
      const started = settings.schoolYearStarts?.find((start) => start.label === label)
      const startYear = Number(label.slice(0, 4))
      const year = schoolYearOf(
        started?.startedOn ??
          `${startYear}-${String(settings.schoolYearStartMonth).padStart(2, '0')}-${String(settings.schoolYearStartDay).padStart(2, '0')}`,
        settings,
      )
      return { label, from: year.from, to: year.to }
    })
    const record = settings.schoolYearStarts?.find((start) => start.label === current.label)
    const nameOf = (id?: string) =>
      id ? (s.users.find((user) => user.id === id)?.name ?? 'Unknown user') : null
    return {
      settings: schoolYearDatesOf(s),
      current,
      step: schoolYearStep(settings, s.today),
      currentStartedBy: nameOf(record?.startedBy),
      currentEndedBy: nameOf(record?.endedBy),
      years,
      defaultYear: archivedYears.length ? [...archivedYears].sort().reverse()[0] : null,
      students: students.sort(byNewest),
      staff: staff.sort(byNewest),
    }
  })
}
