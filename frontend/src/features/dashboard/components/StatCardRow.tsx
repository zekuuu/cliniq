import { splitText } from '../../../lib/patients'
import { StatCard, StatCardSkeleton, type IconName, type StatTone } from '../../../components'
import type { DateRange } from '../../../lib/dateRange'
import { trendFor } from '../lib/statTrend'
import { paths } from '../../../routes/paths'
import type { DashboardSummary } from '../../../types/dashboard'

const CARDS = {
  unfinished: { icon: 'alertTriangle', label: 'Unfinished incident records', tone: 'unfinished' },
  followUps: { icon: 'calendarClock', label: 'Follow-ups to review', tone: 'follow-up' },
  letters: { icon: 'fileText', label: 'Pending excuse letters', tone: 'letter' },
  visits: { icon: 'activity', label: 'Clinic visits', tone: 'brand' },
  incidents: { icon: 'alertTriangle', label: 'Incidents', tone: 'error' },
  students: { icon: 'users', label: 'Active students', tone: 'active' },
} satisfies Record<string, { icon: IconName; label: string; tone: StatTone }>

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'

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

/** What the clinician should do today. Only Staff can act on these, so the Admin gets none (ADR-038). */
export function AttentionCards({ summary, pendingLetterCount }: { summary: DashboardSummary; pendingLetterCount: number }) {
  const { incidentsAwaitingStage2 } = summary.counts
  const overdue = summary.dueFollowUps.filter((row) => row.daysFromToday < 0).length
  return (
    <ul className={GRID}>
      <li className="flex"><StatCard {...CARDS.unfinished} value={incidentsAwaitingStage2} scope="Current · Stage 2 not done" to={`${paths.incidents}?completion=needs_completion`} /></li>
      <li className="flex"><StatCard {...CARDS.followUps} value={summary.dueFollowUps.length} scope={overdue ? `${overdue} overdue` : 'None overdue'} to={paths.followUps} /></li>
      <li className="flex"><StatCard {...CARDS.letters} value={pendingLetterCount} scope="Current · awaiting approval" to={paths.visitsWithPendingLetter} /></li>
    </ul>
  )
}

/** The period's totals. Students and Incidents link for both roles (ADR-038); Visits only for Staff. */
export function ActivityCards({ summary, range, canNavigate }: { summary: DashboardSummary; range: DateRange; canNavigate: boolean }) {
  const { counts, previousCounts } = summary
  const noComparison = range.preset === 'all' ? 'All records' : 'No earlier records to compare'
  return (
    <ul className={GRID}>
      <li className="flex"><StatCard {...CARDS.visits} value={counts.visits} trend={previousCounts ? trendFor(counts.visits, previousCounts.visits, range, summary.percentMinPriorCount) : undefined} scope={previousCounts ? undefined : noComparison} footnote={`${splitText(counts.split.visits)}. Incidents are counted separately.`} to={canNavigate ? paths.visitsInRange(range.from, range.to) : undefined} /></li>
      <li className="flex"><StatCard {...CARDS.incidents} value={counts.incidents} trend={previousCounts ? trendFor(counts.incidents, previousCounts.incidents, range, summary.percentMinPriorCount) : undefined} scope={previousCounts ? undefined : noComparison} footnote={[splitText(counts.split.incidents), counts.incidentsAtStage1 > 0 && `${counts.incidentsAtStage1} still at Stage 1`].filter(Boolean).join(' · ')} to={paths.incidentsInRange(range.from, range.to)} /></li>
      <li className="flex"><StatCard {...CARDS.students} value={counts.activeStudents} scope="Current · excludes archived" to={paths.students} /></li>
    </ul>
  )
}
