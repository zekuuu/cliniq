import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import { complaintGroupKey } from '../../lib/complaints'
import { symptoms as symptomsWord } from '../../lib/labels'
import { stockQuantityText, type InventoryFlag } from '../status/inventory'
import { ITEM_BRAND_LABELS, type ItemBrand } from '../../types/entities'
import { Badge } from '../ui/Badge'
import { Input } from '../ui/Input'
import {
  DROPDOWN_PANEL,
  dropdownOptionClassName,
  placeDropdownPanel,
} from '../ui/dropdownClassName'

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
  /** "Avoid if allergic to" words (ADR-049, D8). */
  avoidIfAllergicTo?: string[]
  /** "Commonly used for" symptom options (consultation, November 6, 2026). */
  usedFor?: string[]
}

const GROUPS = [
  { category: 'medicine', label: 'Medicines' },
  { category: 'supply', label: 'Supplies' },
] as const

type Group = { key: string; label: string; items: PickableItem[] }

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
 *
 * With `symptoms` chosen (the Visit form), items tagged "Commonly used for" one of them come first
 * under "Suggested for these symptoms"; the rest sit behind a "Show all medicines" row (collapsed by
 * default) that Enter or a click opens. Typing always searches every item. Nothing is ever hidden
 * from search, disabled or blocked by a suggestion: stock, expiry and allergy warnings are unchanged.
 */
export function InventoryItemPicker({
  items,
  onPick,
  label = 'Add medicine or supply',
  hint,
  symptoms,
}: {
  items: ReadonlyArray<PickableItem>
  onPick: (itemId: string) => void
  label?: string
  hint?: string
  /** The visit's chosen symptoms; omitted or empty lists every item as before. */
  symptoms?: ReadonlyArray<string>
}) {
  const id = useId()
  const listboxId = `${id}-listbox`
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [showAll, setShowAll] = useState(false)

  const search = query.trim().toLowerCase()
  const wanted = new Set((symptoms ?? []).map(complaintGroupKey).filter(Boolean))
  const isSuggested = (item: PickableItem) =>
    (item.usedFor ?? []).some((tag) => wanted.has(complaintGroupKey(tag)))
  const matching = items
    .filter((item) => item.name.toLowerCase().includes(search))
    .sort((a, b) => a.name.localeCompare(b.name))
  const suggested = wanted.size ? matching.filter(isSuggested) : []
  const rest = matching.filter((item) => !suggested.includes(item))
  // The toggle row shows only for the unfiltered list; a search always shows every match.
  const hasToggle = suggested.length > 0 && !search && rest.length > 0
  const collapsed = hasToggle && !showAll
  const groups: Group[] = [
    ...(suggested.length
      ? [{ key: 'suggested', label: `Suggested for these ${symptomsWord}`, items: suggested }]
      : []),
    ...(collapsed
      ? []
      : GROUPS.map((group) => ({
          key: group.category,
          label: group.label,
          items: rest.filter((item) => item.category === group.category),
        }))),
  ].filter((group) => group.items.length)
  const flat = groups.flatMap((group) => group.items)
  /** The "Show all medicines" row is the last option, after every item. */
  const toggleIndex = hasToggle ? flat.length : -1
  const optionCount = flat.length + (hasToggle ? 1 : 0)
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
  }, [open, optionCount])

  useEffect(() => {
    if (open && active >= 0)
      document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' })
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
      if (!optionCount) return setOpen(true)
      const step = event.key === 'ArrowDown' ? 1 : -1
      setOpen(true)
      setActive((current) =>
        current < 0 && step < 0 ? optionCount - 1 : (current + step + optionCount) % optionCount,
      )
    } else if (event.key === 'Enter') {
      // Never submit the surrounding form from the search field.
      event.preventDefault()
      if (open && active === toggleIndex) setShowAll((current) => !current)
      else if (open && flat[active]) pick(flat[active])
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
            <p className="px-2.5 py-1.5 text-sm text-text-secondary">
              No items match “{query.trim()}”.
            </p>
          )}
          {groups.map((group) => (
            <div key={group.key} role="group" aria-labelledby={`${id}-${group.key}`}>
              <p
                id={`${id}-${group.key}`}
                className="px-2.5 pt-2 pb-1 text-xs font-semibold text-text-secondary"
              >
                {group.label}
              </p>
              {group.key === 'suggested' && (
                <p className="px-2.5 pb-1 text-xs text-text-secondary">
                  Suggestions come from the tags set on each item. The clinician decides.
                </p>
              )}
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
                      {item.brand && (
                        <span className="text-xs text-text-secondary">
                          {ITEM_BRAND_LABELS[item.brand]}
                        </span>
                      )}
                      {disabled && (
                        <Badge tone="error" variant="soft">
                          Expired
                        </Badge>
                      )}
                      {nearing && (
                        <Badge tone="warning" variant="soft">
                          {item.daysUntilExpiry === 0
                            ? 'Expires today'
                            : `Expires in ${item.daysUntilExpiry}d`}
                        </Badge>
                      )}
                    </span>
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        item.currentStock <= 0 ? 'font-semibold text-error' : 'text-text-secondary',
                      )}
                    >
                      {stockQuantityText(item.currentStock, item.unit, item.flags)}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
          {hasToggle && (
            <div
              id={optionId(toggleIndex)}
              role="option"
              aria-selected={active === toggleIndex}
              aria-expanded={showAll}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setShowAll((current) => !current)}
              onMouseMove={() => setActive(toggleIndex)}
              className={cn(
                dropdownOptionClassName(false),
                'mt-1 border-t border-border font-semibold text-brand-green-dark',
                active === toggleIndex && 'bg-surface',
              )}
            >
              {showAll ? 'Show suggested only' : `Show all medicines (${rest.length} more)`}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
