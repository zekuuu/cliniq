import { useState } from 'react'
import { allergyMatches, allergyWarningText } from '../../lib/itemsGiven'
import type { ItemGivenLine } from '../../types/entities'
import { Icon } from '../icons/Icon'
import { Input } from '../ui/Input'
import { InventoryItemPicker, type PickableItem } from './InventoryItemPicker'

/** One editable line. `quantity` is 0 only while the field is being retyped. */
export interface ItemLineDraft {
  itemId: string
  quantity: number
  instructions: string
}

export const INSTRUCTIONS_MAX = 120

/**
 * Item, quantity, unit, instructions, remove, shared by the column names and every row from sm. Fixed
 * widths, never `auto`: the names and the rows are separate grids, so `auto` sized them apart.
 */
const ROW_COLUMNS = 'sm:grid-cols-[minmax(0,1fr)_6rem_4.5rem_minmax(0,12rem)_1rem]'

const iconButton =
  'inline-flex cursor-pointer rounded-sm text-text-secondary transition-colors hover:text-brand-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-text-secondary motion-reduce:transition-none'

/**
 * "Medicines & supplies given" (cliniq-item-picker-patterns, ADR-018): repeatable lines picked from
 * inventory, each with a quantity stepper, the item's unit, optional instructions, and a remove
 * control. Picking an item already on a line adds one to that line. Stock problems warn but never
 * block; expired items can't be picked, and an expired item already on a saved record can be kept or
 * lowered but not raised. The data layer enforces the same rules.
 *
 * The patient's recorded allergies sit next to the picker. An item's optional "avoid if allergic to"
 * words that the allergies mention add a warning there (ADR-049, D8); nothing is ever blocked.
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
  const allergyWarnings = [...new Set(lines.flatMap((line) => allergyMatches(byId.get(line.itemId) ?? {}, allergies ?? [])))]

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
              <span className="flex items-center gap-1 font-semibold text-warning-text">
                <Icon name="alertTriangle" size={14} />
                Allergies: {allergies.join(', ')}
              </span>
              <span className="mt-0.5 block">Check before giving medicine.</span>
              {allergyWarnings.map((tag) => (
                <span key={tag} className="mt-1 block font-semibold text-text-primary">
                  {allergyWarningText(tag)}
                </span>
              ))}
            </>
          ) : (
            // "None recorded", not "No allergies": an empty field also reads this way (ADR-051).
            'Allergies: None recorded.'
          )}
        </div>
      </div>

      {lines.length > 0 && (
        <>
          {/* Compact like the Sports Report list (Zean, November 3, 2026): one divided row per item. From sm the
              columns are named once here; below sm each field shows its own label. */}
          <div aria-hidden="true" className={`mt-3 hidden gap-x-3 text-xs font-semibold text-text-secondary sm:grid ${ROW_COLUMNS}`}>
            <span>Item</span>
            <span>Quantity</span>
            <span>Unit</span>
            <span>Instructions (optional)</span>
            <span />
          </div>
          <ul aria-label="Medicines and supplies given" className="mt-1 flex flex-col divide-y divide-border">
            {lines.map((line) => {
              const name = nameOf(line.itemId)
              const unit = unitOf(line.itemId)
              const item = byId.get(line.itemId)
              const isExpired = expired(line.itemId)
              const available = item ? item.currentStock + (savedById.get(line.itemId)?.quantity ?? 0) : null
              const overStock = available !== null && line.quantity > available
              return (
                <li key={line.itemId} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-2 ${ROW_COLUMNS}`}>
                  {/* Expiry on its own small line under the name: a badge beside a wrapping name overlapped it. */}
                  <p className="order-1 min-w-0 text-sm font-semibold text-text-primary sm:order-none">
                    {name}
                    {isExpired && <span className="block text-xs font-semibold text-error-text">Expired</span>}
                    {item?.flags.includes('nearing_expiration') && (
                      <span className="block text-xs font-semibold text-warning-text">
                        {item.daysUntilExpiry === 0 ? 'Expires today' : `Expires in ${item.daysUntilExpiry} ${item.daysUntilExpiry === 1 ? 'day' : 'days'}`}
                      </span>
                    )}
                  </p>
                  <div className="order-3 col-span-2 flex items-center gap-3 sm:order-none sm:contents">
                    <div className="inline-flex h-10 items-center gap-1 rounded-md border border-border bg-background px-2 shadow-card">
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
                        className="w-8 bg-transparent text-center text-sm font-semibold text-text-primary tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
                      />
                      <button type="button" aria-label={`Increase ${name}`} disabled={!canRaise(line)} onClick={() => update(line.itemId, { quantity: line.quantity + 1 })} className={iconButton}>
                        <Icon name="plus" />
                      </button>
                    </div>
                    <span className="text-sm text-text-secondary">{unit}</span>
                  </div>
                  <Input
                    label="Instructions (optional)"
                    aria-label={`Instructions for ${name}`}
                    className="order-4 col-span-2 sm:order-none sm:col-span-1 sm:[&>label]:sr-only"
                    value={line.instructions}
                    maxLength={INSTRUCTIONS_MAX}
                    placeholder="e.g. 1 tablet every 6 hours"
                    onChange={(event) => update(line.itemId, { instructions: event.target.value })}
                  />
                  <button type="button" aria-label={`Remove ${name}`} onClick={() => remove(line.itemId)} className={`order-2 sm:order-none ${iconButton}`}>
                    <Icon name="xCircle" />
                  </button>
                  {overStock && (
                    <p className="order-5 col-span-full flex items-start gap-1 text-xs font-semibold text-warning-text sm:order-none">
                      <Icon name="alertTriangle" size={14} className="mt-px shrink-0" />
                      Only {available} {unit} in stock. Saving takes stock below zero; recount and restock.
                    </p>
                  )}
                  {isExpired && (
                    <p className="order-6 col-span-full text-xs text-text-secondary sm:order-none">This item has expired. Keep or lower the quantity given; it can’t be raised.</p>
                  )}
                </li>
              )
            })}
          </ul>
        </>
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

