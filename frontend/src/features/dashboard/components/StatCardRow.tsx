import {
  StatCard,
  StatCardSkeleton,
  TitleLink,
  type IconName,
  type StatTone,
  type StatTrend,
} from '../../../components'
import { rangeLengthDays, type DateRange } from '../../../lib/dateRange'
import { paths } from '../../../routes/paths'
import type { DashboardSummary } from '../../../types/dashboard'

/**
 * Icon, label, and accent per card, shared by the loaded cards and their skeletons so the two never
 * drift. Accents follow the reference mockup and each color's single meaning: brand = routine
 * activity, error = emergencies, warning = needs attention, neutral = plain count.
 */
const CARDS = {
  visits: { icon: 'activity', label: 'Clinic visits', tone: 'brand' },
  incidents: { icon: 'alertTriangle', label: 'Incidents', tone: 'error' },
  pending: { icon: 'clipboardList', label: 'Incomplete records', tone: 'warning' },
  lowStock: { icon: 'package', label: 'Low-stock items', tone: 'warning' },
  students: { icon: 'users', label: 'Active students', tone: 'neutral' },
} satisfies Record<string, { icon: IconName; label: string; tone: StatTone }>

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'

export function StatCardRowSkeleton() {
  return (
    <ul aria-hidden="true" className={GRID}>
      {Object.values(CARDS).map((c) => (
        <li key={c.label} className="flex">
          <StatCardSkeleton icon={c.icon} label={c.label} tone={c.tone} />
        </li>
      ))}
    </ul>
  )
}

function trendFor(current: number, previous: number, range: DateRange): StatTrend {
  const days = rangeLengthDays(range)
  const period = days === 1 ? 'prior day' : `prior ${days} days`
  if (previous === 0) {
    return current === 0
      ? { direction: 'flat', text: `No change vs ${period}` }
      : { direction: 'up', text: `Up from 0 (${period})` }
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return { direction: 'flat', text: `No change vs ${period}` }
  return {
    direction: pct > 0 ? 'up' : 'down',
    text: `${Math.abs(pct)}% vs ${period}`,
  }
}

/**
 * Five cards: visits, incidents, pending/incomplete records, low-stock items, active students.
 * This covers Reference 1's four cards plus Module 9's "active students" (confirmed with the team,
 * 2026-09-26, ADR-011). Range-scoped cards compare against the previous equal period (the header
 * shows which period); the others say "Current".
 */
export function StatCardRow({
  summary,
  range,
  canNavigate,
}: {
  summary: DashboardSummary
  range: DateRange
  canNavigate: boolean
}) {
  const { counts, previousCounts } = summary
  // No trend without a fair previous period (the All range, or one reaching back before any record).
  const noComparison = range.preset === 'all' ? 'All records' : 'No earlier records to compare'
  // The Alerts list also holds items that are only expiring or expired; say so, so the counts match up.
  const expiringOnly = summary.inventoryAlerts.filter((row) => !row.flags.includes('low_stock')).length
  const cards = [
    {
      to: paths.visits,
      card: (
        <StatCard
          icon={CARDS.visits.icon}
          label={CARDS.visits.label}
          tone={CARDS.visits.tone}
          value={counts.visits}
          trend={previousCounts ? trendFor(counts.visits, previousCounts.visits, range) : undefined}
          scope={previousCounts ? undefined : noComparison}
          labelAction={
            canNavigate ? <TitleLink to={paths.visits}>{CARDS.visits.label}</TitleLink> : undefined
          }
        />
      ),
    },
    {
      to: paths.incidents,
      card: (
        <StatCard
          icon={CARDS.incidents.icon}
          label={CARDS.incidents.label}
          tone={CARDS.incidents.tone}
          value={counts.incidents}
          trend={previousCounts ? trendFor(counts.incidents, previousCounts.incidents, range) : undefined}
          scope={previousCounts ? undefined : noComparison}
          footnote={
            counts.incidentsAtStage1 > 0
              ? `${counts.incidentsAtStage1} still at Stage 1`
              : undefined
          }
          labelAction={
            canNavigate ? <TitleLink to={paths.incidents}>{CARDS.incidents.label}</TitleLink> : undefined
          }
        />
      ),
    },
    {
      to: paths.incompleteRecords,
      card: (
        <StatCard
          icon={CARDS.pending.icon}
          label={CARDS.pending.label}
          tone={CARDS.pending.tone}
          value={counts.pendingRecords}
          scope="Current · missing required fields"
          labelAction={
            canNavigate ? <TitleLink to={paths.incompleteRecords}>{CARDS.pending.label}</TitleLink> : undefined
          }
        />
      ),
    },
    {
      to: paths.inventory,
      card: (
        <StatCard
          icon={CARDS.lowStock.icon}
          label={CARDS.lowStock.label}
          tone={CARDS.lowStock.tone}
          value={counts.lowStockItems}
          scope="Current · below threshold"
          footnote={
            expiringOnly > 0
              ? `${expiringOnly} more expiring or expired in the Alerts list`
              : undefined
          }
          labelAction={
            canNavigate ? <TitleLink to={paths.inventory}>{CARDS.lowStock.label}</TitleLink> : undefined
          }
        />
      ),
    },
    {
      to: paths.students,
      card: (
        <StatCard
          icon={CARDS.students.icon}
          label={CARDS.students.label}
          tone={CARDS.students.tone}
          value={counts.activeStudents}
          scope="Current · excludes archived"
          labelAction={
            canNavigate ? <TitleLink to={paths.students}>{CARDS.students.label}</TitleLink> : undefined
          }
        />
      ),
    },
  ]
  return (
    <section aria-label="Summary counts">
      <ul className={GRID}>
        {cards.map(({ to, card }) => (
          <li key={to} className="flex">
            {card}
          </li>
        ))}
      </ul>
    </section>
  )
}
