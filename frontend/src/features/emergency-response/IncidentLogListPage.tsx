import { useState, type ReactNode } from 'react'
import { usePatientFilter } from '../../hooks/usePatientFilter'
import { Link } from 'react-router'
import {
  ActionMenu,
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
  ShortcutHint,
  Input,
  Pagination,
  SegmentedControl,
  Skeleton,
  type BadgeTone,
  type DataTableColumn,
} from '../../components'
import { SHORTCUT_KEYS } from '../../lib/shortcuts'
import { usePagedList } from '../../hooks/usePagedList'
import { useDateRangeEntryParams } from '../../hooks/useDateRangeEntryParams'
import { formatDateTime } from '../../lib/dates'
import type { DateRange } from '../../lib/dateRange'
import { toggleTableSort } from '../../lib/tableSort'
import { paths } from '../../routes/paths'
import {
  defaultIncidentLogRange,
  fetchIncidentLogPage,
  INCIDENT_SORT_KEYS,
  type IncidentCompletion,
  type IncidentLogRow,
  type IncidentSortKey,
} from './api/incidentLogApi'
import { PatientFilterSelect, PatientNumber } from '../../components'
import type { PatientFilter } from '../../lib/patients'
import { getMockSessionUser, type SessionUser } from '../../lib/data'

type CompletionFilter = IncidentCompletion | 'all'

const completionOptions = [
  { value: 'all', label: 'All' },
  { value: 'needs_completion', label: 'Needs completion' },
  { value: 'complete', label: 'Complete' },
] satisfies Array<{ value: CompletionFilter; label: string }>

const completionMeta: Record<IncidentCompletion, { label: string; tone: BadgeTone }> = {
  needs_completion: { label: 'Needs completion', tone: 'unfinished' },
  complete: { label: 'Complete', tone: 'success' },
}

function IncidentLogSkeleton({ back }: { back: ReactNode }) {
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
          <Skeleton className="mt-5 h-64 w-full" />
        </Card>
      </div>
    </div>
  )
}

const viewReport = (row: IncidentLogRow) => (
  <Link to={paths.incidentReport(row.id)} className={buttonClassName({ size: 'sm' })}>
    <Icon name="fileText" />
    View Report
  </Link>
)

