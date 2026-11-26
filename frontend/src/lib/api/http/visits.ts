import {
  StockRuleError,
  type ExcuseLetterApproval,
  type ExcuseLetterApprovalInput,
  type FollowUpView,
  type PendingExcuseLetter,
  type PeReferral,
  type PeReferralInput,
  type RecordVisitInput,
  type SessionUser,
  type StudentExcuseLetter,
  type VisitPatch,
} from '../../mock-db'
import type { FollowUp, FollowUpStatus, ISODate, Visit } from '../../../types/entities'
import { http } from '../client'
import { mapped, type ErrorMap } from '../errors'

/**
 * VISITS in API mode (S3; API-Contract.md "Clinic Visits" and "Follow-Ups"), with the excuse
 * letters, the sports (PE) referral and the follow-ups. The server decides stock, "now" and every
 * rule; a refused line comes back as the mock's `StockRuleError`, so the forms show it in place.
 */

/** The visit forms show a refused save in place ("… Nothing was saved."), as the mock's stock rule did. */
const SAVE_ERRORS: ErrorMap = { validation: (message) => new StockRuleError(message) }

export function listVisits(
  range?: { from: ISODate; to: ISODate },
  options: { includeEnteredInError?: boolean } = {},
): Promise<Visit[]> {
  return http.get('/visits', {
    query: {
      from: range?.from,
      to: range?.to,
      includeEnteredInError: options.includeEnteredInError ? 1 : undefined,
    },
  })
}

export function getVisit(id: string): Promise<Visit> {
  return http.get(`/visits/${encodeURIComponent(id)}`)
}

/** The mock's demo default for a screen opened without a visit id; the API has none. */
export function getLatestVisit(): Promise<Visit> {
  return Promise.reject(new Error('Visit not found'))
}

export function recordVisit(
  input: RecordVisitInput,
): Promise<{ visit: Visit; followUp: FollowUp | null; belowZero: string[] }> {
  return mapped(http.post('/visits', input), SAVE_ERRORS)
}

export function updateVisit(
  id: string,
  patch: VisitPatch,
): Promise<{ visit: Visit; belowZero: string[] }> {
  return mapped(http.put(`/visits/${encodeURIComponent(id)}`, patch), SAVE_ERRORS)
}

export function markVisitEnteredInError(id: string, reason: string): Promise<Visit> {
  return http.post(`/visits/${encodeURIComponent(id)}/entered-in-error`, { reason })
}

export function undoVisitEnteredInError(id: string): Promise<Visit> {
  return http.post(`/visits/${encodeURIComponent(id)}/entered-in-error/undo`, {})
}

export function getExcuseLetterApproval(visitId: string): Promise<ExcuseLetterApproval | null> {
  return http.get(`/visits/${encodeURIComponent(visitId)}/excuse-letter`)
}

export function getExcuseLetterById(letterId: string): Promise<ExcuseLetterApproval> {
  return http.get(`/excuse-letters/${encodeURIComponent(letterId)}`)
}

export async function issueReplacementExcuseLetter(visitId: string, reason: string): Promise<void> {
  await http.post(`/visits/${encodeURIComponent(visitId)}/excuse-letter/replacement`, { reason })
}

export function approveExcuseLetter(
  visitId: string,
  input: ExcuseLetterApprovalInput,
): Promise<ExcuseLetterApproval> {
  return http.post(`/visits/${encodeURIComponent(visitId)}/excuse-letter/approve`, input)
}

/** Masked LRN, never a name (ADR-004). */
export function listPendingExcuseLetters(): Promise<PendingExcuseLetter[]> {
  return http.get('/excuse-letters/pending')
}

export function getStudentExcuseLetters(studentId: string): Promise<StudentExcuseLetter[]> {
  return http.get(`/students/${encodeURIComponent(studentId)}/excuse-letters`)
}

export function submitPeReferral(input: PeReferralInput): Promise<PeReferral> {
  return http.post('/pe-referrals', input)
}

export function listFollowUps(
  query: { status?: FollowUpStatus | '' } = {},
): Promise<FollowUpView[]> {
  return http.get('/follow-ups', { query: { status: query.status } })
}

export function setFollowUpStatus(
  id: string,
  status: FollowUpStatus,
  _actor?: SessionUser,
  reason?: string,
): Promise<FollowUp> {
  return http.put(`/follow-ups/${encodeURIComponent(id)}/status`, {
    status,
    reason: reason ?? null,
  })
}

export function rescheduleFollowUp(id: string, followUpDate: ISODate): Promise<FollowUp> {
  return http.post(`/follow-ups/${encodeURIComponent(id)}/reschedule`, { followUpDate })
}

export function undoFollowUpReschedule(id: string): Promise<FollowUp> {
  return http.post(`/follow-ups/${encodeURIComponent(id)}/undo-reschedule`, {})
}
