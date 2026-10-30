import { useRef, useState, type FormEvent } from 'react'
import { Button, DatePicker, Input, Modal, SegmentedControl, Select } from '../../components'
import { ADJUSTMENT_REASON_LABELS, getMockToday, StockRuleError, STAFF_ADJUSTMENT_REASONS, type StaffAdjustmentReason } from '../../lib/mock-db'
import { useFocusFirstInvalid } from '../../hooks/useFocusFirstInvalid'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate } from '../../lib/dates'
import { adjustStock, fetchInventoryHistory, restockItem, type InventoryItemView } from './api/inventoryApi'
import { ITEM_BRAND_LABELS } from '../../types/entities'

type AdjustMode = 'add' | 'remove' | 'count'

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
        <p className="text-sm text-text-secondary">Generic or branded: <span className="font-semibold text-text-primary">{item.brand ? ITEM_BRAND_LABELS[item.brand] : 'Not specified'}</span></p>
        <p className="text-sm text-text-secondary">Avoid if allergic to: <span className="font-semibold text-text-primary">{item.avoidIfAllergicTo?.length ? item.avoidIfAllergicTo.join(', ') : 'None set'}</span></p>
        <section aria-labelledby="batch-list-title">
          <h2 id="batch-list-title" className="text-sm font-semibold text-text-primary">Batches on hand</h2>
          <ul className="mt-2 divide-y divide-border rounded-md border border-border">
            {/* First to expire first; no-expiry batches last (same order dispensing uses). */}
            {[...item.batches].sort((left, right) => (left.expirationDate ?? '9999-12-31').localeCompare(right.expirationDate ?? '9999-12-31')).map((batch) => {
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
 * Adjust Stock (Staff, ADR-018): Add or Remove a positive quantity (panel review IV-7: no typed minus
 * sign), or "set to counted quantity", with a required reason (and a required note for Other). The
 * result is shown before saving and can't go below 0; the data layer enforces it too.
 */
export function AdjustStockModal({ item, onClose, onSaved }: { item: InventoryItemView; onClose: () => void; onSaved: (message: string) => void }) {
  const [mode, setMode] = useState<AdjustMode>('remove')
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
  const change = mode === 'remove' ? -parsed : parsed
  const after = batch && Number.isInteger(parsed) ? (mode === 'count' ? parsed : batch.quantity + change) : null

  async function submit(event: FormEvent) {
    event.preventDefault()
    const next: typeof errors = {}
    if (mode === 'count' && !(Number.isInteger(parsed) && parsed >= 0)) next.amount = 'Enter the counted quantity as a whole number of 0 or more.'
    if (mode !== 'count' && !(Number.isInteger(parsed) && parsed > 0)) next.amount = `Enter how many to ${mode}, a whole number of 1 or more.`
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
      const updated = await adjustStock(item.id, { batchId, ...(mode === 'count' ? { countedQuantity: parsed } : { change }), reason, note })
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
            { value: 'remove', label: 'Remove' },
            { value: 'add', label: 'Add' },
            { value: 'count', label: 'Set to counted quantity' },
          ]}
        />
        <Input
          data-autofocus
          label={mode === 'count' ? 'Counted quantity' : mode === 'add' ? 'Quantity to add' : 'Quantity to remove'}
          required
          type="number"
          step="1"
          min={mode === 'count' ? '0' : '1'}
          value={amount}
          hint={after !== null && after >= 0 ? `This batch after saving: ${after} ${item.unit} (now ${batch?.quantity ?? 0})` : `This batch now: ${batch?.quantity ?? 0} ${item.unit}`}
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
  const [noExpirationConfirmed, setNoExpirationConfirmed] = useState(false)
  const [errors, setErrors] = useState<{ quantity?: string; expirationDate?: string; save?: string }>({})
  const [saving, setSaving] = useState(false)
  const invalidRef = useRef<HTMLFormElement>(null)
  const invalid = useFocusFirstInvalid(invalidRef)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const amount = Number(quantity)
    const nextErrors: typeof errors = {}
    if (!quantity.trim() || !Number.isInteger(amount) || amount < 1) {
      nextErrors.quantity = 'Enter the quantity received as a whole number of at least 1.'
    }
    if (!noExpirationConfirmed && !expirationDate) {
      nextErrors.expirationDate = 'Choose an expiration date, or confirm this batch has no expiration date.'
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      invalid.report(Object.keys(nextErrors).length)
      return
    }
    setSaving(true)
    try {
      const updated = await restockItem(item.id, amount, { expirationDate, noExpirationConfirmed })
      onSaved(`${item.name} restocked with ${amount} ${item.unit}. Stock is now ${updated.currentStock} ${item.unit}.`)
    } catch (caught) {
      if (!(caught instanceof StockRuleError)) throw caught
      setErrors({ save: caught.message })
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
          error={errors.quantity}
          onChange={(event) => {
            setQuantity(event.target.value)
            setErrors((current) => ({ ...current, quantity: undefined, save: undefined }))
          }}
        />
        <DatePicker
          label="Expiration date"
          min={getMockToday()}
          value={expirationDate}
          required={!noExpirationConfirmed}
          disabled={noExpirationConfirmed}
          hint={noExpirationConfirmed ? 'Recorded as no expiration date for this batch.' : "This is the new batch's date."}
          error={errors.expirationDate}
          onChange={(next) => {
            setExpirationDate(next)
            setErrors((current) => ({ ...current, expirationDate: undefined, save: undefined }))
          }}
        />
        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-text-primary transition-colors hover:bg-background motion-reduce:transition-none">
          <input
            type="checkbox"
            checked={noExpirationConfirmed}
            onChange={(event) => {
              setNoExpirationConfirmed(event.target.checked)
              if (event.target.checked) setExpirationDate('')
              setErrors((current) => ({ ...current, expirationDate: undefined, save: undefined }))
            }}
            className="mt-0.5 size-4 cursor-pointer accent-brand-green-dark"
          />
          <span>
            <span className="block font-semibold">This batch has no expiration date</span>
            <span className="mt-0.5 block text-xs text-text-secondary">Select only for items with no manufacturer expiration date.</span>
          </span>
        </label>
        {errors.save && <p role="alert" className="text-sm font-semibold text-error">{errors.save}</p>}
        <FormActions onCancel={onClose} saving={saving} label="Save Restock" />
      </form>
    </Modal>
  )
}
