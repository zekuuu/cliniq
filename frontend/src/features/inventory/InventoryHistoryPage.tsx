import { useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  BackButton,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  DateRangePicker,
  EmptyState,
  ErrorState,
  Icon,
  Pagination,
  Select,
  Skeleton,
  type DataTableColumn,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { usePageSize, type PageSize } from '../../hooks/usePageSize'
import { rangeForPreset, type DateRange } from '../../lib/dateRange'
import { formatDate, formatDateTime } from '../../lib/dates'
import {
  ADJUSTMENT_REASON_LABELS,
  getMockToday,
  listInventory,
  listInventoryMovements,
  type InventoryMovementRow,
} from '../../lib/mock-db'
import { paths } from '../../routes/paths'

const TYPE_OPTIONS = [
  { value: '', label: 'All movements' },
  { value: 'dispense', label: 'Dispensed' },
  { value: 'restock', label: 'Restocked' },
  { value: 'adjustment', label: 'Adjusted' },
]

const typeText = (row: InventoryMovementRow) =>
  row.reason
    ? `Adjusted: ${ADJUSTMENT_REASON_LABELS[row.reason]}`
    : row.type === 'dispense'
      ? 'Dispensed'
      : row.type === 'restock'
        ? 'Restocked'
        : 'Adjusted'

// Fits the card at 1280px with the sidebar open (about 56rem, less the focus-ring room), so a desktop never scrolls sideways
// (Zean, November 4, 2026). Balanced to the content (November 5): Change, Batch, Patient and By are
// sized to their widest usual value; Date and Movement take a share of the width, Item the
// rest, so at the page cap nothing wraps and on a narrower desktop the date and movement wrap first.
// All columns are left-aligned. Only a narrower screen scrolls.
const HISTORY_TABLE_MIN_WIDTH = '55rem'

/** "Nov 4, 2026 ·" over "10:05 AM": the time never breaks across lines. */
function DateOverTime({ value }: { value: string }) {
  const [date, time] = value.split(' · ')
  return time ? (
    <>
      {date} · <span className="whitespace-nowrap">{time}</span>
    </>
  ) : (
    value
  )
}

const columns: Array<DataTableColumn<InventoryMovementRow>> = [
  {
    key: 'when',
    header: 'Date and time',
    width: '17.5%',
    cell: (row) => <DateOverTime value={formatDateTime(row.timestamp)} />,
  },
  { key: 'item', header: 'Item', rowHeader: true, cell: (row) => row.itemName },
  { key: 'type', header: 'Movement', width: '20%', cell: typeText },
  {
    key: 'change',
    header: 'Change',
    width: '6.5rem',
    cell: (row) => `${row.change > 0 ? '+' : ''}${row.change} ${row.unit}`,
  },
  {
    key: 'batch',
    header: 'Batch',
    width: '6.5rem',
    cell: (row) =>
      row.batches
        .map(
          (batch) =>
            `${batch.quantity} · ${batch.expirationDate ? `exp. ${formatDate(batch.expirationDate)}` : 'no expiration'}`,
        )
        .join(', ') || 'Not recorded',
  },
  {
    key: 'patient',
    header: 'Patient',
    width: '7.5rem',
    cell: (row) => row.patientNumber ?? 'None',
  },
  { key: 'by', header: 'By', width: '7.5rem', cell: (row) => row.by },
]

/** Inventory Usage History (Module 8): every stock movement, or one item's with `?item=`. Staff only. */
export function InventoryHistoryPage() {
  const [params] = useSearchParams()
  const today = getMockToday()
  const [itemId, setItemId] = useState(params.get('item') ?? '')
  const [type, setType] = useState('')
  const [range, setRange] = useState<DateRange>(() => rangeForPreset('all', today))
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = usePageSize()
  const { data, status, isRefetching, reload } = useAsyncData(
    `${itemId}|${type}|${range.from}|${range.to}`,
    async () => {
      const [items, rows] = await Promise.all([
        listInventory(),
        listInventoryMovements({
          itemId,
          type: type as InventoryMovementRow['type'] | '',
          from: range.from,
          to: range.to,
        }),
      ])
      return { items, rows }
    },
  )
  const back = <BackButton fallback={paths.inventory} />
  const shell = 'mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8'
  if (status === 'error')
    return (
      <div className={shell}>
        {back}
        <ErrorState asPageTitle title="Unable to load the usage history." onRetry={reload} />
      </div>
    )
  if (!data)
    return (
      <div className={shell}>
        {back}
        <p className="sr-only" role="status">
          Loading usage history...
        </p>
        <Card className="p-5" aria-hidden="true">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="mt-4 h-64" />
        </Card>
      </div>
    )
  const pageCount = Math.max(1, Math.ceil(data.rows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const change =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }
  return (
    <div className={shell}>
      {back}
      <Card className="p-5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Inventory Usage History
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Every stock movement. Patients show by masked number.
        </p>
      </Card>
      <Card aria-labelledby="usage-history-title">
        <CardHeader
          titleId="usage-history-title"
          title="Stock movements"
          description={`${data.rows.length} movement${data.rows.length === 1 ? '' : 's'} shown`}
          icon={<Icon name="clipboardList" />}
        />
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <Select
              className="w-64"
              label="Item"
              value={itemId}
              options={[
                { value: '', label: 'All items' },
                ...data.items.map((item) => ({ value: item.id, label: item.name })),
              ]}
              onChange={change(setItemId)}
            />
            <Select
              className="w-44"
              label="Movement"
              value={type}
              options={TYPE_OPTIONS}
              onChange={change(setType)}
            />
            <DateRangePicker
              value={range}
              onChange={change(setRange)}
              today={today}
              presets={['all', 'today', 'last7', 'thisMonth', 'custom']}
              presetLabels={{ last7: 'This week' }}
              customPopover
            />
          </div>
          <div aria-busy={isRefetching} className={isRefetching ? 'opacity-60' : undefined}>
            {data.rows.length ? (
              <>
                <DataTable
                  caption="Stock movements"
                  columns={columns}
                  rows={data.rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)}
                  rowKey={(row) => row.id}
                  fixedLayout
                  minTableWidth={HISTORY_TABLE_MIN_WIDTH}
                />
                <Pagination
                  page={currentPage}
                  pageCount={pageCount}
                  total={data.rows.length}
                  pageSize={pageSize}
                  onPageSizeChange={change<PageSize>(setPageSize)}
                  itemLabel="movements"
                  onPageChange={setPage}
                />
              </>
            ) : (
              <EmptyState
                icon="clipboardList"
                title="No stock movements found"
                description="Try another item, movement or date range."
              />
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
