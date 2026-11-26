import { useState } from 'react'
import { flushSync } from 'react-dom'
import { Lrn } from '../../components/ui/MaskedLrn'
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
  PrintButton,
  PrintDocument,
  PrintTable,
  Select,
  Skeleton,
  StatusBadge,
  type DataTableColumn,
  type StatusMap,
} from '../../components'
import { usePagedList } from '../../hooks/usePagedList'
import { apiMode } from '../../lib/api/mode'
import { notify } from '../../lib/notify'
import { describeRange, rangeForPreset, type DateRange } from '../../lib/dateRange'
import { formatDateRange, formatDateTime, todayISO } from '../../lib/dates'
import type { ISODate } from '../../types/entities'
import { toggleTableSort } from '../../lib/tableSort'
import {
  ROLE_LABELS,
  auditTargetTypes,
  type AuditLogRow,
  type AuditTargetType,
  type SessionUser,
} from '../../lib/data'
import type { AuditActionType } from '../../types/entities'
import { paths } from '../../routes/paths'
import {
  AUDIT_SORT_KEYS,
  auditLogPrintUrl,
  fetchAuditLog,
  fetchAuditLogPage,
  filterAndSortAudit,
  type AuditSortKey,
} from './api/auditLogApi'

const actionOptions: Array<{ value: AuditActionType; label: string }> = [
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'submit', label: 'Submit' },
  { value: 'approve', label: 'Approve' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'archive', label: 'Archive' },
  { value: 'print', label: 'Print / Save as PDF' },
  { value: 'view', label: 'Viewed a record' },
]

