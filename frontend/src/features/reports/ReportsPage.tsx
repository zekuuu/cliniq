import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Badge, Card, PrintButton, CardBody, CardHeader, DataTable, ErrorState, Icon, MonthPicker, Skeleton, Tabs, buttonClassName, type DataTableColumn } from '../../components'
import { paths } from '../../routes/paths'
import { useAsyncData } from '../../hooks/useAsyncData'
import { addMonths, formatDateTime, todayISO } from '../../lib/dates'
import { sortTableRows, toggleTableSort, type TableSortState } from '../../lib/tableSort'
import type { SessionUser } from '../../lib/mock-db'
import { fetchMonthlyReport, type MonthlyReportData } from './api/reportsApi'
import { HealthSummary } from './components/HealthSummary'
import { InventorySheetTable, VisitsBySexTable, WeeklyComplaintsTable } from './components/MonthlyTables'
import { ReportsPrint, type ReportView } from './components/ReportsPrint'
import { PatientNumber } from '../../components/ui/PatientNumber'

type ArchiveRow = MonthlyReportData['incidents'][number]

const REPORT_TABS = [
  { value: 'monthly', label: 'Monthly Report', icon: 'fileText' },
  { value: 'incidents', label: 'Incident register', icon: 'alertTriangle' },
  { value: 'health', label: 'Complaint summary', icon: 'activity' },
  { value: 'inventory', label: 'Inventory sheet', icon: 'package' },
] as const

/** "YYYY-MM" of the month before. */
function previousMonthOf(value: string) { return addMonths(`${value}-01`, -1).slice(0, 7) }

function monthLabel(value: string) { return new Date(`${value}-01T00:00:00`).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }) }

type ArchiveSortKey = 'student' | 'date' | 'complaint' | 'status'

const baseIncidentColumns: Array<DataTableColumn<ArchiveRow>> = [
  { key: 'student', header: 'LRN or Staff No.', rowHeader: true, cell: (incident) => <PatientNumber patient={incident.patient} /> },
  { key: 'date', header: 'Date', cell: (incident) => formatDateTime(incident.time) },
  { key: 'complaint', header: 'Complaint', cell: (incident) => incident.complaint },
  { key: 'status', header: 'Status', cell: (incident) => <Badge tone={incident.stage === 1 ? 'warning' : 'info'} variant="soft">{incident.stage === 1 ? 'Needs completion' : 'Complete'}</Badge> },
]

function ReportBodySkeleton() {
  return <div aria-hidden="true" className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-24" />)}</div>
}

const ARCHIVE_SORT_LABELS: Record<ArchiveSortKey, string> = { student: 'LRN or Staff No.', date: 'date', complaint: 'complaint', status: 'status' }

