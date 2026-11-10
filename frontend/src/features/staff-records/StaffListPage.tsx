import { useState, type ReactNode } from 'react'
import { DRILL_THROUGH_STATE } from '../../hooks/useGoBack'
import { rowsInNewestYear } from '../archive/newestArchivedYear'
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
  Pagination,
  Select,
  Skeleton,
  type DataTableColumn,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { usePageSize, type PageSize } from '../../hooks/usePageSize'
import { paths } from '../../routes/paths'
import { sortTableRows, toggleTableSort, type TableSortState } from '../../lib/tableSort'
import type { Personnel } from '../../types/entities'
import {
  getArchive,
  getMockSessionUser,
  missingStaffFields,
  type SessionUser,
} from '../../lib/mock-db'
import { fetchStaffIncompleteRecords, fetchStaffList, fetchStaffTypes } from './api/staffApi'

function StaffListSkeleton({ back }: { back: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Card className="p-5">
          <Skeleton className="h-7 w-48 max-w-full" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </Card>
        <Card className="p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="mt-5 flex flex-col gap-3">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function TypeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { data: types = [] } = useAsyncData('staff-types', fetchStaffTypes)
  return (
    <Select
      label="Type"
      value={value}
      placeholder="All types"
      clearable
      options={types.map((type) => ({ value: type, label: type }))}
      onChange={onChange}
    />
  )
}

type StaffSortKey = 'name' | 'number' | 'type' | 'department' | 'status'

/** Record status, as on the Student List (ADR-067): incomplete = something `missingStaffFields` names. */
type RecordStatusFilter = '' | 'complete' | 'incomplete'
const recordStatusOptions = [
  { value: 'complete', label: 'Complete' },
  { value: 'incomplete', label: 'Incomplete' },
]
const isIncomplete = (person: Personnel) => missingStaffFields(person).length > 0

const baseColumns: Array<DataTableColumn<Personnel>> = [
  {
    key: 'name',
    header: 'Full name',
    width: '24%',
    rowHeader: true,
    cell: (person) => (
      <span className="flex flex-wrap items-center gap-2">
        {person.fullName}
        {person.archived && (
          <Badge tone="neutral" variant="outline" icon="archive">
            Archived
          </Badge>
        )}
      </span>
    ),
  },
  {
    key: 'number',
    header: 'Staff No.',
    width: '12%',
    cell: (person) => <span className="tabular-nums">{person.staffNumber}</span>,
  },
  { key: 'type', header: 'Type', width: '16%', cell: (person) => person.type },
  {
    key: 'department',
    header: 'Department or role',
    width: '20%',
    cell: (person) => person.department ?? '—',
  },
  {
    key: 'status',
    header: 'Record status',
    width: '13%',
    cell: (person) => (
      <Badge tone={isIncomplete(person) ? 'warning' : 'success'} variant="soft">
        {isIncomplete(person) ? 'Incomplete' : 'Complete'}
      </Badge>
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    width: '15%',
    align: 'right',
    cell: (person) => (
      <Link to={paths.staffProfile(person.id)} className={buttonClassName({ size: 'sm' })}>
        View Profile
      </Link>
    ),
  },
]

/**
 * Staff List (ADR-043, D7): teachers and school staff seen at the clinic. A deliberate masterlist,
 * like the Student List, so names are shown; nothing medical appears inline. School Clinician only.
 */
export function StaffListPage({ viewer = getMockSessionUser() }: { viewer?: SessionUser } = {}) {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  // ADR-067: Complete / Incomplete; the Incomplete records button opens the staff queue page instead.
  const [recordStatus, setRecordStatus] = useState<RecordStatusFilter>('')
  const incompleteOnly = recordStatus === 'incomplete'
  const [sort, setSort] = useState<TableSortState<StaffSortKey>>({
    key: 'name',
    direction: 'ascending',
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = usePageSize()
  const changePageSize = (size: PageSize) => {
    setPageSize(size)
    setPage(1)
  }
  const { data, status, isRefetching, reload } = useAsyncData(
    `staff-list|${search}|${type}|${includeArchived}`,
    () => fetchStaffList({ search, type, includeArchived }),
  )
  // The button counts the open rows on the staff Incomplete Records page.
  const queue = useAsyncData('staff-incomplete-records', fetchStaffIncompleteRecords)
  // The Archive page's door from here too, as on the Student List (professor's consultation, November 6, 2026).
  const archive = useAsyncData(`archive-count|${viewer.role}`, () => getArchive(viewer))
  const incompleteCount = queue.data?.filter((record) => record.status === 'open').length ?? 0

  const back = <BackButton fallback={paths.dashboard} drillThroughOnly />
  if (viewer.role !== 'staff') {
    return (
      <div className="mx-auto max-w-page-wide px-4 pt-10 pb-8 sm:px-8">
        <ErrorState asPageTitle title="Staff access required." />
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState asPageTitle title="Unable to load staff records." onRetry={reload} />
      </div>
    )
  }
  if (!data) {
    return (
      <>
        <p className="sr-only" role="status">
          Loading staff list...
        </p>
        <StaffListSkeleton back={back} />
      </>
    )
  }

  const sortColumn = (key: StaffSortKey, label: string) => ({
    label,
    direction: sort.key === key ? sort.direction : undefined,
    onSort: () => setSort((current) => toggleTableSort(current, key)),
  })
  const labels: Record<StaffSortKey, string> = {
    name: 'Full name',
    number: 'Staff No.',
    type: 'Type',
    department: 'Department or role',
    status: 'Record status',
  }
  const sortable = baseColumns.map((column) =>
    column.key in labels
      ? {
          ...column,
          sort: sortColumn(column.key as StaffSortKey, labels[column.key as StaffSortKey]),
        }
      : column,
  )
  // Filtered to incomplete records: what's missing, and Edit Record straight to the form, as on the student queue.
  const columns: Array<DataTableColumn<Personnel>> = incompleteOnly
    ? [
        ...sortable.filter((column) => !['department', 'status', 'actions'].includes(column.key)),
        {
          key: 'missing',
          header: 'Missing fields',
          width: '25%',
          cell: (person) => (
            <span className="flex flex-wrap gap-1">
              {missingStaffFields(person).map((field) => (
                // The student queue's badge (Zean, November 5, 2026).
                <Badge key={field} tone="warning" variant="soft" className="whitespace-normal!">
                  {field}
                </Badge>
              ))}
            </span>
          ),
        },
        {
          key: 'actions',
          header: 'Actions',
          width: '15%',
          align: 'right',
          cell: (person) => (
            <Link
              to={paths.staffEdit(person.id)}
              aria-label={`Edit Record for ${person.fullName}`}
              className={buttonClassName({ size: 'sm' })}
            >
              <Icon name="pencil" />
              Edit Record
            </Link>
          ),
        },
      ]
    : sortable
  const listed = recordStatus
    ? data.filter((person) => isIncomplete(person) === incompleteOnly)
    : data
  // By last name, then first name (ADR-064): the order the list arrives in.
  const nameOrder = new Map(data.map((person, index) => [person.id, index]))
  const rows = sortTableRows(listed, sort, (person, key) =>
    key === 'name'
      ? nameOrder.get(person.id)
      : key === 'number'
        ? person.staffNumber
        : key === 'type'
          ? person.type
          : key === 'status'
            ? isIncomplete(person)
              ? 'Incomplete'
              : 'Complete'
            : (person.department ?? ''),
  )
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Staff List</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Teachers, non-teaching staff and utility workers seen at the clinic. Medical details
              stay inside the individual profile.
            </p>
          </div>
          {/* ml-auto: when the actions wrap under the description they stay right-aligned, as on the Student List. */}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
            <Link
              className={buttonClassName({ variant: 'secondary' })}
              to={paths.archive}
              state={{ ...DRILL_THROUGH_STATE, section: 'staff' }}
            >
              <Icon name="archive" />
              Archive{archive.data ? ` (${rowsInNewestYear(archive.data.staff).length})` : ''}
            </Link>
            {/* ADR-067: the staff Incomplete Records page, as the Student List's button opens the student queue. */}
            <Link className={buttonClassName({ variant: 'secondary' })} to={paths.staffIncomplete}>
              <Icon name="alertTriangle" />
              Incomplete records ({incompleteCount})
            </Link>
            {/* ADR-069, as on the Student List. */}
            <Link className={buttonClassName({ variant: 'secondary' })} to={paths.staffImport}>
              <Icon name="fileText" />
              Import List
            </Link>
            <Link className={buttonClassName({ variant: 'primary' })} to={paths.staffNew}>
              <Icon name="plus" />
              Add Staff
            </Link>
          </div>
        </div>
      </Card>

      <Card aria-labelledby="staff-list-title">
        <CardHeader
          titleId="staff-list-title"
          title="Staff records"
          description={`${listed.length.toLocaleString('en-PH')} result${listed.length === 1 ? '' : 's'} shown${incompleteOnly ? ' · incomplete records only' : ''}`}
          icon={<Icon name="user" />}
        />
        <CardBody className="flex flex-col gap-4">
          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_16rem_12rem_auto]">
            <Input
              label="Search"
              type="search"
              value={search}
              placeholder="Name or Staff No."
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
            <TypeSelect
              value={type}
              onChange={(value) => {
                setType(value)
                setPage(1)
              }}
            />
            <Select
              label="Record status"
              value={recordStatus}
              placeholder="All records"
              clearable
              options={recordStatusOptions}
              onChange={(value) => {
                setRecordStatus(value as RecordStatusFilter)
                setPage(1)
              }}
            />
            <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-semibold text-text-primary shadow-card transition-colors hover:bg-surface">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(event) => {
                  setIncludeArchived(event.target.checked)
                  setPage(1)
                }}
                className="size-4 cursor-pointer accent-brand-green-dark"
              />
              Show archived
            </label>
          </div>

          <div aria-busy={isRefetching} className={isRefetching ? 'opacity-60' : undefined}>
            {listed.length ? (
              <>
                <DataTable
                  caption="Staff masterlist"
                  columns={columns}
                  rows={pageRows}
                  rowKey={(person) => person.id}
                  fixedLayout
                  minTableWidth="40rem"
                />
                <Pagination
                  page={currentPage}
                  pageCount={pageCount}
                  total={rows.length}
                  pageSize={pageSize}
                  onPageSizeChange={changePageSize}
                  itemLabel="staff"
                  onPageChange={setPage}
                />
              </>
            ) : (
              <EmptyState
                icon="user"
                title={incompleteOnly ? 'No incomplete staff records' : 'No staff found'}
                description={
                  incompleteOnly
                    ? 'Every staff record shown has a sex and an emergency contact.'
                    : 'Try a different search, type, or record-status filter, or add a staff record.'
                }
              />
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
