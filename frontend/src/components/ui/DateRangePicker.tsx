import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import {
  PRESET_LABELS,
  rangeForPreset,
  type DateRange,
  type DateRangePreset,
} from '../../lib/dateRange'
import type { ISODate } from '../../types/entities'
import { Icon } from '../icons/Icon'
import { Button } from './Button'
import {
  DROPDOWN_CHEVRON_SIZE,
  DROPDOWN_PANEL,
  dropdownChevronClassName,
  dropdownOptionClassName,
  dropdownTriggerClassName,
} from './dropdownClassName'
import { DatePicker } from './DatePicker'

export interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  /** Today's date; custom ranges can't go past it. */
  today: ISODate
  /** Inline label + select, for a page header's top-right slot (the reference's period dropdown). */
  compact?: boolean
  /** Presets available in this context. Defaults to the dashboard's reporting ranges. */
  presets?: ReadonlyArray<DateRangePreset>
  /** Context-specific display labels, such as “This week” for an operational log. */
  presetLabels?: Partial<Record<DateRangePreset, string>>
  /** Float the custom dates below this control instead of changing the surrounding layout. */
  customPopover?: boolean
  /** Which trigger edge the floating custom panel lines up with; use "start" at a row's left edge. */
  popoverAlign?: 'start' | 'end'
  /** Stretch the trigger across its container, for a grid of equal-width filters. */
  fullWidth?: boolean
  className?: string
}

const defaultPresetOrder: DateRangePreset[] = [
  'all',
  'today',
  'last7',
  'last30',
  'thisMonth',
  'thisYear',
  'custom',
]

/**
 * Date-range filter: "All" is the first, default-safe preset, followed by narrower presets and a
 * custom From/To pair behind "Custom range". Editing the dates only changes a draft; nothing is
 * applied until Apply (or Enter). An invalid custom range is explained inline and never applied,
 * so the rest of the page keeps showing the last valid range.
 */
