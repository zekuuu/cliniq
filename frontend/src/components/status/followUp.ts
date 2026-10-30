import type { FollowUpStatus } from '../../types/entities'
import type { StatusMap } from '../ui/StatusBadge'

/** FollowUp.status lifecycle (Module 3): Pending → Completed / Missed / Cancelled. */
export const followUpStatusMap: StatusMap<FollowUpStatus> = {
  pending: { label: 'Pending', tone: 'info', icon: 'clock', variant: 'soft' },
  completed: { label: 'Completed', tone: 'info', icon: 'checkCircle', variant: 'soft' },
  missed: { label: 'Missed', tone: 'error', icon: 'xCircle', variant: 'soft' },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: 'xCircle', variant: 'soft' },
}

/**
 * How close a *pending* follow-up is to its date. It's computed fresh from today's date on every page
 * load (Module 9), never by a background job. This is a display state, not a new FollowUp.status:
 * an overdue follow-up stays `pending` until Staff marks it Missed or Completed.
 */
export type FollowUpDueState = 'overdue' | 'due' | 'due_today' | 'upcoming'

export const followUpDueMap: StatusMap<FollowUpDueState> = {
  overdue: { label: 'Overdue', tone: 'error', icon: 'alertOctagon', variant: 'soft' },
  due_today: { label: 'Due today', tone: 'warning', icon: 'clock', variant: 'soft' },
  /** ADR-051: past its date but within `config.followUpOverdueAfterDays`. */
  due: { label: 'Due', tone: 'warning', icon: 'clock', variant: 'soft' },
  upcoming: { label: 'Upcoming', tone: 'info', icon: 'calendarClock', variant: 'soft' },
}
