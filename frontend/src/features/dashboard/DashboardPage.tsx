import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { Card, ErrorState, Icon, Tabs } from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { cn } from '../../lib/cn'
import { todayISO } from '../../lib/dates'
import { getMockSessionUser, type SessionUser } from '../../lib/mock-db'
import { rangeForPreset, type DateRange } from '../../lib/dateRange'
import type { DashboardSummary } from '../../types/dashboard'
import { fetchDashboardSummary } from './api/dashboardApi'
import {
  ALERT_GRID,
  AlertListsSkeleton,
  FollowUpsAlert,
  FrequentVisitorsAlert,
  InventoryAlert,
} from './components/AlertLists'
import { ComplaintTrends, ComplaintTrendsSkeleton } from './components/ComplaintTrends'
import { DashboardHeader } from './components/DashboardHeader'
import { PendingExcuseLetters } from './components/PendingExcuseLetters'
import { BackupStatusLink, NewVisitLink } from './components/StaffShortcuts'
import { StatCardRow, StatCardRowSkeleton } from './components/StatCardRow'
import { VisitCalendar } from './components/VisitCalendar'

type DashboardView = 'overview' | 'trends' | 'calendar'

/** How long a view shows its skeleton after a switch, so the change reads as a load, not a jump. */
const VIEW_SWITCH_SKELETON_MS = 300

/** `?view=` value → view. No parameter or an unknown value opens Overview (ADR-025). */
function parseDashboardView(value: string | null): DashboardView {
  return value === 'trends' || value === 'calendar' ? value : 'overview'
}

/**
 * Clinic Overview Dashboard (Screen Inventory #31, Reference 1, Module 9).
 * Staff and Admin/Principal see the same layout, except the header greeting and a Staff-only strip
 * with the "New Visit" shortcut and backup-status indicator (Screen #4; ADR-011 amendment). It's
 * view-only for both: no create, update, or delete happens here, so there are no audit-log writes.
 *
 * Header (Staff: backup status above Print) → view tabs, with Staff's New Visit on the tab row
 * (ADR-025): Overview (stat cards, three alert groups, Staff's pending excuse letters), Trends (complaint trends), Calendar. One view shows at a time; the choice
 * lives in `?view=` (replace, so Back is unaffected). Every panel stays mounted, so switching keeps
 * the calendar's state and refetches nothing, and Print prints every view. Each view shows its own
 * shaped skeleton on first load and its own error; later refetches keep the previous render dimmed.
 */
export function DashboardPage({ viewer = getMockSessionUser() }: { viewer?: SessionUser }) {
  const today = todayISO()
  // A summary view opens on the current month; operational logs keep the All default.
  const [range, setRange] = useState<DateRange>(() => rangeForPreset('thisMonth', today))
  const [searchParams, setSearchParams] = useSearchParams()
  const view = parseDashboardView(searchParams.get('view'))
  const canNavigate = viewer.role === 'staff'
  const [switching, setSwitching] = useState(false)
  useEffect(() => {
    if (!switching) return
    // `view` restarts the timer when the user switches again before it ends.
    const timer = setTimeout(() => setSwitching(false), VIEW_SWITCH_SKELETON_MS)
    return () => clearTimeout(timer)
  }, [switching, view])

  const { data, status, isRefetching, reload } = useAsyncData(
    // The preset is part of the key: the trend's bucket size depends on it, not only the dates.
    `${range.preset}|${range.from}|${range.to}`,
    () => fetchDashboardSummary({ range }),
  )

  function changeView(next: DashboardView) {
    if (next === view) return
    setSwitching(true)
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (next === 'overview') params.delete('view')
        else params.set('view', next)
        return params
      },
      { replace: true },
    )
  }

  /** The summary request's states, shared by Overview and Trends (one request feeds both). */
  function summaryPanel(
    loadingLabel: string,
    skeleton: ReactNode,
    content: (d: DashboardSummary) => ReactNode,
  ) {
    if (status === 'error')
      return <ErrorState title="Unable to load the clinic overview." onRetry={reload} />
    if ((status === 'loading' && !data) || switching)
      return (
        <>
          <p className="sr-only" role="status">
            {loadingLabel}
          </p>
          {skeleton}
        </>
      )
    if (!data) return null
    return (
      <div
        aria-busy={isRefetching}
        className={cn(
          'flex flex-col gap-6 transition-opacity motion-reduce:transition-none print:block print:space-y-6',
          isRefetching && 'opacity-60',
        )}
      >
        {content(data)}
      </div>
    )
  }

  // Follow-ups, frequent visitors, and inventory alerts, counted from the summary already loaded.
  const alertCount = data
    ? data.dueFollowUps.length + data.frequentVisitors.length + data.inventoryAlerts.length
    : 0

  return (
    // Block flow in print: in a flex column, a card pushed to the next page by break-inside-avoid
    // doesn't move the following section down, so the Calendar printed over Common complaints.
    // Spacing groups by meaning: the header card sits 16px above the tab row (gap-4); the tabs sit
    // 12px above the panel they switch (gap-3).
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8 print:block print:space-y-6">
      <Card className="p-5">
        <DashboardHeader
          viewer={viewer}
          today={today}
          range={range}
          onRangeChange={setRange}
          isRefetching={isRefetching}
          onPrint={() => window.print()}
          oldestRecordDate={data?.oldestRecordDate}
          showRange={view !== 'calendar'}
          status={viewer.role === 'staff' && <BackupStatusLink />}
        />
      </Card>

      <div className="flex flex-col gap-3 print:block">
        <Tabs
          label="Dashboard view"
          value={view}
          onChange={changeView}
          printAll
          actions={viewer.role === 'staff' && <NewVisitLink className="self-start md:self-auto" />}
          tabs={[
            {
              value: 'overview',
              label: 'Overview',
              icon: 'layoutGrid',
              // Visible from every view, so alerts aren't missed while on Trends or Calendar.
              badge:
                alertCount > 0 ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="inline-flex shrink-0 items-center gap-0.5 rounded-sm bg-warning px-1.5 text-xs leading-5 font-semibold text-white"
                    >
                      <Icon name="alertTriangle" size={12} />
                      {alertCount}
                    </span>
                    <span className="sr-only">{`, ${alertCount} ${alertCount === 1 ? 'alert' : 'alerts'}`}</span>
                  </>
                ) : undefined,
              panel: summaryPanel(
                'Loading clinic overview…',
                <>
                  <StatCardRowSkeleton />
                  <AlertListsSkeleton />
                </>,
                (d) => (
                  <>
                    <StatCardRow summary={d} range={range} canNavigate={canNavigate} />
                    <section aria-label="Alerts" className={ALERT_GRID}>
                      <FollowUpsAlert summary={d} canNavigate={canNavigate} />
                      <FrequentVisitorsAlert summary={d} range={range} canNavigate={canNavigate} />
                      <InventoryAlert summary={d} canNavigate={canNavigate} />
                    </section>
                    {viewer.role === 'staff' && <PendingExcuseLetters />}
                  </>
                ),
              ),
            },
            {
              value: 'trends',
              label: 'Trends',
              icon: 'activity',
              panel: summaryPanel('Loading trends…', <ComplaintTrendsSkeleton />, (d) => (
                <ComplaintTrends trends={d.complaintTrends} />
              )),
            },
            {
              value: 'calendar',
              label: 'Calendar',
              icon: 'calendar',
              // Separate data source: loads with its own skeleton, and fails/retries on its own.
              panel: (
                <VisitCalendar
                  today={today}
                  initialAnchor={range.to}
                  canNavigate={canNavigate}
                  showSkeleton={switching}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
