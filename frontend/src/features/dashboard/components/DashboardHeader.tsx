import { Button, DateRangePicker } from '../../../components'
import { formatLongDate } from '../../../lib/dates'
import { describeRangeDates, type DateRange } from '../../../lib/dateRange'
import type { SessionUser } from '../../../lib/mock-db'
import type { ISODate } from '../../../types/entities'

function greeting(now: Date): string {
  const h = now.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export interface DashboardHeaderProps {
  viewer: SessionUser
  today: ISODate
  range: DateRange
  onRangeChange: (range: DateRange) => void
  isRefetching: boolean
  onPrint: () => void
  /** Where the All range really starts; unknown until the summary loads. */
  oldestRecordDate?: ISODate | null
  /**
   * False on the Calendar view, which has its own period: the Date range and its "Showing …" line
   * hide on screen so nobody reads them as filtering the calendar. Print always shows the line.
   */
}

/**
 * Page header, following the reference: title/greeting on the left, and the period selector plus
 * the one page action (Print) on the right. Staff get a greeting in the supporting line; Admin gets
 * the same page title without Staff-specific warmth. The "New Visit" shortcut sits on the view-tab
 * row below this header.
 */
export function DashboardHeader({
  viewer,
  today,
  range,
  onRangeChange,
  isRefetching,
  onPrint,
  oldestRecordDate,
}: DashboardHeaderProps) {
  const isStaff = viewer.role === 'staff'
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Clinic Overview</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {isStaff
            ? `${greeting(new Date())}, ${viewer.name}. Today's clinic activity and student health updates.`
            : 'Today’s clinic activity and student health updates.'}
        </p>
        <p className="mt-0.5 text-xs text-text-secondary" aria-live="polite">
          <time dateTime={today}>{formatLongDate(today)}</time>
          <span>
            <span aria-hidden="true"> · </span>
            {isRefetching ? 'Updating…' : `Showing ${describeRangeDates(range, oldestRecordDate)}`}
          </span>
          <span aria-hidden="true"> · </span>
          View only
        </p>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2 print:hidden">
        <DateRangePicker value={range} onChange={onRangeChange} today={today} compact />
        <Button variant="secondary" icon="printer" onClick={onPrint}>
          Print / Save as PDF
        </Button>
      </div>
    </header>
  )
}
