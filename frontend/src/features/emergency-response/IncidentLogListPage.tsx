import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
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
  Pagination,
  SegmentedControl,
  Skeleton,
  type BadgeTone,
  type DataTableColumn,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/dates'
import { describeRange, type DateRange } from '../../lib/dateRange'
import { sortTableRows, toggleTableSort, type TableSortState } from '../../lib/tableSort'
import { paths } from '../../routes/paths'
import {
  defaultIncidentLogRange,
  fetchIncidentLog,
  type IncidentCompletion,
  type IncidentLogRow,
} from './api/incidentLogApi'

type CompletionFilter = IncidentCompletion | 'all'

const PAGE_SIZE = 10
type IncidentSortKey = 'time' | 'student' | 'complaint' | 'status'

const completionOptions = [
  { value: 'all', label: 'All' },
  { value: 'needs_completion', label: 'Needs completion' },
  { value: 'complete', label: 'Complete' },
] satisfies Array<{ value: CompletionFilter; label: string }>

const completionMeta: Record<IncidentCompletion, { label: string; tone: BadgeTone }> = {
  needs_completion: { label: 'Needs completion', tone: 'warning' },
  complete: { label: 'Complete', tone: 'success' },
}

function IncidentLogSkeleton({ back }: { back: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Card className="p-5"><Skeleton className="h-7 w-48 max-w-full" /><Skeleton className="mt-2 h-4 w-96 max-w-full" /></Card>
        <Card className="p-5"><div className="grid grid-cols-1 gap-3 md:grid-cols-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-64 max-w-full" /></div><Skeleton className="mt-5 h-64 w-full" /></Card>
      </div>
    </div>
  )
}

const baseColumns: Array<DataTableColumn<IncidentLogRow>> = [
  { key: 'time', header: 'Date and time', rowHeader: true, cell: (row) => formatDateTime(row.time) },
  { key: 'student', header: 'Student Number', cell: (row) => <div><p>{row.studentNumber}</p><p className="text-xs text-text-secondary">{row.gradeLevel}</p></div> },
  { key: 'complaint', header: 'Reason / description', cell: (row) => <div><p>{row.complaint}</p>{row.eventTag && <p className="text-xs text-text-secondary">{row.eventTag}</p>}</div> },
  { key: 'status', header: 'Status', cell: (row) => <Badge tone={completionMeta[row.completion].tone} variant="soft">{completionMeta[row.completion].label}</Badge> },
  { key: 'actions', header: 'Actions', cell: (row) => <div className="flex flex-wrap gap-2">{row.completion === 'needs_completion' && <Link to={paths.incidentComplete(row.id)} className={buttonClassName({ size: 'sm' })}><Icon name="clipboardList" />Complete Stage 2</Link>}<Link to={paths.incidentReport(row.id)} className={buttonClassName({ size: 'sm' })}><Icon name="fileText" />View Report</Link></div> },
]

export function IncidentLogListPage() {
  const defaultRange = defaultIncidentLogRange()
  const [range, setRange] = useState<DateRange>({ preset: 'all', ...defaultRange })
  const [search, setSearch] = useState('')
  const [completion, setCompletion] = useState<CompletionFilter>('all')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<TableSortState<IncidentSortKey>>({ key: 'time', direction: 'descending' })
  const { from, to } = range
  const { data, status, isRefetching, reload } = useAsyncData(
    `${from}|${to}|${search}|${completion}`,
    () => fetchIncidentLog({ from, to, search, completion }),
  )
  // Filter changes reset to the first page in the same event (cliniq-pagination-patterns).
  function changeRange(next: DateRange) { setRange(next); setPage(1) }
  function changeSearch(next: string) { setSearch(next); setPage(1) }
  function changeCompletion(next: CompletionFilter) { setCompletion(next); setPage(1) }

  // A top-level list shows Back only when a drill-through link opened it (the Dashboard).
  const back = <BackButton fallback={paths.dashboard} drillThroughOnly />
  if (status === 'error') return <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">{back}<ErrorState title="Unable to load incident log." onRetry={reload} /></div>
  if (!data) return <><p className="sr-only" role="status">Loading incident log...</p><IncidentLogSkeleton back={back} /></>
  function changeSort(key: IncidentSortKey) {
    setSort((current) => toggleTableSort(current, key))
    setPage(1)
  }
  const sortedRows = sortTableRows(data, sort, (row, key) => {
    if (key === 'time') return row.time
    if (key === 'student') return row.studentNumber
    if (key === 'complaint') return row.complaint
    return completionMeta[row.completion].label
  })
  const sortColumn = (key: IncidentSortKey, label: string) => ({
    label,
    direction: sort.key === key ? sort.direction : undefined,
    onSort: () => changeSort(key),
  })
  const columns: Array<DataTableColumn<IncidentLogRow>> = baseColumns.map((column) => {
    if (column.key === 'time') return { ...column, sort: sortColumn('time', 'Date and time') }
    if (column.key === 'student') return { ...column, sort: sortColumn('student', 'Student Number') }
    if (column.key === 'complaint') return { ...column, sort: sortColumn('complaint', 'Reason / description') }
    if (column.key === 'status') return { ...column, sort: sortColumn('status', 'Status') }
    return column
  })
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = sortedRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
    {back}
    <Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-text-primary">Incident Log</h1><p className="mt-1 text-sm text-text-secondary">Review incidents by Student Number and complete records that still need follow-up detail.</p></div><div className="flex flex-wrap items-center gap-3"><Badge tone="info" variant="soft">{range.preset === 'all' ? 'All incidents' : describeRange(range)}</Badge><Link className={buttonClassName({ variant: 'primary' })} to={paths.incidentNew()}><Icon name="alertTriangle" />New Incident</Link></div></div></Card>
    <Card aria-labelledby="incident-log-title"><CardHeader titleId="incident-log-title" title="Incidents" description={`${data.length.toLocaleString('en-PH')} record${data.length === 1 ? '' : 's'} shown`} icon={<Icon name="alertTriangle" />} actions={<SegmentedControl label="Completion filter" value={completion} onChange={(value) => changeCompletion(value as CompletionFilter)} options={completionOptions} />} /><CardBody className="flex flex-col gap-4"><div className="flex flex-wrap items-end gap-3"><Input label="Search" value={search} placeholder="Student Number, grade, reason, or event" onChange={(event) => changeSearch(event.target.value)} className="min-w-56 flex-1" /><DateRangePicker value={range} onChange={changeRange} today={defaultRange.to} presets={['all', 'today', 'last7', 'thisMonth', 'custom']} presetLabels={{ last7: 'This week' }} customPopover /></div><div aria-busy={isRefetching} className={isRefetching ? 'opacity-60' : undefined}>{data.length ? <><DataTable caption="Clinic incident log" columns={columns} rows={pageRows} rowKey={(row) => row.id} fixedLayout /><Pagination page={currentPage} pageCount={pageCount} total={data.length} pageSize={PAGE_SIZE} itemLabel="incidents" onPageChange={setPage} /></> : <EmptyState icon="alertTriangle" title="No incidents found" description="Try another date range, Student Number, reason, or completion status." />}</div></CardBody></Card>
  </div>
}
