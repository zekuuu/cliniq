import { Link } from 'react-router'
import { Icon, buttonClassName } from '../../../components'
import { formatDate } from '../../../lib/dates'
import { paths } from '../../../routes/paths'
import type { DashboardSummary } from '../../../types/dashboard'

/**
 * Staff's school-year reminder (Zean, November 7, 2026): under the Dashboard header, where it is seen
 * first, short, with one action. Coming up within a week: info. Past the day and not done: warning.
 */
export function SchoolYearBanner({
  reminder,
}: {
  reminder: NonNullable<DashboardSummary['schoolYearReminder']>
}) {
  const ending = reminder.kind === 'end'
  const date = formatDate(reminder.dueOn)
  const text = reminder.overdue
    ? `School year ${reminder.label} was due to ${ending ? 'end' : 'start'} ${date}.`
    : reminder.dueToday
      ? `School year ${reminder.label} ${ending ? 'ends' : 'starts'} today.`
      : `School year ${reminder.label} ${ending ? 'ends' : 'starts'} ${date}.`
  // Due today warns like overdue (Zean, November 8, 2026).
  const warn = reminder.overdue || reminder.dueToday
  const tone = warn ? 'border-warning bg-warning-fill' : 'border-info bg-info-fill'
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 print:hidden ${tone}`}
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Icon
          name={warn ? 'alertTriangle' : 'calendarClock'}
          size={16}
          className={warn ? 'text-warning-text' : 'text-info-text'}
        />
        {text}
      </p>
      {/* The Archive page highlights its End or Start button when opened from here. */}
      <Link
        to={paths.archive}
        state={{ highlightSchoolYearStep: true }}
        className={buttonClassName({ size: 'sm', variant: warn ? 'primary' : 'secondary' })}
      >
        Go to Archive
      </Link>
    </div>
  )
}
