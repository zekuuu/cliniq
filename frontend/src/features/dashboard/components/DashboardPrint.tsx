import {
  followUpDueMap,
  inventoryFlagMap,
  PrintBars,
  PrintDocument,
  PrintFigures,
  PrintNote,
  PrintSection,
  PrintTable,
  stockQuantityText,
  type PrintFigure,
} from '../../../components'
import { formatDate, formatDateRange, formatDateTime } from '../../../lib/dates'
import { rangeLengthDays, type DateRange } from '../../../lib/dateRange'
import type { PendingExcuseLetter, SessionUser } from '../../../lib/mock-db'
import type { DashboardSummary } from '../../../types/dashboard'
import { dueText, expiryLabel } from '../lib/alerts'
import { activityRows, overviewSentences, periodPhrase } from '../lib/printSummary'
import { bucketName, findClusters } from '../lib/trends'
import { maskLrn } from '../../../lib/lrn'
import { maskPatientNumber, splitText } from '../../../lib/patients'

const COMPLAINT_ROWS = 8

/**
 * "Clinic Overview Report": the Dashboard's printout (ADR-026). A one-to-two-page summary of the chosen
 * Date range for the nurse and the Principal; the formal monthly document is the Reports printout.
 * Every figure comes from the summary the screen already shows. Multi-student, so masked LRNs only
 * (ADR-004).
 */
