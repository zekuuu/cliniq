import {
  Button,
  inventoryFlagMap,
  stockQuantityText,
  followUpDueMap,
  ListCard,
  ListCardSkeleton,
  ListRow,
  ListItemLink,
  StatusBadge,
} from '../../../components'
import { useState } from 'react'
import { describeRange, type DateRange } from '../../../lib/dateRange'
import { paths } from '../../../routes/paths'
import type { DashboardSummary } from '../../../types/dashboard'
import { dueText, expiryLabel } from '../lib/alerts'
import { MaskedLrn } from '../../../components/ui/MaskedLrn'

/*
 * The three alert groups (Reference 1, item 3). All three are read-only: no resolve or complete
 * actions here, for Staff or Admin (Module 9: the dashboard is view-only). Follow-up status
 * changes happen on the Follow-Up List (#18c).
 *
 * Display-privacy (ADR-004, ADR-028): multi-student lists show the masked LRN, never the name. The
 * row data can't carry a name (see `StudentListRef`). Showing the follow-up reason next to the
 * LRN follows ADR-010.
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
          primary={<ListItemLink to={paths.studentProfile(row.student.id)}><MaskedLrn lrn={row.student.lrn} /></ListItemLink>}
          secondary={row.followUp.reason}
          meta={<time dateTime={row.followUp.followUpDate}>{dueText(row)}</time>}
          trailing={<StatusBadge status={row.dueState} map={followUpDueMap} />}
        />
      ))}
    </ListCard>
  )
}

/** How many frequent visitors the Overview lists before "Show all". */
const FREQUENT_VISITORS_SHOWN = 5

export function FrequentVisitorsAlert({
  summary,
  range,
}: {
  summary: DashboardSummary
  range: DateRange
}) {
  // Zean (October 25, 2026): the panel is back, but shows only the students with the most visits
  // until "Show all" (the list is already sorted most visits first). The count badge keeps the total.
  const [showAll, setShowAll] = useState(false)
  const rows = showAll ? summary.frequentVisitors : summary.frequentVisitors.slice(0, FREQUENT_VISITORS_SHOWN)
  const hidden = summary.frequentVisitors.length - FREQUENT_VISITORS_SHOWN
  const scope = describeRange(range).toLowerCase()
  return (
    <ListCard
      title={LISTS.frequent.title}
      icon={LISTS.frequent.icon}
      count={summary.frequentVisitors.length}
      // The title keeps at least 14rem, so on a phone "Show all" drops below it instead of squeezing it.
      className="[&>div:first-child>div:first-child]:basis-56"
      actions={
        hidden > 0 && (
          <Button variant="secondary" size="sm" aria-expanded={showAll} onClick={() => setShowAll((current) => !current)}>
            {showAll ? `Show top ${FREQUENT_VISITORS_SHOWN}` : `Show all ${summary.frequentVisitors.length}`}
          </Button>
        )
      }
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
          primary={<ListItemLink to={paths.studentProfile(row.student.id)}><MaskedLrn lrn={row.student.lrn} /></ListItemLink>}
          secondary={`${row.visitCount} visits`}
        />
      ))}
    </ListCard>
  )
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
