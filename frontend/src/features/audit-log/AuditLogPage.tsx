import { useState } from 'react'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  DateRangePicker,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  ListItemLink,
  MultiSelect,
  Pagination,
  PrintDocument,
  PrintTable,
  Select,
  Skeleton,
  StatusBadge,
  type DataTableColumn,
  type StatusMap,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { describeRange, rangeForPreset, type DateRange } from '../../lib/dateRange'
import { formatDateRange, formatDateTime, todayISO } from '../../lib/dates'
import { sortTableRows, toggleTableSort, type TableSortState } from '../../lib/tableSort'
import { ROLE_LABELS, auditTargetTypes, type AuditLogRow, type AuditTargetType, type SessionUser } from '../../lib/mock-db'
import type { AuditActionType } from '../../types/entities'
import { paths } from '../../routes/paths'
import { fetchAuditLog } from './api/auditLogApi'

const PAGE_SIZE = 10
type AuditSortKey = 'timestamp' | 'user' | 'action' | 'module' | 'record'

const actionOptions: Array<{ value: AuditActionType; label: string }> = [
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'scan', label: 'Scan' },
  { value: 'submit', label: 'Submit' },
  { value: 'approve', label: 'Approve' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'archive', label: 'Archive' },
  { value: 'print', label: 'Print / Save as PDF' },
]

const actionStatusMap: StatusMap<AuditActionType> = {
  login: { label: 'Login', tone: 'success' },
  logout: { label: 'Logout', tone: 'neutral' },
  scan: { label: 'Scan', tone: 'info' },
  submit: { label: 'Submit', tone: 'info' },
  approve: { label: 'Approve', tone: 'success' },
  create: { label: 'Create', tone: 'success' },
  update: { label: 'Update', tone: 'info' },
  delete: { label: 'Delete', tone: 'error' },
  archive: { label: 'Archive', tone: 'neutral' },
  print: { label: 'Print / Save as PDF', tone: 'info' },
}

const targetLabels: Record<AuditTargetType, string> = {
  student: 'Student',
  visit: 'Visit',
  incident: 'Incident',
  inventory: 'Inventory',
  user: 'User account',
  report: 'Report',
  backup: 'Backup',
  'follow-up': 'Follow-up',
  'calendar-event': 'Calendar event',
}

interface AuditLogFilters {
  search: string
  range: DateRange
  userId: string
  actionTypes: AuditActionType[]
  targetTypes: AuditTargetType[]
}

function AuditLogSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      <Card className="p-5"><Skeleton className="h-7 w-48 max-w-full" /><Skeleton className="mt-2 h-4 w-96 max-w-full" /></Card>
      <Card className="p-5"><div className="flex flex-wrap gap-3"><Skeleton className="h-10 min-w-56 flex-1" /><Skeleton className="h-10 w-40" /><Skeleton className="h-10 w-48" /><Skeleton className="h-10 w-48" /><Skeleton className="h-10 w-48" /></div><div className="mt-5 flex flex-col gap-2">{Array.from({ length: 10 }, (_, index) => <Skeleton key={index} className="h-9 w-full" />)}</div></Card>
    </div>
  )
}

function targetPath(row: AuditLogRow, viewer: SessionUser): string | undefined {
  const target = row.target
  if (!target) return undefined
  // Only an actual generated report opens Reports; excuse letters, referrals, and issue reports have no page of their own.
  const isReport = target.recordType === 'report'
  if (viewer.role === 'admin') return isReport ? paths.reports : undefined
  switch (target.type) {
    case 'student':
      return target.studentNumber ? paths.studentProfile(target.studentNumber) : undefined
    case 'visit':
      return paths.visitDetail(target.id)
    case 'incident':
      return paths.incidentReport(target.id)
    case 'follow-up':
      return paths.followUps
    case 'report':
      return isReport ? paths.reports : undefined
    case 'backup':
      return paths.backup
    default:
      return undefined
  }
}

const emptyCell = <span className="text-text-secondary">—</span>

function recordCell(row: AuditLogRow, viewer: SessionUser) {
  if (!row.target) return <span className="text-text-secondary">No record</span>
  const path = targetPath(row, viewer)
  if (!row.target.label) return path ? <ListItemLink to={path}>View<span className="sr-only"> {row.target.kind}</span></ListItemLink> : emptyCell
  return path ? <ListItemLink to={path}>{row.target.label}</ListItemLink> : row.target.label
}

