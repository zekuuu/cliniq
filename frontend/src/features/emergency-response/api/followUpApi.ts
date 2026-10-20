import { listFollowUps, setFollowUpStatus, type FollowUpView, type SessionUser } from '../../../lib/mock-db'
import type { FollowUpStatus } from '../../../types/entities'

/** Follow-Up List (#18c). Rows carry the LRN only (multi-student list, ADR-004). */
export type FollowUpRow = FollowUpView

export function fetchFollowUps(status: '' | FollowUpStatus): Promise<FollowUpRow[]> {
  return listFollowUps({ status })
}

/** Status changes are audited updates; the Dashboard's due list reflects them on its next load. */
export async function updateFollowUpStatus(id: string, status: FollowUpStatus, actor?: SessionUser): Promise<void> {
  await setFollowUpStatus(id, status, actor)
}
