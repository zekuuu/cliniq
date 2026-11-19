import { useState, type ReactNode } from 'react'
import { notify } from '../../lib/notify'
import { useSaveFeedback } from '../../hooks/useSaveFeedback'
import { usePatientFilter } from '../../hooks/usePatientFilter'
import { addDays, formatDate, todayISO } from '../../lib/dates'
import {
  BackButton,
  Badge,
  Button,
  Pagination,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Icon,
  DatePicker,
  Modal,
  Textarea,
  Select,
  Skeleton,
  DataTable,
  type DataTableColumn,
} from '../../components'
import { usePagedList } from '../../hooks/usePagedList'
import { paths } from '../../routes/paths'
import { getMockSessionUser } from '../../lib/data'
import { toggleTableSort } from '../../lib/tableSort'
import type { FollowUpStatus } from '../../types/entities'
import {
  fetchFollowUpPage,
  FOLLOW_UP_SORT_KEYS,
  setNewFollowUpDate,
  updateFollowUpStatus,
  type FollowUpRow,
  type FollowUpSortKey,
} from './api/followUpApi'
import { PatientFilterSelect, PatientNumber } from '../../components'
import { patientNumberLabel } from '../../lib/patients'

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

/** Words for the confirmation message. */
const FOLLOW_UP_STATUS_WORDS: Record<FollowUpStatus, string> = {
  completed: 'completed',
  missed: 'missed',
  cancelled: 'cancelled',
  pending: 'pending',
}