const actionStatusMap: StatusMap<AuditActionType> = {
  login: { label: 'Login', tone: 'success' },
  logout: { label: 'Logout', tone: 'neutral' },
  submit: { label: 'Submit', tone: 'info' },
  approve: { label: 'Approve', tone: 'success' },
  create: { label: 'Create', tone: 'success' },
  update: { label: 'Update', tone: 'info' },
  delete: { label: 'Delete', tone: 'error' },
  archive: { label: 'Archive', tone: 'neutral' },
  print: { label: 'Print / Save as PDF', tone: 'info' },
  view: { label: 'Viewed a record', tone: 'neutral' },
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
  'sports-report': 'Sports Report',
  staff: 'Staff',
  'backup-location': 'Backup location',
  'school-year': 'School year',
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
    <div
      aria-hidden="true"
      className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8"
    >
      <Card className="p-5">
        <Skeleton className="h-7 w-48 max-w-full" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      </Card>
      <Card className="p-5">
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-10 min-w-56 flex-1" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="mt-5 flex flex-col gap-2">
          {Array.from({ length: 10 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      </Card>
    </div>
  )
}

function targetPath(row: AuditLogRow, viewer: SessionUser): string | undefined {
  const target = row.target
  if (!target) return undefined
  // Only an actual generated report opens Reports; excuse letters, referrals, and issue reports have no page of their own.
  const isReport = target.recordType === 'report'
  // ADR-038: the Admin can open a student profile and an incident report, nothing else that is Staff-only.
  if (viewer.role === 'admin') {
    if (target.type === 'student')
      return target.studentId ? paths.studentProfile(target.studentId) : undefined
    if (target.type === 'incident') return paths.incidentReport(target.id)
    return isReport ? paths.reports : undefined
  }
  switch (target.type) {
    case 'student':
      return target.studentId ? paths.studentProfile(target.studentId) : undefined
    case 'visit':
      return paths.visitDetail(target.id)
    case 'incident':
      return paths.incidentReport(target.id)
    case 'staff':
      return paths.staffProfile(target.id)
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
  if (!row.target.label)
    return path ? (
      <ListItemLink to={path}>
        View<span className="sr-only"> {row.target.kind}</span>
      </ListItemLink>
    ) : (
      emptyCell
    )
  // A student-related record shows its masked LRN on screen, never the name; only the printout shows it in full (Zean, November 7, 2026; was full on both, R33).
  const label = row.target.studentId ? (
    <>
      <span aria-hidden="true">LRN </span>
      <Lrn lrn={row.target.label} />
    </>
  ) : (
    row.target.label
  )
  return path ? <ListItemLink to={path}>{label}</ListItemLink> : label
}

/** The applied filters in words, for the printout's scope line. */
function filtersInWords(
  filters: AuditLogFilters,
  users: Array<{ id: string; name: string }>,
): string {
  const { range, userId, actionTypes, targetTypes, search } = filters
  const parts = [
    range.preset === 'all'
      ? 'all dates'
      : range.preset === 'custom'
        ? formatDateRange(range.from, range.to)
        : `${describeRange(range).toLowerCase()} (${formatDateRange(range.from, range.to)})`,
    userId
      ? `user ${users.find((user) => user.id === userId)?.name ?? 'Unknown user'}`
      : 'all users',
    actionTypes.length
      ? `actions ${actionTypes.map((type) => actionStatusMap[type].label).join(', ')}`
      : 'all actions',
    targetTypes.length
      ? `targets ${targetTypes.map((type) => targetLabels[type]).join(', ')}`
      : 'all targets',
  ]
  if (search.trim()) parts.push(`search "${search.trim()}"`)
  return parts.join('; ')
}

/**
 * The compliance printout (ADR-026, Module 11 "export/print a filtered view"): the filters in words, the
 * entry count, and every matching entry (not just the page on screen), in the screen's order.
 */
function AuditLogPrint({
  rows,
  onePage,
  filters,
  users,
  viewer,
}: {
  rows: AuditLogRow[]
  /** Set when only the page on screen prints (Ctrl+P without the Print button); the scope says so. */
  onePage: { page: number; lastPage: number; total: number } | null
  filters: AuditLogFilters
  users: Array<{ id: string; name: string }>
  viewer: SessionUser
}) {
  const count = onePage
    ? `Page ${onePage.page} of ${onePage.lastPage} only: ${rows.length.toLocaleString('en-PH')} of ${onePage.total.toLocaleString('en-PH')} entries. Use the Print button for every entry`
    : `${rows.length.toLocaleString('en-PH')} ${rows.length === 1 ? 'entry' : 'entries'}`
  return (
    <PrintDocument
      title="Audit Log"
      viewer={viewer}
      scope={`${count}. Filters: ${filtersInWords(filters, users)}. Entries are permanent and cannot be edited or deleted.`}
    >
      <PrintTable
        caption="Filtered audit log"
        rows={rows}
        rowKey={(row) => row.id}
        empty="No audit entries match these filters."
        columns={[
          { header: 'Date and time', width: '22%', cell: (row) => formatDateTime(row.dateTime) },
          {
            header: 'Who',
            width: '24%',
            cell: (row) => (
              <>
                {row.userName}
                {row.userRole && (
                  <span className="block text-[8.5pt] text-text-secondary">
                    {ROLE_LABELS[row.userRole]}
                  </span>
                )}
              </>
            ),
          },
          {
            header: 'Action',
            width: '26%',
            cell: (row) => (
              <>
                {actionStatusMap[row.actionType].label}
                {row.summary && (
                  <span className="block text-[8.5pt] text-text-secondary">{row.summary}</span>
                )}
              </>
            ),
          },
          // The printout keeps the full LRN; the screen masks it (Zean, November 7, 2026).
          {
            header: 'Record',
            cell: (row) =>
              row.target
                ? [row.target.kind, row.target.label].filter(Boolean).join(' · ')
                : 'No record',
          },
        ]}
      />
    </PrintDocument>
  )
}

/**
 * `embedded` (the Archive page's Audit log tab): just the entries card, no page header or printout, and
 * `range` sets its starting period (a school year). The log itself is never trimmed (ADR-057).
 */
export function AuditLogPage({
  viewer,
  embedded = false,
  range: startRange,
}: {
  viewer: SessionUser
  embedded?: boolean
  range?: { from: ISODate; to: ISODate }
}) {
  const defaultRange: DateRange = startRange
    ? { preset: 'custom', ...startRange }
    : rangeForPreset('all', todayISO())
  const [selected, setSelected] = useState<Omit<AuditLogFilters, 'search'>>({
    range: defaultRange,
    userId: '',
    actionTypes: [],
    targetTypes: [],
  })
  const { range, userId, actionTypes, targetTypes } = selected
  const query = { from: range.from, to: range.to, userId, actionTypes, targetTypes }
  // One page at a time from the server; page, search and sort live in the address (ADR-082).
  const list = usePagedList({
    key: 'audit-log',
    filters: query,
    sortKeys: AUDIT_SORT_KEYS,
    defaultSort: { key: 'timestamp', direction: 'descending' },
    load: fetchAuditLogPage,
  })
  const { page: data, status, isRefetching, reload, sort } = list
  const filters: AuditLogFilters = { ...selected, search: list.search }
  // The Print button prints every matching entry, not the page on screen. In API mode the Staff-only
  // server stream writes the complete A4 document in chunks and logs one print (ADR-044, ADR-093).
  // Mock mode keeps the existing in-app print document.
  const [printRows, setPrintRows] = useState<AuditLogRow[] | null>(null)
  async function printAll() {
    if (apiMode('AUDIT') === 'api') {
      const popup = window.open(auditLogPrintUrl(query, list.search, sort), '_blank')
      if (popup) popup.opener = null
      else notify.error('Allow the print window, then try again.')
      return
    }
    try {
      const all = await fetchAuditLog(query)
      flushSync(() => setPrintRows(filterAndSortAudit(all.rows, list.search, sort)))
      window.addEventListener('afterprint', () => setPrintRows(null), { once: true })
    } catch {
      // The page on screen still prints, and its printout says so.
    }
    window.print()
  }
  const updateFilters = (changes: Partial<AuditLogFilters>) => {
    const { search, ...rest } = changes
    if (search !== undefined) list.setSearch(search)
    if (Object.keys(rest).length) setSelected((current) => ({ ...current, ...rest }))
  }

  if (status === 'error')
    return (
      <div className="mx-auto max-w-page-wide px-4 pt-10 pb-8 sm:px-8">
        <ErrorState asPageTitle title="Unable to load the audit log." onRetry={reload} />
      </div>
    )
  if (!data)
    return (
      <>
        <p className="sr-only" role="status">
          Loading audit log...
        </p>
        <AuditLogSkeleton />
      </>
    )

  // The server searches only what the table shows, so a search never surfaces hidden student details.
  const changeSort = (key: AuditSortKey) => list.setSort(toggleTableSort(sort, key))
  const sortColumn = (key: AuditSortKey, label: string) => ({
    label,
    direction: sort.key === key ? sort.direction : undefined,
    onSort: () => changeSort(key),
  })
  const columns: Array<DataTableColumn<AuditLogRow>> = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      rowHeader: true,
      width: '19%',
      sort: sortColumn('timestamp', 'Timestamp'),
      cell: (row) => formatDateTime(row.dateTime),
    },
    {
      key: 'user',
      header: 'Who',
      width: '20%',
      sort: sortColumn('user', 'Who'),
      cell: (row) => (
        <div className="flex flex-col">
          <span>{row.userName}</span>
          {row.userRole && (
            <span className="text-xs text-text-secondary">{ROLE_LABELS[row.userRole]}</span>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      width: '20%',
      sort: sortColumn('action', 'Action'),
      cell: (row) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={row.actionType} map={actionStatusMap} />
          {row.summary && <span className="text-xs text-text-secondary">{row.summary}</span>}
        </div>
      ),
    },
    {
      key: 'module',
      header: 'Module',
      width: '17%',
      sort: sortColumn('module', 'Module'),
      cell: (row) => row.target?.kind ?? emptyCell,
    },
    {
      key: 'record',
      header: 'Record',
      width: '24%',
      sort: sortColumn('record', 'Record'),
      cell: (row) => recordCell(row, viewer),
    },
  ]
  const clearFilters = () => {
    updateFilters({ search: '', range: defaultRange, userId: '', actionTypes: [], targetTypes: [] })
  }

  const shownLine = `${data.total.toLocaleString('en-PH')} entr${data.total === 1 ? 'y' : 'ies'} shown · ${describeRange(range)}`
  const clearButton = (
    <Button variant="neutral" onClick={clearFilters} className="print:hidden">
      Clear Filters
    </Button>
  )
  const body = (
    <>
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <Input
          label="Search"
          type="search"
          value={list.searchInput}
          placeholder="User, role, action, or target record"
          onChange={(event) => updateFilters({ search: event.target.value })}
          className="w-full sm:min-w-56 sm:flex-1"
        />
        <DateRangePicker
          value={range}
          onChange={(value) => updateFilters({ range: value })}
          today={defaultRange.to}
          presets={['all', 'today', 'last7', 'thisMonth', 'custom']}
          presetLabels={{ last7: 'This week' }}
          customPopover
          popoverAlign="start"
        />
        <Select
          label="User"
          value={userId}
          options={data.users.map((user) => ({ value: user.id, label: user.name }))}
          placeholder="All users"
          clearable
          onChange={(value) => updateFilters({ userId: value })}
          className="w-full sm:w-48"
        />
        <MultiSelect
          label="Action type"
          values={actionTypes}
          options={actionOptions}
          allLabel="All actions"
          onChange={(values) => updateFilters({ actionTypes: values as AuditActionType[] })}
          className="w-full sm:w-48"
        />
        <MultiSelect
          label="Target / module"
          values={targetTypes}
          options={auditTargetTypes.map((type) => ({ value: type, label: targetLabels[type] }))}
          allLabel="All targets"
          onChange={(values) => updateFilters({ targetTypes: values as AuditTargetType[] })}
          className="w-full sm:w-48"
        />
      </div>
      <div aria-busy={isRefetching} className={isRefetching ? 'opacity-60' : undefined}>
        {data.total ? (
          <>
            <DataTable
              caption="Filtered audit log"
              columns={columns}
              rows={data.rows}
              rowKey={(row) => row.id}
              fixedLayout
            />
            <Pagination
              page={list.pageNumber}
              pageCount={data.lastPage}
              total={data.total}
              pageSize={list.pageSize}
              onPageSizeChange={list.setPageSize}
              itemLabel="entries"
              onPageChange={list.setPage}
            />
          </>
        ) : (
          <EmptyState
            icon="clipboardList"
            title="No audit entries found"
            description="Try another search, date range, user, action type, or target/module filter."
          />
        )}
      </div>
    </>
  )
  // Embedded, it sits inside the Archive's one card, so no card of its own (Zean, November 8, 2026).
  if (embedded)
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-secondary">{shownLine}</p>
          {clearButton}
        </div>
        {body}
      </div>
    )
  const entries = (
    <Card aria-labelledby="audit-log-title">
      <CardHeader
        titleId="audit-log-title"
        title="Audit entries"
        description={shownLine}
        icon={<Icon name="clipboardList" />}
        actions={clearButton}
      />
      <CardBody className="flex flex-col gap-4">{body}</CardBody>
    </Card>
  )

  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      <Card className="p-5 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Audit Log</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Review accountable system activity. Audit entries are permanent and cannot be edited
              or deleted.
            </p>
          </div>
          <PrintButton viewer={viewer} onPrint={() => void printAll()} />
        </div>
      </Card>

      {entries}
      <AuditLogPrint
        rows={printRows ?? data.rows}
        onePage={
          printRows || data.lastPage === 1
            ? null
            : { page: list.pageNumber, lastPage: data.lastPage, total: data.total }
        }
        filters={filters}
        users={data.users}
        viewer={viewer}
      />
    </div>
  )
}