/** The applied filters in words, for the printout's scope line. */
function filtersInWords(filters: AuditLogFilters, users: Array<{ id: string; name: string }>): string {
  const { range, userId, actionTypes, targetTypes, search } = filters
  const parts = [
    range.preset === 'all' ? 'all dates' : range.preset === 'custom' ? formatDateRange(range.from, range.to) : `${describeRange(range).toLowerCase()} (${formatDateRange(range.from, range.to)})`,
    userId ? `user ${users.find((user) => user.id === userId)?.name ?? 'Unknown user'}` : 'all users',
    actionTypes.length ? `actions ${actionTypes.map((type) => actionStatusMap[type].label).join(', ')}` : 'all actions',
    targetTypes.length ? `targets ${targetTypes.map((type) => targetLabels[type]).join(', ')}` : 'all targets',
  ]
  if (search.trim()) parts.push(`search "${search.trim()}"`)
  return parts.join('; ')
}

/**
 * The compliance printout (ADR-026, Module 11 "export/print a filtered view"): the filters in words, the
 * entry count, and every matching entry (not just the page on screen), in the screen's order.
 */
function AuditLogPrint({ rows, filters, users, viewer }: { rows: AuditLogRow[]; filters: AuditLogFilters; users: Array<{ id: string; name: string }>; viewer: SessionUser }) {
  return (
    <PrintDocument
      title="Audit Log"
      viewer={viewer}
      scope={`${rows.length.toLocaleString('en-PH')} ${rows.length === 1 ? 'entry' : 'entries'}. Filters: ${filtersInWords(filters, users)}. Entries are permanent and cannot be edited or deleted.`}
    >
      <PrintTable
        caption="Filtered audit log"
        rows={rows}
        rowKey={(row) => row.id}
        empty="No audit entries match these filters."
        columns={[
          { header: 'Date and time', width: '22%', cell: (row) => formatDateTime(row.dateTime) },
          { header: 'Who', width: '24%', cell: (row) => <>{row.userName}{row.userRole && <span className="block text-[8.5pt] text-text-secondary">{ROLE_LABELS[row.userRole]}</span>}</> },
          { header: 'Action', width: '26%', cell: (row) => <>{actionStatusMap[row.actionType].label}{row.summary && <span className="block text-[8.5pt] text-text-secondary">{row.summary}</span>}</> },
          { header: 'Record', cell: (row) => (row.target ? [row.target.kind, row.target.label].filter(Boolean).join(' · ') : 'No record') },
        ]}
      />
    </PrintDocument>
  )
}

