import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { BackButton, Badge, Button, Card, CardBody, CardHeader, DatePicker, ErrorState, Icon, Input, Select, Skeleton } from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useCancelNavigation } from '../../hooks/useCancelNavigation'
import { useFocusFirstInvalid } from '../../hooks/useFocusFirstInvalid'
import { formatDate } from '../../lib/dates'
import { paths } from '../../routes/paths'
import { fetchInventoryForm, saveInventoryItem, type InventoryFormValues } from './api/inventoryApi'

const EMPTY: InventoryFormValues = { name: '', category: 'medicine', currentStock: '', unit: '', expirationDate: '', lowStockThreshold: '' }

/** Stock and expiry on an existing item: shown, but changed only through the stock actions (ADR-018). */
function ReadOnlyFact({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="flex flex-col gap-1"><p className="text-xs font-semibold text-text-primary">{label}</p><p className="flex h-10 items-center rounded-md border border-border bg-surface px-3 text-sm font-semibold text-text-primary">{value}</p><p className="text-xs text-text-secondary">{note}</p></div>
}

function InventoryFormSkeleton({ back }: { back: ReactNode }) {
  return <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">{back}<div aria-hidden="true"><Card className="p-5"><Skeleton className="h-7 w-56" /><Skeleton className="mt-2 h-4 w-96 max-w-full" /></Card><Card className="mt-4 p-5"><div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-12" />)}</div></Card></div></div>
}

export function InventoryFormPage() {
  const [search] = useSearchParams()
  const itemId = search.get('item') ?? undefined
  const { data, status, reload } = useAsyncData(itemId ?? 'new', () => fetchInventoryForm(itemId))
  const [values, setValues] = useState<InventoryFormValues | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [saving, setSaving] = useState(false)
  // `values` is set only by typing; a save shows `saved` until the next change.
  const { cancel, discardDialog } = useCancelNavigation(paths.inventory, values !== null && !saved)
  const invalidRef = useRef<HTMLFormElement>(null)
  const invalid = useFocusFirstInvalid(invalidRef)
  const back = <BackButton fallback={paths.inventory} />
  if (status === 'error') return <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">{back}<ErrorState title="Unable to load inventory item." onRetry={reload} /></div>
  if (!data) return <><p className="sr-only" role="status">Loading inventory form...</p><InventoryFormSkeleton back={back} /></>
  const initial = values ?? (data.item ? { name: data.item.name, category: data.item.category, currentStock: String(data.item.currentStock), unit: data.item.unit, expirationDate: data.item.expirationDate ?? '', lowStockThreshold: String(data.item.lowStockThreshold) } : EMPTY)
  function setField<K extends keyof InventoryFormValues>(field: K, value: InventoryFormValues[K]) { setValues((current) => ({ ...(current ?? initial), [field]: value })); setError(''); setSaved('') }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!initial.name.trim() || !initial.unit.trim() || initial.currentStock === '' || initial.lowStockThreshold === '') { setError('Complete the item name, unit, stock, and low-stock threshold.'); invalid.report([!initial.name.trim(), !initial.unit.trim(), initial.currentStock === '', initial.lowStockThreshold === ''].filter(Boolean).length); return }
    if (Number(initial.currentStock) < 0 || Number(initial.lowStockThreshold) < 0) { setError('Stock and threshold cannot be negative.'); invalid.report(1); return }
    setSaving(true)
    try { const item = await saveInventoryItem(initial, { itemId }); setSaved(`${item.name} was ${itemId ? 'updated' : 'added'} successfully.`) } finally { setSaving(false) }
  }
  return <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">{discardDialog}<BackButton onBack={cancel} /><Card className="p-5"><div className="flex items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-text-primary">{itemId ? 'Edit Inventory Item' : 'Add Inventory Item'}</h1><p className="mt-1 text-sm text-text-secondary">Keep stock and expiry information ready for safe dispensing.</p></div><Badge tone={itemId ? 'info' : 'success'} variant="soft">{itemId ? 'Editing' : 'New item'}</Badge></div></Card><Card aria-labelledby="inventory-form-title"><CardHeader titleId="inventory-form-title" title="Item details" icon={<Icon name="package" />} /><CardBody><form ref={invalidRef} className="flex flex-col gap-4" onSubmit={submit} noValidate><p role="status" className="sr-only">{invalid.announcement}</p><div className="grid gap-4 md:grid-cols-2"><Input label="Item name" required value={initial.name} onChange={(event) => setField('name', event.target.value)} /><Select label="Category" required value={initial.category} options={[{ value: 'medicine', label: 'Medicine' }, { value: 'supply', label: 'Supply' }]} onChange={(value) => setField('category', value as InventoryFormValues['category'])} />{itemId ? <ReadOnlyFact label="Current stock" value={`${initial.currentStock} ${initial.unit}`} note="Changes only through Dispense, Restock, or Adjust Stock on the Inventory list." /> : <Input label="Current stock" required type="number" min="0" value={initial.currentStock} onChange={(event) => setField('currentStock', event.target.value)} />}<Input label="Unit" required placeholder="tablets, bottles, pieces" value={initial.unit} onChange={(event) => setField('unit', event.target.value)} /><Input label="Low-stock threshold" required type="number" min="0" value={initial.lowStockThreshold} onChange={(event) => setField('lowStockThreshold', event.target.value)} />{itemId ? <ReadOnlyFact label="Expiration date" value={initial.expirationDate ? formatDate(initial.expirationDate) : 'No expiration'} note="Changes only through Restock on the Inventory list." /> : <DatePicker label="Expiration date" value={initial.expirationDate} onChange={(next) => setField('expirationDate', next)} />}</div>{error && <p role="alert" className="text-sm font-semibold text-error">{error}</p>}{saved && <p role="status" className="text-sm font-semibold text-success">{saved}</p>}<div className="flex flex-wrap justify-end gap-2"><Button variant="neutral" onClick={cancel}>Cancel</Button><Button type="submit" variant="primary" icon="checkCircle" loading={saving}>{itemId ? 'Save Changes' : 'Add Item'}</Button></div></form></CardBody></Card></div>
}
