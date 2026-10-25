import {
  StatCard,
  StatCardSkeleton,
  TitleLink,
  type IconName,
  type StatTone,
} from '../../../components'
import type { DateRange } from '../../../lib/dateRange'
import { trendFor } from '../lib/statTrend'
import { paths } from '../../../routes/paths'
import type { DashboardSummary } from '../../../types/dashboard'

const CARDS = {
  visits: { icon: 'activity', label: 'Clinic visits', tone: 'brand' },
  incidents: { icon: 'alertTriangle', label: 'Incidents', tone: 'error' },
  students: { icon: 'users', label: 'Active students', tone: 'brand' },
  letters: { icon: 'fileText', label: 'Pending excuse letters', tone: 'warning' },
  followUps: { icon: 'calendarClock', label: 'Due & overdue follow-ups', tone: 'warning' },
} satisfies Record<string, { icon: IconName; label: string; tone: StatTone }>

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5'

export function StatCardRowSkeleton() {
  return (
    <ul aria-hidden="true" className={GRID}>
      {Object.values(CARDS).map((card) => (
        <li key={card.label} className="flex">
          <StatCardSkeleton icon={card.icon} label={card.label} tone={card.tone} />
        </li>
      ))}
    </ul>
  )
}

/** The Dashboard's first scan: care activity, active students, pending letters, and follow-ups. */
export function StatCardRow({
  summary,
  range,
  canNavigate,
  pendingLetterCount,
}: {
  summary: DashboardSummary
  range: DateRange
  canNavigate: boolean
  pendingLetterCount: number
}) {
  const { counts, previousCounts } = summary
  const noComparison = range.preset === 'all' ? 'All records' : 'No earlier records to compare'
  const overdue = summary.dueFollowUps.filter((row) => row.daysFromToday < 0).length
  // Same order as the sidebar: Students, Visits (and their excuse letters), Incidents, Follow-Ups.
  // Students and Incidents link for both roles (ADR-038); the rest only for Staff (`canNavigate`).
  const cards = [
    {
      key: 'students',
      card: <StatCard icon={CARDS.students.icon} label={CARDS.students.label} tone={CARDS.students.tone} value={counts.activeStudents} scope="Current · excludes archived" labelAction={<TitleLink to={paths.students}>{CARDS.students.label}</TitleLink>} />,
    },
    {
      key: 'visits',
      card: <StatCard icon={CARDS.visits.icon} label={CARDS.visits.label} tone={CARDS.visits.tone} value={counts.visits} trend={previousCounts ? trendFor(counts.visits, previousCounts.visits, range, summary.percentMinPriorCount) : undefined} scope={previousCounts ? undefined : noComparison} footnote="Visits only; incidents are counted separately" labelAction={canNavigate ? <TitleLink to={paths.visitsInRange(range.from, range.to)}>{CARDS.visits.label}</TitleLink> : undefined} />,
    },
    {
      key: 'letters',
      card: <StatCard icon={CARDS.letters.icon} label={CARDS.letters.label} tone={CARDS.letters.tone} value={pendingLetterCount} scope="Current · awaiting approval" labelAction={canNavigate ? <TitleLink to={paths.visitsWithPendingLetter}>{CARDS.letters.label}</TitleLink> : undefined} />,
    },
    {
      key: 'incidents',
      card: <StatCard icon={CARDS.incidents.icon} label={CARDS.incidents.label} tone={CARDS.incidents.tone} value={counts.incidents} trend={previousCounts ? trendFor(counts.incidents, previousCounts.incidents, range, summary.percentMinPriorCount) : undefined} scope={previousCounts ? undefined : noComparison} footnote={counts.incidentsAtStage1 > 0 ? `${counts.incidentsAtStage1} still at Stage 1` : undefined} labelAction={<TitleLink to={paths.incidentsInRange(range.from, range.to)}>{CARDS.incidents.label}</TitleLink>} />,
    },
    {
      key: 'follow-ups',
      card: <StatCard icon={CARDS.followUps.icon} label={CARDS.followUps.label} tone={CARDS.followUps.tone} value={summary.dueFollowUps.length} scope={overdue ? `${overdue} overdue` : 'None overdue'} labelAction={canNavigate ? <TitleLink to={paths.followUps}>{CARDS.followUps.label}</TitleLink> : undefined} />,
    },
  ]

  return (
    <section aria-label="Summary counts">
      <ul className={GRID}>
        {cards.map(({ key, card }) => <li key={key} className="flex">{card}</li>)}
      </ul>
    </section>
  )
}
