import { listFollowUps, rescheduleFollowUp, setFollowUpStatus, type FollowUpView, type SessionUser } from '../../../lib/mock-db'
import type { FollowUpStatus } from '../../../types/entities'

/** Follow-Up List (#18c). Rows carry the LRN only (multi-student list, ADR-004). */
export type FollowUpRow = FollowUpView

export function fetchFollowUps(status: '' | FollowUpStatus): Promise<FollowUpRow[]> {
  return listFollowUps({ status })
}

/** Status changes are audited updates; the Dashboard's due list reflects them on its next load. */
export async function updateFollowUpStatus(id: string, status: FollowUpStatus, actor?: SessionUser, reason?: string): Promise<void> {
  await setFollowUpStatus(id, status, actor, reason)
}

/** A new pending follow-up for the same student and reason (after Missed or Cancelled). */
export async function setNewFollowUpDate(id: string, followUpDate: string, actor?: SessionUser): Promise<void> {
  await rescheduleFollowUp(id, followUpDate, actor)
}
