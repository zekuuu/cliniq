import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { Card, ErrorState, Icon, Tabs } from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { cn } from '../../lib/cn'
import { todayISO } from '../../lib/dates'
import { getMockSessionUser, type SessionUser } from '../../lib/mock-db'
import { rangeForPreset, type DateRange } from '../../lib/dateRange'
import { paths } from '../../routes/paths'
import type { DashboardSummary } from '../../types/dashboard'
import type { StudentSex } from '../../types/entities'
import {
  fetchDashboardSummary,
  fetchPendingExcuseLetters,
} from './api/dashboardApi'
import {
  FrequentVisitorsAlert,
} from './components/AlertLists'
import { AttentionChips } from './components/AttentionChips'
import { ComplaintTrends, ComplaintTrendsSkeleton } from './components/ComplaintTrends'
import { DashboardPrint } from './components/DashboardPrint'
import { DashboardHeader } from './components/DashboardHeader'
import { NewVisitLink } from './components/StaffShortcuts'
import { StatCardRow, StatCardRowSkeleton } from './components/StatCardRow'

type DashboardView = 'overview' | 'trends'

/** How long a view shows its skeleton after a switch, so the change reads as a load, not a jump. */
const VIEW_SWITCH_SKELETON_MS = 300

/** `?view=` value → view. No parameter or an unknown value opens Overview (ADR-025). */
function parseDashboardView(value: string | null): DashboardView {
  return value === 'trends' ? value : 'overview'
}

function parseSex(value: string | null): StudentSex | null {
  return value === 'female' || value === 'male' ? value : null
}

/**
 * Clinic Overview Dashboard (Screen Inventory #31, Reference 1, Module 9).
 * Staff and Admin/Principal see the same layout, except the header greeting and a Staff-only
 * "New Visit" shortcut (Screen #4; ADR-011 amendment). It's
 * view-only for both: no create, update, or delete happens here, so there are no audit-log writes.
 *
 * Header → view tabs, with Staff's New Visit on the tab row
 * (ADR-025): Overview (stat cards and three alert groups; pending excuse letters open in the Visit Log), Trends (complaint trends), Calendar. One view shows at a time; the choice
 * lives in `?view=` (replace, so Back is unaffected). Every panel stays mounted, so switching keeps
 * the calendar's state and refetches nothing. Print produces the "Clinic Overview Report" instead of
 * the screen (`DashboardPrint`, ADR-026), from data loaded here. Each view shows its own
 * shaped skeleton on first load and its own error; later refetches keep the previous render dimmed.
 */
export function DashboardPage({ viewer = getMockSessionUser() }: { viewer?: SessionUser }) {
  const today = todayISO()
  // A summary view opens on the current month; operational logs keep the All default.
  const [range, setRange] = useState<DateRange>(() => rangeForPreset('thisMonth', today))
  const [searchParams, setSearchParams] = useSearchParams()
  const view = parseDashboardView(searchParams.get('view'))
  const demographicFilters = { sex: parseSex(searchParams.get('sex')), gradeLevel: searchParams.get('grade') || null }
  const filterLabel = [
    demographicFilters.sex === 'female' ? 'Female' : demographicFilters.sex === 'male' ? 'Male' : null,
    demographicFilters.gradeLevel,
  ]
    .filter(Boolean)
    .join(' × ')
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
    `${range.preset}|${range.from}|${range.to}|${demographicFilters.sex ?? ''}|${demographicFilters.gradeLevel ?? ''}`,
    () => fetchDashboardSummary({ range, ...demographicFilters }),
  )
  // For the stat card's count and the printout's list; Admin/Principal can't open excuse letters.
  const letters = useAsyncData(`dashboard-pending-excuse-letters|${viewer.role}`, () =>
    viewer.role === 'staff' ? fetchPendingExcuseLetters() : Promise.resolve([]),
  )

  // After every hook: an early return above them would change the hook order between renders.
  if (searchParams.get('view') === 'calendar') return <Navigate to={paths.calendar} replace />

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

  function changeDemographicFilters(next: typeof demographicFilters) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      if (next.sex) params.set('sex', next.sex)
      else params.delete('sex')
      if (next.gradeLevel) params.set('grade', next.gradeLevel)
      else params.delete('grade')
      return params
    }, { replace: true })
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

  // The overview tab flags actionable follow-ups, inventory attention, and incomplete records.
  const alertCount = data
    ? data.dueFollowUps.length + data.inventoryAlerts.length + data.counts.pendingRecords
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
              // Visible from every view, so alerts are not missed while on Trends.
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
                <StatCardRowSkeleton />,
                (d) => (
                  <>
                    <StatCardRow
                      summary={d}
                      range={range}
                      canNavigate={canNavigate}
                      pendingLetterCount={letters.data?.length ?? 0}
                    />
                    <AttentionChips summary={d} canNavigate={canNavigate} />
                    <section aria-label="Frequent visitor warnings">
                      <FrequentVisitorsAlert summary={d} range={range} canNavigate={canNavigate} />
                    </section>
                  </>
                ),
              ),
            },
            {
              value: 'trends',
              label: 'Trends',
              icon: 'activity',
              panel: summaryPanel('Loading trends…', <ComplaintTrendsSkeleton />, (d) => (
                <>
                  {filterLabel && <p role="status" className="w-fit rounded-full bg-surface px-3 py-1 text-sm font-semibold text-text-primary">Filtered: {filterLabel} <button type="button" className="ml-1 cursor-pointer rounded-sm underline underline-offset-2 transition-colors hover:text-brand-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none" onClick={() => changeDemographicFilters({ sex: null, gradeLevel: null })}>Clear</button></p>}
                  <ComplaintTrends trends={d.complaintTrends} demographics={d.demographics} filters={demographicFilters} onFiltersChange={changeDemographicFilters} />
                </>
              )),
            },
          ]}
        />
      </div>
      {data && (
        <DashboardPrint
          summary={data}
          range={range}
          viewer={viewer}
          filterLabel={filterLabel}
          letters={viewer.role === 'staff' ? (letters.data ?? []) : undefined}
        />
      )}
    </div>
  )
}
