import type { ReactNode } from 'react'
import {
  PrintBars,
  PrintDocument,
  PrintNote,
  PrintSection,
  PrintTable,
  stockQuantityText,
} from '../../../components'
import { formatDate, formatDateRange, formatDateTime } from '../../../lib/dates'
import { rangeLengthDays, type DateRange } from '../../../lib/dateRange'
import type { PendingExcuseLetter, SessionUser } from '../../../lib/mock-db'
import type { DashboardSummary, DueFollowUpRow } from '../../../types/dashboard'
import { followUpWhen, stockStatus } from '../lib/alerts'
import { activityRows, overviewSentence, periodPhrase } from '../lib/printSummary'
import { bucketName, findClusters } from '../lib/trends'
import { splitText } from '../../../lib/patients'

const COMPLAINT_ROWS = 8

const STRIP_CELL = 'border-l border-border pl-[3mm] first:border-l-0 first:pl-0'
const LIST_ROW = 'flex break-inside-avoid items-baseline gap-[3mm] border-b border-border py-[0.8mm] text-[9.5pt]'
const SUBHEAD = 'mt-[3mm] mb-[0.5mm] break-after-avoid font-semibold'

/** One figure of the stat strip: words beside any colour, so it reads in black and white. */
function Stat({ label, value, note }: { label: string; value: number; note?: ReactNode }) {
  return (
    <div className={STRIP_CELL}>
      <dt className="text-[9pt] font-semibold">{label}</dt>
      <dd className="text-[16pt] leading-tight font-bold tabular-nums">{value}</dd>
      {note && <dd className="text-[8.5pt] text-text-secondary">{note}</dd>}
    </div>
  )
}

/** Overdue, then due, then upcoming: the order the nurse acts in. A grace-period "due" sits with Due today. */
const FOLLOW_UP_GROUPS: Array<{ title: string; states: Array<DueFollowUpRow['dueState']>; className?: string }> = [
  { title: 'Overdue', states: ['overdue'], className: 'text-error-text' },
  { title: 'Due today', states: ['due_today', 'due'] },
  { title: 'Upcoming', states: ['upcoming'] },
]

/**
 * The Dashboard's printout (ADR-026, redesigned for the groupmate's review, R8): a short summary of the chosen Date range, in action order, for the nurse
 * and the Principal; the formal monthly document is the Reports printout. It prints the open tab only:
 * Overview gives the screen's figures plus the lists its cards and chips link to; Trends gives the
 * breakdowns behind its charts, as tables. Every figure comes from the summary the screen already shows. The paper shows the full LRN so the
 * nurse can match it to school records; the screen stays masked (ADR-044 narrows ADR-004/ADR-028).
 */
