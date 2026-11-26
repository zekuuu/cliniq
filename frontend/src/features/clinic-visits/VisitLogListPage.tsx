import { SYMPTOM, symptom } from '../../lib/labels'
import { useState, type ReactNode } from 'react'
import { usePatientFilter } from '../../hooks/usePatientFilter'
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
  ListItemLink,
  ShortcutHint,
  Input,
  MultiSelect,
  Pagination,
  PatientFilterSelect,
  PatientNumber,
  SegmentedControl,
  Select,
  Skeleton,
  type DataTableColumn,
} from '../../components'
import { SHORTCUT_KEYS } from '../../lib/shortcuts'
import { Link, useSearchParams } from 'react-router'
import { usePagedList } from '../../hooks/usePagedList'
import { useDateRangeEntryParams } from '../../hooks/useDateRangeEntryParams'
import { formatDateTime } from '../../lib/dates'
import { rangeForPreset, type DateRange } from '../../lib/dateRange'
import { toggleTableSort } from '../../lib/tableSort'
import { paths } from '../../routes/paths'
import type { Disposition } from '../../types/entities'
import {
  defaultVisitLogRange,
  fetchVisitLogPage,
  VISIT_LOG_SORT_KEYS,
  type VisitLogRow,
  type VisitLogSortKey,
} from './api/visitLogApi'
import { patientNumberLabel, type PatientFilter } from '../../lib/patients'
import { dispositionLabel, DISPOSITION_TONES } from '../../lib/dispositions'

type DispositionFilter = Disposition | 'all'
type LetterFilter = 'pending' | ''

const dispositionOptions = [
  { value: 'all', label: 'All' },
  { value: 'returned_to_class', label: 'Returned' },
  { value: 'sent_home', label: 'Sent home' },
  { value: 'referred_to_hospital', label: 'Hospital' },
  { value: 'resting_in_clinic', label: 'Resting' },
] satisfies Array<{ value: DispositionFilter; label: string }>

