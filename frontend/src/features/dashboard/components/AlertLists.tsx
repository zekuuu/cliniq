import {
  inventoryFlagMap,
  stockQuantityText,
  followUpDueMap,
  frequentVisitorMap,
  ListCard,
  ListCardSkeleton,
  ListRow,
  ListItemLink,
  StatusBadge,
} from '../../../components'
import { formatDate } from '../../../lib/dates'
import { describeRange, type DateRange } from '../../../lib/dateRange'
import { paths } from '../../../routes/paths'
import type { DashboardSummary, DueFollowUpRow, InventoryAlertRow } from '../../../types/dashboard'

/*
 * The three alert groups (Reference 1, item 3). All three are read-only: no resolve or complete
 * actions here, for Staff or Admin (Module 9: the dashboard is view-only). Follow-up status
 * changes happen on the Follow-Up List (#18c).
 *
 * Display-privacy (ADR-004): multi-student lists show the Student Number, never the name. The
 * row data can't carry a name (see `StudentListRef`). Showing the follow-up reason next to the
 * Student Number follows ADR-010.
 */

/** Titles + icons shared by the loaded lists and their skeletons. */
const LISTS = {
  followUps: { title: 'Due & upcoming follow-ups', icon: 'calendarClock' },
  frequent: { title: 'Frequent-visitor warnings', icon: 'repeat' },
  inventory: { title: 'Low-stock & expiring items', icon: 'package' },
} as const

// Print lifts each list's height cap (ListCard), so rows must size to their content there too;
// a fixed 26rem row would let full lists spill over the trends row below.
export const ALERT_GRID =
  'grid grid-cols-1 items-stretch gap-4 lg:auto-rows-[26rem] lg:grid-cols-3 print:auto-rows-auto'
const ALERT_LIST_HEIGHT = 'max-h-80 lg:max-h-none'

export function AlertListsSkeleton() {
  return (
    <div aria-hidden="true" className={ALERT_GRID}>
      <ListCardSkeleton {...LISTS.followUps} maxHeightClass={ALERT_LIST_HEIGHT} />
      <ListCardSkeleton
        {...LISTS.frequent}
        withSecondary={false}
        maxHeightClass={ALERT_LIST_HEIGHT}
      />
      <ListCardSkeleton {...LISTS.inventory} maxHeightClass={ALERT_LIST_HEIGHT} />
    </div>
  )
}

function dueText(row: DueFollowUpRow): string {
  const date = formatDate(row.followUp.followUpDate)
  if (row.daysFromToday < 0) {
    const n = -row.daysFromToday
    return `${date} (${n} ${n === 1 ? 'day' : 'days'} ago)`
  }
  if (row.daysFromToday === 0) return `${date} (today)`
  return `${date} (in ${row.daysFromToday} ${row.daysFromToday === 1 ? 'day' : 'days'})`
}

export function FollowUpsAlert({
  summary,
  canNavigate,
}: {
  summary: DashboardSummary
  canNavigate: boolean
}) {
  const rows = summary.dueFollowUps
  return (
    <ListCard
      title={LISTS.followUps.title}
      icon={LISTS.followUps.icon}
      count={rows.length}
      titleTo={canNavigate ? paths.followUps : undefined}
      maxHeightClass={ALERT_LIST_HEIGHT}
      description={`Overdue, due today, or due in the next ${summary.upcomingWindowDays} days. Counted from today.`}
      empty={{
        title: 'No follow-ups due',
        description: `Nothing is overdue, due today, or due in the next ${summary.upcomingWindowDays} days.`,
      }}
    >
      {rows.map((row) => (
        <ListRow
          key={row.followUp.id}
          primary={canNavigate ? <ListItemLink to={paths.studentProfile(row.student.studentNumber)}>{row.student.studentNumber}</ListItemLink> : row.student.studentNumber}
          secondary={row.followUp.reason}
          meta={<time dateTime={row.followUp.followUpDate}>{dueText(row)}</time>}
          trailing={<StatusBadge status={row.dueState} map={followUpDueMap} />}
        />
      ))}
    </ListCard>
  )
}

export function FrequentVisitorsAlert({
  summary,
  range,
  canNavigate,
}: {
  summary: DashboardSummary
  range: DateRange
  canNavigate: boolean
}) {
  const rows = summary.frequentVisitors
  const scope = describeRange(range).toLowerCase()
  return (
    <ListCard
      title={LISTS.frequent.title}
      icon={LISTS.frequent.icon}
      count={rows.length}
      maxHeightClass={ALERT_LIST_HEIGHT}
      description={`${summary.frequentVisitorMinVisits}+ visits (${scope}). A warning only, not a diagnosis.`}
      empty={{
        title: 'No frequent-visitor warnings',
        description: `No student reached ${summary.frequentVisitorMinVisits} visits in this date range.`,
      }}
    >
      {rows.map((row) => (
        <ListRow
          key={row.student.id}
          primary={canNavigate ? <ListItemLink to={paths.studentProfile(row.student.studentNumber)}>{row.student.studentNumber}</ListItemLink> : row.student.studentNumber}
          secondary={`${row.visitCount} visits`}
          trailing={<StatusBadge status="frequent_visits" map={frequentVisitorMap} />}
        />
      ))}
    </ListCard>
  )
}

function expiryLabel(row: InventoryAlertRow): string | undefined {
  if (row.daysUntilExpiry === null) return undefined
  const n = Math.abs(row.daysUntilExpiry)
  const days = `${n} ${n === 1 ? 'day' : 'days'}`
  if (row.daysUntilExpiry < 0) return `Expired ${days} ago`
  if (row.daysUntilExpiry === 0) return 'Expires today'
  return `Expires in ${days}`
}

export function InventoryAlert({
  summary,
  canNavigate,
}: {
  summary: DashboardSummary
  canNavigate: boolean
}) {
  const rows = summary.inventoryAlerts
  return (
    <ListCard
      title={LISTS.inventory.title}
      icon={LISTS.inventory.icon}
      count={rows.length}
      className="@container"
      titleTo={canNavigate ? paths.inventory : undefined}
      maxHeightClass={ALERT_LIST_HEIGHT}
      description="Current stock. Low stock and expiry are separate flags."
      empty={{
        title: 'No inventory alerts',
        description: 'Every item is above its low-stock threshold and not close to expiring.',
      }}
    >
      {rows.map((row) => (
        <ListRow
          key={row.item.id}
          primary={canNavigate ? <ListItemLink to={paths.inventory}>{row.item.name}</ListItemLink> : row.item.name}
          secondary={`${stockQuantityText(row.item.currentStock, row.item.unit, row.flags)}${row.flags.includes('expired') ? '' : ' in stock'} · threshold ${row.item.lowStockThreshold}`}
          trailing={
            <div className="flex flex-wrap justify-end gap-1 @max-[28rem]:flex-col @max-[28rem]:flex-nowrap @max-[28rem]:items-end">
              {row.flags.map((flag) => (
                <StatusBadge
                  key={flag}
                  status={flag}
                  map={inventoryFlagMap}
                  label={flag === 'low_stock' ? undefined : expiryLabel(row)}
                />
              ))}
            </div>
          }
        />
      ))}
    </ListCard>
  )
}