export function DashboardPrint({
  summary,
  range,
  viewer,
  letters,
  filterLabel,
}: {
  summary: DashboardSummary
  range: DateRange
  viewer: SessionUser
  /** Active Trends filter (e.g. "Female × Grade 5"); it narrows the complaint figures only. */
  filterLabel?: string
  /** Staff only: excuse letters awaiting approval. */
  letters?: PendingExcuseLetter[]
}) {
  const { counts, previousCounts, complaintTrends: trends } = summary
  const oldest = summary.oldestRecordDate
  const period = periodPhrase(range, oldest)
  const days = rangeLengthDays(range)
  const previousNote = (n: number) => `Previous ${days === 1 ? 'day' : `${days} days`}: ${n}`
  const figures: PrintFigure[] = [
    {
      label: 'Clinic visits',
      value: counts.visits,
      note: [splitText(counts.split.visits), previousCounts ? previousNote(previousCounts.visits) : 'In the period'].join('; '),
    },
    {
      label: 'Incidents',
      value: counts.incidents,
      note:
        [
          splitText(counts.split.incidents),
          previousCounts && previousNote(previousCounts.incidents),
          counts.incidentsAtStage1 > 0 && `${counts.incidentsAtStage1} still at Stage 1`,
        ]
          .filter(Boolean)
          .join('; ') || 'In the period',
    },
    {
      label: 'Incomplete records',
      value: counts.pendingRecords,
      note: 'Current, missing required fields',
    },
    { label: 'Low-stock items', value: counts.lowStockItems, note: 'Current, below threshold' },
    { label: 'Active students', value: counts.activeStudents, note: 'Current, excludes archived' },
  ]
  const complaints = [...trends.series, ...trends.otherComplaints]
  const complaintTotal = complaints.reduce((sum, c) => sum + c.total, 0)
  // Eight rows, then the rest summed into one row, so the totals still add up.
  const rest = complaints.slice(COMPLAINT_ROWS)
  const complaintRows = rest.length
    ? [
        ...complaints.slice(0, COMPLAINT_ROWS),
        {
          complaint: `Other (${rest.length} complaints)`,
          total: rest.reduce((sum, c) => sum + c.total, 0),
        },
      ]
    : complaints
  const clusters = findClusters(trends)
  const activity = activityRows(trends)

  return (
    <PrintDocument
      title="Clinic Overview Report"
      viewer={viewer}
      scope={
        <>
          <span className="font-semibold">
            {range.preset === 'all' ? `All records ${period}` : `Visits and incidents ${period}`}.
          </span>{' '}
          The period applies to visits, incidents, complaints
          {summary.showFrequentVisitors ? ', and frequent visitors' : ''}. Follow-ups,
          stock, and record counts are as of {formatDate(summary.today)}.
          {filterLabel && ` The activity, complaint, and cluster figures count only ${filterLabel} visits and incidents.`}
        </>
      }
    >
      <PrintSection title="Key figures">
        <PrintFigures figures={figures} />
        <p className="mt-[2.5mm] text-[10.5pt]">{overviewSentences(summary, period).join(' ')}</p>
      </PrintSection>

      <PrintSection title="Items needing attention">
        <h3 className="mt-[2mm] mb-[1mm] font-semibold">
          Follow-ups overdue or due in the next {summary.upcomingWindowDays} days
        </h3>
        <PrintTable
          caption="Due and upcoming follow-ups"
          rows={summary.dueFollowUps}
          rowKey={(row) => row.followUp.id}
          empty="No follow-ups are overdue or due soon."
          columns={[
            { header: 'LRN or Staff No.', width: '18%', cell: (row) => maskPatientNumber(row.patient) },
            { header: 'Reason', cell: (row) => row.followUp.reason },
            { header: 'Due', width: '28%', cell: (row) => dueText(row) },
            { header: 'Status', width: '14%', cell: (row) => followUpDueMap[row.dueState].label },
          ]}
        />
        {summary.showFrequentVisitors && (
          <>
            <h3 className="mt-[3mm] mb-[1mm] font-semibold">
              Frequent visitors ({summary.frequentVisitorMinVisits}+ visits in the period)
            </h3>
            {summary.frequentVisitors.length ? (
              <>
                {/* A long list flows into columns, so a long range doesn't spend a page on it. */}
                <ul aria-label="Frequent-visitor warnings" className="columns-4 gap-[5mm] text-[9pt]">
                  {summary.frequentVisitors.map((row) => (
                    <li
                      key={row.student.id}
                      className="break-inside-avoid border-b border-border py-[0.8mm] tabular-nums"
                    >
                      {maskLrn(row.student.lrn)} · {row.visitCount} visits
                    </li>
                  ))}
                </ul>
                <PrintNote>A warning to review, not a diagnosis.</PrintNote>
              </>
            ) : (
              <PrintNote className="text-text-primary">
                No student reached the frequent-visitor threshold.
              </PrintNote>
            )}
          </>
        )}
        {letters && (
          <>
            <h3 className="mt-[3mm] mb-[1mm] font-semibold">Excuse letters awaiting approval</h3>
            <PrintTable
              caption="Excuse letters awaiting approval"
              rows={letters}
              rowKey={(row) => row.visitId}
              empty="No excuse letters are awaiting approval."
              columns={[
                { header: 'LRN', width: '18%', cell: (row) => maskLrn(row.lrn) },
                {
                  header: 'Excused',
                  width: '36%',
                  cell: (row) => formatDateRange(row.excusedFrom, row.excusedUntil),
                },
                { header: 'Clinic visit', cell: (row) => formatDateTime(row.visitDateTime) },
              ]}
            />
          </>
        )}
        <h3 className="mt-[3mm] mb-[1mm] font-semibold">Low-stock and expiring items (current)</h3>
        <PrintTable
          caption="Low-stock and expiring items"
          rows={summary.inventoryAlerts}
          rowKey={(row) => row.item.id}
          empty="Every item is above its low-stock threshold and not close to expiring."
          columns={[
            { header: 'Item', cell: (row) => row.item.name },
            {
              header: 'In stock',
              width: '22%',
              cell: (row) => stockQuantityText(row.item.currentStock, row.item.unit, row.flags),
            },
            {
              header: 'Threshold',
              width: '12%',
              align: 'right',
              cell: (row) => row.item.lowStockThreshold,
            },
            {
              header: 'Flags',
              width: '30%',
              cell: (row) =>
                row.flags
                  .map((flag) =>
                    flag === 'low_stock' ? inventoryFlagMap[flag].label : expiryLabel(row),
                  )
                  .join(', '),
            },
          ]}
        />
      </PrintSection>

      <PrintSection title="Complaints (visits and incidents)">
        {complaints.length === 0 ? (
          <PrintNote className="text-text-primary">No complaints were recorded {period}.</PrintNote>
        ) : (
          <div className="grid grid-cols-2 items-start gap-[6mm]">
            <PrintBars
              caption="Most common complaints"
              rows={trends.series.map((s) => ({ label: s.complaint, value: s.total }))}
            />
            <PrintTable
              caption="Complaints with count and share"
              rows={complaintRows}
              rowKey={(row) => row.complaint}
              empty=""
              columns={[
                { header: 'Complaint', cell: (row) => row.complaint },
                { header: 'Count', width: '20%', align: 'right', cell: (row) => row.total },
                {
                  header: 'Share',
                  width: '20%',
                  align: 'right',
                  cell: (row) => `${Math.round((row.total / complaintTotal) * 100)}%`,
                },
              ]}
            />
          </div>
        )}
        {clusters.length > 0 && (
          <p className="mt-[2mm] break-inside-avoid border-l-[3px] border-text-primary pl-[2mm] text-[9.5pt]">
            <span className="font-semibold">Possible symptom cluster: </span>
            {clusters
              .map(
                (c) =>
                  `${c.complaint}, ${c.count} cases (${bucketName(trends.buckets[c.bucketIndex], trends.granularity)})`,
              )
              .join('; ')}
            . An early-warning signal to review, not a confirmed outbreak.
          </p>
        )}
      </PrintSection>

      <PrintSection title="Visit activity">
        <PrintTable
          caption="Visits and incidents per period"
          rows={activity}
          rowKey={(row) => row.label}
          empty={`No visits or incidents ${period}.`}
          columns={[
            {
              header: trends.granularity === 'day' ? 'Week' : 'Period',
              cell: (row) => row.label,
            },
            {
              header: 'Visits and incidents',
              width: '40%',
              align: 'right',
              cell: (row) => row.total,
            },
          ]}
        />
      </PrintSection>
    </PrintDocument>
  )
}
