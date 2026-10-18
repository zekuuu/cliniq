import { useState, type ReactNode } from 'react'
import { formatDate } from '../../lib/dates'
import { Link, useSearchParams } from 'react-router'
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
  Input,
  Select,
  Skeleton,
  StatusBadge,
  buttonClassName,
  inventoryFlagMap,
  type DataTableColumn,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { sortTableRows, toggleTableSort, type TableSortState } from '../../lib/tableSort'
import { paths } from '../../routes/paths'
import { fetchInventory, type InventoryFilters, type InventoryItemView } from './api/inventoryApi'
import { inventoryStatusSortValue } from './inventoryStatusSort'
import { AdjustStockModal, BatchDetailsModal, RestockModal } from './StockModals'

function InventorySkeleton({ back }: { back: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Card className="p-5"><Skeleton className="h-7 w-52" /><Skeleton className="mt-2 h-4 w-96 max-w-full" /></Card>
        <Card className="p-5"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_auto]"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10 w-36" /></div><Skeleton className="mt-5 h-64" /></Card>
      </div>
    </div>
  )
}

/** Flags come computed from the data layer; this only chooses how to show them. */
function stockBadges(item: InventoryItemView) {
  return (
    <div className="flex flex-wrap gap-1">
      {item.belowZero && <Badge tone="error" variant="soft">Below zero</Badge>}
      {item.flags.map((flag) => <StatusBadge key={flag} status={flag} map={inventoryFlagMap} />)}
      {!item.belowZero && item.flags.length === 0 && <Badge tone="success" variant="soft">In stock</Badge>}
    </div>
  )
}

function stockCell(item: InventoryItemView) {
  return (
    <div className="flex flex-col gap-1 tabular-nums">
      <span>{item.currentStock} {item.unit} usable</span>
      {item.expiredStock > 0 && (
        <span aria-label={`Expired stock: ${item.expiredStock} ${item.unit}${item.oldestExpiredDate ? `, oldest expiry ${formatDate(item.oldestExpiredDate)}` : ''}`} className="flex items-center gap-1 text-xs font-semibold text-error">
          <Icon name="alertOctagon" size={14} aria-hidden />
          Expired: {item.expiredStock}{item.oldestExpiredDate ? ` · ${formatDate(item.oldestExpiredDate)}` : ''}
        </span>
      )}
    </div>
  )
}

type InventorySortKey = 'name' | 'category' | 'stock' | 'expiry' | 'status'

const baseColumns: Array<DataTableColumn<InventoryItemView>> = [
  { key: 'name', header: 'Item', rowHeader: true, cell: (item) => item.name },
  { key: 'category', header: 'Category', cell: (item) => item.category === 'medicine' ? 'Medicine' : 'Supply' },
  { key: 'stock', header: 'Stock', align: 'right', cell: stockCell },
  { key: 'expiry', header: 'Next usable expiry', cell: (item) => (item.expirationDate ? formatDate(item.expirationDate) : 'No expiration') },
  { key: 'status', header: 'Status', width: '11.5rem', cell: stockBadges },
  { key: 'actions', header: 'Actions', width: '16.5rem', cell: () => null },
]

type StockAction = { kind: 'adjust' | 'restock' | 'batches'; item: InventoryItemView }

