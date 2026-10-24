import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from '../icons/Icon'
import {
  DROPDOWN_CHECK_ROW,
  DROPDOWN_CHEVRON_SIZE,
  DROPDOWN_PANEL,
  dropdownChevronClassName,
  dropdownTriggerClassName,
} from './dropdownClassName'

export interface MultiSelectOption {
  value: string
  label: string
}

export interface MultiSelectProps {
  label: string
  values: ReadonlyArray<string>
  options: ReadonlyArray<MultiSelectOption>
  onChange: (values: string[]) => void
  allLabel: string
  className?: string
}

/**
 * Compact checkbox popover for filters that intentionally accept more than one value. It is kept
 * separate from Select: native selects cannot communicate or operate a multi-select filter well.
 */
export function MultiSelect({
  label,
  values,
  options,
  onChange,
  allLabel,
  className,
}: MultiSelectProps) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const selected = new Set(values)
  const summary = values.length === 0 ? allLabel : `${values.length} selected`

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  function toggle(value: string) {
    const next = new Set(values)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange(options.filter((option) => next.has(option.value)).map((option) => option.value))
  }

  function clearSelection() {
    onChange([])
  }

  return (
    <div
      ref={rootRef}
      onBlur={(event) => {
        // Tab out closes the panel, as an outside click does; otherwise it covers what gets focus.
        if (event.relatedTarget && !rootRef.current?.contains(event.relatedTarget as Node)) setOpen(false)
      }}
      className={cn('relative flex flex-col gap-1', className)}
    >
      <span id={`${id}-label`} className="text-xs font-semibold text-text-primary">
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        aria-labelledby={`${id}-label ${id}-summary`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false)
            triggerRef.current?.focus()
          }
        }}
        className={dropdownTriggerClassName({ className: 'relative w-full' })}
      >
        <span id={`${id}-summary`} className="min-w-0 flex-1 truncate text-left">
          {summary}
        </span>
        <Icon
          name="chevronDown"
          size={DROPDOWN_CHEVRON_SIZE}
          className={dropdownChevronClassName(open)}
        />
      </button>
      {open && (
        <div
          role="dialog"
          aria-labelledby={`${id}-label`}
          // Clicking a row's text focuses the panel, not <main>, so the Tab-out blur above stays shut.
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false)
              triggerRef.current?.focus()
            }
          }}
          className={cn(DROPDOWN_PANEL, 'absolute top-full mt-1.5 min-w-full')}
        >
          <fieldset>
            <legend className="sr-only">{label}</legend>
            <div className="flex flex-col">
              <label htmlFor={`${id}-all`} className={DROPDOWN_CHECK_ROW}>
                <input
                  id={`${id}-all`}
                  type="checkbox"
                  checked={values.length === 0}
                  onChange={clearSelection}
                  className="size-4 cursor-pointer accent-brand-green-dark"
                />
                {allLabel}
              </label>
              {options.map((option) => {
                const optionId = `${id}-${option.value}`
                return (
                  <label key={option.value} htmlFor={optionId} className={DROPDOWN_CHECK_ROW}>
                    <input
                      id={optionId}
                      type="checkbox"
                      checked={selected.has(option.value)}
                      onChange={() => toggle(option.value)}
                      className="size-4 cursor-pointer accent-brand-green-dark"
                    />
                    {option.label}
                  </label>
                )
              })}
            </div>
          </fieldset>
        </div>
      )}
    </div>
  )
}
