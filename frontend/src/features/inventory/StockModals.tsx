import { useRef, useState, type FormEvent } from 'react'
import { Button, DatePicker, Input, Modal, SegmentedControl, Select } from '../../components'
import { ADJUSTMENT_REASON_LABELS, StockRuleError, STAFF_ADJUSTMENT_REASONS, type StaffAdjustmentReason } from '../../lib/mock-db'
import { useFocusFirstInvalid } from '../../hooks/useFocusFirstInvalid'
import { adjustStock, restockItem, type InventoryItemView } from './api/inventoryApi'

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

/**
 * Adjust Stock (Staff, ADR-018): a +/- change or "set to counted quantity", with a required reason
 * (and a required note for Other). The result can't go below 0; the data layer enforces it too.
 */
export function AdjustStockModal({ item, onClose, onSaved }: { item: InventoryItemView; onClose: () => void; onSaved: (message: string) => void }) {
  const [mode, setMode] = useState<AdjustMode>('change')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState<StaffAdjustmentReason | ''>('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<{ amount?: string; reason?: string; note?: string; save?: string }>({})
  const [saving, setSaving] = useState(false)
  const invalidRef = useRef<HTMLFormElement>(null)
  const invalid = useFocusFirstInvalid(invalidRef)

  const parsed = amount.trim() === '' ? NaN : Number(amount)
  const after = Number.isInteger(parsed) ? (mode === 'count' ? parsed : item.currentStock + parsed) : null

  async function submit(event: FormEvent) {
    event.preventDefault()
    const next: typeof errors = {}
    if (mode === 'count' && !(Number.isInteger(parsed) && parsed >= 0)) next.amount = 'Enter the counted quantity as a whole number of 0 or more.'
    if (mode === 'change' && !(Number.isInteger(parsed) && parsed !== 0)) next.amount = 'Enter a whole-number change other than 0, e.g. -5 or 10.'
    if (!next.amount && after !== null && after < 0) next.amount = `Stock can't go below 0. ${item.currentStock} ${item.unit} on hand.`
    if (!next.amount && mode === 'count' && parsed === item.currentStock) next.amount = 'That matches the current stock; there is nothing to adjust.'
    if (!reason) next.reason = 'Choose a reason.'
    if (reason === 'other' && !note.trim()) next.note = 'Add a note explaining the adjustment.'
    setErrors(next)
    invalid.report(Object.keys(next).length)
    if (Object.keys(next).length || !reason) return
    setSaving(true)
    try {
      const updated = await adjustStock(item.id, { ...(mode === 'count' ? { countedQuantity: parsed } : { change: parsed }), reason, note })
      onSaved(`${item.name} adjusted (${ADJUSTMENT_REASON_LABELS[reason]}). Stock is now ${updated.currentStock} ${item.unit}.`)
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
          Current stock: <span className="font-semibold text-text-primary">{item.currentStock} {item.unit}</span>
        </p>
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
          The expiration date changes only through Restock. To replace an expired batch, dispose of the old quantity here, then Restock with the new expiration date.
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
  const [expirationDate, setExpirationDate] = useState(item.expirationDate ?? '')
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
          Current stock: <span className="font-semibold text-text-primary">{item.currentStock} {item.unit}</span>
        </p>
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
          hint="One date per item: confirm it, or set the new batch's date. Clear it for items that don't expire."
          onChange={setExpirationDate}
        />
        <FormActions onCancel={onClose} saving={saving} label="Save Restock" />
      </form>
    </Modal>
  )
}
