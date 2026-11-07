import { formatTime } from '../../lib/dates'

/** The lockout message, the same at sign-in and at password recovery (5 failures, 30 minutes, ADR-015). */
export function lockedMessage(lockedUntil?: number): string {
  const until = lockedUntil ? `at ${formatTime(lockedUntil)}` : 'in 30 minutes'
  return `This account is temporarily locked after repeated failed attempts. Try again ${until}.`
}
