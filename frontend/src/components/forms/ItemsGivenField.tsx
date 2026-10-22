import { useState } from 'react'
import type { ItemGivenLine } from '../../types/entities'
import { Icon } from '../icons/Icon'
import { Badge } from '../ui/Badge'
import { Input } from '../ui/Input'
import { InventoryItemPicker, type PickableItem } from './InventoryItemPicker'

/** One editable line. `quantity` is 0 only while the field is being retyped. */
export interface ItemLineDraft {
  itemId: string
  quantity: number
  instructions: string
}

export const INSTRUCTIONS_MAX = 120

const iconButton =
  'inline-flex cursor-pointer rounded-sm text-text-secondary transition-colors hover:text-brand-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-text-secondary motion-reduce:transition-none'

/**
 * "Medicines & supplies given" (cliniq-item-picker-patterns, ADR-018): repeatable lines picked from
 * inventory, each with a quantity stepper, the item's unit, optional instructions, and a remove
 * control. Picking an item already on a line adds one to that line. Stock problems warn but never
 * block; expired items can't be picked, and an expired item already on a saved record can be kept or
 * lowered but not raised. The data layer enforces the same rules.
 *
 * The student's recorded allergies sit next to the picker for awareness only: there's no ingredient
 * data, so nothing is matched automatically.
 */