const baseColumns: Array<DataTableColumn<IncidentLogRow>> = [
  {
    key: 'time',
    header: 'Date and time',
    rowHeader: true,
    cell: (row) => formatDateTime(row.time),
  },
  {
    key: 'student',
    header: 'LRN or Staff No.',
    cell: (row) => (
      <div>
        <p>
          <PatientNumber patient={row.patient} />
        </p>
        <p className="text-xs text-text-secondary">{row.gradeLevel}</p>
      </div>
    ),
  },
  {
    key: 'complaint',
    header: 'Reason / description',
    cell: (row) => (
      <div>
        <p>{row.complaint}</p>
        {row.eventTag && <p className="text-xs text-text-secondary">{row.eventTag}</p>}
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    cell: (row) => (
      <Badge tone={completionMeta[row.completion].tone} variant="soft">
        {completionMeta[row.completion].label}
      </Badge>
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    width: '15rem',
    cell: (row) =>
      row.completion === 'needs_completion' ? (
        <div className="flex items-center gap-1.5">
          <Link to={paths.incidentComplete(row.id)} className={buttonClassName({ size: 'sm' })}>
            <Icon name="clipboardList" />
            Complete Stage 2
          </Link>
          <ActionMenu
            label={`More actions for incident on ${formatDateTime(row.time)}`}
            items={[
              {
                key: 'report',
                label: 'View Report',
                icon: 'fileText',
                href: paths.incidentReport(row.id),
              },
            ]}
          />
        </div>
      ) : (
        viewReport(row)
      ),
  },
]

/** The Admin reads the log (ADR-038): View Report only, no New Incident or Stage 2. */
export function IncidentLogListPage({
  viewer = getMockSessionUser(),
}: { viewer?: SessionUser } = {}) {
  const isStaff = viewer.role === 'staff'
  const defaultRange: DateRange = { preset: 'today', ...defaultIncidentLogRange() }
  const { initialRange, clearDateParams } = useDateRangeEntryParams(defaultRange)
  const [range, setRange] = useState<DateRange>(initialRange)
  // The Dashboard's Unfinished incident records card opens the log on this filter.
  const [completion, setCompletion] = useState<CompletionFilter>(() =>
    new URLSearchParams(window.location.search).get('completion') === 'needs_completion'
      ? 'needs_completion'
      : 'all',
  )
  const [patientFilter, setPatientFilter] = usePatientFilter()
  // The Admin's log has no staff incidents (ADR-043, D15), so it keeps the LRN alone and no filter.
  const patient: PatientFilter = isStaff ? patientFilter : 'everyone'
  const numberHeader = isStaff ? 'LRN or Staff No.' : 'LRN'
  const { from, to } = range
  // One page at a time from the server; page, search and sort live in the address (ADR-082).
  // A changed filter, search, sort or page size goes back to page 1 (cliniq-pagination-patterns).
  const list = usePagedList({
    key: `incident-log|${viewer.role}`,
    filters: { from, to, completion, patient },
    sortKeys: INCIDENT_SORT_KEYS,
    defaultSort: { key: 'time', direction: 'descending' },
    load: (request, signal) => fetchIncidentLogPage(request, viewer, signal),
  })
  const { page: data, status, isRefetching, reload, sort } = list
  function changeRange(next: DateRange) {
    setRange(next)
    clearDateParams()
  }
  function changeCompletion(next: CompletionFilter) {
    setCompletion(next)
  }
  function changePatient(next: PatientFilter) {
    setPatientFilter(next)
  }

  // A top-level list shows Back only when a drill-through link opened it (the Dashboard).
  const back = <BackButton fallback={paths.dashboard} drillThroughOnly />
  if (status === 'error')
    return (
      <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState asPageTitle title="Unable to load incident log." onRetry={reload} />
      </div>
    )
  if (!data)
    return (
      <>
        <p className="sr-only" role="status">
          Loading incident log...
        </p>
        <IncidentLogSkeleton back={back} />
      </>
    )
  function changeSort(key: IncidentSortKey) {
    list.setSort(toggleTableSort(sort, key))
  }
  const sortColumn = (key: IncidentSortKey, label: string) => ({
    label,
    direction: sort.key === key ? sort.direction : undefined,
    onSort: () => changeSort(key),
  })
  const columns: Array<DataTableColumn<IncidentLogRow>> = baseColumns.map((column) => {
    if (column.key === 'time') return { ...column, sort: sortColumn('time', 'Date and time') }
    // The Admin's rows are all students, so the Student chip would only repeat itself.
    if (column.key === 'student')
      return {
        ...column,
        header: numberHeader,
        sort: sortColumn('student', numberHeader),
        ...(!isStaff && {
          cell: (row: IncidentLogRow) => (
            <div>
              <p>
                <PatientNumber patient={row.patient} chip={false} />
              </p>
              <p className="text-xs text-text-secondary">{row.gradeLevel}</p>
            </div>
          ),
        }),
      }
    if (column.key === 'complaint')
      return { ...column, sort: sortColumn('complaint', 'Reason / description') }
    if (column.key === 'status') return { ...column, sort: sortColumn('status', 'Status') }
    if (column.key === 'actions' && !isStaff) return { ...column, cell: viewReport }
    return column
  })

  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Incident Log</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {isStaff
                ? 'Review incidents by LRN or Staff No. and complete records that still need follow-up detail.'
                : 'Review incidents by LRN and open each incident report.'}
            </p>
          </div>
          {isStaff && (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                className={buttonClassName({ variant: 'primary' })}
                to={paths.incidentNew}
                aria-keyshortcuts={SHORTCUT_KEYS.newIncident}
              >
                <Icon name="alertTriangle" />
                New Incident
                <ShortcutHint keys={SHORTCUT_KEYS.newIncident} />
              </Link>
            </div>
          )}
        </div>
      </Card>
      <Card aria-labelledby="incident-log-title">
        <CardHeader
          titleId="incident-log-title"
          title="Incidents"
          description={`${data.total.toLocaleString('en-PH')} record${data.total === 1 ? '' : 's'} shown`}
          icon={<Icon name="alertTriangle" />}
          actions={
            <SegmentedControl
              label="Completion filter"
              value={completion}
              onChange={(value) => changeCompletion(value as CompletionFilter)}
              options={completionOptions}
            />
          }
        />
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <Input
              label="Search"
              type="search"
              value={list.searchInput}
              placeholder={
                isStaff ? 'LRN, Staff No., reason or event' : 'LRN, grade, reason, or event'
              }
              onChange={(event) => list.setSearch(event.target.value)}
              className="min-w-56 flex-1"
            />
            {isStaff && <PatientFilterSelect value={patient} onChange={changePatient} />}
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
            {data.total ? (
              <>
                <DataTable
                  caption="Clinic incident log"
                  columns={columns}
                  rows={data.rows}
                  rowKey={(row) => row.id}
                  fixedLayout
                  minTableWidth="58rem"
                />
                <Pagination
                  page={list.pageNumber}
                  pageCount={data.lastPage}
                  total={data.total}
                  pageSize={list.pageSize}
                  onPageSizeChange={list.setPageSize}
                  itemLabel="incidents"
                  onPageChange={list.setPage}
                />
              </>
            ) : (
              <EmptyState
                icon="alertTriangle"
                title="No incidents found"
                description="Try another date range, LRN, reason, or completion status."
              />
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
