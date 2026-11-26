import {
  clearMockSession,
  RecoveryError,
  IdleSignoutSettingsError,
  OperationalSettingsError,
  startMockSession as startBridgedMockSession,
  type IdleSignoutSettings,
  type OperationalSettings,
  type MockAuthResult,
  type OwnAccount,
  type SessionUser,
} from '../../mock-db'
import { db } from '../../mock-db/store'
import { API_ACTIVITY_EVENT } from '../../sessionActivity'
import { ApiError, http } from '../client'
import { mapped, type ErrorMap } from '../errors'
import { API_MODULES, apiMode } from '../mode'

/**
 * AUTH in API mode (ADR-080, API-Contract.md "Authentication and session"). The server holds the
 * session; this module keeps only what the screens read synchronously: the signed-in user and a
 * pending forced password change, both restored from `GET /api/auth/me` at start-up.
 */

let current: SessionUser | null = null
let pending: SessionUser | null = null
let idleMinutes: number | null = null
let sessionEnded = false

/**
 * The server ended the session (7-day maximum, or the account changed): Login says so until the
 * next sign-in. Held here, not in router state, which the Login redirect replaces.
 */
export function noteSessionEnded(): void {
  sessionEnded = true
}

export function sessionEndedNotice(): boolean {
  return sessionEnded
}

/** The signed-in role's idle limit last read, for Login's "signed out after N minutes". */
export function lastIdleMinutes(): number | null {
  return idleMinutes
}

interface MeResponse {
  user: SessionUser
  mustChangePassword: boolean
  idleSignoutMinutes: number
  idleSecondsLeft: number
}

/** Start-up: restores the session from the server's cookie. A 401 means nobody is signed in. */
export async function bootstrapApiSession(): Promise<void> {
  try {
    const me = await http.get<MeResponse>('/auth/me', { quiet401: true })
    current = me.mustChangePassword ? null : me.user
    idleMinutes = me.idleSignoutMinutes
    pending = me.mustChangePassword ? me.user : null
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) throw error
    current = null
    pending = null
  }
}

/** The session ended on the server (401): forget it here too. */
export function forgetApiSession(): void {
  current = null
  pending = null
  clearMockSession()
}

/**
 * Modules still on the mock attribute their writes to the mock's own session. When sign-in is on
 * the API and some module is not, start the mock session for the same username (the development
 * seeder loads the mock's accounts), so a mixed setup keeps working.
 */
function bridgeMockSession(username: string): void {
  if (API_MODULES.every((module) => apiMode(module) === 'api')) return
  const normalized = username.trim().toLowerCase()
  const user = db().users.find((u) => u.username.toLowerCase() === normalized)
  if (user) startBridgedMockSession({ id: user.id, name: user.name, role: user.role })
}

export async function authenticateMockUser(
  username: string,
  password: string,
): Promise<MockAuthResult> {
  const result = await http.post<MockAuthResult>(
    '/auth/login',
    { username, password },
    { quiet401: true },
  )
  if (result.mustChangePassword) notePendingPasswordChange(result.user)
  bridgeMockSession(username)
  return result
}

export function getAuthenticatedUser(): SessionUser | null {
  return current
}

export function startMockSession(user: SessionUser): void {
  current = user
  pending = null
  sessionEnded = false
}

export function getMockSessionUser(): SessionUser {
  if (current) return current
  throw new Error('No signed-in user: every CLINIQ screen requires Login.')
}

export function beginPasswordChange(): void {
  // The server already holds the session under a forced change; `pending` came from the login.
}

export function clearPendingPasswordChange(): void {
  pending = null
}

export function getPendingPasswordChangeUser(): SessionUser | null {
  return pending
}

/** Login answered `mustChangePassword`: remember whose password Force Password Change sets. */
export function notePendingPasswordChange(user: SessionUser): void {
  pending = user
  current = null
}

export async function logoutMockSession(_actor: SessionUser, summary?: string): Promise<void> {
  try {
    await http.post('/auth/logout', summary ? { reason: summary } : {}, { quiet401: true })
  } catch (error) {
    // Already signed out on the server (idle or expired): the sign-out is done either way.
    if (!(error instanceof ApiError && error.status === 401)) throw error
  } finally {
    forgetApiSession()
  }
}

export async function changeMockPassword(_userId: string, nextPassword: string): Promise<void> {
  await http.post('/auth/password', { nextPassword })
}

export async function changeOwnPassword(
  _userId: string,
  currentPassword: string,
  nextPassword: string,
): Promise<void> {
  await http.post('/auth/password', { currentPassword, nextPassword })
}

let lastKeepAlive = 0

