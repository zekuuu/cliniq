import { useState, type ReactNode } from 'react'
import {
  BackButton,
  Badge,
  buttonClassName,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  DateRangePicker,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  MultiSelect,
  Pagination,
  SegmentedControl,
  Select,
  Skeleton,
  type DataTableColumn,
} from '../../components'
import { Link, useSearchParams } from 'react-router'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDateRangeEntryParams } from '../../hooks/useDateRangeEntryParams'
import { formatDateTime } from '../../lib/dates'
import { rangeForPreset, type DateRange } from '../../lib/dateRange'
import { sortTableRows, toggleTableSort, type TableSortState } from '../../lib/tableSort'
import { paths } from '../../routes/paths'
import type { Disposition } from '../../types/entities'
import {
  defaultVisitLogRange,
  fetchVisitLog,
  type VisitLogRow,
} from './api/visitLogApi'
import { MaskedLrn } from '../../components/ui/MaskedLrn'
import { lrnLabel } from '../../lib/lrn'
import { DISPOSITION_LABELS, DISPOSITION_TONES } from '../../lib/dispositions'

type DispositionFilter = Disposition | 'all'
type LetterFilter = 'pending' | ''

const PAGE_SIZE = 10
type VisitLogSortKey = 'dateTime' | 'lrn' | 'record' | 'disposition'

const dispositionOptions = [
  { value: 'all', label: 'All' },
  { value: 'returned_to_class', label: 'Returned' },
  { value: 'sent_home', label: 'Sent home' },
  { value: 'referred_to_hospital', label: 'Hospital' },
  { value: 'resting_in_clinic', label: 'Resting' },
] satisfies Array<{ value: DispositionFilter; label: string }>

const dispositionMeta = (disposition: Disposition) => ({ label: DISPOSITION_LABELS[disposition], tone: DISPOSITION_TONES[disposition] })

