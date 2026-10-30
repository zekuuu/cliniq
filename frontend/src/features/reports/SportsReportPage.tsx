import { useState } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router'
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
  Skeleton,
  buttonClassName,
  type DataTableColumn,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../lib/dates'
import type { SessionUser, SportsReportContent, SportsReportContentRow } from '../../lib/mock-db'
import { paths } from '../../routes/paths'
import { fetchSportsReportContent } from './api/sportsReportApi'
import { SportsReportPrint } from './components/SportsReportPrint'
import { SPORTS_REPORT_CONFIDENTIALITY, leftOutText, sportsReportColumns, windowDates, windowLabel, windowRange, withChosenEntries } from './sportsReportContent'

/**
 * One Sports Report (ADR-034): the preview is the printout's own table, read from the visits and
 * incidents now. Print reads them again, so the paper is current to the minute, and the print is audited.
 */
export function SportsReportPage({ reportId = '', viewer }: { reportId?: string; viewer: SessionUser }) {
  const { data, status, reload } = useAsyncData(`sports-report-content|${reportId}`, () => fetchSportsReportContent(reportId, viewer))
  const [printed, setPrinted] = useState<SportsReportContent | null>(null)
  const [printError, setPrintError] = useState<string | null>(null)
  // ADR-051: every entry starts ticked; the clinician unticks what should not be released.
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set())
  const toggle = (entryId: string) =>
    setExcluded((current) => {
      const next = new Set(current)
      if (!next.delete(entryId)) next.add(entryId)
      return next
    })
  const content = printed ?? data
  const back = <BackButton fallback={paths.sportsReports} />

  async function print() {
    if (!content?.rows.length) {
      setPrintError('This report has no students to print. Edit the report and add at least one active student.')
      return
    }
    setPrintError(null)
    const fresh = await fetchSportsReportContent(reportId, viewer)
    if (!fresh.rows.length) {
      setPrinted(fresh)
      setPrintError('This report has no students to print. Edit the report and add at least one active student.')
      return
    }
    flushSync(() => setPrinted(fresh))
    window.print()
  }

  if (status === 'error')
    return (
      <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState title="Unable to load this Sports Report." onRetry={reload} />
      </div>
    )
  if (!content)
    return (
      <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <p className="sr-only" role="status">
          Loading Sports Report...
        </p>
        <Card aria-hidden="true" className="p-5">
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </Card>
        <Card aria-hidden="true" className="p-5">
          <Skeleton className="h-40 w-full" />
        </Card>
      </div>
    )

  const { report } = content
  const leftOut = leftOutText(content)
  const entryIds = content.rows.flatMap((row) => row.entries.map((entry) => entry.id))
  const included = entryIds.filter((id) => !excluded.has(id)).length
  const columns: Array<DataTableColumn<SportsReportContentRow>> = sportsReportColumns(report.includeConditions, { excluded, onToggle: toggle }).map((column, index) => ({
    key: column.header,
    header: column.header,
    width: column.width,
    rowHeader: index === 0,
    cell: column.cell,
  }))
  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-secondary">Sports Report</p>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-text-primary">
              <span className="min-w-0 wrap-break-word">{report.title}</span>
              {report.archived && (
                <Badge tone="neutral" variant="outline">
                  Archived
                </Badge>
              )}
            </h1>
            <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
              {report.activity && (
                <>
                  <dt className="font-semibold text-text-secondary">Activity</dt>
                  <dd className="text-text-primary">{report.activity}</dd>
                </>
              )}
              <dt className="font-semibold text-text-secondary">Requested by</dt>
              <dd className="text-text-primary">{report.requestedBy}</dd>
              <dt className="font-semibold text-text-secondary">Look-back window</dt>
              <dd className="text-text-primary">
                {windowLabel(report.window)} ({windowDates(content)})
              </dd>
              <dt className="font-semibold text-text-secondary">Conditions and allergies</dt>
              <dd className="text-text-primary">{report.includeConditions ? 'Included' : 'Not included'}</dd>
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className={buttonClassName({ variant: 'secondary' })} to={paths.sportsReportEdit(report.id)}>
              <Icon name="pencil" />
              Edit
            </Link>
            <Button variant="primary" icon="printer" onClick={() => void print()}>
              Print / Save as PDF
            </Button>
          </div>
        </div>
        {printError && (
          <p role="alert" className="mt-4 rounded-md border border-error bg-error/10 px-3 py-2 text-sm font-semibold text-text-primary">
            {printError}
          </p>
        )}
      </Card>
      <Card aria-labelledby="sports-report-preview">
        <CardHeader
          titleId="sports-report-preview"
          title="What the printout shows"
          description={`As of ${formatDateTime(content.asOf)}. ${windowRange(content)}. ${included} of ${entryIds.length} ${entryIds.length === 1 ? 'entry' : 'entries'} included; untick any that should not print.`}
          icon={<Icon name="fileText" />}
        />
        <CardBody>
          {content.rows.length ? (
            <DataTable caption="Sports Report preview" columns={columns} rows={content.rows} rowKey={(row) => row.studentId} fixedLayout minTableWidth="48rem" className="[&_td]:align-top [&_th]:align-top" />
          ) : (
            <EmptyState icon="users" title="No students on this report" description="Edit the report to add students before printing." />
          )}
          {leftOut && <p className="mt-3 text-sm text-text-secondary">{leftOut}</p>}
          <p className="mt-3 text-sm text-text-secondary">{SPORTS_REPORT_CONFIDENTIALITY}</p>
        </CardBody>
      </Card>
      <SportsReportPrint content={withChosenEntries(content, excluded)} viewer={viewer} />
    </div>
  )
}