export function AuditLogPage({ viewer }: { viewer: SessionUser }) {
  const defaultRange = rangeForPreset('all', todayISO())
  const [filters, setFilters] = useState<AuditLogFilters>({ search: '', range: defaultRange, userId: '', actionTypes: [], targetTypes: [] })
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<TableSortState<AuditSortKey>>({ key: 'timestamp', direction: 'descending' })
  const { search, range, userId, actionTypes, targetTypes } = filters
  const queryKey = `${range.from}|${range.to}|${userId}|${actionTypes.join(',')}|${targetTypes.join(',')}`
  const { data, status, isRefetching, reload } = useAsyncData(queryKey, () => fetchAuditLog({ from: range.from, to: range.to, userId, actionTypes, targetTypes }))
  const updateFilters = (changes: Partial<AuditLogFilters>) => {
    setFilters((current) => ({ ...current, ...changes }))
    setPage(1)
  }

  if (status === 'error') return <div className="mx-auto max-w-page-wide px-4 pt-10 pb-8 sm:px-8"><ErrorState title="Unable to load the audit log." onRetry={reload} /></div>
  if (!data) return <><p className="sr-only" role="status">Loading audit log...</p><AuditLogSkeleton /></>

  // Search matches only what the table already shows, so it never surfaces hidden student details.
  const needle = search.trim().toLowerCase()
  const filteredRows = needle
    ? data.rows.filter((row) =>
        [row.userName, row.userRole ? ROLE_LABELS[row.userRole] : '', actionStatusMap[row.actionType].label, row.summary ?? '', row.target?.kind ?? 'No record', row.target?.label ?? '']
          .some((text) => text.toLowerCase().includes(needle)),
      )
    : data.rows
  const sortedRows = sortTableRows(filteredRows, sort, (row, key) => {
    if (key === 'timestamp') return row.dateTime
    if (key === 'user') return row.userName
    if (key === 'action') return actionStatusMap[row.actionType].label
    if (key === 'module') return row.target?.kind ?? ''
    return row.target?.label ?? ''
  })
  const changeSort = (key: AuditSortKey) => {
    setSort((current) => toggleTableSort(current, key))
    setPage(1)
  }
  const sortColumn = (key: AuditSortKey, label: string) => ({
    label,
    direction: sort.key === key ? sort.direction : undefined,
    onSort: () => changeSort(key),
  })
  const columns: Array<DataTableColumn<AuditLogRow>> = [
    { key: 'timestamp', header: 'Timestamp', rowHeader: true, width: '19%', sort: sortColumn('timestamp', 'Timestamp'), cell: (row) => formatDateTime(row.dateTime) },
    { key: 'user', header: 'Who', width: '20%', sort: sortColumn('user', 'Who'), cell: (row) => <div className="flex flex-col"><span>{row.userName}</span>{row.userRole && <span className="text-xs text-text-secondary">{ROLE_LABELS[row.userRole]}</span>}</div> },
    { key: 'action', header: 'Action', width: '20%', sort: sortColumn('action', 'Action'), cell: (row) => <div className="flex flex-col items-start gap-1"><StatusBadge status={row.actionType} map={actionStatusMap} />{row.summary && <span className="text-xs text-text-secondary">{row.summary}</span>}</div> },
    { key: 'module', header: 'Module', width: '17%', sort: sortColumn('module', 'Module'), cell: (row) => row.target?.kind ?? emptyCell },
    { key: 'record', header: 'Record', width: '24%', sort: sortColumn('record', 'Record'), cell: (row) => recordCell(row, viewer) },
  ]
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = sortedRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const clearFilters = () => {
    updateFilters({ search: '', range: defaultRange, userId: '', actionTypes: [], targetTypes: [] })
  }

  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      <Card className="p-5 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Audit Log</h1>
            <p className="mt-1 text-sm text-text-secondary">Review accountable system activity. Audit entries are permanent and cannot be edited or deleted.</p>
          </div>
          <Button variant="secondary" icon="printer" onClick={() => window.print()}>Print / Save as PDF</Button>
        </div>
      </Card>

      <Card aria-labelledby="audit-log-title">
        <CardHeader titleId="audit-log-title" title="Audit entries" description={`${sortedRows.length.toLocaleString('en-PH')} entr${sortedRows.length === 1 ? 'y' : 'ies'} shown · ${describeRange(range)}`} icon={<Icon name="clipboardList" />} actions={<Button variant="neutral" onClick={clearFilters} className="print:hidden">Clear Filters</Button>} />
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3 print:hidden">
            <Input label="Search" type="search" value={search} placeholder="User, role, action, or target record" onChange={(event) => updateFilters({ search: event.target.value })} className="w-full sm:min-w-56 sm:flex-1" />
            <DateRangePicker value={range} onChange={(value) => updateFilters({ range: value })} today={defaultRange.to} presets={['all', 'today', 'last7', 'thisMonth', 'custom']} presetLabels={{ last7: 'This week' }} customPopover popoverAlign="start" />
            <Select label="User" value={userId} options={data.users.map((user) => ({ value: user.id, label: user.name }))} placeholder="All users" clearable onChange={(value) => updateFilters({ userId: value })} className="w-full sm:w-48" />
            <MultiSelect label="Action type" values={actionTypes} options={actionOptions} allLabel="All actions" onChange={(values) => updateFilters({ actionTypes: values as AuditActionType[] })} className="w-full sm:w-48" />
            <MultiSelect label="Target / module" values={targetTypes} options={auditTargetTypes.map((type) => ({ value: type, label: targetLabels[type] }))} allLabel="All targets" onChange={(values) => updateFilters({ targetTypes: values as AuditTargetType[] })} className="w-full sm:w-48" />
          </div>
          <div aria-busy={isRefetching} className={isRefetching ? 'opacity-60' : undefined}>
            {sortedRows.length ? <><DataTable caption="Filtered audit log" columns={columns} rows={pageRows} rowKey={(row) => row.id} fixedLayout /><Pagination page={currentPage} pageCount={pageCount} total={sortedRows.length} pageSize={PAGE_SIZE} itemLabel="entries" onPageChange={setPage} /></> : <EmptyState icon="clipboardList" title="No audit entries found" description="Try another search, date range, user, action type, or target/module filter." />}
          </div>
        </CardBody>
      </Card>
      <AuditLogPrint rows={sortedRows} filters={filters} users={data.users} viewer={viewer} />
    </div>
  )
}