export function DashboardPrint({
  summary,
  range,
  viewer,
  letters,
  filterLabel,
  view,
}: {
  summary: DashboardSummary
  range: DateRange
  viewer: SessionUser
  /** The Dashboard tab that is open; only its content prints. */
  view: 'overview' | 'trends'
  /** Active Trends filter (e.g. "Female × Grade 5"); it narrows the complaint figures only. */
  filterLabel?: string
  /** Staff only: excuse letters awaiting approval. */
  letters?: PendingExcuseLetter[]
}) {
  const { counts, complaintTrends: trends } = summary
  const oldest = summary.oldestRecordDate
  const period = periodPhrase(range, oldest)
  const days = rangeLengthDays(range)
  const overdue = summary.dueFollowUps.filter((row) => row.dueState === 'overdue').length
  const expiredOrExpiring = summary.inventoryAlerts.filter((row) => row.flags.some((flag) => flag !== 'low_stock')).length
  const oneDay = days === 1
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
      title={view === 'overview' ? 'Clinic Overview' : 'Clinic Trends Report'}
      viewer={viewer}
      scope={
        view === 'overview' ? (
          <>
            <span className="block font-semibold">
              {range.preset === 'all'
                ? `All records ${period}`
                : oneDay
                  ? `${formatDate(range.from)} · Visits and incidents for ${range.from === summary.today ? 'today' : 'the day'}`
                  : formatDateRange(range.from, range.to)}
            </span>
            The period applies to visits and incidents{summary.showFrequentVisitors ? ', and frequent visitors' : ''}. Follow-ups, excuse letters, stock and record counts are as of {formatDate(summary.today)}.
          </>
        ) : (
          <>
            <span className="block">Dashboard tab: Trends</span>
            <span className="font-semibold">
              {range.preset === 'all' ? `All records ${period}` : `Visits and incidents ${period}`}.
            </span>{' '}
            The period applies to every figure.
            {filterLabel && ` The activity, complaint, and cluster figures count only ${filterLabel} visits and incidents.`}
          </>
        )
      }
    >
      {view === 'overview' && (
        <>
          {!oneDay && <p data-print-summary className="text-[10.5pt]">{overviewSentence(summary)}</p>}
          <dl data-print-strip className={`mt-[2mm] grid gap-[3mm] border-y border-text-primary py-[2mm] ${letters ? 'grid-cols-5' : 'grid-cols-4'}`}>
            <Stat label="Visits" value={counts.visits} note={splitText(counts.split.visits)} />
            <Stat
              label="Incidents"
              value={counts.incidents}
              note={
                <>
                  {splitText(counts.split.incidents)}
                  {counts.incidentsAtStage1 > 0 && <span className="block font-semibold text-error-text">{counts.incidentsAtStage1} still at Stage 1</span>}
                </>
              }
            />
            <Stat label="Active students" value={counts.activeStudents} />
            {letters && <Stat label="Pending excuse letters" value={letters.length} />}
            <Stat
              label="Follow-ups"
              value={summary.dueFollowUps.length}
              note={overdue ? <span className="font-semibold text-error-text">{overdue} overdue</span> : 'None overdue'}
            />
          </dl>
          <p data-print-attention className="mt-[2mm] text-[10pt] font-semibold">
            {counts.pendingRecords} incomplete records · {counts.lowStockItems} low stock · {expiredOrExpiring} expired or expiring
          </p>

          <PrintSection title="Follow-ups">
            <div data-print-followups>
              {FOLLOW_UP_GROUPS.map((group) => {
                const rows = summary.dueFollowUps.filter((row) => group.states.includes(row.dueState))
                return (
                  <div key={group.title}>
                    <h3 className={`${SUBHEAD} ${group.className ?? ''}`}>{group.title} · {rows.length}</h3>
                    {rows.map((row) => (
                      <p key={row.followUp.id} className={LIST_ROW}>
                        <span className="w-[32mm] shrink-0 text-text-secondary tabular-nums">{row.patient.number}</span>
                        <span className="min-w-0 flex-1">{row.followUp.reason}</span>
                        <span className={`shrink-0 tabular-nums ${group.className ?? ''}`}>{followUpWhen(row)}</span>
                      </p>
                    ))}
                  </div>
                )
              })}
            </div>
          </PrintSection>

          {letters && (
            <PrintSection title="Excuse letters awaiting approval">
              <div data-print-letters>
                {letters.length === 0 && <PrintNote className="text-text-primary">No excuse letters are awaiting approval.</PrintNote>}
                {letters.map((row) => (
                  <p key={row.visitId} className={LIST_ROW}>
                    <span className="w-[32mm] shrink-0 text-text-secondary tabular-nums">{row.lrn}</span>
                    <span className="min-w-0 flex-1">{formatDateRange(row.excusedFrom, row.excusedUntil)}</span>
                    <span className="shrink-0 tabular-nums">{formatDateTime(row.visitDateTime)}</span>
                  </p>
                ))}
              </div>
            </PrintSection>
          )}

          <PrintSection title="Low stock and expiring">
            <div data-print-stock>
              {summary.inventoryAlerts.length === 0 && <PrintNote className="text-text-primary">Every item is above its low-stock threshold and not close to expiring.</PrintNote>}
              {summary.inventoryAlerts.map((row) => (
                <p key={row.item.id} className={LIST_ROW}>
                  <span className="min-w-0 flex-1">{row.item.name}</span>
                  <span className="shrink-0 tabular-nums">{stockQuantityText(row.item.currentStock, row.item.unit, row.flags)}</span>
                  <span className={`w-[42mm] shrink-0 rounded-sm px-[1.5mm] text-right text-[9pt] font-semibold [print-color-adjust:exact] ${row.flags.includes('expired') ? 'bg-error text-white' : row.flags.includes('low_stock') ? 'border border-warning text-warning-text' : ''}`}>
                    {stockStatus(row)}
                  </span>
                </p>
              ))}
            </div>
          </PrintSection>

          {(summary.showFrequentVisitors || complaints.length > 0) && (
            <div data-print-details className="mt-[5mm] grid grid-cols-2 items-start gap-[6mm]">
              {summary.showFrequentVisitors && (
                <section>
                  <h2 className="mb-[1mm] break-after-avoid border-b border-text-primary text-[11pt] font-bold">
                    Frequent visitors ({summary.frequentVisitorMinVisits}+ visits in the period)
                  </h2>
                  {summary.frequentVisitors.length ? (
                    <>
                      <ul aria-label="Frequent-visitor warnings" className="text-[9pt]">
                        {summary.frequentVisitors.map((row) => (
                          <li key={row.student.id} className="flex break-inside-avoid gap-[2mm] tabular-nums">
                            <span className="w-[6mm] shrink-0 font-semibold">{row.visitCount}</span>
                            {row.student.lrn}
                          </li>
                        ))}
                      </ul>
                      <PrintNote>Visits per student. A warning to review, not a diagnosis.</PrintNote>
                    </>
                  ) : (
                    <PrintNote className="text-text-primary">No student reached the frequent-visitor threshold.</PrintNote>
                  )}
                </section>
              )}
              {complaints.length > 0 && (
                <section>
                  <h2 className="mb-[1mm] break-after-avoid border-b border-text-primary text-[11pt] font-bold">Complaints</h2>
                  <PrintTable
                    caption="Complaints with count"
                    rows={complaintRows}
                    rowKey={(row) => row.complaint}
                    empty=""
                    columns={[
                      { header: 'Complaint', cell: (row) => row.complaint },
                      { header: 'Count', width: '22%', align: 'right', cell: (row) => row.total },
                    ]}
                  />
                </section>
              )}
            </div>
          )}
        </>
      )}

      {view === 'trends' && (
        <>
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

          <PrintSection title="Visits and incidents by sex and grade level">
            <PrintNote>Aggregated. By sex counts students and staff; by grade level counts students only.</PrintNote>
            <div className="grid grid-cols-2 items-start gap-[6mm]">
              <PrintTable
                caption="By sex"
                rows={summary.demographics.sex}
                rowKey={(row) => row.key}
                empty="No visits or incidents in the period."
                columns={[
                  { header: 'Sex', cell: (row) => row.label },
                  { header: 'Students', width: '17%', align: 'right', cell: (row) => row.students },
                  { header: 'Staff', width: '13%', align: 'right', cell: (row) => row.staff },
                  { header: 'Visits', width: '15%', align: 'right', cell: (row) => row.visits },
                  { header: 'Incidents', width: '18%', align: 'right', cell: (row) => row.incidents },
                  { header: 'Share', width: '13%', align: 'right', cell: (row) => `${Math.round(row.share * 100)}%` },
                ]}
              />
              <PrintTable
                caption="By grade level"
                rows={summary.demographics.gradeLevel}
                rowKey={(row) => row.key}
                empty="No visits or incidents in the period."
                columns={[
                  { header: 'Grade level', cell: (row) => row.label },
                  { header: 'Visits', width: '17%', align: 'right', cell: (row) => row.visits },
                  { header: 'Incidents', width: '20%', align: 'right', cell: (row) => row.incidents },
                  { header: 'Share', width: '17%', align: 'right', cell: (row) => `${Math.round(row.share * 100)}%` },
                ]}
              />
            </div>
          </PrintSection>
        </>
      )}
    </PrintDocument>
  )
}