export function InventoryListPage() {
  const [searchParams] = useSearchParams()
  const attention = searchParams.get('attention')
  const [filters, setFilters] = useState<InventoryFilters>(() => ({
    search: '',
    category: '',
    hasExpiredStock: false,
    attention: attention === 'low_stock' || attention === 'expiry' ? attention : '',
  }))
  const [sort, setSort] = useState<TableSortState<InventorySortKey>>({ key: 'status', direction: 'ascending' })
  const [action, setAction] = useState<StockAction | null>(null)
  const [message, setMessage] = useState('')
  const key = `${filters.search}|${filters.category}|${filters.hasExpiredStock}|${filters.attention}`
  const { data, status, isRefetching, reload } = useAsyncData(key, () => fetchInventory(filters))
  // A top-level list shows Back only when a drill-through link opened it (the Dashboard).
  const back = <BackButton fallback={paths.dashboard} drillThroughOnly />
  if (status === 'error') return <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">{back}<ErrorState title="Unable to load inventory." onRetry={reload} /></div>
  if (!data) return <><p className="sr-only" role="status">Loading inventory...</p><InventorySkeleton back={back} /></>
  const sortColumn = (key: InventorySortKey, label: string) => ({
    label,
    direction: sort.key === key ? sort.direction : undefined,
    onSort: () => setSort((current) => toggleTableSort(current, key)),
  })
  const columns: Array<DataTableColumn<InventoryItemView>> = baseColumns.map((column) => {
    if (column.key === 'name') return { ...column, sort: sortColumn('name', 'Item') }
    if (column.key === 'category') return { ...column, sort: sortColumn('category', 'Category') }
    if (column.key === 'stock') return { ...column, sort: sortColumn('stock', 'Current stock') }
    if (column.key === 'expiry') return { ...column, sort: sortColumn('expiry', 'Expiration') }
    if (column.key === 'status') return { ...column, sort: sortColumn('status', 'Status') }
    if (column.key === 'actions')
      return {
        ...column,
        cell: (item: InventoryItemView) => (
          <div className="flex flex-nowrap gap-1.5">
            <Button size="sm" variant="secondary" aria-label={`Restock ${item.name}`} onClick={() => setAction({ kind: 'restock', item })}>Restock</Button>
            <Button size="sm" variant="secondary" aria-label={`Adjust Stock for ${item.name}`} onClick={() => setAction({ kind: 'adjust', item })}>Adjust Stock</Button>
            <Button size="sm" variant="secondary" aria-label={`View batches for ${item.name}`} onClick={() => setAction({ kind: 'batches', item })}>Batches</Button>
            <Link className={buttonClassName({ variant: 'secondary', size: 'sm' })} aria-label={`Edit ${item.name}`} to={`${paths.inventoryNew}?item=${encodeURIComponent(item.id)}`}>Edit</Link>
          </div>
        ),
      }
    return column
  })
  const sortedData = sortTableRows(data, sort, (item, key) => {
    if (key === 'name') return item.name
    if (key === 'category') return item.category
    if (key === 'stock') return item.currentStock
    if (key === 'expiry') return item.expirationDate
    return inventoryStatusSortValue(item)
  })
  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-text-primary">Inventory</h1><p className="mt-1 text-sm text-text-secondary">Track medicine and supplies, expiration dates, and low-stock thresholds.</p></div><Link className={buttonClassName({ variant: 'primary' })} to={paths.inventoryNew}><Icon name="package" />Add Item</Link></div></Card>
      <Card aria-labelledby="inventory-list-title"><CardHeader titleId="inventory-list-title" title="Medicine and supplies" description={`${data.length} item${data.length === 1 ? '' : 's'} shown`} icon={<Icon name="package" />} /><CardBody className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_14rem_14rem_auto] md:items-end"><Input label="Search" value={filters.search} placeholder="Item name" onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} /><Select label="Category" value={filters.category} options={[{ value: 'medicine', label: 'Medicine' }, { value: 'supply', label: 'Supply' }]} placeholder="All categories" clearable onChange={(value) => setFilters((current) => ({ ...current, category: value as InventoryFilters['category'] }))} /><Select label="Attention" value={filters.attention ?? ''} options={[{ value: 'low_stock', label: 'Low stock' }, { value: 'expiry', label: 'Expired or expiring' }, { value: 'has_expired', label: 'Has expired stock' }]} placeholder="All stock" clearable onChange={(value) => setFilters((current) => ({ ...current, attention: value === 'low_stock' || value === 'expiry' ? value : '', hasExpiredStock: value === 'has_expired' }))} /><Button variant="secondary" onClick={() => setFilters({ search: '', category: '', hasExpiredStock: false, attention: '' })}>Clear Filters</Button></div>
        {message && <p role="status" className="rounded-md border border-success bg-success/10 px-4 py-3 text-sm font-semibold text-text-primary">{message}</p>}
        <div aria-busy={isRefetching} className={isRefetching ? 'opacity-60' : undefined}>{data.length ? <DataTable caption="Inventory items" columns={columns} rows={sortedData} rowKey={(item) => item.id} fixedLayout /> : <EmptyState icon="package" title="No inventory items found" description="Try a different search or category." />}</div>
      </CardBody></Card>
      {action && (() => {
        if (action.kind === 'batches') return <BatchDetailsModal item={action.item} onClose={() => setAction(null)} />
        const Dialog = action.kind === 'adjust' ? AdjustStockModal : RestockModal
        return (
          <Dialog
            item={action.item}
            onClose={() => setAction(null)}
            onSaved={(text) => {
              setAction(null)
              setMessage(text)
              reload()
            }}
          />
        )
      })()}
    </div>
  )
}
