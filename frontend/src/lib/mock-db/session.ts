import type { User, UserRole } from '../../types/entities'
import { db } from './store'

/**
 * MOCK SESSION: stands in for Sanctum auth until Phase B2 lands.
 *
 * A session exists only after a successful Login (`startMockSession`). Every route requires one, so
 * each audited action is attributable to the account that signed in
 * (ADR-002, security clarification). There is deliberately no URL parameter or role picker that
 * creates a session. Like the planned Sanctum token, it lasts one week with no idle timeout
 * (Module 1), and Log out ends it.
 *
 * Every account in `mock-db.json` is fictional (see the file's `meta.notice`).
 */
export type SessionUser = Pick<User, 'id' | 'name' | 'role'>

const SESSION_KEY = 'cliniq.session'
const PENDING_PASSWORD_KEY = 'cliniq.pendingPasswordChange'
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000

interface StoredSession {
  userId: string
  expiresAt: number
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function sessionUserById(id: string): SessionUser | null {
  const user = db().users.find((u) => u.id === id)
  return user ? { id: user.id, name: user.name, role: user.role } : null
}

function userForRole(role: UserRole): SessionUser {
  const state = db()
  const mustChange = new Set(
    state.frontendOnly.devAccounts.filter((a) => a.mustChangePassword).map((a) => a.userId),
  )
  const user =
    state.users.find((u) => u.role === role && !mustChange.has(u.id)) ??
    state.users.find((u) => u.role === role)
  if (!user) throw new Error(`mock-db.json has no "${role}" account`)
  return { id: user.id, name: user.name, role: user.role }
}

/** The signed-in account, or `null` when nobody has logged in (or the week-long session expired). */
export function getAuthenticatedUser(): SessionUser | null {
  const raw = storage()?.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const session = JSON.parse(raw) as StoredSession
    if (!session.userId || !(session.expiresAt > Date.now())) {
      clearMockSession()
      return null
    }
    return sessionUserById(session.userId)
  } catch {
    clearMockSession()
    return null
  }
}

/** Called only after Login verified the credentials (and any forced password change is done). */
export function startMockSession(user: SessionUser): void {
  const session: StoredSession = { userId: user.id, expiresAt: Date.now() + SESSION_LIFETIME_MS }
  storage()?.removeItem(PENDING_PASSWORD_KEY)
  storage()?.setItem(SESSION_KEY, JSON.stringify(session))
}

/**
 * Login verified the credentials of an account that must change its password first. The account id
 * is held here — never taken from the URL — so only that account's password can be changed.
 */
export function beginPasswordChange(userId: string): void {
  storage()?.setItem(PENDING_PASSWORD_KEY, userId)
}

export function getPendingPasswordChangeUser(): SessionUser | null {
  const userId = storage()?.getItem(PENDING_PASSWORD_KEY)
  return userId ? sessionUserById(userId) : null
}

/**
 * The account an action is attributed to. In the app this is always the signed-in user, since no
 * screen renders without Login. Only the test runner, which renders screens directly, falls back to
 * the first Staff account; outside tests a missing session is an error rather than a silent default.
 */
export function getMockSessionUser(): SessionUser {
  const user = getAuthenticatedUser()
  if (user) return user
  if (import.meta.env.MODE === 'test') return userForRole('staff')
  throw new Error('No signed-in user: every CLINIQ screen requires Login.')
}

/** Ends the session. The real Sanctum logout endpoint replaces this in Phase B2. */
export function clearMockSession(): void {
  storage()?.removeItem(SESSION_KEY)
  storage()?.removeItem(PENDING_PASSWORD_KEY)
}

export const ROLE_LABELS: Record<UserRole, string> = {
  staff: 'School Clinician',
  admin: 'Admin / Principal',
}
