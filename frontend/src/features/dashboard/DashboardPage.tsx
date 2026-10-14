import { useState } from 'react'
import { Card, ErrorState } from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { cn } from '../../lib/cn'
import { todayISO } from '../../lib/dates'
import { getMockSessionUser, type SessionUser } from '../../lib/mock-db'
import { rangeForPreset, type DateRange } from '../../lib/dateRange'
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
import { StaffShortcuts } from './components/StaffShortcuts'
import { StatCardRow, StatCardRowSkeleton } from './components/StatCardRow'
import { VisitCalendar } from './components/VisitCalendar'

/**
 * First-load skeleton: each section's own shaped placeholder in the same grid positions as the
 * loaded page, so nothing shifts when data arrives (Design-System.md, Feedback & System States).
 * The calendar isn't here because it loads independently and shows its own view-shaped skeleton.
 */
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <StatCardRowSkeleton />
      <AlertListsSkeleton />
      <ComplaintTrendsSkeleton />
    </div>
  )
}

/**
 * Clinic Overview Dashboard (Screen Inventory #31, Reference 1, Module 9).
 * Staff and Admin/Principal see the same layout, except the header greeting and a Staff-only strip
 * with the "New Visit" shortcut and backup-status indicator (Screen #4; ADR-011 amendment). It's
 * view-only for both: no create, update, or delete happens here, so there are no audit-log writes.
 *
 * Top to bottom: header → date-range filter → Staff shortcuts → stat cards → three alert groups → complaint trends →
 * calendar. The export/print button sits in the header. Every data section shows a skeleton shaped
 * like itself on first load; later refetches keep the previous render dimmed instead.
 */
export function DashboardPage({ viewer = getMockSessionUser() }: { viewer?: SessionUser }) {
  const today = todayISO()
  // A summary view opens on the current month; operational logs keep the All default.
  const [range, setRange] = useState<DateRange>(() => rangeForPreset('thisMonth', today))
  const canNavigate = viewer.role === 'staff'

  const { data, status, isRefetching, reload } = useAsyncData(
    // The preset is part of the key: the trend's bucket size depends on it, not only the dates.
    `${range.preset}|${range.from}|${range.to}`,
    () => fetchDashboardSummary({ range }),
  )

  return (
    // Block flow in print: in a flex column, a card pushed to the next page by break-inside-avoid
    // doesn't move the following section down, so the Calendar printed over Common complaints.
    <div className="mx-auto flex max-w-page-wide flex-col gap-6 px-4 pt-10 pb-8 sm:px-8 print:block print:space-y-6">
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

      {viewer.role === 'staff' && <StaffShortcuts />}

      {status === 'error' ? (
        <ErrorState title="Unable to load the clinic overview." onRetry={reload} />
      ) : status === 'loading' && !data ? (
        <>
          <p className="sr-only" role="status">
            Loading clinic overview…
          </p>
          <DashboardSkeleton />
        </>
      ) : data ? (
        <div
          aria-busy={isRefetching}
          className={cn(
            'flex flex-col gap-6 transition-opacity motion-reduce:transition-none print:block print:space-y-6',
            isRefetching && 'opacity-60',
          )}
        >
          <StatCardRow summary={data} range={range} canNavigate={canNavigate} />

          <section aria-label="Alerts" className={ALERT_GRID}>
            <FollowUpsAlert summary={data} canNavigate={canNavigate} />
            <FrequentVisitorsAlert summary={data} range={range} canNavigate={canNavigate} />
            <InventoryAlert summary={data} canNavigate={canNavigate} />
          </section>

          {viewer.role === 'staff' && <PendingExcuseLetters />}

          <ComplaintTrends trends={data.complaintTrends} />
        </div>
      ) : null}

      {/* Separate data source: loads in parallel with its own skeleton, and fails/retries on its own. */}
      <VisitCalendar today={today} initialAnchor={range.to} canNavigate={canNavigate} />
    </div>
  )
}
