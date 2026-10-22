import '../../../components/charts/chartSetup'
import type { Chart, ChartOptions, Plugin, ScriptableContext } from 'chart.js'
import { useId, useMemo, useState, type ReactNode } from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  Card,
  CARD_SURFACE,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  Icon,
  SegmentedControl,
  Skeleton,
  type DataTableColumn,
} from '../../../components'
import { cn } from '../../../lib/cn'
import { formatDate, formatShortDate } from '../../../lib/dates'
import { bucketName, bucketTotals, findClusters, type ClusterNote } from '../lib/trends'
import { sortTableRows, toggleTableSort, type TableSortState } from '../../../lib/tableSort'
import { colorToken } from '../../../lib/tokens'
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion'
import { smoothTooltip } from '../../../components/charts/smoothTooltip'
import type {
  ComplaintSeries,
  ComplaintTrends as Trends,
  DemographicAnalysis,
  TrendBucket,
  TrendGranularity,
  WeekdayComparison,
} from '../../../types/dashboard'

/*
 * Trends row (Reference 1, item 4), laid out like the reference mockup's "Visits Trend" +
 * "Top Visit Reasons" pair:
 * - Left (2/3): visits + incidents over time, grouped by day, week, month, or year (line with a
 *   light area wash). The grouping follows the page's date range (data layer); there's no toggle
 *   for it, only for Chart vs Table. A possible symptom cluster is drawn ON the chart as a warning-colored point with a ⚠
 *   marker (spec: "a simple highlighted marker on the chart, not a separate widget").
 * - Right (1/3): the most common complaints in the range as labeled horizontal bars. A complaint
 *   with a possible cluster gets a warning bar plus a ⚠ icon and text, never color alone.
 * The table view (left card) keeps the full complaint × period breakdown as the chart fallback.
 */

type ViewMode = 'chart' | 'table'

const MAX_VISIBLE_TABLE_PERIODS = 12
/** Hover point and tooltip glide time on the trend chart. */
const HOVER_MS = 320
const PERIOD_COLUMN_WIDTH_REM = 5
const PERIOD_COLUMN_WIDTH = `${PERIOD_COLUMN_WIDTH_REM}rem`
const TOTAL_COLUMN_WIDTH = '5rem'

/**
 * Period header without the visible year (the card title shows it once), so period columns stay
 * narrow. The year stays in the header's accessible name as screen-reader-only text. Yearly
 * periods are years, so they show as-is.
 */
function tableBucketHeader(bucket: TrendBucket, granularity: TrendGranularity): ReactNode {
  if (granularity === 'year' || granularity === 'hour') return bucketName(bucket, granularity)
  const year = bucket.from.slice(0, 4)
  return granularity === 'month' ? (
    <>
      {formatDate(bucket.from, { month: 'short' })}
      <span className="sr-only"> {year}</span>
    </>
  ) : (
    <>
      {formatShortDate(bucket.from)}
      <span className="sr-only">, {year}</span>
    </>
  )
}

/**
 * The year(s) the trend covers, e.g. "2026" or "2025–2026"; the full date for Hourly, whose periods
 * are hours of one day; none for Yearly, whose periods are years.
 */
function trendYears(trends: Trends): string | undefined {
  const first = trends.buckets[0]
  const last = trends.buckets.at(-1)
  if (trends.granularity === 'year' || !first || !last) return undefined
  if (trends.granularity === 'hour') return formatDate(first.from)
  const [from, to] = [first.from.slice(0, 4), last.to.slice(0, 4)]
  return from === to ? from : `${from}–${to}`
}