export function DateRangePicker({
  value,
  onChange,
  today,
  compact = false,
  presets = defaultPresetOrder,
  presetLabels,
  customPopover = false,
  popoverAlign = 'end',
  fullWidth = false,
  className,
}: DateRangePickerProps) {
  const selectId = useId()
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [draft, setDraft] = useState({ from: value.from, to: value.to })
  const [error, setError] = useState<string | undefined>()
  const [open, setOpen] = useState(false)
  // Compact and popover variants: the From/To panel floats like a dropdown, so it needs its own
  // open state (dismissable, never stacked under the preset list) instead of showing whenever the
  // preset is "custom".
  const floating = compact || customPopover
  const [customOpen, setCustomOpen] = useState(false)
  const showCustom = floating ? customOpen && !open : value.preset === 'custom'
  const selectedIndex = Math.max(
    0,
    presets.findIndex((preset) => preset === value.preset),
  )
  const labelForPreset = (preset: DateRangePreset) => presetLabels?.[preset] ?? PRESET_LABELS[preset]

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setCustomOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  function editDraft(next: { from: ISODate; to: ISODate }) {
    setDraft(next)
    setError(undefined)
  }

  function closeCustom() {
    setCustomOpen(false)
    triggerRef.current?.focus()
  }

  function applyCustom(next: { from: ISODate; to: ISODate }) {
    if (!next.from || !next.to) {
      setError('Enter both a start and an end date.')
    } else if (next.from > next.to) {
      setError('The start date must be on or before the end date.')
    } else if (next.to > today) {
      setError('The end date can’t be later than today.')
    } else {
      setError(undefined)
      onChange({ preset: 'custom', ...next })
      if (floating) closeCustom()
    }
  }

  function cancelCustom() {
    setDraft({ from: value.from, to: value.to })
    setError(undefined)
    closeCustom()
  }

  function onPresetChange(preset: DateRangePreset) {
    setOpen(false)
    setCustomOpen(preset === 'custom')
    if (preset === 'custom') {
      setError(undefined)
      // "All" uses a 1900 sentinel start date, which is no useful starting point for a custom draft.
      setDraft(value.preset === 'all' ? { from: today, to: today } : { from: value.from, to: value.to })
      // Floating: the popover holds the draft, and the preset only switches once Apply succeeds.
      if (!floating) onChange({ ...value, preset: 'custom' })
    } else {
      setError(undefined)
      onChange(rangeForPreset(preset, today))
    }
  }

  function focusOption(index: number) {
    optionRefs.current[index]?.focus()
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      window.setTimeout(() =>
        focusOption(event.key === 'ArrowDown' ? selectedIndex : presets.length - 1),
      )
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen((next) => !next)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  function onOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      focusOption((index + direction + presets.length) % presets.length)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusOption(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusOption(presets.length - 1)
    } else if (event.key === 'Escape') {
      setOpen(false)
      triggerRef.current?.focus()
    }
  }

  return (
    <div
      ref={rootRef}
      onBlur={(event) => {
        // Tab out closes the menu and popover, as an outside click does; otherwise they cover what gets focus.
        if (event.relatedTarget && !rootRef.current?.contains(event.relatedTarget as Node)) {
          setOpen(false)
          setCustomOpen(false)
        }
      }}
      className={cn(
        floating
          ? cn('relative flex', !fullWidth && 'justify-end')
          : 'flex flex-wrap items-end gap-3',
        className,
      )}
    >
      <div
        className={cn('flex', compact ? 'items-center gap-2' : 'flex-col gap-1', fullWidth && 'w-full')}
      >
        <label
          htmlFor={selectId}
          className={cn(
            'text-xs font-semibold',
            compact ? 'text-text-secondary' : 'text-text-primary',
          )}
        >
          Date range
        </label>
        <div className={cn('relative', fullWidth ? 'flex' : 'inline-flex')}>
          <button
            ref={triggerRef}
            id={selectId}
            type="button"
            aria-label="Date range"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listboxId : undefined}
            onClick={() => setOpen((next) => !next)}
            onKeyDown={onTriggerKeyDown}
            className={dropdownTriggerClassName({ className: fullWidth ? 'w-full' : 'min-w-40' })}
          >
            <span className="mr-2 inline-flex size-5 items-center justify-center text-brand-green-dark">
              <Icon name="calendar" size={14} />
            </span>
            <span className="min-w-0 flex-1 text-left">{labelForPreset(value.preset)}</span>
          </button>
          <Icon
            name="chevronDown"
            size={DROPDOWN_CHEVRON_SIZE}
            className={dropdownChevronClassName(open)}
          />
          {open && (
            <div
              id={listboxId}
              role="listbox"
              aria-label="Date range presets"
              className={cn(DROPDOWN_PANEL, 'absolute top-full right-0 mt-1.5 min-w-full overflow-hidden')}
            >
              {presets.map((preset, index) => {
                const selected = preset === value.preset
                return (
                  <button
                    key={preset}
                    ref={(node) => {
                      optionRefs.current[index] = node
                    }}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => onPresetChange(preset)}
                    onKeyDown={(event) => onOptionKeyDown(event, index)}
                    className={dropdownOptionClassName(selected)}
                  >
                    {labelForPreset(preset)}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
      {showCustom && (
        <form
          aria-label="Custom date range"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            applyCustom(draft)
          }}
          onKeyDown={(event) => {
            if (floating && event.key === 'Escape') cancelCustom()
          }}
          className={cn(
            'rounded-md border border-border bg-background',
            // Popover variants overlay below the trigger so custom dates never shift page content.
            floating
              ? cn(
                  'absolute top-full z-30 mt-1.5 w-max p-3 shadow-raised',
                  popoverAlign === 'start' ? 'left-0' : 'right-0',
                )
              : 'basis-full p-3 shadow-card',
          )}
        >
          <div className="flex flex-wrap items-start gap-3">
            <DatePicker
              label="From"
              value={draft.from}
              max={today}
              onChange={(next) => editDraft({ ...draft, from: next })}
              aria-describedby={error ? `${selectId}-range-error` : undefined}
              className="w-40"
            />
            <DatePicker
              label="To"
              value={draft.to}
              max={today}
              onChange={(next) => editDraft({ ...draft, to: next })}
              aria-describedby={error ? `${selectId}-range-error` : undefined}
              className="w-40"
            />
          </div>
          {error && (
            <p
              id={`${selectId}-range-error`}
              role="alert"
              className="mt-2 text-xs font-semibold text-error"
            >
              {error}
            </p>
          )}
          <div className="mt-3 flex justify-end gap-2">
            {floating && (
              <Button type="button" variant="neutral" size="sm" onClick={cancelCustom}>
                Cancel
              </Button>
            )}
            <Button type="submit" variant="primary" size="sm">
              Apply
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
