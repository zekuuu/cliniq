import { useState, type ReactNode } from 'react'
import { formatDate } from '../../lib/dates'
import {
  BackButton,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Icon,
  Modal,
  Select,
  Skeleton,
  DataTable,
  type DataTableColumn,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { paths } from '../../routes/paths'
import { getMockSessionUser } from '../../lib/mock-db'
import { sortTableRows, toggleTableSort, type TableSortState } from '../../lib/tableSort'
import type { FollowUpStatus } from '../../types/entities'
import { fetchFollowUps, updateFollowUpStatus, type FollowUpRow } from './api/followUpApi'
import { MaskedLrn } from '../../components/ui/MaskedLrn'
import { lrnLabel } from '../../lib/lrn'

function FollowUpSkeleton({ back }: { back: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <Card aria-hidden="true" className="p-5">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      </Card>
      <Card aria-hidden="true" className="p-5">
        <Skeleton className="h-10 w-44" />
        <Skeleton className="mt-5 h-56 w-full" />
      </Card>
    </div>
  )
}

function statusBadge(status: FollowUpStatus) {
  const tone =
    status === 'completed'
      ? 'info'
      : status === 'missed'
        ? 'error'
        : status === 'cancelled'
          ? 'neutral'
          : 'warning'
  return (
    // Neutral has no default icon; Cancelled still gets one so every status is icon + label.
    <Badge tone={tone} variant="soft" icon={status === 'cancelled' ? 'xCircle' : undefined}>
      {status[0].toUpperCase() + status.slice(1)}
    </Badge>
  )
}

/** Pending → one of three equal outcomes (Module-Overview: "Mark a follow-up Completed, Missed, or Cancelled"). */
const OUTCOME_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'missed', label: 'Missed' },
  { value: 'cancelled', label: 'Cancelled' },
]

type FollowUpSortKey = 'student' | 'reason' | 'due' | 'status'

export function FollowUpListPage() {
  const [statusFilter, setStatusFilter] = useState<'' | FollowUpStatus>('')
  const [statusOverrides, setStatusOverrides] = useState<Record<string, FollowUpStatus>>({})
  const [confirming, setConfirming] = useState<null | { item: FollowUpRow; status: 'missed' | 'cancelled' }>(null)
  const [sort, setSort] = useState<TableSortState<FollowUpSortKey>>({ key: 'status', direction: 'ascending' })
  const { data, status, reload } = useAsyncData(statusFilter, () => fetchFollowUps(statusFilter))
  // A top-level list shows Back only when a drill-through link opened it (the Dashboard).
  const back = <BackButton fallback={paths.dashboard} drillThroughOnly />
  if (status === 'error')
    return (
      <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState title="Unable to load follow-ups." onRetry={reload} />
      </div>
    )
  if (!data)
    return (
      <>
        <p className="sr-only" role="status">
          Loading follow-ups...
        </p>
        <FollowUpSkeleton back={back} />
      </>
    )
  const rows = data.map((item) => ({ ...item, status: statusOverrides[item.id] ?? item.status }))
  const sortColumn = (key: FollowUpSortKey, label: string) => ({
    label,
    direction: sort.key === key ? sort.direction : undefined,
    onSort: () => setSort((current) => toggleTableSort(current, key)),
  })
  const sortedRows = sortTableRows(rows, sort, (item, key) => {
    if (key === 'student') return item.lrn
    if (key === 'reason') return item.reason
    if (key === 'due') return item.followUpDate
    return item.status
  })
  async function applyStatus(item: FollowUpRow, next: FollowUpStatus) {
    // Optimistic: the row flips immediately; the data layer writes the status and its audit entry.
    setStatusOverrides((current) => ({ ...current, [item.id]: next }))
    setConfirming(null)
    await updateFollowUpStatus(item.id, next, getMockSessionUser())
  }
  function chooseStatus(item: FollowUpRow, next: string) {
    // Completed is the expected outcome and applies at once. Missed and Cancelled close the
    // follow-up without the student being seen, so they ask first.
    if (next === 'completed') void applyStatus(item, 'completed')
    else if (next === 'missed' || next === 'cancelled') setConfirming({ item, status: next })
  }
  const columns: Array<DataTableColumn<FollowUpRow>> = [
    {
      key: 'student',
      header: 'LRN',
      rowHeader: true,
      sort: sortColumn('student', 'LRN'),
      cell: (item) => <MaskedLrn lrn={item.lrn} />,
    },
    { key: 'reason', header: 'Reason', sort: sortColumn('reason', 'Reason'), cell: (item) => item.reason },
    { key: 'due', header: 'Due date', sort: sortColumn('due', 'Due date'), cell: (item) => formatDate(item.followUpDate) },
    { key: 'status', header: 'Status', sort: sortColumn('status', 'Status'), cell: (item) => statusBadge(item.status) },
    {
      key: 'actions',
      header: 'Actions',
      cell: (item) =>
        item.status === 'pending' ? (
          <Select
            className="w-44"
            size="sm"
            hideLabel
            label={`Update status for ${lrnLabel(item.lrn)}, ${item.reason}`}
            value=""
            placeholder="Update status"
            options={OUTCOME_OPTIONS}
            onChange={(value) => chooseStatus(item, value)}
          />
        ) : (
          '—'
        ),
    },
  ]
  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <Card className="p-5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Follow-Ups</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Review upcoming care tasks and close the loop on student follow-up plans.
        </p>
      </Card>
      <Card aria-labelledby="follow-up-list-title">
        <CardHeader
          titleId="follow-up-list-title"
          title="Follow-up tasks"
          description={`${rows.length} task${rows.length === 1 ? '' : 's'} shown`}
          icon={<Icon name="calendarClock" />}
          actions={
            <Select
              className="w-full sm:w-auto"
              label="Status"
              inline
              value={statusFilter}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'completed', label: 'Completed' },
                { value: 'missed', label: 'Missed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              placeholder="All statuses"
              clearable
              onChange={(value) => setStatusFilter(value as '' | FollowUpStatus)}
            />
          }
        />
        <CardBody>
          {rows.length ? (
            <DataTable
              caption="Follow-up tasks"
              columns={columns}
              rows={sortedRows}
              rowKey={(item) => item.id}
              fixedLayout
              minTableWidth="60rem"
            />
          ) : (
            <EmptyState
              icon="calendarClock"
              title="No follow-ups found"
              description="Try a different status filter."
            />
          )}
        </CardBody>
      </Card>
      <Modal
        open={confirming !== null}
        title={confirming?.status === 'missed' ? 'Mark this follow-up as Missed?' : 'Cancel this follow-up?'}
        onClose={() => setConfirming(null)}
      >
        {confirming && (
          <>
            <p className="text-sm text-text-secondary">
              <MaskedLrn lrn={confirming.item.lrn} /> · {confirming.item.reason} · due {formatDate(confirming.item.followUpDate)}.{' '}
              {confirming.status === 'missed'
                ? 'The student did not return for this follow-up.'
                : 'This follow-up is no longer needed.'}{' '}
              It can't be changed back from this screen.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="neutral" data-autofocus onClick={() => setConfirming(null)}>
                Keep Pending
              </Button>
              <Button variant="primary" onClick={() => void applyStatus(confirming.item, confirming.status)}>
                {confirming.status === 'missed' ? 'Mark as Missed' : 'Cancel Follow-Up'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
