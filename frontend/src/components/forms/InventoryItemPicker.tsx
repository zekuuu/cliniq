import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import { stockQuantityText, type InventoryFlag } from '../status/inventory'
import { ITEM_BRAND_LABELS, type ItemBrand } from '../../types/entities'
import { Badge } from '../ui/Badge'
import { Input } from '../ui/Input'
import { DROPDOWN_PANEL, dropdownOptionClassName, placeDropdownPanel } from '../ui/dropdownClassName'

/** What the picker needs from an item. The data layer's `InventoryItemView` already fits. */
export type PickableItem = {
  id: string
  name: string
  category: 'medicine' | 'supply'
  currentStock: number
  unit: string
  flags: ReadonlyArray<InventoryFlag>
  daysUntilExpiry: number | null
  /** Generic or branded, when recorded (Sir Rey, October 25, 2026). */
  brand?: ItemBrand | null
}

const GROUPS = [
  { category: 'medicine', label: 'Medicines' },
  { category: 'supply', label: 'Supplies' },
] as const

function isPickable(item: PickableItem): boolean {
  return !item.flags.includes('expired')
}

/**
 * Searchable inventory picker (cliniq-item-picker-patterns): type to filter, items grouped into
 * Medicines and Supplies, each showing its current stock and unit. Expired items stay visible but
 * disabled with an "Expired" badge; nearing-expiry items stay pickable with a warning badge. It's an
 * "add" control: picking calls `onPick` and clears the search, ready for the next item.
 *
 * ARIA 1.2 combobox: focus stays in the text field; Up/Down move through the options, Enter picks,
 * Escape closes (or clears the search when already closed), Tab moves on.
 */
export function InventoryItemPicker({
  items,
  onPick,
  label = 'Add medicine or supply',
  hint,
}: {
  items: ReadonlyArray<PickableItem>
  onPick: (itemId: string) => void
  label?: string
  hint?: string
}) {
  const id = useId()
  const listboxId = `${id}-listbox`
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const search = query.trim().toLowerCase()
  const groups = GROUPS.map((group) => ({
    ...group,
    items: items
      .filter((item) => item.category === group.category && item.name.toLowerCase().includes(search))
      .sort((a, b) => a.name.localeCompare(b.name)),
  })).filter((group) => group.items.length)
  const flat = groups.flatMap((group) => group.items)
  const optionId = (index: number) => `${id}-option-${index}`

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  useLayoutEffect(() => {
    const input = inputRef.current
    const panel = panelRef.current
    if (!open || !input || !panel) return
    const place = () => placeDropdownPanel(input, panel)
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, flat.length])

  useEffect(() => {
    if (open && active >= 0) document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' })
    // optionId is derived from the stable useId value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active])

  function pick(item: PickableItem) {
    if (!isPickable(item)) return
    onPick(item.id)
    setQuery('')
    setActive(-1)
    setOpen(false)
    inputRef.current?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!flat.length) return setOpen(true)
      const step = event.key === 'ArrowDown' ? 1 : -1
      setOpen(true)
      setActive((current) => (current < 0 && step < 0 ? flat.length - 1 : (current + step + flat.length) % flat.length))
    } else if (event.key === 'Enter') {
      // Never submit the surrounding form from the search field.
      event.preventDefault()
      if (open && flat[active]) pick(flat[active])
    } else if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        setOpen(false)
      } else if (query) {
        event.preventDefault()
        setQuery('')
      }
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <Input
        ref={inputRef}
        label={label}
        hint={hint}
        value={query}
        placeholder="Search by item name"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value)
          setActive(-1)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <div
          ref={panelRef}
          id={listboxId}
          role="listbox"
          aria-label={label}
          className={cn(DROPDOWN_PANEL, 'fixed overflow-y-auto scrollbar-thin')}
        >
          {groups.length === 0 && (
            <p className="px-2.5 py-1.5 text-sm text-text-secondary">No items match “{query.trim()}”.</p>
          )}
          {groups.map((group) => (
            <div key={group.category} role="group" aria-labelledby={`${id}-${group.category}`}>
              <p id={`${id}-${group.category}`} className="px-2.5 pt-2 pb-1 text-xs font-semibold text-text-secondary">
                {group.label}
              </p>
              {group.items.map((item) => {
                const optionIndex = flat.indexOf(item)
                const disabled = !isPickable(item)
                const nearing = item.flags.includes('nearing_expiration')
                return (
                  <div
                    key={item.id}
                    id={optionId(optionIndex)}
                    role="option"
                    aria-selected={optionIndex === active}
                    aria-disabled={disabled || undefined}
                    // Keep focus in the search field while clicking an option.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => pick(item)}
                    onMouseMove={() => setActive(optionIndex)}
                    className={cn(
                      dropdownOptionClassName(false),
                      'items-center justify-between gap-6',
                      optionIndex === active && 'bg-surface',
                      disabled && 'cursor-not-allowed text-text-secondary hover:bg-transparent',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {item.name}
                      {item.brand && <span className="text-xs text-text-secondary">{ITEM_BRAND_LABELS[item.brand]}</span>}
                      {disabled && <Badge tone="error" variant="soft">Expired</Badge>}
                      {nearing && (
                        <Badge tone="warning" variant="soft">
                          {item.daysUntilExpiry === 0 ? 'Expires today' : `Expires in ${item.daysUntilExpiry}d`}
                        </Badge>
                      )}
                    </span>
                    <span className={cn('text-xs tabular-nums', item.currentStock <= 0 ? 'font-semibold text-error' : 'text-text-secondary')}>
                      {stockQuantityText(item.currentStock, item.unit, item.flags)}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