function VisitLogSkeleton({ back }: { back: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Card className="p-5">
          <Skeleton className="h-7 w-48 max-w-full" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </Card>
        <Card className="p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-64 max-w-full" />
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

export function VisitLogListPage() {
  const todayRange: DateRange = { preset: 'today', ...defaultVisitLogRange() }
  // `?letter=pending` comes from the Dashboard count and must include outstanding letters from
  // earlier days; date deep links still take precedence in useDateRangeEntryParams.
  const [searchParams] = useSearchParams()
  const defaultRange = searchParams.get('letter') === 'pending'
    ? rangeForPreset('all', todayRange.to)
    : todayRange
  const { initialRange, clearDateParams } = useDateRangeEntryParams(defaultRange)
  // `?from=&to=` (e.g. the Dashboard calendar's "View visits") applies only on arrival.
  const [range, setRange] = useState<DateRange>(initialRange)
  const [search, setSearch] = useState('')
  const [disposition, setDisposition] = useState<DispositionFilter>('all')
  // `?letter=pending` (the Dashboard's "Pending excuse letters" card) applies only on arrival.
  const [letter, setLetter] = useState<LetterFilter>(searchParams.get('letter') === 'pending' ? 'pending' : '')
  // `?inClinic=1` (the Dashboard's "In clinic now" chip) applies only on arrival.
  const [inClinicNow, setInClinicNow] = useState(searchParams.get('inClinic') === '1')
  const [includeEnteredInError, setIncludeEnteredInError] = useState(false)
  const visitStatusFilters = [
    ...(inClinicNow ? ['in-clinic-now'] : []),
    ...(includeEnteredInError ? ['include-entered-in-error'] : []),
  ]
  const [sort, setSort] = useState<TableSortState<VisitLogSortKey>>({ key: 'dateTime', direction: 'descending' })
  const [page, setPage] = useState(1)

  const { data, status, isRefetching, reload } = useAsyncData(
    `${range.from}|${range.to}|${search}|${disposition}|${letter}|${inClinicNow}|${includeEnteredInError}`,
    () => fetchVisitLog({ from: range.from, to: range.to, search, disposition, letter, inClinicNow, includeEnteredInError }),
  )

  // Filters reset to the first page in the same event, so a narrower result never lands on an
  // empty later page (cliniq-pagination-patterns).
  function changeRange(next: DateRange) {
    setRange(next)
    clearDateParams()
    setPage(1)
  }
  function changeSearch(next: string) {
    setSearch(next)
    setPage(1)
  }
  function changeDisposition(next: DispositionFilter) {
    setDisposition(next)
    setPage(1)
  }
  function changeLetter(next: string) {
    setLetter(next === 'pending' ? 'pending' : '')
    setPage(1)
  }
  function changeVisitStatus(next: string[]) {
    setInClinicNow(next.includes('in-clinic-now'))
    setIncludeEnteredInError(next.includes('include-entered-in-error'))
    setPage(1)
  }

  function toggleSort(key: VisitLogSortKey) {
    setPage(1)
    setSort((current) => toggleTableSort(current, key))
  }

  // A top-level list shows Back only when a drill-through link opened it (the Dashboard).
  const back = <BackButton fallback={paths.dashboard} drillThroughOnly />
  if (status === 'error') {
    return (
      <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState title="Unable to load visit log." onRetry={reload} />
      </div>
    )
  }

  if (!data) {
    return (
      <>
        <p className="sr-only" role="status">
          Loading visit log...
        </p>
        <VisitLogSkeleton back={back} />
      </>
    )
  }

  const sortedRows = sortTableRows(data, sort, (row, key) => {
    switch (key) {
      case 'dateTime':
        return row.dateTime
      case 'lrn':
        return row.lrn
      case 'record':
        return row.complaint
      case 'disposition':
        return dispositionMeta(row.disposition).label
    }
  })

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = sortedRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const sortColumn = (key: VisitLogSortKey, label: string) => ({
    label,
    direction: sort.key === key ? sort.direction : undefined,
    onSort: () => toggleSort(key),
  })

  const columns: Array<DataTableColumn<VisitLogRow>> = [
    {
      key: 'date',
      header: 'Date and time',
      rowHeader: true,
      sort: sortColumn('dateTime', 'Date and time'),
      cell: (row) => formatDateTime(row.dateTime),
    },
    {
      key: 'student',
      header: 'LRN',
      sort: sortColumn('lrn', 'LRN'),
      cell: (row) => (
        <div>
          <p><MaskedLrn lrn={row.lrn} /></p>
          <p className="text-xs text-text-secondary">{row.gradeLevel}</p>
        </div>
      ),
    },
    {
      key: 'summary',
      header: 'Complaint',
      sort: sortColumn('record', 'Complaint'),
      cell: (row) => (
        <div>
          <p>{row.complaint}</p>
          {row.eventTag && <p className="text-xs text-text-secondary">{row.eventTag}</p>}
          {(row.inClinicNow || row.escalated || row.enteredInError) && (
            <div className="mt-1 flex flex-wrap gap-1">
              {row.inClinicNow && <Badge tone="info" variant="soft">In clinic now</Badge>}
              {row.escalated && <Badge tone="warning" variant="soft">Escalated</Badge>}
              {row.enteredInError && <Badge tone="error" variant="soft">Entered in error</Badge>}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'disposition',
      header: 'Disposition',
      sort: sortColumn('disposition', 'Disposition'),
      cell: (row) => (
        <Badge tone={dispositionMeta(row.disposition).tone} variant="soft">
          {dispositionMeta(row.disposition).label}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          <Link to={paths.visitDetail(row.id)} className={buttonClassName({ size: 'sm' })}>
            <Icon name="fileText" />
            View Details
          </Link>
          {row.letterPending && (
            <Link
              to={paths.excuseLetter(row.id)}
              aria-label={`Review Letter for ${lrnLabel(row.lrn)}`}
              className={buttonClassName({ size: 'sm' })}
            >
              Review Letter
            </Link>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Visit Log
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Review daily clinic visits by LRN and complaint. Treatment details open
              from the individual record.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link className={buttonClassName({ variant: 'primary' })} to={paths.visitNew}>
              <Icon name="stethoscope" />
              New Visit
            </Link>
          </div>
        </div>
      </Card>

      <Card aria-labelledby="visit-log-title">
        <CardHeader
          titleId="visit-log-title"
          title="Visits"
          description={`${data.length.toLocaleString('en-PH')} record${data.length === 1 ? '' : 's'} shown`}
          icon={<Icon name="clipboardList" />}
          actions={
            <SegmentedControl
              label="Disposition filter"
              value={disposition}
              onChange={changeDisposition}
              options={dispositionOptions}
            />
          }
        />
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <Input
              label="Search"
              value={search}
              placeholder="LRN, grade, complaint, or event"
              onChange={(event) => changeSearch(event.target.value)}
              className="min-w-56 flex-1"
            />
            <Select
              label="Excuse letter"
              value={letter}
              options={[{ value: 'pending', label: 'Pending approval' }]}
              placeholder="All visits"
              clearable
              onChange={changeLetter}
              className="w-48"
            />
            <MultiSelect
              label="Visit status"
              values={visitStatusFilters}
              options={[
                { value: 'in-clinic-now', label: 'In clinic now only' },
                { value: 'include-entered-in-error', label: 'Include entered in error' },
              ]}
              allLabel="All visits"
              onChange={changeVisitStatus}
              className="w-56"
            />
            <DateRangePicker
              value={range}
              onChange={changeRange}
              today={defaultRange.to}
              presets={['all', 'today', 'last7', 'thisMonth', 'custom']}
              presetLabels={{ last7: 'This week' }}
              customPopover
            />
          </div>

          <div aria-busy={isRefetching} className={isRefetching ? 'opacity-60' : undefined}>
            {data.length ? (
              <>
                <DataTable
                  caption="Clinic visit log"
                  columns={columns}
                  rows={pageRows}
                  rowKey={(row) => row.id}
                  fixedLayout
                  minTableWidth="48rem"
                />
                <Pagination
                  page={currentPage}
                  pageCount={pageCount}
                  total={sortedRows.length}
                  pageSize={PAGE_SIZE}
                  itemLabel="visits"
                  onPageChange={setPage}
                />
              </>
            ) : (
              <EmptyState
                icon="clipboardList"
                title="No visits found"
                description="Try another date range, LRN, disposition, or excuse-letter filter."
              />
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
