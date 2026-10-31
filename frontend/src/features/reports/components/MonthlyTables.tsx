import { DataTable, EmptyState, PrintTable } from '../../../components'
import { formatDate } from '../../../lib/dates'
import type { MonthlyInventoryRow } from '../../../lib/mock-db'
import type { MonthlyReportData } from '../api/reportsApi'

/*
 * The two monthly tables the clinic keeps on paper (ADR-050): visits by complaint per week, and the
 * inventory sheet. Each has a screen table and an A4 table built from the same rows.
 */

type Weekly = MonthlyReportData['weeklyComplaints']
type WeeklyRow = { complaint: string; counts: number[]; total: number }

/** The complaint rows plus an "All complaints" row, so the week columns can be checked against the total. */
function weeklyRows(weekly: Weekly): WeeklyRow[] {
  const total = weekly.totals.reduce((sum, count) => sum + count, 0)
  return [...weekly.rows, { complaint: ALL_COMPLAINTS, counts: weekly.totals, total }]
}

const ALL_COMPLAINTS = 'All complaints'

/** Zeros recede and the "All complaints" row stands out, so the real counts are what the eye finds. */
function weekCell(row: WeeklyRow, count: number) {
  if (row.complaint === ALL_COMPLAINTS) return <span className="font-semibold">{count}</span>
  return count === 0 ? <span className="text-text-secondary">0</span> : count
}

/** "Oct 11–17" on screen; the printout keeps the shorter "11-17" under its month title. */
function weekHeader(week: Weekly['weeks'][number]) {
  return `${formatDate(week.from, { month: 'short' })} ${week.label.replace('-', '–')}`
}

export function WeeklyComplaintsTable({ weekly }: { weekly: Weekly }) {
  if (!weekly.rows.length) return <EmptyState title="No clinic visits this month" description="Weekly counts appear once visits are recorded." />
  return (
    <DataTable
      caption="Clinic visits by complaint and week"
      columns={[
        { key: 'complaint', header: 'Complaint', rowHeader: true, width: '12rem', cell: (row: WeeklyRow) => row.complaint },
        ...weekly.weeks.map((week, index) => ({ key: week.from, header: weekHeader(week), align: 'right' as const, width: '6rem', cell: (row: WeeklyRow) => weekCell(row, row.counts[index]) })),
        { key: 'total', header: 'Total', align: 'right', width: '5rem', cell: (row: WeeklyRow) => <span className="font-semibold">{row.total}</span> },
      ]}
      rows={weeklyRows(weekly)}
      rowKey={(row) => row.complaint}
      fixedLayout
      stickyFirstColumn
      minTableWidth={`${12 + 6 * (weekly.weeks.length + 1)}rem`}
    />
  )
}

export function WeeklyComplaintsPrint({ weekly }: { weekly: Weekly }) {
  return (
    <PrintTable
      caption="Clinic visits by complaint and week"
      rows={weekly.rows.length ? weeklyRows(weekly) : []}
      rowKey={(row) => row.complaint}
      empty="No clinic visits were recorded this month."
      columns={[
        { header: 'Complaint', cell: (row) => row.complaint },
        ...weekly.weeks.map((week, index) => ({ header: week.label, width: '9%', align: 'right' as const, cell: (row: WeeklyRow) => row.counts[index] })),
        { header: 'Total', width: '9%', align: 'right', cell: (row) => row.total },
      ]}
    />
  )
}

const INVENTORY_COLUMNS = [
  { key: 'item', header: 'Item', cell: (row: MonthlyInventoryRow) => row.itemName },
  { key: 'unit', header: 'Unit', width: '7rem', cell: (row: MonthlyInventoryRow) => row.unit },
  { key: 'purchase', header: 'New Purchase', align: 'right' as const, width: '8rem', cell: (row: MonthlyInventoryRow) => row.newPurchase },
  { key: 'available', header: 'Total Available', align: 'right' as const, width: '8rem', cell: (row: MonthlyInventoryRow) => row.totalAvailable },
  { key: 'ending', header: 'Ending Inventory', align: 'right' as const, width: '8rem', cell: (row: MonthlyInventoryRow) => row.endingInventory },
]

export function InventorySheetTable({ rows }: { rows: MonthlyInventoryRow[] }) {
  if (!rows.length) return <EmptyState title="No inventory items" description="Add items on the Inventory screen." />
  return (
    <div className="flex flex-col gap-3">
      <DataTable caption="Monthly inventory sheet" columns={INVENTORY_COLUMNS} rows={rows} rowKey={(row) => row.itemId} fixedLayout minTableWidth="44rem" />
      <p className="text-xs text-text-secondary">
        Computed from the stock movements: New Purchase is what was restocked in the month, Total Available is the stock at its start plus New Purchase, and Ending Inventory is what was left after dispensing, adjustments and expiry write-offs.
      </p>
    </div>
  )
}

export function InventorySheetPrint({ rows }: { rows: MonthlyInventoryRow[] }) {
  return (
    <PrintTable
      caption="Monthly inventory sheet"
      rows={rows}
      rowKey={(row) => row.itemId}
      empty="No inventory items."
      columns={INVENTORY_COLUMNS.map(({ header, width, cell, ...column }) => ({
        header,
        cell,
        width: width ? (header === 'Unit' ? '12%' : '15%') : undefined,
        ...('align' in column ? { align: column.align } : {}),
      }))}
    />
  )
}

type BySex = MonthlyReportData['visitsBySex']

/** Visits by sex, as the Dashboard's Trends tables word it (ADR-045, ADR-051); staff patients apart. */
function sexRows(bySex: BySex) {
  return [
    { label: 'Female', count: bySex.female },
    { label: 'Male', count: bySex.male },
    { label: 'All students', count: bySex.female + bySex.male },
    { label: 'Staff (no sex recorded)', count: bySex.staff },
  ]
}

export function VisitsBySexSummary({ bySex }: { bySex: BySex }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {sexRows(bySex).map((row) => (
        <div key={row.label} className="rounded-md border border-border bg-surface px-4 py-3">
          <dt className="text-xs font-semibold text-text-secondary">{row.label}</dt>
          <dd className="mt-1 text-xl font-bold text-text-primary tabular-nums">{row.count}</dd>
        </div>
      ))}
    </dl>
  )
}

export function VisitsBySexPrint({ bySex }: { bySex: BySex }) {
  return (
    <PrintTable
      caption="Clinic visits by sex"
      rows={sexRows(bySex)}
      rowKey={(row) => row.label}
      empty=""
      columns={[
        { header: 'Group', cell: (row) => row.label },
        { header: 'Visits', width: '20%', align: 'right', cell: (row) => row.count },
      ]}
    />
  )
}
