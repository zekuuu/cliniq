import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DRILL_THROUGH_STATE } from '../../hooks/useGoBack'
import { fetchArchiveCount } from '../archive/archiveCount'
import { Link, useLocation, useSearchParams } from 'react-router'
import {
  ActionMenu,
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
import { usePagedList } from '../../hooks/usePagedList'
import { STUDENT_SEARCH_MIN_LENGTH } from '../../lib/lrn'
import { paths } from '../../routes/paths'
import { toggleTableSort } from '../../lib/tableSort'
import type { StudentListRow } from '../../types/entities'
import { getMockSessionUser, type SessionUser } from '../../lib/data'
import {
  fetchGradeLevels,
  fetchIncompleteCount,
  fetchStudentPage,
  STUDENT_SORT_KEYS,
  type StudentSortKey,
} from './api/studentListApi'
import { MaskedLrn } from '../../components/ui/MaskedLrn'

function StudentListSkeleton({ back }: { back: ReactNode }) {
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

function GradeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { data: gradeLevels = [] } = useAsyncData('grade-levels', fetchGradeLevels)
  return (
    <Select
      label="Grade level"
      value={value}
      placeholder="All grade levels"
      clearable
      options={gradeLevels.map((level) => ({ value: level, label: level }))}
      onChange={onChange}
    />
  )
}

type RecordStatusFilter = '' | 'complete' | 'incomplete'

const recordStatusOptions = [
  { value: 'complete', label: 'Complete' },
  { value: 'incomplete', label: 'Incomplete' },
]

const baseColumns: Array<DataTableColumn<StudentListRow>> = [
  {
    key: 'name',
    header: 'Full name',
    width: '27%',
    rowHeader: true,
    cell: (student) => student.fullName,
  },
  {
    key: 'number',
    header: 'LRN',
    width: '20%',
    cell: (student) => <MaskedLrn lrn={student.lrn} />,
  },
  {
    key: 'grade',
    header: 'Grade level',
    width: '15%',
    cell: (student) => student.gradeLevel,
  },
  {
    key: 'status',
    header: 'Record status',
    width: '23%',
    cell: (student) => (
      <div className="flex flex-wrap gap-1">
        <Badge tone={student.recordComplete ? 'success' : 'warning'} variant="soft">
          {student.recordComplete ? 'Complete' : 'Incomplete'}
        </Badge>
        {student.archived && (
          <Badge tone="neutral" variant="outline" icon="archive">
            Archived
          </Badge>
        )}
      </div>
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    width: '15%',
    align: 'right',
    cell: (student) => (
      // A router link: a plain href reloaded the whole app and its shell reads (ADR-082).
      <Link
        to={paths.studentProfile(student.id)}
        className="inline-flex min-h-8 cursor-pointer items-center justify-center rounded-md border border-border px-2.5 text-xs font-semibold text-brand-green-dark transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none"
      >
        View Profile
      </Link>
    ),
  },
]

/**
 * Student List (Screen #6). This is the masterlist special case: full names are correct, but no
 * medical/confidential fields are shown inline. The Admin reads it without Add Student (ADR-038).
 */
export function StudentListPage({ viewer = getMockSessionUser() }: { viewer?: SessionUser } = {}) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [gradeLevel, setGradeLevel] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  // `?record=incomplete` is read only on arrival; the Dashboard chip now opens the Incomplete Records Queue instead.
  const [searchParams] = useSearchParams()
  const [recordStatus, setRecordStatus] = useState<RecordStatusFilter>(() => {
    const value = searchParams.get('record')
    return value === 'complete' || value === 'incomplete' ? value : ''
  })
  // R11: a way to the Incomplete Records Queue besides the Dashboard. The queue is Staff only (ADR-038).
  // Staff only: the link is never shown to the Admin, and the API answers the Admin 403 (ADR-080).
  const { data: incompleteCount } = useAsyncData(`incomplete-count|${viewer.role}`, () =>
    viewer.role === 'staff' ? fetchIncompleteCount() : Promise.resolve(undefined),
  )
  // The second door to the Archive page (the sidebar is the first): only its count is read.
  const { data: archiveCount } = useAsyncData(`archive-count|${viewer.role}`, () =>
    fetchArchiveCount(viewer, 'students'),
  )
  // One page at a time from the server; page, search and sort live in the address (ADR-082).
  const list = usePagedList({
    key: 'student-list',
    filters: { gradeLevel, includeArchived, recordStatus },
    sortKeys: STUDENT_SORT_KEYS,
    defaultSort: { key: 'name', direction: 'ascending' },
    load: fetchStudentPage,
    minSearch: STUDENT_SEARCH_MIN_LENGTH,
  })
  const { page: data, status, isRefetching, reload, sort } = list

  // The field renders once the list has loaded; Alt + K can also arrive while the page is already open.
  const listReady = Boolean(data)
  const { search: urlSearch } = useLocation()
  useEffect(() => {
    if (listReady && new URLSearchParams(urlSearch).get('focus') === 'search')
      searchInputRef.current?.focus()
  }, [listReady, urlSearch])

  // A top-level list shows Back only when a drill-through link opened it (the Dashboard).
  const back = <BackButton fallback={paths.dashboard} drillThroughOnly />
  if (status === 'error') {
    return (
      <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState asPageTitle title="Unable to load student records." onRetry={reload} />
      </div>
    )
  }

  if (!data) {
    return (
      <>
        <p className="sr-only" role="status">
          Loading student list...
        </p>
        <StudentListSkeleton back={back} />
      </>
    )
  }

  const sortColumn = (key: StudentSortKey, label: string) => ({
    label,
    direction: sort.key === key ? sort.direction : undefined,
    onSort: () => list.setSort(toggleTableSort(sort, key)),
  })
  const columns: Array<DataTableColumn<StudentListRow>> = baseColumns.map((column) => {
    if (column.key === 'name') return { ...column, sort: sortColumn('name', 'Full name') }
    if (column.key === 'number') return { ...column, sort: sortColumn('number', 'LRN') }
    if (column.key === 'grade') return { ...column, sort: sortColumn('grade', 'Grade level') }
    if (column.key === 'status') return { ...column, sort: sortColumn('status', 'Record status') }
    return column
  })

  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Student List</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Search the masterlist by full name or LRN. Medical details stay inside the individual
              profile.
            </p>
          </div>
          <div className="ml-auto flex flex-wrap justify-end gap-2">
            {viewer.role === 'admin' && (
              <Link
                className={buttonClassName({ variant: 'secondary' })}
                to={paths.archive}
                state={{ ...DRILL_THROUGH_STATE, section: 'students' }}
              >
                <Icon name="archive" />
                Archive{archiveCount !== undefined ? ` (${archiveCount})` : ''}
              </Link>
            )}
            {viewer.role === 'staff' && (
              <>
                {incompleteCount !== undefined && (
                  <Link
                    className={buttonClassName({ variant: 'secondary' })}
                    to={paths.incompleteRecords}
                  >
                    <Icon name="alertTriangle" />
                    Incomplete records ({incompleteCount})
                  </Link>
                )}
                <Link className={buttonClassName({ variant: 'primary' })} to={paths.studentNew}>
                  <Icon name="plus" />
                  Add Student
                </Link>
                <ActionMenu
                  label="More actions for Student List"
                  items={[
                    {
                      key: 'import',
                      label: 'Import List',
                      icon: 'fileText',
                      href: paths.studentImport,
                    },
                    {
                      key: 'archive',
                      label: `Archive${archiveCount !== undefined ? ` (${archiveCount})` : ''}`,
                      icon: 'archive',
                      href: paths.archive,
                      state: { ...DRILL_THROUGH_STATE, section: 'students' },
                    },
                  ]}
                />
              </>
            )}
          </div>
        </div>
      </Card>

      <Card aria-labelledby="student-list-title">
        <CardHeader
          titleId="student-list-title"
          title="Student records"
          description={`${data.total.toLocaleString('en-PH')} result${data.total === 1 ? '' : 's'} shown`}
          icon={<Icon name="users" />}
        />
        <CardBody className="flex flex-col gap-4">
          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_16rem_12rem_auto]">
            <Input
              ref={searchInputRef}
              label="Search"
              type="search"
              value={list.searchInput}
              placeholder="Name or LRN"
              onChange={(event) => list.setSearch(event.target.value)}
            />
            <GradeSelect value={gradeLevel} onChange={setGradeLevel} />
            <Select
              label="Record status"
              value={recordStatus}
              placeholder="All records"
              clearable
              options={recordStatusOptions}
              onChange={(value) => setRecordStatus(value as RecordStatusFilter)}
            />
            <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-semibold text-text-primary shadow-card transition-colors hover:bg-surface">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(event) => setIncludeArchived(event.target.checked)}
                className="size-4 cursor-pointer accent-brand-green-dark"
              />
              Include archived
            </label>
          </div>

          <div aria-busy={isRefetching} className={isRefetching ? 'opacity-60' : undefined}>
            {data.total ? (
              <>
                <DataTable
                  caption="Student masterlist"
                  columns={columns}
                  rows={data.rows}
                  rowKey={(student) => student.id}
                  fixedLayout
                  minTableWidth="40rem"
                />
                <Pagination
                  page={list.pageNumber}
                  pageCount={data.lastPage}
                  total={data.total}
                  pageSize={list.pageSize}
                  onPageSizeChange={list.setPageSize}
                  itemLabel="students"
                  onPageChange={list.setPage}
                />
              </>
            ) : (
              <EmptyState
                icon="users"
                title="No students found"
                description="Try a different search, grade-level, or record-status filter."
              />
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
