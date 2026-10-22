import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Badge, Button, Card, CardBody, CardHeader, DataTable, ErrorState, Icon, MonthPicker, Skeleton, buttonClassName, type DataTableColumn } from '../../components'
import { paths } from '../../routes/paths'
import { useAsyncData } from '../../hooks/useAsyncData'
import { addMonths, formatDateTime, todayISO } from '../../lib/dates'
import { sortTableRows, toggleTableSort, type TableSortState } from '../../lib/tableSort'
import type { SessionUser } from '../../lib/mock-db'
import { fetchMonthlyReport, type MonthlyReportData } from './api/reportsApi'
import { HealthSummary } from './components/HealthSummary'
import { ReportsPrint, type ReportView } from './components/ReportsPrint'
import { MaskedLrn } from '../../components/ui/MaskedLrn'

type ArchiveRow = MonthlyReportData['incidents'][number]

/** "YYYY-MM" of the month before. */
function previousMonthOf(value: string) { return addMonths(`${value}-01`, -1).slice(0, 7) }

function monthLabel(value: string) { return new Date(`${value}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }) }

type ArchiveSortKey = 'student' | 'date' | 'complaint' | 'status'

const baseIncidentColumns: Array<DataTableColumn<ArchiveRow>> = [
  { key: 'student', header: 'LRN', rowHeader: true, cell: (incident) => <MaskedLrn lrn={incident.lrn} /> },
  { key: 'date', header: 'Date', cell: (incident) => formatDateTime(incident.time) },
  { key: 'complaint', header: 'Complaint', cell: (incident) => incident.complaint },
  { key: 'status', header: 'Status', cell: (incident) => <Badge tone={incident.stage === 1 ? 'warning' : 'info'} variant="soft">{incident.stage === 1 ? 'Needs completion' : 'Complete'}</Badge> },
]

function ReportBodySkeleton() {
  return <div aria-hidden="true" className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-24" />)}</div>
}

const ARCHIVE_SORT_LABELS: Record<ArchiveSortKey, string> = { student: 'LRN', date: 'date', complaint: 'complaint', status: 'status' }

function sortArchive(rows: ArchiveRow[], sort: TableSortState<ArchiveSortKey>) {
  return sortTableRows(rows, sort, (row, key) => {
    if (key === 'student') return row.lrn
    if (key === 'date') return row.time
    if (key === 'complaint') return row.complaint
    return row.stage === 1 ? 'Needs completion' : 'Complete'
  })
}

/** The archive's order in words for the printout, e.g. "date, newest first". */
function archiveOrder(sort: TableSortState<ArchiveSortKey>) {
  const up = sort.direction === 'ascending'
  const words = sort.key === 'date' ? (up ? 'oldest first' : 'newest first') : up ? 'A to Z' : 'Z to A'
  return `${ARCHIVE_SORT_LABELS[sort.key]}, ${words}`
}

function IncidentArchiveTable({ rows, sort, setSort, canOpen }: { rows: ArchiveRow[]; sort: TableSortState<ArchiveSortKey>; setSort: (update: (current: TableSortState<ArchiveSortKey>) => TableSortState<ArchiveSortKey>) => void; canOpen: boolean }) {
  const sortColumn = (key: ArchiveSortKey, label: string) => ({
    label,
    direction: sort.key === key ? sort.direction : undefined,
    onSort: () => setSort((current) => toggleTableSort(current, key)),
  })
  const columns: Array<DataTableColumn<ArchiveRow>> = baseIncidentColumns.map((column) => {
    if (column.key === 'student') return { ...column, sort: sortColumn('student', 'LRN') }
    if (column.key === 'date') return { ...column, sort: sortColumn('date', 'Date') }
    if (column.key === 'complaint') return { ...column, sort: sortColumn('complaint', 'Complaint') }
    if (column.key === 'status') return { ...column, sort: sortColumn('status', 'Status') }
    return column
  })
  // Panel review RP-4: each row opens its record (Staff only; the incident screens are Staff routes).
  if (canOpen)
    columns.push({
      key: 'open',
      header: 'Actions',
      cell: (incident) => (
        <Link
          to={incident.stage === 1 ? paths.incidentComplete(incident.id) : paths.incidentReport(incident.id)}
          className={buttonClassName({ size: 'sm' })}
          aria-label={`${incident.stage === 1 ? 'Complete Stage 2' : 'Open report'}: ${incident.complaint}, ${formatDateTime(incident.time)}`}
        >
          {incident.stage === 1 ? 'Complete Stage 2' : 'Open report'}
        </Link>
      ),
    })
  return <DataTable caption="Incident register" columns={columns} rows={sortArchive(rows, sort)} rowKey={(incident) => incident.id} fixedLayout minTableWidth={canOpen ? '48rem' : '40rem'} />
}

export function ReportsPage({ viewer }: { viewer: SessionUser }) {
  const location = useLocation()
  const initialView = (location.state as { reportView?: ReportView } | null)?.reportView ?? 'monthly'
  const [view, setView] = useState<ReportView>(initialView)
  const [month, setMonth] = useState(todayISO().slice(0, 7))
  // Kept here so the archive printout lists incidents in the order the screen shows.
  const [archiveSort, setArchiveSort] = useState<TableSortState<ArchiveSortKey>>({ key: 'date', direction: 'descending' })
  const { data, status, isRefetching, reload } = useAsyncData(`report|${month}`, () => fetchMonthlyReport(month))
  const title = view === 'monthly' ? 'Monthly Report' : view === 'incidents' ? 'Incident register' : 'Complaint summary'
  let body
  if (status === 'error') body = <ErrorState title="Unable to generate this report." onRetry={reload} />
  else if (!data) body = <><p className="sr-only" role="status">Generating report...</p><ReportBodySkeleton /></>
  else body = <div aria-busy={isRefetching} className={isRefetching ? 'opacity-60' : undefined}>{view === 'monthly' && <div className="grid gap-4 sm:grid-cols-3"><Summary label="Clinic visits" value={data.counts.visits} /><Summary label="Incidents" value={data.counts.incidents} /><Summary label="Follow-ups" value={data.counts.followUps} /><p className="text-xs text-text-secondary sm:col-span-3">Visits and incidents are counted separately. A visit escalated to an incident counts once, as the incident.</p></div>}{view === 'incidents' && <IncidentArchiveTable rows={data.incidents} sort={archiveSort} setSort={setArchiveSort} canOpen={viewer.role === 'staff'} />}{view === 'health' && <HealthSummary rows={data.complaintCounts} />}</div>
  return <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8"><Card className="p-5 print:hidden"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-text-primary">Reports</h1><p className="mt-1 text-sm text-text-secondary">Generate, review, and print clinic reports for {viewer.role === 'admin' ? 'administrative review' : 'clinic operations'}.</p></div><div className="flex flex-wrap gap-2">{viewer.role === 'staff' && <Link className={buttonClassName({ variant: 'secondary' })} to={paths.sportsReports}><Icon name="users" />Sports Reports</Link>}<Button variant="secondary" icon="printer" onClick={() => window.print()}>Print / Save as PDF</Button></div></div><div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Report type"><Button variant={view === 'monthly' ? 'primary' : 'secondary'} role="tab" aria-selected={view === 'monthly'} onClick={() => setView('monthly')}>Monthly Report</Button><Button variant={view === 'incidents' ? 'primary' : 'secondary'} role="tab" aria-selected={view === 'incidents'} onClick={() => setView('incidents')}>Incident register</Button><Button variant={view === 'health' ? 'primary' : 'secondary'} role="tab" aria-selected={view === 'health'} onClick={() => setView('health')}>Complaint summary</Button></div></Card><Card aria-labelledby="report-title"><CardHeader titleId="report-title" title={title} description={`Reporting period: ${monthLabel(month)}`} icon={<Icon name="fileText" />} /><CardBody><div className="mb-5 max-w-xs print:hidden"><MonthPicker id="report-month" label="Report month" value={month} onChange={setMonth} clearable={false} /></div>{body}</CardBody></Card>{data && <ReportsPrint view={view} data={data} month={monthLabel(month)} previousMonth={monthLabel(previousMonthOf(month))} archiveRows={sortArchive(data.incidents, archiveSort)} archiveOrder={archiveOrder(archiveSort)} viewer={viewer} />}</div>
}

function Summary({ label, value }: { label: string; value: number }) { return <div className="rounded-md border border-border bg-surface p-4"><p className="text-xs font-semibold text-text-secondary">{label}</p><p className="mt-2 text-3xl font-bold tabular-nums text-text-primary">{value}</p></div> }
