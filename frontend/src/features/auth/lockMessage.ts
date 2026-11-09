import { formatTime } from '../../lib/dates'
import { LOCKOUT_MINUTES } from '../../lib/mock-db'

/** The lockout message, the same at sign-in and at password recovery (ADR-015). */
export function lockedMessage(lockedUntil?: number): string {
  const until = lockedUntil ? `at ${formatTime(lockedUntil)}` : `in ${LOCKOUT_MINUTES} minutes`
  return `This account is temporarily locked after repeated failed attempts. Try again ${until}.`
}

/** Appends "locked after N more failed attempts" once 3 or fewer are left (Zean, November 8, 2026). */
export function withAttemptsLeft(message: string, remaining?: number): string {
  if (remaining === undefined || remaining > 3) return message
  return `${message} Your account will be locked after ${remaining} more failed ${remaining === 1 ? 'attempt' : 'attempts'}.`
}