/** Adds an alpha channel to a token hex, for the 10% area wash under the line (dataviz spec). */
function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}${a}` : hex
}

/** Warning triangle with "!" drawn above each flagged point. */
const clusterMarker: Plugin<'line'> = {
  id: 'clusterMarker',
  afterDatasetsDraw(chart: Chart<'line'>) {
    const indexes = (chart.options.plugins as { clusterMarker?: { indexes: number[] } })
      .clusterMarker?.indexes
    if (!indexes?.length) return
    const { ctx } = chart
    const meta = chart.getDatasetMeta(0)
    ctx.save()
    for (const index of indexes) {
      const point = meta.data[index]
      if (!point) continue
      const { x, y } = point.getProps(['x', 'y'], true) as { x: number; y: number }
      const top = y - 24
      ctx.beginPath()
      ctx.moveTo(x, top)
      ctx.lineTo(x + 8, top + 13)
      ctx.lineTo(x - 8, top + 13)
      ctx.closePath()
      ctx.fillStyle = colorToken('warning')
      ctx.fill()
      ctx.fillStyle = colorToken('white')
      ctx.font = 'bold 10px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('!', x, top + 11.5)
    }
    ctx.restore()
  },
}

function TrendLineChart({ trends, clusters }: { trends: Trends; clusters: ClusterNote[] }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const totals = bucketTotals(trends)
  const showEveryCountGridline = Math.max(0, ...totals) <= 12
  const clusterIdx = [...new Set(clusters.map((c) => c.bucketIndex))]
  const green = colorToken('brand-green')
  const warning = colorToken('warning')
  const surface = colorToken('background')
  const grid = colorToken('border')
  const tick = colorToken('text-secondary')
  const isCluster = (i: number) => clusterIdx.includes(i)

  const data = {
    labels: trends.buckets.map((b) => b.label),
    datasets: [
      {
        label: 'Visits and incidents',
        data: totals,
        borderColor: green,
        borderWidth: 2,
        // Vertical gradient wash (reference style): 22% at the top fading to 0 at the baseline.
        backgroundColor: (ctx: ScriptableContext<'line'>) => {
          const { chartArea, ctx: c } = ctx.chart
          if (!chartArea) return withAlpha(green, 0.1)
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          g.addColorStop(0, withAlpha(green, 0.22))
          g.addColorStop(1, withAlpha(green, 0))
          return g
        },
        fill: 'origin' as const,
        tension: 0.3,
        pointRadius: totals.map((_, i) => (isCluster(i) ? 6 : 3.5)),
        pointHoverRadius: totals.map((_, i) => (isCluster(i) ? 9 : 7)),
        pointHitRadius: 14,
        pointBackgroundColor: totals.map((_, i) => (isCluster(i) ? warning : green)),
        pointBorderColor: surface,
        pointBorderWidth: 2,
      },
    ],
  }

  const options: ChartOptions<'line'> & { plugins: { clusterMarker: { indexes: number[] } } } = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 28, right: 8 } },
    animation: prefersReducedMotion ? false : { duration: 280, easing: 'easeOutCubic' },
    // Hover point and tooltip move slower and ease in and out, so moving across the chart glides.
    animations: prefersReducedMotion
      ? undefined
      : { radius: { duration: HOVER_MS, easing: 'easeInOutCubic' } },
    transitions: {
      active: {
        animation: { duration: prefersReducedMotion ? 0 : HOVER_MS, easing: 'easeInOutCubic' },
      },
    },
    interaction: { mode: 'index', axis: 'x', intersect: false },
    scales: {
      x: {
        grid: { display: false },
        border: { color: grid },
        ticks: { color: tick, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
      },
      y: {
        beginAtZero: true,
        grid: { color: grid },
        border: { display: false },
        ticks: {
          color: tick,
          precision: 0,
          ...(showEveryCountGridline ? { stepSize: 1, maxTicksLimit: 13 } : { maxTicksLimit: 5 }),
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false,
        displayColors: false,
        external: (context) => smoothTooltip(context, HOVER_MS),
        callbacks: {
          title: (items) => bucketName(trends.buckets[items[0].dataIndex], trends.granularity),
          label: (item) => `${item.parsed.y} visits and incidents`,
          afterLabel: (item) =>
            clusters
              .filter((c) => c.bucketIndex === item.dataIndex)
              .map((c) => `Possible cluster: ${c.complaint} (${c.count})`)
              .join('\n'),
        },
      },
      clusterMarker: { indexes: clusterIdx },
    },
  }

  const summary = `Visits and incidents by ${trends.granularity}: ${trends.buckets
    .map(
      (b, i) =>
        `${bucketName(b, trends.granularity)} ${totals[i]}${isCluster(i) ? ' (possible symptom cluster)' : ''}`,
    )
    .join('; ')}.`

  return (
    // Printing runs no script, so Chart.js can't re-measure for the narrower page: the canvas would keep
    // its screen width and spill past the card under the cluster note. In print it scales to the
    // card's width (height from its own aspect ratio), and the box shrinks to fit it.
    <div className="relative h-72 print:h-auto print:[&_canvas]:h-auto! print:[&_canvas]:w-full!">
      <Line
        data={data}
        options={options}
        plugins={[clusterMarker]}
        role="img"
        aria-label={summary}
      />
    </div>
  )
}

/** Monthly grouped bars make weekday patterns comparable without pretending adjacent dates are alike. */
function WeekdayComparisonChart({ comparison }: { comparison: WeekdayComparison }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const current = colorToken('brand-green-dark')
  const previous = colorToken('text-secondary')
  const surface = colorToken('background')
  const grid = colorToken('border')
  const tick = colorToken('text-secondary')
  const summary = comparison.rows
    .map((row) => `${row.label}: ${comparison.currentLabel} ${row.current}; ${comparison.previousLabel} ${row.previous}`)
    .join('; ')
  return (
    <div className="relative h-72 print:h-auto print:[&_canvas]:h-auto! print:[&_canvas]:w-full!">
      <Bar
        role="img"
        aria-label={`Visits and incidents by weekday, ${comparison.currentLabel} compared with ${comparison.previousLabel}: ${summary}.`}
        data={{
          labels: comparison.rows.map((row) => row.label.slice(0, 3)),
          datasets: [
            {
              label: `${comparison.currentLabel} (solid)`,
              data: comparison.rows.map((row) => row.current),
              backgroundColor: current,
              borderColor: surface,
              borderWidth: 1,
              borderRadius: 3,
            },
            {
              label: `${comparison.previousLabel} (outlined)`,
              data: comparison.rows.map((row) => row.previous),
              backgroundColor: withAlpha(previous, 0.18),
              borderColor: previous,
              borderWidth: 2,
              borderRadius: 3,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: prefersReducedMotion ? false : { duration: 280, easing: 'easeOutCubic' },
          transitions: { active: { animation: { duration: prefersReducedMotion ? 0 : HOVER_MS, easing: 'easeInOutCubic' } } },
          interaction: { mode: 'index', axis: 'x', intersect: false },
          scales: {
            x: { grid: { display: false }, border: { color: grid }, ticks: { color: tick, maxRotation: 0 } },
            y: { beginAtZero: true, grid: { color: grid }, border: { display: false }, ticks: { color: tick, precision: 0 } },
          },
          plugins: {
            legend: { display: true, labels: { color: tick, boxWidth: 14 } },
            tooltip: {
              enabled: false,
              external: (context) => smoothTooltip(context, HOVER_MS),
              callbacks: {
                title: (items) => comparison.rows[items[0].dataIndex].label,
                label: (item) => `${item.dataset.label?.replace(/ \(.+\)/, '')}: ${item.parsed.y}`,
                // One short line: the counts are already above, and the prior month's busiest date
                // stays in the Table view.
                afterBody: (items) => {
                  const peak = comparison.rows[items[0].dataIndex].currentPeak
                  if (!peak) return []
                  const context = peak.annotations.length ? ` · ${peak.annotations.join(', ')}` : ''
                  return [`Busiest day: ${formatShortDate(peak.date)} (${peak.count} ${peak.count === 1 ? 'case' : 'cases'})${context}`]
                },
              },
            },
          },
        }}
      />
    </div>
  )
}

/** Keyboard-focusable text alternative; each month pairs its case count with its busiest date. */
function WeekdayComparisonTable({ comparison }: { comparison: WeekdayComparison }) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[44rem] table-fixed text-sm" aria-label="Visits and incidents by weekday comparison">
        <colgroup>
          <col className="w-[14%]" />
          {/* Wide enough for "Visits and incidents" on two lines (panel review 5.1: say what is counted). */}
          <col className="w-[13%]" />
          <col className="w-[30%]" />
          <col className="w-[13%]" />
          <col className="w-[30%]" />
        </colgroup>
        <thead className="border-b border-border text-left text-xs text-text-secondary">
          <tr>
            <th scope="col" rowSpan={2} className="px-2 py-1.5 font-semibold">Weekday</th>
            <th scope="colgroup" colSpan={2} className="border-l border-border bg-surface px-2 py-1.5 text-center font-semibold">{comparison.currentLabel}</th>
            <th scope="colgroup" colSpan={2} className="border-l border-border bg-surface px-2 py-1.5 text-center font-semibold">{comparison.previousLabel}</th>
          </tr>
          <tr>
            <th scope="col" className="border-l border-border px-2 py-1.5 text-right font-semibold">Visits and incidents</th>
            <th scope="col" className="px-2 py-1.5 font-semibold">Busiest date &amp; context</th>
            <th scope="col" className="border-l border-border px-2 py-1.5 text-right font-semibold">Visits and incidents</th>
            <th scope="col" className="px-2 py-1.5 font-semibold">Busiest date &amp; context</th>
          </tr>
        </thead>
        <tbody>
          {comparison.rows.map((row) => (
            <tr key={row.label} tabIndex={0} className="border-b border-border last:border-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-green">
              <th scope="row" className="px-2 py-2 text-left font-semibold text-text-primary">{row.label}</th>
              <td className="border-l border-border px-2 py-2 text-right tabular-nums">{row.current}</td>
              <td className="px-2 py-2 text-xs text-text-secondary">
                {row.currentPeak ? (
                  <>
                    <span className="block font-semibold text-text-primary">{formatShortDate(row.currentPeak.date)} · {row.currentPeak.count} {row.currentPeak.count === 1 ? 'case' : 'cases'}</span>
                    {row.currentPeak.annotations.length > 0 && <span className="block">{row.currentPeak.annotations.join(', ')}</span>}
                  </>
                ) : 'No recorded day'}
              </td>
              <td className="border-l border-border px-2 py-2 text-right tabular-nums">{row.previous}</td>
              <td className="px-2 py-2 text-xs text-text-secondary">
                {row.previousPeak ? (
                  <>
                    <span className="block font-semibold text-text-primary">{formatShortDate(row.previousPeak.date)} · {row.previousPeak.count} {row.previousPeak.count === 1 ? 'case' : 'cases'}</span>
                    {row.previousPeak.annotations.length > 0 && <span className="block">{row.previousPeak.annotations.join(', ')}</span>}
                  </>
                ) : 'No recorded day'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TrendTable({ trends }: { trends: Trends }) {
  const [sort, setSort] = useState<TableSortState<string>>({
    key: 'total',
    direction: 'descending',
  })
  const [showAllComplaints, setShowAllComplaints] = useState(false)
  const totals = bucketTotals(trends)
  const firstVisibleBucketIndex = Math.max(0, trends.buckets.length - MAX_VISIBLE_TABLE_PERIODS)
  const visibleBucketIndexes = trends.buckets
    .slice(firstVisibleBucketIndex)
    .map((_, index) => firstVisibleBucketIndex + index)
  const visibleBuckets = visibleBucketIndexes.map((index) => trends.buckets[index])
  const earlierPeriodCount = firstVisibleBucketIndex
  const visibleTotal = (counts: number[]) =>
    visibleBucketIndexes.reduce((sum, index) => sum + counts[index], 0)
  const totalRow: ComplaintSeries = {
    complaint: 'All visits & incidents',
    counts: totals,
    total: visibleTotal(totals),
    clusterBuckets: [],
  }
  const complaintRows = [...trends.series, ...trends.otherComplaints].map((row) => ({
    ...row,
    total: visibleTotal(row.counts),
  }))
  const maxComplaintLength = Math.max(
    totalRow.complaint.length,
    ...complaintRows.map((row) => row.complaint.length),
  )
  const complaintMinColumnWidth = `${maxComplaintLength + 2}ch`
  const periodColumnsWidth = `${visibleBuckets.length * PERIOD_COLUMN_WIDTH_REM}rem`
  // The Complaint column fills any spare width on short ranges, keeping Total flush to the right.
  // At the minimum table width it resolves back to its content-calibrated minimum.
  const complaintColumnWidth = `calc(100% - ${periodColumnsWidth} - ${TOTAL_COLUMN_WIDTH})`
  const visibleComplaintRows = complaintRows.filter(
    (row) => showAllComplaints || visibleBucketIndexes.some((index) => row.counts[index] > 0),
  )
  const rows = [totalRow, ...visibleComplaintRows]
  const sortColumn = (key: string, label: string) => ({
    label,
    direction: sort.key === key ? sort.direction : undefined,
    onSort: () => setSort((current) => toggleTableSort(current, key)),
  })
  const columns: Array<DataTableColumn<ComplaintSeries>> = [
    {
      key: 'complaint',
      header: 'Complaint',
      cell: (r) => r.complaint,
      rowHeader: true,
      width: complaintColumnWidth,
      sort: sortColumn('complaint', 'Complaint'),
    },
    ...visibleBuckets.map((b, displayIndex) => {
      const sourceIndex = visibleBucketIndexes[displayIndex]
      return {
        key: b.key,
        header: tableBucketHeader(b, trends.granularity),
        align: 'right' as const,
        width: PERIOD_COLUMN_WIDTH,
        cell: (r: ComplaintSeries) =>
          r.clusterBuckets.includes(sourceIndex) ? (
            <span className="inline-flex items-center gap-1 font-semibold">
              <Icon name="alertTriangle" size={12} className="text-warning" />
              {r.counts[sourceIndex]}
              <span className="sr-only"> (possible symptom cluster)</span>
            </span>
          ) : (
            r.counts[sourceIndex]
          ),
      }
    }),
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      width: TOTAL_COLUMN_WIDTH,
      sort: sortColumn('total', 'Total'),
      cell: (r) => <strong>{r.total}</strong>,
    },
  ]
  // A long period window grows past this content-calibrated minimum and overflows into the scroller;
  // fixed layout keeps every column stable when rows are hidden or shown.
  const tableMinWidth = `calc(${complaintMinColumnWidth} + ${periodColumnsWidth} + ${TOTAL_COLUMN_WIDTH})`
  // Only Complaint and Total sort; period columns read in time order and aren't sortable.
  const sortedRows = sortTableRows(rows, sort, (row, key) =>
    key === 'complaint' ? row.complaint : row.total,
  )
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-pressed={showAllComplaints}
        onClick={() => setShowAllComplaints((current) => !current)}
        className="w-fit cursor-pointer rounded-sm px-1 py-0.5 text-xs text-text-secondary underline-offset-2 transition-colors duration-150 hover:text-brand-green-dark hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none"
      >
        {showAllComplaints ? 'Hide zero-activity complaint types' : 'Show all complaint types'}
      </button>
      <p aria-live="polite" className="sr-only">
        {showAllComplaints
          ? 'Showing all complaint types.'
          : 'Zero-activity complaint types are hidden.'}
      </p>
      <DataTable
        caption="Complaint counts per period, visits and incidents combined. A warning icon marks a possible symptom cluster."
        columns={columns}
        rows={sortedRows}
        rowKey={(r) => r.complaint}
        fixedLayout
        minTableWidth={tableMinWidth}
        stickyFirstColumn
        stickyLastColumn
      />
      {earlierPeriodCount > 0 && (
        <p className="text-xs text-text-secondary">
          + {earlierPeriodCount} earlier period{earlierPeriodCount === 1 ? '' : 's'} — narrow the
          date range to see them
        </p>
      )}
    </div>
  )
}

function VisitsTrendCard({
  trends,
  clusters,
}: {
  trends: Trends
  clusters: ClusterNote[]
}) {
  const headingId = useId()
  const [view, setView] = useState<ViewMode>('chart')
  const years = trendYears(trends)
  const comparison = trends.weekdayComparison
  const hasData = trends.buckets.length > 1 || trends.series.length > 0
  const tooFewBuckets = trends.buckets.length < 2
  const showTable = view === 'table'

  return (
    <Card aria-labelledby={headingId} className="lg:col-span-2">
      <CardHeader
        titleId={headingId}
        icon={<Icon name="activity" />}
        title={
          years ? (
            <>
              Visits trend <span className="font-normal text-text-secondary">· {years}</span>
            </>
          ) : (
            'Visits trend'
          )
        }
        description={comparison ? `Monday to Sunday: ${comparison.currentLabel} compared with ${comparison.previousLabel}.` : `Visits and incidents per ${trends.granularity}.`}
        actions={
          <SegmentedControl
            label="Show trend as"
            value={view}
            onChange={(nextView) => setView(nextView)}
            options={[
              { value: 'chart', label: 'Chart', icon: 'barChart' },
              { value: 'table', label: 'Table', icon: 'table' },
            ]}
          />
        }
      />
      <CardBody className="flex flex-col gap-3">
        {!hasData ? (
          <EmptyState
            icon="activity"
            title="No visits or incidents in this date range"
            description="Choose a different period to see the trend."
          />
        ) : (
          <>
            {tooFewBuckets && (
              <p className="text-xs text-text-secondary">
                This period fits in a single {trends.granularity}, so there’s nothing to compare over time.
                Choose a longer period to see a trend.
              </p>
            )}
            {comparison ? showTable ? (
              // The complaint × day table follows, so every complaint type stays reachable on a
              // month range too (Common complaints points here for the ones it leaves out).
              <>
                <WeekdayComparisonTable comparison={comparison} />
                <TrendTable trends={trends} />
              </>
            ) : (
              <WeekdayComparisonChart comparison={comparison} />
            ) : showTable ? (
              <TrendTable trends={trends} />
            ) : (
              <TrendLineChart trends={trends} clusters={clusters} />
            )}
            {/* Weekday bars can't mark the day a cluster fell on, so the note carries it on month ranges. */}
            {clusters.length > 0 && (
              <div role="note" className="flex items-start gap-2 text-xs text-text-primary">
                <Icon name="alertTriangle" size={14} className="mt-0.5 shrink-0 text-warning" />
                <p>
                  <span className="font-semibold">Possible symptom cluster: </span>
                  {clusters
                    .map(
                      (c) =>
                        `${c.complaint}, ${c.count} cases (${bucketName(trends.buckets[c.bucketIndex], trends.granularity)})`,
                    )
                    .join('; ')}
                  .{' '}
                  <span className="text-text-secondary">
                    An early-warning signal to review, not a confirmed outbreak.
                  </span>
                </p>
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  )
}

function CommonComplaintsCard({ trends, clusters }: { trends: Trends; clusters: ClusterNote[] }) {
  const headingId = useId()
  const max = Math.max(1, ...trends.series.map((s) => s.total))
  const otherTotal = trends.otherComplaints.reduce((sum, s) => sum + s.total, 0)
  return (
    <Card aria-labelledby={headingId}>
      <CardHeader
        titleId={headingId}
        icon={<Icon name="barChart" />}
        title="Common complaints"
        description="Top complaints in this period."
      />
      <CardBody>
        {trends.series.length === 0 ? (
          <EmptyState icon="barChart" title="No complaints recorded in this date range" />
        ) : (
          <>
            <ol className="flex flex-col gap-4" aria-labelledby={headingId}>
              {trends.series.map((s) => {
                const cluster = clusters.find((c) => c.complaint === s.complaint)
                return (
                  <li key={s.complaint} className="flex flex-col gap-1">
                    <div className="grid grid-cols-[minmax(0,8rem)_1fr_2.5rem] items-center gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-1.5 text-text-primary">
                        <span className="truncate">{s.complaint}</span>
                        {cluster && (
                          <Icon name="alertTriangle" size={14} className="shrink-0 text-warning" />
                        )}
                      </span>
                      <span aria-hidden="true" className="h-3 rounded-full bg-surface">
                        <span
                          className={cn(
                            'block h-3 rounded-full',
                            cluster ? 'bg-warning' : 'bg-brand-green-dark',
                          )}
                          style={{ width: `${Math.max(4, (s.total / max) * 100)}%` }}
                        />
                      </span>
                      <span className="text-right font-semibold text-text-primary tabular-nums">
                        {s.total}
                      </span>
                    </div>
                    {cluster && (
                      <p className="text-xs text-text-secondary">
                        Possible cluster:{' '}
                        {bucketName(trends.buckets[cluster.bucketIndex], trends.granularity)}
                      </p>
                    )}
                  </li>
                )
              })}
            </ol>
            {trends.otherComplaints.length > 0 && (
              <p className="mt-3 border-t border-border pt-2 text-xs text-text-secondary">
                {trends.otherComplaints.length} other complaint types, {otherTotal} cases (see the
                trend’s Table view)
              </p>
            )}
          </>
        )}
      </CardBody>
    </Card>
  )
}

export interface ComplaintTrendsProps {
  trends: Trends
  demographics?: DemographicAnalysis
  filters?: { sex: 'female' | 'male' | null; gradeLevel: string | null }
  onFiltersChange?: (filters: { sex: 'female' | 'male' | null; gradeLevel: string | null }) => void
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}

/**
 * Filter toggles. Selected reads like a `SegmentedControl` chip (green ring, raised, heavier
 * weight), so the active filter is visible without relying on color alone.
 */
const FILTER_BUTTON_BASE =
  'cursor-pointer rounded-md border border-border text-left transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green aria-pressed:border-brand-green aria-pressed:bg-background aria-pressed:shadow-card aria-pressed:ring-1 aria-pressed:ring-brand-green motion-reduce:transition-none'
const FILTER_BUTTON = `${FILTER_BUTTON_BASE} px-3 py-2 text-sm`

// Grade filters have short labels and sit beneath a dense chart, so they use a compact grid without
// changing the larger sex-filter controls alongside them.
const GRADE_FILTER_BUTTON = `${FILTER_BUTTON_BASE} min-w-0 px-2 py-1.5 text-xs`

function countsText(rows: DemographicAnalysis['sex']) {
  return rows.map((row) => `${row.label} ${row.count} (${percent(row.share)})`).join('; ')
}

function splitText(rows: DemographicAnalysis['gradeLevel']) {
  return rows
    .map((row) => `${row.label} ${row.visits} ${row.visits === 1 ? 'visit' : 'visits'}, ${row.incidents} ${row.incidents === 1 ? 'incident' : 'incidents'}`)
    .join('; ')
}

function DemographicCharts({
  demographics,
  filters,
  onFiltersChange,
}: Required<Pick<ComplaintTrendsProps, 'demographics' | 'filters' | 'onFiltersChange'>>) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const animation = prefersReducedMotion ? false : ({ duration: 280, easing: 'easeOutCubic' } as const)
  // The same gliding tooltip as the trend charts, instead of Chart.js's canvas tooltip that jumps.
  const hover = {
    transitions: { active: { animation: { duration: prefersReducedMotion ? 0 : HOVER_MS, easing: 'easeInOutCubic' as const } } },
    tooltip: { enabled: false, external: (context: Parameters<typeof smoothTooltip>[0]) => smoothTooltip(context, HOVER_MS) },
  }
  // The visible Female/Male labels carry the meaning; these documented colors make the datasets
  // readily distinguishable without reusing status colors.
  const sexColors = demographics.sex.map((row) =>
    colorToken(row.key === 'female' ? 'chart-female' : 'chart-male'),
  )
  const tick = colorToken('text-secondary')
  return (
    <section aria-label="Demographic analysis" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* On desktop the card stretches to the grade card beside it: a somewhat larger donut, with the
          leftover height shared above and below instead of one empty band under the buttons. */}
      <Card className="lg:flex lg:flex-col">
        <CardHeader title="Visits and incidents by sex" description="Visits and incidents in the selected period; aggregated only." icon={<Icon name="barChart" />} />
        <CardBody className="flex flex-col gap-3 lg:flex-1 lg:justify-center">
          {/* Legend clicks would hide a segment while its count stays on the button below; filtering is the buttons' job. */}
          <div className="relative h-56 lg:h-72"><Doughnut data={{ labels: demographics.sex.map((row) => row.label), datasets: [{ data: demographics.sex.map((row) => row.count), backgroundColor: sexColors, borderColor: colorToken('background'), borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, animation, transitions: hover.transitions, plugins: { tooltip: hover.tooltip, legend: { display: true, position: 'bottom', onClick: () => {}, labels: { color: tick } } } }} aria-label={`Visits and incidents by Sex: ${countsText(demographics.sex)}.`} role="img" /></div>
          <div className="grid grid-cols-2 gap-2">
            {demographics.sex.map((row) => (
              <button key={row.key} type="button" aria-pressed={filters.sex === row.key} onClick={() => onFiltersChange({ ...filters, sex: filters.sex === row.key ? null : row.key as 'female' | 'male' })} className={FILTER_BUTTON}>
                <span className="block font-semibold text-text-primary">{row.label}</span><span className="text-text-secondary">{row.count} · {percent(row.share)}</span>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Visits and incidents by grade level" description="Visits and incidents in the selected period; aggregated only." icon={<Icon name="barChart" />} />
        <CardBody className="flex flex-col gap-3">
          {/* Stacked, so each bar's height is still the grade's total; incidents use the incident red. */}
          <div className="relative h-56"><Bar data={{ labels: demographics.gradeLevel.map((row) => row.label), datasets: [{ label: 'Visits', data: demographics.gradeLevel.map((row) => row.visits), backgroundColor: colorToken('brand-green-dark'), borderColor: colorToken('background'), borderWidth: 1 }, { label: 'Incidents', data: demographics.gradeLevel.map((row) => row.incidents), backgroundColor: colorToken('error'), borderColor: colorToken('background'), borderWidth: 1 }] }} options={{ responsive: true, maintainAspectRatio: false, animation, transitions: hover.transitions, interaction: { mode: 'index', axis: 'x', intersect: false }, plugins: { tooltip: hover.tooltip, legend: { display: true, position: 'bottom', onClick: () => {}, labels: { color: tick, boxWidth: 14 } } }, scales: { x: { stacked: true, ticks: { color: tick } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0, color: tick } } } }} aria-label={`Visits and incidents by grade level: ${splitText(demographics.gradeLevel)}.`} role="img" /></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {demographics.gradeLevel.map((row) => (
              <button key={row.key} type="button" aria-pressed={filters.gradeLevel === row.key} onClick={() => onFiltersChange({ ...filters, gradeLevel: filters.gradeLevel === row.key ? null : row.key })} className={GRADE_FILTER_BUTTON}>
                <span className="font-semibold text-text-primary">{row.label}</span><span className="ml-1 text-text-secondary">{row.count} · {percent(row.share)}</span>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>
    </section>
  )
}

export function ComplaintTrends({ trends, demographics, filters, onFiltersChange }: ComplaintTrendsProps) {
  const clusters = useMemo(() => findClusters(trends), [trends])
  return (
    <section aria-label="Trends" className="flex flex-col gap-4">
      {demographics && filters && onFiltersChange && <DemographicCharts demographics={demographics} filters={filters} onFiltersChange={onFiltersChange} />}
      <div className={TRENDS_GRID}>
        <VisitsTrendCard trends={trends} clusters={clusters} />
        <CommonComplaintsCard trends={trends} clusters={clusters} />
      </div>
    </section>
  )
}

// `items-start`: each card keeps its own height instead of stretching to the taller one.
const TRENDS_GRID = 'grid grid-cols-1 items-start gap-4 lg:grid-cols-3'

/**
 * Loading placeholder shaped like the trends row: the line-chart card (real title, toggle bars, a
 * chart frame with gridlines and a flat placeholder line) and the complaints card (real title,
 * five label + bar rows).
 */
export function ComplaintTrendsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div data-skeleton="demographics" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {['Visits and incidents by sex', 'Visits and incidents by grade level'].map((title) => (
          <div key={title} className={CARD_SURFACE}>
            <div className="flex items-start gap-2.5 px-5 pt-5 pb-3">
              <span className="mt-0.5 text-brand-green-dark">
                <Icon name="barChart" />
              </span>
              <div className="flex flex-col gap-1.5">
                <span className="text-base font-semibold text-text-primary">{title}</span>
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
            <div className="flex flex-col gap-3 px-5 pb-5">
              <Skeleton className="h-56" />
              <div className="flex gap-2">
                <Skeleton className="h-14 flex-1" />
                <Skeleton className="h-14 flex-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div data-skeleton="complaint-trends" className={TRENDS_GRID}>
        <div data-skeleton="trend-chart" className={cn(CARD_SURFACE, 'lg:col-span-2')}>
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 pb-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-brand-green-dark">
                <Icon name="activity" />
              </span>
              <div className="flex flex-col gap-1.5">
                <span className="text-base font-semibold text-text-primary">Visits trend</span>
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
          <div className="px-5 pb-5">
            <div className="flex h-72 flex-col justify-between border-b border-border pt-7">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-2.5 w-5" />
                  <div className="h-px flex-1 bg-border" />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-around">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-2.5 w-10" />
              ))}
            </div>
          </div>
        </div>
        <div data-skeleton="complaints-list" className={CARD_SURFACE}>
          <div className="flex items-start gap-2.5 px-5 pt-5 pb-3">
            <span className="mt-0.5 text-brand-green-dark">
              <Icon name="barChart" />
            </span>
            <div className="flex flex-col gap-1.5">
              <span className="text-base font-semibold text-text-primary">Common complaints</span>
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
          <ol className="flex flex-col gap-5 px-5 pb-5">
            {[90, 72, 55, 40, 28].map((w) => (
              <li
                key={w}
                data-skeleton="complaint-row"
                className="grid grid-cols-[minmax(0,8rem)_1fr_2.5rem] items-center gap-3"
              >
                <Skeleton className="h-3 w-24" />
                <span className="h-3 rounded-full bg-surface">
                  <Skeleton className="h-3 rounded-full" style={{ width: `${w}%` }} />
                </span>
                <Skeleton className="ml-auto h-3 w-6" />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
