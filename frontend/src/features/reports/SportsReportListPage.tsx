import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  BackButton,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorState,
  Icon,
  ListItemLink,
  Skeleton,
  buttonClassName,
  type DataTableColumn,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/dates'
import type { SessionUser, SportsReportSummary } from '../../lib/mock-db'
import { paths } from '../../routes/paths'
import { archiveSportsReport, copySportsReport, fetchSportsReports } from './api/sportsReportApi'

/**
 * Saved Sports Reports (ADR-034): lists of students the clinician prints for a PE or sports
 * instructor. Staff only. Rows name the report, never a student.
 */
export function SportsReportListPage({ viewer }: { viewer: SessionUser }) {
  const navigate = useNavigate()
  const { data: reports, status, reload } = useAsyncData('sports-reports', () => fetchSportsReports(viewer))
  const [showArchived, setShowArchived] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  async function duplicate(report: SportsReportSummary) {
    const copy = await copySportsReport(report.id, viewer)
    navigate(paths.sportsReportEdit(copy.id))
  }
  async function setArchived(report: SportsReportSummary, archived: boolean) {
    await archiveSportsReport(report.id, archived, viewer)
    setNotice(`“${report.title}” ${archived ? 'archived' : 'restored'}.`)
    reload()
  }

  const header = (
    <>
      <BackButton fallback={paths.reports} />
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Sports Reports</h1>
            <p className="mt-1 max-w-prose text-sm text-text-secondary">
              Saved lists of students for a PE or sports activity. Print one for the instructor who asks; it shows each
              student's recent visits and incidents.
            </p>
          </div>
          <Link className={buttonClassName({ variant: 'primary' })} to={paths.sportsReportNew}>
            <Icon name="plus" />
            New Sports Report
          </Link>
        </div>
      </Card>
    </>
  )
  let body
  if (status === 'error') body = <ErrorState title="Unable to load Sports Reports." onRetry={reload} />
  else if (!reports)
    body = (
      <>
        <p className="sr-only" role="status">
          Loading Sports Reports...
        </p>
        <Card aria-hidden="true" className="p-5">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="mt-3 h-8 w-full" />
          ))}
        </Card>
      </>
    )
  else {
    const archivedCount = reports.filter((report) => report.archived).length
    const rows = reports.filter((report) => showArchived || !report.archived)
    const columns: Array<DataTableColumn<SportsReportSummary>> = [
      {
        key: 'title',
        header: 'Title',
        width: '23%',
        rowHeader: true,
        cell: (report) => (
          <span className="flex flex-wrap items-center gap-2">
            <ListItemLink to={paths.sportsReport(report.id)}>{report.title}</ListItemLink>
            {report.archived && (
              <Badge tone="neutral" variant="outline">
                Archived
              </Badge>
            )}
          </span>
        ),
      },
      { key: 'activity', header: 'Activity', width: '15%', cell: (report) => report.activity ?? '—' },
      { key: 'requestedBy', header: 'Requested by', width: '15%', cell: (report) => report.requestedBy },
      { key: 'students', header: 'Students', width: '7%', align: 'right', cell: (report) => report.studentCount },
      { key: 'updatedAt', header: 'Last updated', width: '13%', cell: (report) => formatDateTime(report.updatedAt) },
      {
        key: 'actions',
        header: 'Actions',
        cell: (report) => (
          <span className="flex flex-wrap gap-2">
            <Link className={buttonClassName({ variant: 'secondary', size: 'sm' })} to={paths.sportsReportEdit(report.id)} aria-label={`Edit ${report.title}`}>
              Edit
            </Link>
            <Button size="sm" variant="neutral" onClick={() => void duplicate(report)} aria-label={`Duplicate ${report.title}`}>
              Duplicate
            </Button>
            <Button size="sm" variant="neutral" onClick={() => void setArchived(report, !report.archived)} aria-label={`${report.archived ? 'Restore' : 'Archive'} ${report.title}`}>
              {report.archived ? 'Restore' : 'Archive'}
            </Button>
          </span>
        ),
      },
    ]
    body = (
      <Card aria-labelledby="sports-reports-title">
        <CardHeader
          titleId="sports-reports-title"
          title="Saved reports"
          description={`${rows.length} report${rows.length === 1 ? '' : 's'}${archivedCount && !showArchived ? `, ${archivedCount} archived hidden` : ''}`}
          icon={<Icon name="clipboardList" />}
        />
        <CardBody>
          <label className="mb-4 flex w-fit cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-text-primary transition-colors hover:bg-surface motion-reduce:transition-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(event) => setShowArchived(event.target.checked)}
              className="size-4 cursor-pointer accent-brand-green-dark"
            />
            Show archived reports
          </label>
          {rows.length ? (
            <DataTable caption="Saved Sports Reports" columns={columns} rows={rows} rowKey={(report) => report.id} fixedLayout minTableWidth="60rem" />
          ) : (
            <EmptyState
              icon="clipboardList"
              title={reports.length ? 'No active Sports Reports' : 'No Sports Reports yet'}
              description={reports.length ? 'Show archived reports to see the others.' : 'Create one when an instructor asks for a list of students.'}
            />
          )}
        </CardBody>
      </Card>
    )
  }
  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {header}
      {notice && (
        <p role="status" className="rounded-md border border-success bg-success/10 px-3 py-2 text-sm font-semibold text-text-primary">
          {notice}
        </p>
      )}
      {body}
    </div>
  )
}