// ADR-053: a staff visit's "Returned to class" reads "Returned to work".
const dispositionMeta = (disposition: Disposition, kind: 'student' | 'personnel' = 'student') => ({
  label: dispositionLabel(disposition, kind),
  tone: DISPOSITION_TONES[disposition],
})

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
  const defaultRange =
    searchParams.get('letter') === 'pending' ? rangeForPreset('all', todayRange.to) : todayRange
  const { initialRange, clearDateParams } = useDateRangeEntryParams(defaultRange)
  // `?from=&to=` (e.g. the Dashboard calendar's "View visits") applies only on arrival.
  const [range, setRange] = useState<DateRange>(initialRange)
  const [disposition, setDisposition] = useState<DispositionFilter>('all')
  // `?letter=pending` (the Dashboard's "Pending excuse letters" card) applies only on arrival.
  const [letter, setLetter] = useState<LetterFilter>(
    searchParams.get('letter') === 'pending' ? 'pending' : '',
  )
  // `?inClinic=1` applies only on arrival; no screen links to it (Zean removed the Dashboard chip).
  const [inClinicNow, setInClinicNow] = useState(searchParams.get('inClinic') === '1')
  const [includeEnteredInError, setIncludeEnteredInError] = useState(false)
  const [patient, setPatient] = usePatientFilter()
  const visitStatusFilters = [
    ...(inClinicNow ? ['in-clinic-now'] : []),
    ...(includeEnteredInError ? ['include-entered-in-error'] : []),
  ]
  // One page at a time from the server; page, search and sort live in the address (ADR-082).
  // A changed filter, search, sort or page size goes back to page 1 (cliniq-pagination-patterns).
  const list = usePagedList({
    key: 'visit-log',
    filters: {
      from: range.from,
      to: range.to,
      disposition,
      letter,
      inClinicNow,
      includeEnteredInError,
      patient,
    },
    sortKeys: VISIT_LOG_SORT_KEYS,
    defaultSort: { key: 'dateTime', direction: 'descending' },
    load: fetchVisitLogPage,
  })
  const { page: data, status, isRefetching, reload, sort } = list

  function changeRange(next: DateRange) {
    setRange(next)
    clearDateParams()
  }
  function changeDisposition(next: DispositionFilter) {
    setDisposition(next)
  }
  function changePatient(next: PatientFilter) {
    setPatient(next)
  }
  function changeLetter(next: string) {
    setLetter(next === 'pending' ? 'pending' : '')
  }
  function changeVisitStatus(next: string[]) {
    setInClinicNow(next.includes('in-clinic-now'))
    setIncludeEnteredInError(next.includes('include-entered-in-error'))
  }

  function toggleSort(key: VisitLogSortKey) {
    list.setSort(toggleTableSort(sort, key))
  }

  // A top-level list shows Back only when a drill-through link opened it (the Dashboard).
  const back = <BackButton fallback={paths.dashboard} drillThroughOnly />
  if (status === 'error') {
    return (
      <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState asPageTitle title="Unable to load visit log." onRetry={reload} />
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
      cell: (row) => (
        <ListItemLink to={paths.visitDetail(row.id)}>{formatDateTime(row.dateTime)}</ListItemLink>
      ),
    },
    {
      key: 'student',
      header: 'LRN or Staff No.',
      width: '14rem',
      sort: sortColumn('lrn', 'LRN or Staff No.'),
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
      key: 'summary',
      header: SYMPTOM,
      sort: sortColumn('record', SYMPTOM),
      cell: (row) => (
        <div>
          <p>{row.complaint}</p>
          {row.eventTag && <p className="text-xs text-text-secondary">{row.eventTag}</p>}
          {/* No "In clinic now" badge: it repeated the disposition "Resting in clinic" (review round 2, R20). */}
          {(row.escalated || row.enteredInError) && (
            <div className="mt-1 flex flex-wrap gap-1">
              {row.escalated && (
                <Badge tone="warning" variant="soft">
                  Escalated
                </Badge>
              )}
              {row.enteredInError && (
                <Badge tone="error" variant="soft">
                  Entered in error
                </Badge>
              )}
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
          {dispositionMeta(row.disposition, row.patient.kind).label}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.letterPending && (
            <Link
              to={paths.excuseLetter(row.id)}
              aria-label={`Review Letter for ${patientNumberLabel(row.patient)}`}
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
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Visit Log</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Review daily clinic visits by LRN or Staff No. and complaint. Treatment details open
              from the individual record.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              className={buttonClassName({ variant: 'primary' })}
              to={paths.visitNew}
              aria-keyshortcuts={SHORTCUT_KEYS.newVisit}
            >
              <Icon name="stethoscope" />
              New Visit
              <ShortcutHint keys={SHORTCUT_KEYS.newVisit} />
            </Link>
          </div>
        </div>
      </Card>

      <Card aria-labelledby="visit-log-title">
        <CardHeader
          titleId="visit-log-title"
          title="Visits"
          description={`${data.total.toLocaleString('en-PH')} record${data.total === 1 ? '' : 's'} shown`}
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
              type="search"
              value={list.searchInput}
              placeholder={`LRN, Staff No., ${symptom} or event`}
              onChange={(event) => list.setSearch(event.target.value)}
              className="min-w-56 flex-1"
            />
            <PatientFilterSelect value={patient} onChange={changePatient} />
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
            {data.total ? (
              <>
                <DataTable
                  caption="Clinic visit log"
                  columns={columns}
                  rows={data.rows}
                  rowKey={(row) => row.id}
                  fixedLayout
                  minTableWidth="56rem"
                />
                <Pagination
                  page={list.pageNumber}
                  pageCount={data.lastPage}
                  total={data.total}
                  pageSize={list.pageSize}
                  onPageSizeChange={list.setPageSize}
                  itemLabel="visits"
                  onPageChange={list.setPage}
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