export function FollowUpListPage() {
  const [statusFilter, setStatusFilter] = useState<'' | FollowUpStatus>('')
  const [statusOverrides, setStatusOverrides] = useState<Record<string, FollowUpStatus>>({})
  // An inline row action: the row flips at once, a message confirms it, and a failure puts it back (useSaveFeedback).
  const feedback = useSaveFeedback()
  const [confirming, setConfirming] = useState<null | {
    item: FollowUpRow
    status: 'missed' | 'cancelled'
  }>(null)
  // Panel review FU-4: Cancelled needs a reason; Missed's is optional (Zean, November 8, 2026) and then offers "Set a new date".
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [rescheduling, setRescheduling] = useState<null | FollowUpRow>(null)
  const [newDate, setNewDate] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [patientFilter, setPatientFilter] = usePatientFilter()
  // One page at a time from the server; page and sort live in the address (ADR-082).
  const list = usePagedList({
    key: 'follow-ups',
    filters: { status: statusFilter, patient: patientFilter },
    sortKeys: FOLLOW_UP_SORT_KEYS,
    defaultSort: { key: 'status', direction: 'descending' },
    load: fetchFollowUpPage,
  })
  const { page: data, status, reload, sort } = list
  // A top-level list shows Back only when a drill-through link opened it (the Dashboard).
  const back = <BackButton fallback={paths.dashboard} drillThroughOnly />
  if (status === 'error')
    return (
      <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState asPageTitle title="Unable to load follow-ups." onRetry={reload} />
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
  // The page's rows, with a just-changed status shown at once (the save confirms it).
  const pageRows = data.rows.map((item) => ({
    ...item,
    status: statusOverrides[item.id] ?? item.status,
  }))
  const sortColumn = (key: FollowUpSortKey, label: string) => ({
    label,
    direction: sort.key === key ? sort.direction : undefined,
    onSort: () => list.setSort(toggleTableSort(sort, key)),
  })
  async function applyStatus(item: FollowUpRow, next: FollowUpStatus, why?: string) {
    // Optimistic: the row flips immediately; the data layer writes the status and its audit entry.
    setStatusOverrides((current) => ({ ...current, [item.id]: next }))
    setConfirming(null)
    const saved = await feedback.run(
      () => updateFollowUpStatus(item.id, next, getMockSessionUser(), why),
      {
        saved: `Follow-up marked ${FOLLOW_UP_STATUS_WORDS[next]}`,
      },
    )
    if (!saved.ok) {
      setStatusOverrides((current) =>
        Object.fromEntries(Object.entries(current).filter(([id]) => id !== item.id)),
      )
      return
    }
    if (next === 'missed' || next === 'cancelled') reload()
    if (next === 'missed') offerNewDate(item)
  }
  function offerNewDate(item: FollowUpRow) {
    setNewDate(addDays(todayISO(), 1))
    setRescheduling(item)
  }
  function confirmClosing() {
    if (!confirming) return
    if (confirming.status === 'cancelled' && !reason.trim()) {
      setReasonError('Give the reason.')
      notify.checkFields()
      return
    }
    void applyStatus(confirming.item, confirming.status, reason)
  }
  async function scheduleNewDate() {
    if (!rescheduling || !newDate) return
    setScheduling(true)
    try {
      await setNewFollowUpDate(rescheduling.id, newDate, getMockSessionUser())
      setRescheduling(null)
      notify.success('New follow-up date set', { id: 'follow-up-date' })
      reload()
    } catch (cause) {
      notify.apiError(cause, 'The new date was not set. Please try again.', {
        id: 'follow-up-date',
      })
    } finally {
      setScheduling(false)
    }
  }
  function chooseStatus(item: FollowUpRow, next: string) {
    // Completed is the expected outcome and applies at once. Missed and Cancelled close the
    // follow-up without the student being seen, so they ask first.
    if (next === 'completed') void applyStatus(item, 'completed')
    else if (next === 'missed' || next === 'cancelled') {
      setReason('')
      setReasonError('')
      setConfirming({ item, status: next })
    }
  }
  const columns: Array<DataTableColumn<FollowUpRow>> = [
    {
      key: 'student',
      header: 'LRN or Staff No.',
      width: '14rem',
      rowHeader: true,
      sort: sortColumn('student', 'LRN or Staff No.'),
      cell: (item) => <PatientNumber patient={item.patient} />,
    },
    {
      key: 'reason',
      header: 'Reason',
      sort: sortColumn('reason', 'Reason'),
      cell: (item) => (
        <div>
          {item.reason}
          {/* ADR-049 (D5): the clinician's "Stay home until cleared", with her note. */}
          {item.stayHomeUntilCleared && (
            <p className="mt-1 text-xs font-semibold text-text-primary">
              Stay home until cleared{item.stayHomeNote ? `: ${item.stayHomeNote}` : ''}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'due',
      header: 'Due date',
      width: '8.5rem',
      sort: sortColumn('due', 'Due date'),
      cell: (item) => formatDate(item.followUpDate),
    },
    {
      key: 'status',
      header: 'Status',
      width: '12rem',
      sort: sortColumn('status', 'Status'),
      cell: (item) => (
        <div>
          {statusBadge(item.status)}
          {item.statusReason && (
            <p className="mt-1 text-xs text-text-secondary">Reason: {item.statusReason}</p>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '12.5rem',
      cell: (item) =>
        item.status === 'pending' ? (
          <Select
            className="w-44"
            size="sm"
            hideLabel
            label={`Update status for ${patientNumberLabel(item.patient)}, ${item.reason}`}
            value=""
            placeholder="Update status"
            options={OUTCOME_OPTIONS}
            onChange={(value) => chooseStatus(item, value)}
          />
        ) : item.status === 'missed' ? (
          // Also reaches a follow-up that reads as Missed (ADR-051), which never saw the dialog.
          <Button variant="neutral" size="sm" onClick={() => offerNewDate(item)}>
            Set a new date
          </Button>
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
          Review upcoming care tasks and close the loop on student and staff follow-up plans.
        </p>
      </Card>
      <Card aria-labelledby="follow-up-list-title">
        <CardHeader
          titleId="follow-up-list-title"
          title="Follow-up tasks"
          description={`${data.total} task${data.total === 1 ? '' : 's'} shown`}
          icon={<Icon name="calendarClock" />}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <PatientFilterSelect
                value={patientFilter}
                onChange={setPatientFilter}
                className="w-full sm:w-auto"
                inline
              />
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
            </div>
          }
        />
        <CardBody>
          {data.total ? (
            <>
              <DataTable
                caption="Follow-up tasks"
                columns={columns}
                rows={pageRows}
                rowKey={(item) => item.id}
                fixedLayout
                minTableWidth="60rem"
              />
              <Pagination
                page={list.pageNumber}
                pageCount={data.lastPage}
                total={data.total}
                pageSize={list.pageSize}
                onPageSizeChange={list.setPageSize}
                itemLabel="follow-ups"
                onPageChange={list.setPage}
              />
            </>
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
        title={
          confirming?.status === 'missed'
            ? 'Mark this follow-up as Missed?'
            : 'Cancel this follow-up?'
        }
        onClose={() => setConfirming(null)}
      >
        {confirming && (
          <>
            <p className="text-sm text-text-secondary">
              <PatientNumber patient={confirming.item.patient} chip={false} /> ·{' '}
              {confirming.item.reason} · due {formatDate(confirming.item.followUpDate)}.{' '}
              {confirming.status === 'missed'
                ? 'The student did not return for this follow-up.'
                : 'This follow-up is no longer needed.'}{' '}
              It can't be changed back from this screen.
            </p>
            <Textarea
              className="mt-4"
              label="Reason"
              required={confirming.status === 'cancelled'}
              placeholder={confirming.status === 'missed' ? 'Optional' : undefined}
              rows={2}
              maxLength={300}
              value={reason}
              onChange={(value) => {
                setReason(value)
                setReasonError('')
              }}
              error={reasonError}
            />
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="neutral" data-autofocus onClick={() => setConfirming(null)}>
                Keep Pending
              </Button>
              <Button variant="primary" loading={feedback.saving} onClick={confirmClosing}>
                {confirming.status === 'missed' ? 'Mark as Missed' : 'Cancel Follow-Up'}
              </Button>
            </div>
          </>
        )}
      </Modal>
      <Modal
        open={rescheduling !== null}
        title="Set a new date?"
        onClose={() => setRescheduling(null)}
      >
        {rescheduling && (
          <>
            <p className="text-sm text-text-secondary">
              Creates a new pending follow-up for{' '}
              <PatientNumber patient={rescheduling.patient} chip={false} /> with the same reason (
              {rescheduling.reason}).
            </p>
            <DatePicker
              className="mt-4"
              label="New follow-up date"
              required
              value={newDate}
              min={todayISO()}
              onChange={setNewDate}
            />
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button variant="neutral" data-autofocus onClick={() => setRescheduling(null)}>
                Not now
              </Button>
              <Button
                variant="primary"
                loading={scheduling}
                disabled={!newDate}
                onClick={() => void scheduleNewDate()}
              >
                Set new date
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
