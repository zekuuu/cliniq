import {
  DuplicateUsernameError,
  LastAdminError,
  getUser,
  listUsers,
  resetUserPassword,
  saveUser,
  setUserActive,
  type SessionUser,
} from '../../../lib/mock-db'

export { DuplicateUsernameError, LastAdminError }
import type { User, UserRole } from '../../../types/entities'

export function fetchUsers(): Promise<User[]> {
  return listUsers()
}

export function fetchUser(userId: string): Promise<User> {
  return getUser(userId)
}

/** Creates or updates an account; the data layer writes the audit entry. Passwords never pass here. */
export function submitUser(
  values: { name: string; username: string; role: UserRole; profilePicture?: string | null; temporaryPassword?: string },
  options: { userId?: string; actor?: SessionUser },
): Promise<User> {
  return saveUser(values, options)
}

/** Disables or re-enables the account; the data layer refuses to disable the last active Admin. */
export function changeUserStatus(userId: string, active: boolean, actor: SessionUser): Promise<User> {
  return setUserActive(userId, active, actor)
}

/** Sets a temporary password the person must change at first sign-in; it is never shown again. */
export function resetPassword(userId: string, temporaryPassword: string, actor: SessionUser): Promise<void> {
  return resetUserPassword(userId, temporaryPassword, actor)
}
