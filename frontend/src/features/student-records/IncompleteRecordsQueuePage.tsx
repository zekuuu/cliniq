import { useMemo, useState, type ReactNode } from 'react'
import {
  BackButton,
  Badge,
  Button,
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
import { formatDate } from '../../lib/dates'
import { sortTableRows, toggleTableSort, type TableSortState } from '../../lib/tableSort'
import { getMockSessionUser, type SessionUser } from '../../lib/mock-db'
import {
  fetchIncompleteRecords,
  markIncompleteRecordResolved,
  type IncompleteRecord,
} from './api/incompleteRecordsApi'

type QueueFilter = 'open' | 'resolved' | 'all'
type IncompleteSortKey = 'student' | 'grade' | 'missing' | 'imported' | 'status'

interface ResolvedRecord {
  resolvedBy: string
  resolvedAt: string
}

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

export function IncompleteRecordsQueuePage({
  viewer = getMockSessionUser(),
}: {
  viewer?: SessionUser
}) {
  const { data, status, isRefetching, reload } = useAsyncData(
    'incomplete-records',
    fetchIncompleteRecords,
  )
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [search, setSearch] = useState('')
  const [resolved, setResolved] = useState<Record<string, ResolvedRecord>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [sort, setSort] = useState<TableSortState<IncompleteSortKey>>({ key: 'imported', direction: 'descending' })

  async function resolveRecord(record: IncompleteRecord) {
    setSavingId(record.id)
    try {
      const updated = await markIncompleteRecordResolved(record, viewer)
      setResolved((current) => ({
        ...current,
        [record.id]: { resolvedBy: updated.resolvedBy ?? viewer.name, resolvedAt: updated.resolvedAt ?? '' },
      }))
    } finally {
      setSavingId(null)
    }
  }

  // Resolutions come from the data layer; `resolved` only holds ones made since this page loaded.
  const resolutionOf = (record: IncompleteRecord): ResolvedRecord | undefined =>
    resolved[record.id] ??
    (record.resolvedAt ? { resolvedBy: record.resolvedBy ?? 'Unknown user', resolvedAt: record.resolvedAt } : undefined)

  const visibleRows = useMemo(() => {
    if (!data) return []
    const term = search.trim().toLowerCase()
    return data
      .filter((record) => {
        const isResolved = Boolean(resolutionOf(record))
        if (filter === 'open') return !isResolved
        if (filter === 'resolved') return isResolved
        return true
      })
      .filter((record) => {
        if (!term) return true
        return (
          record.fullName.toLowerCase().includes(term) ||
          record.studentNumber.toLowerCase().includes(term) ||
          record.gradeLevel.toLowerCase().includes(term)
        )
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolutionOf only reads `resolved`
  }, [data, filter, resolved, search])

  const sortedRows = useMemo(
    () => sortTableRows(visibleRows, sort, (record, key) => {
      if (key === 'student') return record.fullName
      if (key === 'grade') return record.gradeLevel
      if (key === 'missing') return record.missingFields.join(', ')
      if (key === 'imported') return record.importedAt
      return resolutionOf(record) ? 'Resolved' : 'Open'
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resolutionOf only reads `resolved`
    [visibleRows, sort, resolved],
  )

  const sortColumn = (key: IncompleteSortKey, label: string) => ({
    label,
    direction: sort.key === key ? sort.direction : undefined,
    onSort: () => setSort((current) => toggleTableSort(current, key)),
  })

  const columns: Array<DataTableColumn<IncompleteRecord>> = [
    {
      key: 'student',
      header: 'Student',
      rowHeader: true,
      sort: sortColumn('student', 'Student'),
      cell: (record) => (
        <div>
          <p>{record.fullName}</p>
          <p className="text-xs font-normal text-text-secondary">{record.studentNumber}</p>
        </div>
      ),
    },
    {
      key: 'grade',
      header: 'Grade level',
      sort: sortColumn('grade', 'Grade level'),
      cell: (record) => record.gradeLevel,
    },
    {
      key: 'missing',
      header: 'Missing fields',
      sort: sortColumn('missing', 'Missing fields'),
      cell: (record) => (
        <div className="flex flex-wrap gap-1">
          {record.missingFields.map((field) => (
            <Badge key={field} tone="warning" variant="soft">
              {field}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'imported',
      header: 'Imported',
      sort: sortColumn('imported', 'Imported'),
      cell: (record) => (
        <div>
          <p>{record.importedAt ? formatDate(record.importedAt) : '—'}</p>
          <p className="text-xs text-text-secondary">{record.importedBy}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Resolution',
      sort: sortColumn('status', 'Resolution'),
      cell: (record) => {
        const resolution = resolutionOf(record)
        if (resolution) {
          return (
            <div>
              <Badge tone="success" variant="soft" icon="checkCircle">
                Resolved
              </Badge>
              <p className="mt-1 text-xs text-text-secondary">
                {resolution.resolvedBy} · {formatResolvedAt(resolution.resolvedAt)}
              </p>
            </div>
          )
        }
        return (
          <Button
            size="sm"
            variant="secondary"
            icon="checkCircle"
            loading={savingId === record.id}
            onClick={() => void resolveRecord(record)}
          >
            Mark Reviewed
          </Button>
        )
      },
    },
  ]

  if (viewer.role !== 'staff') {
    return (
      <div className="mx-auto max-w-page-wide px-4 pt-10 pb-8 sm:px-8">
        <ErrorState title="Staff access required." />
      </div>
    )
  }

  const back = <BackButton fallback={paths.students} />

  if (status === 'error') {
    return (
      <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState title="Unable to load incomplete records." onRetry={reload} />
      </div>
    )
  }

  if (!data) {
    return (
      <>
        <p className="sr-only" role="status">
          Loading incomplete records...
        </p>
        <QueueSkeleton back={back} />
      </>
    )
  }

  const openCount = data.filter((record) => !resolutionOf(record)).length
  const resolvedCount = data.length - openCount

  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Incomplete Records
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Review Registrar-imported student records that still need required-field completion.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="warning" variant="soft">
              {openCount} open
            </Badge>
            <Badge tone="success" variant="soft">
              {resolvedCount} resolved
            </Badge>
          </div>
        </div>
      </Card>

      <Card aria-labelledby="incomplete-records-title">
        <CardHeader
          titleId="incomplete-records-title"
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
            value={search}
            placeholder="Name, Student Number, or grade"
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-xl"
          />

          <div aria-busy={isRefetching} className={isRefetching ? 'opacity-60' : undefined}>
            {visibleRows.length ? (
              <DataTable
                caption="Incomplete student records"
                columns={columns}
                rows={sortedRows}
                rowKey={(record) => record.id}
                fixedLayout
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
