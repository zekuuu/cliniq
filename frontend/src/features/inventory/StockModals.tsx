import { useRef, useState, type FormEvent } from 'react'
import { Button, DatePicker, Input, Modal, SegmentedControl, Select } from '../../components'
import { ADJUSTMENT_REASON_LABELS, StockRuleError, STAFF_ADJUSTMENT_REASONS, type StaffAdjustmentReason } from '../../lib/mock-db'
import { useFocusFirstInvalid } from '../../hooks/useFocusFirstInvalid'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate } from '../../lib/dates'
import { adjustStock, fetchInventoryHistory, restockItem, type InventoryItemView } from './api/inventoryApi'

type AdjustMode = 'change' | 'count'

const reasonOptions = STAFF_ADJUSTMENT_REASONS.map((reason) => ({ value: reason, label: ADJUSTMENT_REASON_LABELS[reason] }))

function FormActions({ onCancel, saving, label }: { onCancel: () => void; saving: boolean; label: string }) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
      <Button variant="neutral" onClick={onCancel}>Cancel</Button>
      <Button type="submit" variant="primary" icon="checkCircle" loading={saving}>{label}</Button>
    </div>
  )
}

/** Read-only batch and movement detail: zero-quantity expired batches remain visible after disposal. */
export function BatchDetailsModal({ item, onClose }: { item: InventoryItemView; onClose: () => void }) {
  const { data: history, status, reload } = useAsyncData(item.id, () => fetchInventoryHistory(item.id))
  return (
    <Modal open title={`Batches: ${item.name}`} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <section aria-labelledby="batch-list-title">
          <h2 id="batch-list-title" className="text-sm font-semibold text-text-primary">Batches on hand</h2>
          <ul className="mt-2 divide-y divide-border rounded-md border border-border">
            {item.batches.map((batch) => {
              const expired = Boolean(batch.expirationDate && batch.expirationDate < new Date().toISOString().slice(0, 10))
              return <li key={batch.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"><span><span className="font-semibold text-text-primary">{batch.quantity} {item.unit}</span> · received {formatDate(batch.receivedDate)}</span><span className={expired ? 'font-semibold text-error' : 'text-text-secondary'}>{batch.expirationDate ? `${formatDate(batch.expirationDate)}${expired ? ' · Expired' : ''}` : 'No expiration'}</span></li>
            })}
          </ul>
        </section>
        <section aria-labelledby="movement-history-title">
          <h2 id="movement-history-title" className="text-sm font-semibold text-text-primary">Movement history</h2>
          {status === 'error' ? <Button variant="secondary" onClick={reload}>Retry history</Button> : !history ? <p role="status" className="text-sm text-text-secondary">Loading history…</p> : history.length ? <ul className="mt-2 divide-y divide-border rounded-md border border-border">{history.map((entry) => <li key={entry.id} className="px-3 py-2 text-sm text-text-secondary"><span className="font-semibold text-text-primary">{entry.reason === 'expired_disposed' ? 'Disposed' : entry.type === 'restock' ? 'Restocked' : entry.type === 'dispense' ? 'Dispensed' : 'Adjusted'}</span> · {entry.quantity > 0 ? '+' : ''}{entry.quantity} {item.unit}{entry.batchAllocations.length ? ` · ${entry.batchAllocations.map((allocation) => allocation.batchId).join(', ')}` : ''}</li>)}</ul> : <p className="mt-2 text-sm text-text-secondary">No recorded movements.</p>}
        </section>
        <div className="flex justify-end"><Button data-autofocus variant="secondary" onClick={onClose}>Close</Button></div>
      </div>
    </Modal>
  )
}

/**
 * Adjust Stock (Staff, ADR-018): a +/- change or "set to counted quantity", with a required reason
 * (and a required note for Other). The result can't go below 0; the data layer enforces it too.
 */
export function AdjustStockModal({ item, onClose, onSaved }: { item: InventoryItemView; onClose: () => void; onSaved: (message: string) => void }) {
  const [mode, setMode] = useState<AdjustMode>('change')
  const [batchId, setBatchId] = useState(item.batches.find((batch) => batch.expirationDate && batch.expirationDate < new Date().toISOString().slice(0, 10))?.id ?? item.batches[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState<StaffAdjustmentReason | ''>('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<{ amount?: string; reason?: string; note?: string; save?: string }>({})
  const [saving, setSaving] = useState(false)
  const invalidRef = useRef<HTMLFormElement>(null)
  const invalid = useFocusFirstInvalid(invalidRef)

  const batch = item.batches.find((candidate) => candidate.id === batchId)
  const parsed = amount.trim() === '' ? NaN : Number(amount)
  const after = batch && Number.isInteger(parsed) ? (mode === 'count' ? parsed : batch.quantity + parsed) : null

  async function submit(event: FormEvent) {
    event.preventDefault()
    const next: typeof errors = {}
    if (mode === 'count' && !(Number.isInteger(parsed) && parsed >= 0)) next.amount = 'Enter the counted quantity as a whole number of 0 or more.'
    if (mode === 'change' && !(Number.isInteger(parsed) && parsed !== 0)) next.amount = 'Enter a whole-number change other than 0, e.g. -5 or 10.'
    if (!batch) next.amount = 'Choose a batch.'
    if (!next.amount && after !== null && after < 0) next.amount = `Stock can't go below 0. ${batch?.quantity ?? 0} ${item.unit} in this batch.`
    if (!next.amount && batch && mode === 'count' && parsed === batch.quantity) next.amount = 'That matches the selected batch; there is nothing to adjust.'
    if (!reason) next.reason = 'Choose a reason.'
    if (reason === 'other' && !note.trim()) next.note = 'Add a note explaining the adjustment.'
    setErrors(next)
    invalid.report(Object.keys(next).length)
    if (Object.keys(next).length || !reason) return
    setSaving(true)
    try {
      const updated = await adjustStock(item.id, { batchId, ...(mode === 'count' ? { countedQuantity: parsed } : { change: parsed }), reason, note })
      onSaved(`${item.name} adjusted (${ADJUSTMENT_REASON_LABELS[reason]}). Usable stock is now ${updated.currentStock} ${item.unit}.`)
    } catch (caught) {
      if (!(caught instanceof StockRuleError)) throw caught
      setErrors({ save: caught.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={`Adjust Stock: ${item.name}`} onClose={onClose}>
      <form ref={invalidRef} noValidate onSubmit={submit} className="flex flex-col gap-4">
        <p role="status" className="sr-only">
          {invalid.announcement}
        </p>
        <p className="text-sm text-text-secondary">
          Usable stock: <span className="font-semibold text-text-primary">{item.currentStock} {item.unit}</span>
        </p>
        <Select
          label="Batch"
          required
          value={batchId}
          options={item.batches.map((candidate) => ({
            value: candidate.id,
            label: `${candidate.quantity} ${item.unit} · ${candidate.expirationDate ? formatDate(candidate.expirationDate) : 'No expiration'}${candidate.expirationDate && candidate.expirationDate < new Date().toISOString().slice(0, 10) ? ' · Expired' : ''}`,
          }))}
          onChange={setBatchId}
        />
        <SegmentedControl
          label="Adjustment type"
          value={mode}
          onChange={(value) => {
            setMode(value)
            setAmount('')
            setErrors({})
          }}
          options={[
            { value: 'change', label: 'Change amount' },
            { value: 'count', label: 'Set to counted quantity' },
          ]}
        />
        <Input
          data-autofocus
          label={mode === 'count' ? 'Counted quantity' : 'Change (+/-)'}
          required
          type="number"
          step="1"
          min={mode === 'count' ? '0' : undefined}
          value={amount}
          hint={after !== null && after >= 0 ? `Stock after: ${after} ${item.unit}` : mode === 'change' ? 'Use a minus sign to remove stock, e.g. -5.' : undefined}
          error={errors.amount}
          onChange={(event) => {
            setAmount(event.target.value)
            setErrors((current) => ({ ...current, amount: undefined, save: undefined }))
          }}
        />
        <Select
          label="Reason"
          required
          value={reason}
          placeholder="Choose a reason"
          options={reasonOptions}
          error={errors.reason}
          onChange={(value) => {
            setReason(value as StaffAdjustmentReason | '')
            setErrors((current) => ({ ...current, reason: undefined, note: undefined, save: undefined }))
          }}
        />
        <Input
          label={reason === 'other' ? 'Note' : 'Note (optional)'}
          required={reason === 'other'}
          value={note}
          maxLength={200}
          error={errors.note}
          onChange={(event) => {
            setNote(event.target.value)
            setErrors((current) => ({ ...current, note: undefined }))
          }}
        />
        <p className="rounded-md border border-border px-3 py-2 text-xs text-text-secondary">
          The expiration date changes only through Restock. This changes only the selected batch; dispose of an expired batch explicitly before restocking, which always creates a new batch.
        </p>
        {errors.save && <p role="alert" className="text-sm font-semibold text-error">{errors.save}</p>}
        <FormActions onCancel={onClose} saving={saving} label="Save Adjustment" />
      </form>
    </Modal>
  )
}

/** Restock (Module 8, stock flow step 4): adds the quantity received and confirms the expiration date. */
export function RestockModal({ item, onClose, onSaved }: { item: InventoryItemView; onClose: () => void; onSaved: (message: string) => void }) {
  const [quantity, setQuantity] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const invalidRef = useRef<HTMLFormElement>(null)
  const invalid = useFocusFirstInvalid(invalidRef)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const amount = Number(quantity)
    if (!quantity.trim() || !Number.isInteger(amount) || amount < 1) {
      setError('Enter the quantity received as a whole number of at least 1.')
      invalid.report(1)
      return
    }
    setSaving(true)
    try {
      const updated = await restockItem(item.id, amount, expirationDate)
      onSaved(`${item.name} restocked with ${amount} ${item.unit}. Stock is now ${updated.currentStock} ${item.unit}.`)
    } catch (caught) {
      if (!(caught instanceof StockRuleError)) throw caught
      setError(caught.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title={`Restock: ${item.name}`} onClose={onClose}>
      <form ref={invalidRef} noValidate onSubmit={submit} className="flex flex-col gap-4">
        <p role="status" className="sr-only">
          {invalid.announcement}
        </p>
        <p className="text-sm text-text-secondary">
          Usable stock: <span className="font-semibold text-text-primary">{item.currentStock} {item.unit}</span>
        </p>
        {item.expiredStock > 0 && (
          <p role="note" className="rounded-md border border-error bg-error/10 px-3 py-2 text-sm text-text-primary">
            {item.expiredStock} {item.unit} remain expired in stock{item.oldestExpiredDate ? ` (oldest expiry ${formatDate(item.oldestExpiredDate)})` : ''}. Restocking adds a new batch and does not remove them.
          </p>
        )}
        <Input
          data-autofocus
          label="Quantity received"
          required
          type="number"
          min="1"
          step="1"
          value={quantity}
          error={error}
          onChange={(event) => {
            setQuantity(event.target.value)
            setError('')
          }}
        />
        <DatePicker
          label="Expiration date"
          value={expirationDate}
          hint="This is the new batch's date. Leave it blank only for items that do not expire."
          onChange={setExpirationDate}
        />
        <FormActions onCancel={onClose} saving={saving} label="Save Restock" />
      </form>
    </Modal>
  )
}