/**
 * `POST /api/session/keepalive`: counts as activity and answers the server's idle seconds left,
 * which the idle warning follows (ADR-078). Sent on "Stay signed in", and at most once a minute while
 * the person is active; never on a timer.
 */
export async function keepAlive(force = false): Promise<number | null> {
  const now = Date.now()
  if (!force && now - lastKeepAlive < 60_000) return null
  lastKeepAlive = now
  const { idleSecondsLeft } = await http.post<{ idleSecondsLeft: number }>('/session/keepalive')
  window.dispatchEvent(new CustomEvent(API_ACTIVITY_EVENT, { detail: { idleSecondsLeft } }))
  return idleSecondsLeft
}

export function getIdleSignoutSettings(): Promise<IdleSignoutSettings> {
  return http.get<IdleSignoutSettings>('/settings/idle-signout')
}

export function getOperationalSettings(): Promise<OperationalSettings> {
  return http.get<OperationalSettings>('/settings/operational')
}

export function saveOperationalSettings(input: OperationalSettings): Promise<OperationalSettings> {
  return mapped(http.put<OperationalSettings>('/settings/operational', input), {
    validation: (message) => new OperationalSettingsError(message),
    forbidden: (message) => new OperationalSettingsError(message),
  })
}

export async function getIdleSignoutMinutes(role: SessionUser['role']): Promise<number> {
  const settings = await getIdleSignoutSettings()
  idleMinutes =
    role === 'admin' ? settings.idleSignoutMinutesAdmin : settings.idleSignoutMinutesStaff
  return idleMinutes
}

export function saveIdleSignoutSettings(input: IdleSignoutSettings): Promise<IdleSignoutSettings> {
  return mapped(
    http
      .put('/settings/idle-signout', {
        idleSignoutMinutesStaff: input.idleSignoutMinutesStaff,
        idleSignoutMinutesAdmin: input.idleSignoutMinutesAdmin,
      })
      .then(() => getIdleSignoutSettings()),
    {
      validation: (message) => new IdleSignoutSettingsError(message),
      forbidden: (message) => new IdleSignoutSettingsError(message),
    },
  )
}

/** Recovery and authenticator failures carry the server's message and the attempts left. */
const RECOVERY_ERRORS: ErrorMap = {
  validation: (message, error) => new RecoveryError(message, error.attemptsLeft),
}

function recovery<T>(promise: Promise<T>): Promise<T> {
  return mapped(promise, RECOVERY_ERRORS).catch((error: unknown) => {
    // The expired reset (410) is a plain refusal with its own message.
    if (error instanceof ApiError && error.status === 410) throw new RecoveryError(error.message)
    if (error instanceof ApiError && error.status === 409) throw new RecoveryError(error.message)
    throw error
  })
}

export async function checkRecoveryAccount(username: string): Promise<void> {
  await recovery(http.post('/auth/recovery/check', { username }, { quiet401: true }))
}

export async function verifyPasswordRecovery(username: string, proof: string): Promise<string> {
  const { token } = await recovery(
    http.post<{ token: string }>(
      '/auth/recovery/verify',
      { username, code: proof },
      { quiet401: true },
    ),
  )
  return token
}

export async function resetPasswordWithRecovery(
  token: string,
  nextPassword: string,
): Promise<void> {
  await recovery(http.post('/auth/recovery/reset', { token, nextPassword }, { quiet401: true }))
}

export function getAuthenticatorStatus(): Promise<{ enabled: boolean; recoveryCodesLeft: number }> {
  return http.get('/auth/authenticator')
}

export async function startAuthenticatorSetup(
  proof?: string,
): Promise<{ secret: string; uri: string }> {
  const started = await recovery(
    http.post<{ secret: string; otpauthUri: string }>(
      '/auth/authenticator/setup',
      proof ? { proof } : {},
    ),
  )
  return { secret: started.secret, uri: started.otpauthUri }
}

export function confirmAuthenticatorSetup(code: string): Promise<{ recoveryCodes: string[] }> {
  return recovery(http.post('/auth/authenticator/confirm', { code }))
}

export async function turnOffAuthenticator(proof: string): Promise<void> {
  await recovery(http.delete('/auth/authenticator', { proof }))
}

export function getOwnAccount(): Promise<OwnAccount> {
  return http.get('/auth/profile')
}

export async function updateOwnProfile(input: {
  name: string
  profilePicture: string | null
}): Promise<OwnAccount> {
  const saved = await http.put<OwnAccount>('/auth/profile', input)
  // The shell re-reads the signed-in user's name after Edit profile (ADR-066).
  if (current) current = { ...current, name: saved.name }
  return saved
}