export function ItemsGivenField({
  items,
  lines,
  onChange,
  allergies,
  saved = [],
  error,
}: {
  items: ReadonlyArray<PickableItem>
  lines: ItemLineDraft[]
  onChange: (lines: ItemLineDraft[]) => void
  /** `null` until a student is identified. */
  allergies: string[] | null
  /** The record's lines as last saved. Their stock is already taken, and their snapshots are kept. */
  saved?: ReadonlyArray<ItemGivenLine>
  error?: string
}) {
  const [announcement, setAnnouncement] = useState('')
  const byId = new Map(items.map((item) => [item.id, item]))
  const savedById = new Map(saved.map((line) => [line.itemId, line]))
  const nameOf = (itemId: string) => savedById.get(itemId)?.itemName ?? byId.get(itemId)?.name ?? 'Unknown item'
  const unitOf = (itemId: string) => savedById.get(itemId)?.unit ?? byId.get(itemId)?.unit ?? ''
  const expired = (itemId: string) => Boolean(byId.get(itemId)?.flags.includes('expired'))
  /** Raising past what's already saved takes new stock, which an expired item can't give. */
  const canRaise = (line: ItemLineDraft) => !expired(line.itemId) || line.quantity < (savedById.get(line.itemId)?.quantity ?? 0)

  function update(itemId: string, patch: Partial<ItemLineDraft>) {
    onChange(lines.map((line) => (line.itemId === itemId ? { ...line, ...patch } : line)))
  }

  function pick(itemId: string) {
    const existing = lines.find((line) => line.itemId === itemId)
    if (existing) {
      if (!canRaise(existing)) return
      update(itemId, { quantity: existing.quantity + 1 })
      setAnnouncement(`${nameOf(itemId)} quantity is now ${existing.quantity + 1}.`)
    } else {
      onChange([...lines, { itemId, quantity: 1, instructions: '' }])
      setAnnouncement(`${nameOf(itemId)} added.`)
    }
  }

  function remove(itemId: string) {
    onChange(lines.filter((line) => line.itemId !== itemId))
    setAnnouncement(`${nameOf(itemId)} removed.`)
  }

  return (
    <fieldset className="rounded-md border border-border p-4">
      <legend className="px-1 text-sm font-semibold text-text-primary">Medicines &amp; supplies given</legend>
      <p className="text-xs text-text-secondary">Optional. Each line is taken from inventory when the visit is saved.</p>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)] sm:items-start">
        <InventoryItemPicker items={items} onPick={pick} />
        <div role="note" aria-label="Allergies" className="rounded-md border border-border px-3 py-2 text-xs text-text-secondary sm:mt-5">
          {allergies === null ? (
            'Allergies appear here once the student is identified.'
          ) : allergies.length ? (
            <>
              <span className="flex items-center gap-1 font-semibold text-warning">
                <Icon name="alertTriangle" size={14} />
                Allergies: {allergies.join(', ')}
              </span>
              <span className="mt-0.5 block">Check before giving medicine. Items aren’t matched to allergies.</span>
            </>
          ) : (
            // "None recorded", not "No allergies": an empty list can also mean nobody asked (open DECIDE).
            'Allergies: None recorded.'
          )}
        </div>
      </div>

      {lines.length > 0 && (
        <ul aria-label="Medicines and supplies given" className="mt-3 flex flex-col gap-2">
          {lines.map((line) => {
            const name = nameOf(line.itemId)
            const unit = unitOf(line.itemId)
            const item = byId.get(line.itemId)
            const isExpired = expired(line.itemId)
            const available = item ? item.currentStock + (savedById.get(line.itemId)?.quantity ?? 0) : null
            const overStock = available !== null && line.quantity > available
            return (
              <li key={line.itemId} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <p className="min-w-0 flex-1 text-sm font-semibold text-text-primary">
                    {name}
                    {isExpired && <Badge tone="error" variant="soft" className="ml-2">Expired</Badge>}
                    {item?.flags.includes('nearing_expiration') && (
                      <Badge tone="warning" variant="soft" className="ml-2">
                        {item.daysUntilExpiry === 0 ? 'Expires today' : `Expires in ${item.daysUntilExpiry}d`}
                      </Badge>
                    )}
                  </p>
                  <div className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3 shadow-card">
                    <button type="button" aria-label={`Decrease ${name}`} disabled={line.quantity <= 1} onClick={() => update(line.itemId, { quantity: line.quantity - 1 })} className={iconButton}>
                      <Icon name="minus" />
                    </button>
                    <input
                      aria-label={`Quantity of ${name}`}
                      inputMode="numeric"
                      autoComplete="off"
                      value={line.quantity || ''}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, '')
                        update(line.itemId, { quantity: digits ? Number(digits) : 0 })
                      }}
                      onBlur={() => {
                        if (line.quantity < 1) update(line.itemId, { quantity: 1 })
                      }}
                      className="w-10 bg-transparent text-center text-sm font-semibold text-text-primary tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
                    />
                    <button type="button" aria-label={`Increase ${name}`} disabled={!canRaise(line)} onClick={() => update(line.itemId, { quantity: line.quantity + 1 })} className={iconButton}>
                      <Icon name="plus" />
                    </button>
                  </div>
                  <span className="w-16 text-sm text-text-secondary">{unit}</span>
                  <button type="button" aria-label={`Remove ${name}`} onClick={() => remove(line.itemId)} className={iconButton}>
                    <Icon name="xCircle" />
                  </button>
                </div>
                <Input
                  label="Instructions (optional)"
                  className="mt-2"
                  value={line.instructions}
                  maxLength={INSTRUCTIONS_MAX}
                  placeholder="e.g. 1 tablet every 6 hours"
                  hint={`${line.instructions.length}/${INSTRUCTIONS_MAX} characters`}
                  onChange={(event) => update(line.itemId, { instructions: event.target.value })}
                />
                {overStock && (
                  <p className="mt-2 flex items-start gap-1 text-xs font-semibold text-warning">
                    <Icon name="alertTriangle" size={14} className="mt-px shrink-0" />
                    Only {available} {unit} in stock. Saving takes stock below zero; recount and restock.
                  </p>
                )}
                {isExpired && (
                  <p className="mt-2 text-xs text-text-secondary">This item has expired. Keep or lower the quantity given; it can’t be raised.</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs font-semibold text-error">
          {error}
        </p>
      )}
      <p className="sr-only" role="status">
        {announcement}
      </p>
    </fieldset>
  )
}

