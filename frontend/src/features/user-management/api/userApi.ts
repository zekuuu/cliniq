import { DuplicateUsernameError, getUser, listUsers, saveUser, type SessionUser } from '../../../lib/mock-db'

export { DuplicateUsernameError }
import type { User, UserRole } from '../../../types/entities'

export function fetchUsers(): Promise<User[]> {
  return listUsers()
}

export function fetchUser(userId: string): Promise<User> {
  return getUser(userId)
}

/** Creates or updates an account; the data layer writes the audit entry. Passwords never pass here. */
export function submitUser(
  values: { name: string; username: string; role: UserRole; profilePicture?: string | null },
  options: { userId?: string; actor?: SessionUser },
): Promise<User> {
  return saveUser(values, options)
}
