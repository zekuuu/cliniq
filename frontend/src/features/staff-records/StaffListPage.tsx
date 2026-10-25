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
  EmptyState,
  ErrorState,
  Icon,
  Input,
  Select,
  Skeleton,
  type DataTableColumn,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { paths } from '../../routes/paths'
import { sortTableRows, toggleTableSort, type TableSortState } from '../../lib/tableSort'
import type { Personnel } from '../../types/entities'
import { getMockSessionUser, type SessionUser } from '../../lib/mock-db'
import { fetchStaffList, fetchStaffTypes } from './api/staffApi'

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

type StaffSortKey = 'name' | 'number' | 'type' | 'department'

const baseColumns: Array<DataTableColumn<Personnel>> = [
  {
    key: 'name',
    header: 'Full name',
    width: '27%',
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
  { key: 'number', header: 'Staff No.', width: '14%', cell: (person) => <span className="tabular-nums">{person.staffNumber}</span> },
  { key: 'type', header: 'Type', width: '19%', cell: (person) => person.type },
  { key: 'department', header: 'Department or role', width: '25%', cell: (person) => person.department ?? '—' },
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
  const [sort, setSort] = useState<TableSortState<StaffSortKey>>({ key: 'name', direction: 'ascending' })
  const { data, status, isRefetching, reload } = useAsyncData(`staff-list|${search}|${type}|${includeArchived}`, () =>
    fetchStaffList({ search, type, includeArchived }),
  )

  const back = <BackButton fallback={paths.dashboard} drillThroughOnly />
  if (viewer.role !== 'staff') {
    return (
      <div className="mx-auto max-w-page-wide px-4 pt-10 pb-8 sm:px-8">
        <ErrorState title="Staff access required." />
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState title="Unable to load staff records." onRetry={reload} />
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
  const labels: Record<StaffSortKey, string> = { name: 'Full name', number: 'Staff No.', type: 'Type', department: 'Department or role' }
  const columns = baseColumns.map((column) =>
    column.key in labels ? { ...column, sort: sortColumn(column.key as StaffSortKey, labels[column.key as StaffSortKey]) } : column,
  )
  const rows = sortTableRows(data, sort, (person, key) =>
    key === 'name' ? person.fullName : key === 'number' ? person.staffNumber : key === 'type' ? person.type : (person.department ?? ''),
  )

  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Staff List</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Teachers, non-teaching staff and utility workers seen at the clinic. Medical details stay inside the
              individual profile.
            </p>
          </div>
          <Link className={buttonClassName({ variant: 'primary' })} to={paths.staffNew}>
            <Icon name="plus" />
            Add Staff
          </Link>
        </div>
      </Card>

      <Card aria-labelledby="staff-list-title">
        <CardHeader
          titleId="staff-list-title"
          title="Staff records"
          description={`${data.length.toLocaleString('en-PH')} result${data.length === 1 ? '' : 's'} shown`}
          icon={<Icon name="user" />}
        />
        <CardBody className="flex flex-col gap-4">
          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_16rem_auto]">
            <Input label="Search" value={search} placeholder="Name or Staff No." onChange={(event) => setSearch(event.target.value)} />
            <TypeSelect value={type} onChange={setType} />
            <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-semibold text-text-primary shadow-card transition-colors hover:bg-surface">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(event) => setIncludeArchived(event.target.checked)}
                className="size-4 cursor-pointer accent-brand-green-dark"
              />
              Show archived
            </label>
          </div>

          <div aria-busy={isRefetching} className={isRefetching ? 'opacity-60' : undefined}>
            {data.length ? (
              <DataTable
                caption="Staff masterlist"
                columns={columns}
                rows={rows}
                rowKey={(person) => person.id}
                fixedLayout
                minTableWidth="40rem"
              />
            ) : (
              <EmptyState icon="user" title="No staff found" description="Try a different search or type filter, or add a staff record." />
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
