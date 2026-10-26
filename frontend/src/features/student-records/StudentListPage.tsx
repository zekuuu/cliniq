import { useEffect, useRef, useState, type ReactNode } from 'react'
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
import type { Student } from '../../types/entities'
import { getMockSessionUser, type SessionUser } from '../../lib/mock-db'
import { fetchGradeLevels, fetchStudentList } from './api/studentListApi'
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

function GradeSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
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

type StudentSortKey = 'name' | 'number' | 'grade' | 'status'

const baseColumns: Array<DataTableColumn<Student>> = [
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
        <Badge tone={student.recordComplete ? 'info' : 'warning'} variant="soft">
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
      <a
        href={paths.studentProfile(student.id)}
        className="inline-flex min-h-8 cursor-pointer items-center justify-center rounded-md border border-border px-2.5 text-xs font-semibold text-brand-green-dark transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none"
      >
        View Profile
      </a>
    ),
  },
]

/**
 * Student List (Screen #6). This is the masterlist special case: full names are correct, but no
 * medical/confidential fields are shown inline. The Admin reads it without Add Student (ADR-038).
 */
export function StudentListPage({ viewer = getMockSessionUser() }: { viewer?: SessionUser } = {}) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [sort, setSort] = useState<TableSortState<StudentSortKey>>({ key: 'name', direction: 'ascending' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = usePageSize()
  const changePageSize = (size: PageSize) => {
    setPageSize(size)
    setPage(1)
  }
  const key = `${search}|${gradeLevel}|${includeArchived}`
  const { data, status, isRefetching, reload } = useAsyncData(key, () =>
    fetchStudentList({ search, gradeLevel, includeArchived }),
  )

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('focus') === 'search') {
      searchInputRef.current?.focus()
    }
  }, [])

  // A top-level list shows Back only when a drill-through link opened it (the Dashboard).
  const back = <BackButton fallback={paths.dashboard} drillThroughOnly />
  if (status === 'error') {
    return (
      <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState title="Unable to load student records." onRetry={reload} />
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
    onSort: () => setSort((current) => toggleTableSort(current, key)),
  })
  const columns: Array<DataTableColumn<Student>> = baseColumns.map((column) => {
    if (column.key === 'name') return { ...column, sort: sortColumn('name', 'Full name') }
    if (column.key === 'number') return { ...column, sort: sortColumn('number', 'LRN') }
    if (column.key === 'grade') return { ...column, sort: sortColumn('grade', 'Grade level') }
    if (column.key === 'status') return { ...column, sort: sortColumn('status', 'Record status') }
    return column
  })
  const sortedData = sortTableRows(data, sort, (student, key) => {
    if (key === 'name') return student.fullName
    if (key === 'number') return student.lrn
    if (key === 'grade') return student.gradeLevel
    return student.recordComplete ? (student.archived ? 'Complete Archived' : 'Complete') : 'Incomplete'
  })
  const pageCount = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageRows = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Student List</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Search the masterlist by full name or LRN. Medical details stay inside the
              individual profile.
            </p>
          </div>
          {viewer.role === 'staff' && (
            <Link className={buttonClassName({ variant: 'primary' })} to={paths.studentNew}>
              <Icon name="plus" />
              Add Student
            </Link>
          )}
        </div>
      </Card>

      <Card aria-labelledby="student-list-title">
        <CardHeader
          titleId="student-list-title"
          title="Student records"
          description={`${data.length.toLocaleString('en-PH')} result${data.length === 1 ? '' : 's'} shown`}
          icon={<Icon name="users" />}
        />
        <CardBody className="flex flex-col gap-4">
          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_16rem_auto]">
            <Input
              ref={searchInputRef}
              label="Search"
              value={search}
              placeholder="Name or LRN"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
            <GradeSelect
              value={gradeLevel}
              onChange={(value) => {
                setGradeLevel(value)
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
              Include archived
            </label>
          </div>

          <div aria-busy={isRefetching} className={isRefetching ? 'opacity-60' : undefined}>
            {data.length ? (
              <>
                <DataTable
                  caption="Student masterlist"
                  columns={columns}
                  rows={pageRows}
                  rowKey={(student) => student.id}
                  fixedLayout
                  minTableWidth="40rem"
                />
                <Pagination
                  page={currentPage}
                  pageCount={pageCount}
                  total={sortedData.length}
                  pageSize={pageSize}
                  onPageSizeChange={changePageSize}
                  itemLabel="students"
                  onPageChange={setPage}
                />
              </>
            ) : (
              <EmptyState
                icon="users"
                title="No students found"
                description="Try a different search or grade-level filter."
              />
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
