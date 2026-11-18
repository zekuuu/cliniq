import {
  BackupFailedError,
  DuplicateItemNameError,
  DuplicateLrnError,
  DuplicateUsernameError,
  IncidentApprovedError,
  LastAdminError,
  LrnLockedError,
  MockAuthError,
  NoBackupLocationError,
  StockRuleError,
} from '../mock-db'
import { ApiError } from './client'

/**
 * The contract's error body, turned into the error the mock throws for the same refusal
 * (API-Contract.md "Errors"), so each screen's existing `catch` keeps working in API mode. The
 * message is always the server's text. The original `ApiError` stays reachable as `cause`.
 */
const RULE_ERRORS: Record<string, () => Error> = {
  last_admin: () => new LastAdminError(),
  duplicate_username: () => new DuplicateUsernameError(),
  duplicate_lrn: () => new DuplicateLrnError(),
  lrn_locked: () => new LrnLockedError(),
  incident_approved: () => new IncidentApprovedError(),
  stock_rule: () => new StockRuleError(),
  duplicate_item_name: () => new DuplicateItemNameError(),
  no_backup_location: () => new NoBackupLocationError(),
  backup_failed: () => new BackupFailedError(),
}

/** Keep the class's own message where the screen reads the class, not the text. */
const KEEP_CLASS_MESSAGE = new Set(['duplicate_username'])

export type ErrorFactory = (message: string, error: ApiError) => Error

/** Per call: which mock class a 403 or 422 of this endpoint becomes. */
export interface ErrorMap {
  forbidden?: ErrorFactory
  validation?: ErrorFactory
}

function withCause<E extends Error>(mapped: E, error: ApiError, message?: string): E {
  if (message !== undefined) mapped.message = message
  Object.defineProperty(mapped, 'cause', { value: error, enumerable: false })
  return mapped
}

export function toMockError(error: unknown, map: ErrorMap = {}): unknown {
  if (!(error instanceof ApiError)) return error
  if (error.status === 401 && error.code === 'invalid_credentials')
    return withCause(new MockAuthError('invalid_credentials', undefined, error.attemptsLeft), error)
  if (error.status === 423 && error.code === 'account_locked') {
    const until = error.lockedUntil ? Date.parse(error.lockedUntil) : undefined
    return withCause(new MockAuthError('locked', until), error)
  }
  if (error.status === 409 && error.rule && RULE_ERRORS[error.rule]) {
    const keep = KEEP_CLASS_MESSAGE.has(error.rule)
    return withCause(RULE_ERRORS[error.rule](), error, keep ? undefined : error.message)
  }
  if (error.status === 403 && error.code === 'forbidden' && map.forbidden)
    return withCause(map.forbidden(error.message, error), error)
  if (error.status === 422 && map.validation)
    return withCause(map.validation(error.message, error), error)
  return error
}

/** Runs an HTTP call and rethrows its failure as the mock's error. */
export async function mapped<T>(promise: Promise<T>, map?: ErrorMap): Promise<T> {
  try {
    return await promise
  } catch (error) {
    throw toMockError(error, map)
  }
}

/** The first message of each field, as the screens keep their field errors. */
export function firstFieldErrors(error: ApiError): Record<string, string> {
  return Object.fromEntries(
    Object.entries(error.errors ?? {}).map(([field, messages]) => [field, messages[0] ?? '']),
  )
}