function sortArchive(rows: ArchiveRow[], sort: TableSortState<ArchiveSortKey>) {
  return sortTableRows(rows, sort, (row, key) => {
    if (key === 'student') return `${row.patient.kind}|${row.patient.number}`
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

function IncidentArchiveTable({ rows, sort, setSort, canOpen }: { rows: ArchiveRow[]; sort: TableSortState<ArchiveSortKey>; setSort: (update: (current: TableSortState<ArchiveSortKey>) => TableSortState<ArchiveSortKey>) => void; canOpen: 'staff' | 'report' | 'none' }) {
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
  // Panel review RP-4: each row opens its record. The Admin reads the report only (ADR-038).
  if (canOpen !== 'none')
    columns.push({
      key: 'open',
      header: 'Actions',
      cell: (incident) => (
        <Link
          to={canOpen === 'staff' && incident.stage === 1 ? paths.incidentComplete(incident.id) : paths.incidentReport(incident.id)}
          className={buttonClassName({ size: 'sm' })}
          aria-label={`${canOpen === 'staff' && incident.stage === 1 ? 'Complete Stage 2' : 'Open report'}: ${incident.complaint}, ${formatDateTime(incident.time)}`}
        >
          {canOpen === 'staff' && incident.stage === 1 ? 'Complete Stage 2' : 'Open report'}
        </Link>
      ),
    })
  return <DataTable caption="Incident register" columns={columns} rows={sortArchive(rows, sort)} rowKey={(incident) => incident.id} fixedLayout minTableWidth={canOpen !== 'none' ? '48rem' : '40rem'} />
}

export function ReportsPage({ viewer }: { viewer: SessionUser }) {
  const location = useLocation()
  const initialView = (location.state as { reportView?: ReportView } | null)?.reportView ?? 'monthly'
  const [view, setView] = useState<ReportView>(initialView)
  const [month, setMonth] = useState(todayISO().slice(0, 7))
  // Kept here so the archive printout lists incidents in the order the screen shows.
  const [archiveSort, setArchiveSort] = useState<TableSortState<ArchiveSortKey>>({ key: 'date', direction: 'descending' })
  const { data, status, isRefetching, reload } = useAsyncData(`report|${month}`, () => fetchMonthlyReport(month))
  const title = view === 'monthly' ? 'Monthly Report' : view === 'incidents' ? 'Incident register' : view === 'inventory' ? 'Monthly inventory sheet' : 'Complaint summary'
  let body
  if (status === 'error') body = <ErrorState title="Unable to generate this report." onRetry={reload} />
  else if (!data) body = <><p className="sr-only" role="status">Generating report...</p><ReportBodySkeleton /></>
  else body = <div aria-busy={isRefetching} className={isRefetching ? 'opacity-60' : undefined}>{view === 'monthly' && <div className="grid gap-4 sm:grid-cols-3"><Summary label="Clinic visits" value={data.counts.visits} /><Summary label="Incidents" value={data.counts.incidents} /><Summary label="Follow-ups" value={data.counts.followUps} /><p className="text-xs text-text-secondary sm:col-span-3">Visits and incidents are counted separately. A visit escalated to an incident counts once, as the incident.</p><section aria-labelledby="visits-by-sex-title" className="flex min-w-0 flex-col gap-2 sm:col-span-3"><h2 id="visits-by-sex-title" className="text-sm font-semibold text-text-primary">Clinic visits by sex</h2><div className="max-w-md"><VisitsBySexTable bySex={data.visitsBySex} /></div></section><section aria-labelledby="weekly-complaints-title" className="flex min-w-0 flex-col gap-2 sm:col-span-3"><h2 id="weekly-complaints-title" className="text-sm font-semibold text-text-primary">Clinic visits by complaint and week</h2><WeeklyComplaintsTable weekly={data.weeklyComplaints} /></section></div>}{view === 'inventory' && <InventorySheetTable rows={data.inventory} />}{view === 'incidents' && <IncidentArchiveTable rows={data.incidents} sort={archiveSort} setSort={setArchiveSort} canOpen={viewer.role === 'staff' ? 'staff' : 'report'} />}{view === 'health' && <HealthSummary rows={data.complaintCounts} />}</div>
  // One card, shown under whichever tab is selected: the views share the month and its data.
  const reportCard = <Card aria-labelledby="report-title"><CardHeader titleId="report-title" title={title} description={`Reporting period: ${monthLabel(month)}`} icon={<Icon name="fileText" />} /><CardBody><div className="mb-5 max-w-xs print:hidden"><MonthPicker id="report-month" label="Report month" value={month} onChange={setMonth} clearable={false} /></div>{body}</CardBody></Card>
  return <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8"><Card className="p-5 print:hidden"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-text-primary">Reports</h1><p className="mt-1 text-sm text-text-secondary">Generate, review, and print clinic reports for {viewer.role === 'admin' ? 'administrative review' : 'clinic operations'}.</p></div><div className="flex flex-wrap gap-2">{viewer.role === 'staff' && <Link className={buttonClassName({ variant: 'secondary' })} to={paths.sportsReports}><Icon name="users" />Sports Reports</Link>}<PrintButton viewer={viewer} /></div></div></Card><div className="flex flex-col gap-3 print:block"><Tabs label="Report type" value={view} onChange={setView} className="flex-wrap print:hidden" tabs={REPORT_TABS.map((tab) => ({ ...tab, panel: tab.value === view ? reportCard : null }))} /></div>{data && <ReportsPrint view={view} data={data} month={monthLabel(month)} previousMonth={monthLabel(previousMonthOf(month))} archiveRows={sortArchive(data.incidents, archiveSort)} archiveOrder={archiveOrder(archiveSort)} viewer={viewer} />}</div>
}

function Summary({ label, value }: { label: string; value: number }) { return <div className="rounded-md border border-border bg-surface p-4"><p className="text-xs font-semibold text-text-secondary">{label}</p><p className="mt-2 text-3xl font-bold tabular-nums text-text-primary">{value}</p></div> }
