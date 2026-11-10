import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import {
  BackButton,
  Badge,
  buttonClassName,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  SegmentedControl,
  Skeleton,
  type DataTableColumn,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { paths } from '../../routes/paths'
import { nameMatches } from '../../lib/personName'
import { sortTableRows, toggleTableSort, type TableSortState } from '../../lib/tableSort'
import { getMockSessionUser, type SessionUser, type StaffIncompleteRecord } from '../../lib/mock-db'
import { fetchStaffIncompleteRecords } from './api/staffApi'

type QueueFilter = 'open' | 'resolved' | 'all'
type StaffQueueSortKey = 'staff' | 'number' | 'type' | 'missing' | 'status'

function QueueSkeleton({ back }: { back: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Card className="p-5">
          <Skeleton className="h-7 w-80 max-w-full" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </Card>
        <Card className="p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-72 max-w-full" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="mt-5 flex flex-col gap-3">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function formatResolvedAt(value: string): string {
  return new Date(value).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Staff Incomplete Records (ADR-067): the student queue's layout for staff records with no emergency
 * contact (or no sex, on old records). A record is resolved when Edit Staff saves it complete; the data
 * layer records who and when. No Imported column: staff aren't imported.
 */
export function StaffIncompleteRecordsPage({
  viewer = getMockSessionUser(),
}: {
  viewer?: SessionUser
}) {
  const { data, status, isRefetching, reload } = useAsyncData(
    'staff-incomplete-records',
    fetchStaffIncompleteRecords,
  )
  const [filter, setFilter] = useState<QueueFilter>('open')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<TableSortState<StaffQueueSortKey>>({
    key: 'staff',
    direction: 'ascending',
  })

  const isResolved = (record: StaffIncompleteRecord) => record.status === 'resolved'

  const visibleRows = useMemo(() => {
    if (!data) return []
    const term = search.trim().toLowerCase()
    return data
      .filter((record) =>
        filter === 'open' ? !isResolved(record) : filter === 'resolved' ? isResolved(record) : true,
      )
      .filter(
        (record) =>
          !term ||
          nameMatches(record.person.fullName, term) ||
          record.person.staffNumber.toLowerCase().includes(term) ||
          record.person.type.toLowerCase().includes(term),
      )
  }, [data, filter, search])

  const nameOrder = useMemo(
    () => new Map((data ?? []).map((record, index) => [record.person.id, index])),
    [data],
  )
  const sortedRows = useMemo(
    () =>
      sortTableRows(visibleRows, sort, (record, key) => {
        // The queue arrives by last name, then first name (ADR-064); the Staff column sorts by that order.
        if (key === 'staff') return nameOrder.get(record.person.id)
        if (key === 'number') return record.person.staffNumber
        if (key === 'type') return record.person.type
        if (key === 'missing') return record.missingFields.join(', ')
        return isResolved(record) ? 'Resolved' : 'Open'
      }),
    [visibleRows, sort, nameOrder],
  )

  const sortColumn = (key: StaffQueueSortKey, label: string) => ({
    label,
    direction: sort.key === key ? sort.direction : undefined,
    onSort: () => setSort((current) => toggleTableSort(current, key)),
  })

  const columns: Array<DataTableColumn<StaffIncompleteRecord>> = [
    {
      key: 'staff',
      header: 'Staff',
      width: '20%',
      rowHeader: true,
      sort: sortColumn('staff', 'Staff'),
      cell: (record) => record.person.fullName,
    },
    {
      key: 'number',
      header: 'Staff No.',
      width: '12%',
      sort: sortColumn('number', 'Staff No.'),
      cell: (record) => <span className="tabular-nums">{record.person.staffNumber}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      width: '15%',
      sort: sortColumn('type', 'Type'),
      cell: (record) => record.person.type,
    },
    {
      key: 'missing',
      header: 'Missing fields',
      width: '18%',
      sort: sortColumn('missing', 'Missing fields'),
      cell: (record) => (
        <div className="flex flex-wrap gap-1">
          {record.missingFields.map((field) => (
            <Badge key={field} tone="warning" variant="soft" className="whitespace-normal!">
              {field}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Resolution',
      width: '20%',
      sort: sortColumn('status', 'Resolution'),
      cell: (record) =>
        isResolved(record) && record.review?.resolvedAt ? (
          <div>
            <Badge tone="info" variant="soft" icon="checkCircle">
              Resolved
            </Badge>
            <p className="mt-1 text-xs text-text-secondary">
              {record.resolvedByName ?? 'Unknown user'} ·{' '}
              {formatResolvedAt(record.review.resolvedAt)}
            </p>
          </div>
        ) : (
          <Badge tone="warning" variant="soft">
            Open
          </Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '15%',
      cell: (record) => (
        // Save returns here (Edit Staff's `returnTo`), as on the student queue.
        <Link
          to={paths.staffEdit(record.person.id)}
          state={{ returnTo: paths.staffIncomplete }}
          aria-label={`Edit Record for ${record.person.fullName}`}
          className={buttonClassName({ size: 'sm' })}
        >
          <Icon name="pencil" />
          Edit Record
        </Link>
      ),
    },
  ]

  if (viewer.role !== 'staff') {
    return (
      <div className="mx-auto max-w-page-wide px-4 pt-10 pb-8 sm:px-8">
        <ErrorState asPageTitle title="Staff access required." />
      </div>
    )
  }

  const back = <BackButton to={paths.staff} />

  if (status === 'error') {
    return (
      <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState asPageTitle title="Unable to load incomplete staff records." onRetry={reload} />
      </div>
    )
  }

  if (!data) {
    return (
      <>
        <p className="sr-only" role="status">
          Loading incomplete staff records...
        </p>
        <QueueSkeleton back={back} />
      </>
    )
  }

  const openCount = data.filter((record) => !isResolved(record)).length
  const resolvedCount = data.length - openCount

  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Incomplete Staff Records
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Staff records that still need an emergency contact or the sex recorded.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="warning" variant="soft">
              {openCount} open
            </Badge>
            <Badge tone="info" variant="soft">
              {resolvedCount} resolved
            </Badge>
          </div>
        </div>
      </Card>

      <Card aria-labelledby="staff-incomplete-records-title">
        <CardHeader
          titleId="staff-incomplete-records-title"
          title="Review queue"
          description={`${visibleRows.length.toLocaleString('en-PH')} record${visibleRows.length === 1 ? '' : 's'} shown`}
          icon={<Icon name="inbox" />}
          actions={
            <SegmentedControl
              label="Queue filter"
              value={filter}
              onChange={(value) => setFilter(value as QueueFilter)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'open', label: 'Open' },
                { value: 'resolved', label: 'Resolved' },
              ]}
            />
          }
        />
        <CardBody className="flex flex-col gap-4">
          <Input
            label="Search"
            type="search"
            value={search}
            placeholder="Name, Staff No., or type"
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-xl"
          />

          <div aria-busy={isRefetching} className={isRefetching ? 'opacity-60' : undefined}>
            {visibleRows.length ? (
              <DataTable
                caption="Incomplete staff records"
                columns={columns}
                rows={sortedRows}
                rowKey={(record) => record.person.id}
                fixedLayout
                minTableWidth="56rem"
              />
            ) : (
              <EmptyState
                icon="inbox"
                title="No records in this view"
                description="Try another queue filter or search term."
              />
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
