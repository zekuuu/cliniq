import '../../../components/charts/chartSetup'
import type { ChartOptions } from 'chart.js'
import { useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { DataTable, EmptyState, SegmentedControl, type DataTableColumn } from '../../../components'
import { cn } from '../../../lib/cn'
import { smoothTooltip } from '../../../components/charts/smoothTooltip'
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion'
import { colorToken } from '../../../lib/tokens'
import { sortTableRows, toggleTableSort, type TableSortState } from '../../../lib/tableSort'
import type { ComplaintCount } from '../../../lib/mock-db'

/*
 * Complaint summary (Screen Inventory #21, formerly Health Summaries): clinic visits per complaint for the report month.
 * - Chart by default: one-series horizontal bars sorted by count, which suits comparing sizes across
 *   categories with long labels. One hue (brand-green-dark), since color carries no identity here.
 *   There's deliberately no chart-type picker: the data decides the form.
 * - Table view: exact figures, screen-reader friendly, and the basis for export.
 * - Print: the chart AND the table always print, whichever view is on screen, so a paper report
 *   always carries the exact numbers. The chart stays mounted (off-screen in Table view) so it has
 *   a real size to print from.
 */

type ViewMode = 'chart' | 'table'
type HealthSortKey = 'complaint' | 'visits'

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

function ComplaintBarChart({ rows }: { rows: ComplaintCount[] }) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const bar = colorToken('brand-green-dark')
  const grid = colorToken('border')
  const tick = colorToken('text-secondary')
  const label = colorToken('text-primary')

  const data = {
    labels: rows.map((r) => r.complaint),
    datasets: [
      {
        label: 'Visits',
        data: rows.map((r) => r.count),
        backgroundColor: bar,
        hoverBackgroundColor: colorToken('brand-green'),
        // Rounded only at the data end; the bar stays anchored flat to the baseline.
        borderRadius: 4,
        borderSkipped: 'start' as const,
        barPercentage: 0.7,
        categoryPercentage: 0.9,
        maxBarThickness: 22,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    // Sharper bitmap when the canvas is scaled into a printed page.
    devicePixelRatio: Math.max(2, typeof window === 'undefined' ? 1 : window.devicePixelRatio),
    layout: { padding: { right: 8 } },
    animation: prefersReducedMotion ? false : { duration: 280, easing: 'easeOutCubic' },
    animations: prefersReducedMotion
      ? undefined
      : { x: { duration: 280, easing: 'easeOutCubic' } },
    transitions: {
      active: { animation: { duration: prefersReducedMotion ? 0 : 160, easing: 'easeOutCubic' } },
    },
    interaction: { mode: 'nearest', axis: 'y', intersect: false },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: grid },
        border: { display: false },
        ticks: { color: tick, precision: 0, maxTicksLimit: 6 },
        title: { display: true, text: 'Visits', color: tick },
      },
      y: {
        grid: { display: false },
        border: { color: grid },
        ticks: { color: label, autoSkip: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false,
        displayColors: false,
        external: smoothTooltip,
        callbacks: { label: (item) => plural(item.parsed.x ?? 0, 'visit') },
      },
    },
  }

  const summary = `Clinic visits by complaint: ${rows
    .map((r) => `${r.complaint} ${r.count}`)
    .join('; ')}.`

  return (
    <div
      data-chart="health-summary"
      className="relative w-full"
      style={{ height: `${Math.max(160, rows.length * 34 + 48)}px` }}
    >
      <Bar data={data} options={options} role="img" aria-label={summary} />
    </div>
  )
}

/** `rows` arrive computed (visits per complaint, most frequent first) from the data layer. */
export function HealthSummary({ rows }: { rows: ComplaintCount[] }) {
  const [view, setView] = useState<ViewMode>('chart')
  const [sort, setSort] = useState<TableSortState<HealthSortKey>>({ key: 'visits', direction: 'descending' })
  const totalVisits = rows.reduce((sum, row) => sum + row.count, 0)

  if (rows.length === 0) {
    return (
      <EmptyState
        icon="barChart"
        title="No clinic visits recorded this month"
        description="Choose a different report month to see a complaint summary."
      />
    )
  }

  const sortColumn = (key: HealthSortKey, label: string) => ({
    label,
    direction: sort.key === key ? sort.direction : undefined,
    onSort: () => setSort((current) => toggleTableSort(current, key)),
  })
  const columns: Array<DataTableColumn<ComplaintCount>> = [
    { key: 'complaint', header: 'Complaint', rowHeader: true, sort: sortColumn('complaint', 'Complaint'), cell: (r) => r.complaint },
    { key: 'visits', header: 'Visits', align: 'right', sort: sortColumn('visits', 'Visits'), cell: (r) => r.count },
  ]
  const sortedRows = sortTableRows(rows, sort, (row, key) => key === 'complaint' ? row.complaint : row.count)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-primary">
          <span className="font-semibold">{plural(totalVisits, 'visit')}</span> across{' '}
          {plural(rows.length, 'complaint type')}. Most common:{' '}
          <span className="font-semibold">{rows[0].complaint}</span> ({rows[0].count}).
        </p>
        <SegmentedControl
          label="Show complaint summary as"
          value={view}
          onChange={setView}
          className="print:hidden"
          options={[
            { value: 'chart', label: 'Chart', icon: 'barChart' },
            { value: 'table', label: 'Table', icon: 'table' },
          ]}
        />
      </div>

      {/* Off-screen (not display:none) in Table view, so the canvas keeps a size for printing. */}
      <div
        aria-hidden={view === 'table' || undefined}
        className={cn(
          'print:static print:w-full print:break-inside-avoid print:[&_canvas]:h-auto! print:[&_canvas]:w-full!',
          view === 'table' && 'pointer-events-none absolute -left-[10000px] w-[900px]',
        )}
      >
        <ComplaintBarChart rows={rows} />
      </div>

      <div data-table="health-summary" className={cn(view === 'chart' && 'hidden print:block')}>
        <DataTable
          caption="Complaint summary by complaint"
          columns={columns}
          rows={sortedRows}
          rowKey={(r) => r.complaint}
          fixedLayout
        />
      </div>

      <p className="text-xs text-text-secondary">
        Aggregated counts only. No student is identified in this summary; individual names stay
        inside a deliberately opened student profile.
      </p>
    </div>
  )
}
