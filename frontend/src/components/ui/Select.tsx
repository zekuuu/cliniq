import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from '../icons/Icon'
import {
  DROPDOWN_CHEVRON_SIZE,
  DROPDOWN_PANEL,
  dropdownChevronClassName,
  dropdownOptionClassName,
  dropdownTriggerClassName,
  placeDropdownPanel,
} from './dropdownClassName'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  label: string
  value: string
  options: ReadonlyArray<SelectOption>
  onChange: (value: string) => void
  /** Shown on the trigger while nothing is chosen, e.g. "Select grade level". */
  placeholder?: string
  /**
   * The placeholder is also a real choice, listed as the first option: a filter's "All ..." that
   * clears the value. Without it, a prompt such as "Select complaint" stays on the trigger only.
   */
  clearable?: boolean
  hint?: string
  error?: string
  id?: string
  className?: string
  required?: boolean
  disabled?: boolean
  /** Places the label beside the control from the small breakpoint upward. */
  inline?: boolean
  /** Keeps the label for screen readers only, e.g. a per-row control whose column header names it. */
  hideLabel?: boolean
  /** `sm` matches small buttons inside table rows and 32px inputs in a form grid. */
  size?: 'sm' | 'md'
}

const TYPEAHEAD_RESET_MS = 500

/**
 * Single-choice dropdown in the shared dropdown look (cliniq-dropdown-patterns): a themed trigger
 * and an accessible listbox, the same as the Dashboard's date-range control, in place of a native
 * `<select>` whose open menu is operating-system chrome. Arrow keys, Home/End, typing to jump,
 * Enter, and Escape all work, and focus returns to the trigger when the panel closes.
 */
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder,
  clearable = false,
  hint,
  error,
  id,
  required,
  disabled,
  className,
  inline = false,
  hideLabel = false,
  size = 'md',
}: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  const labelId = `${selectId}-label`
  const valueId = `${selectId}-value`
  const listboxId = `${selectId}-listbox`
  const hintId = hint ? `${selectId}-hint` : undefined
  const errorId = error ? `${selectId}-error` : undefined
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const typeahead = useRef({ query: '', timer: 0 })
  const [open, setOpen] = useState(false)
  const items =
    placeholder !== undefined && clearable ? [{ value: '', label: placeholder }, ...options] : options
  const selectedIndex = items.findIndex((item) => item.value === value)
  const focusIndex = Math.max(0, selectedIndex)

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const panel = panelRef.current
    if (!trigger || !panel) return
    const place = () => placeDropdownPanel(trigger, panel)
    place()
    optionRefs.current[focusIndex]?.focus()
    window.addEventListener('resize', place)
    // Capture phase: also follows a scroll inside any container, not just the page.
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, focusIndex])

  function close() {
    typeahead.current.query = ''
    triggerRef.current?.focus()
    setOpen(false)
  }

  function choose(next: string) {
    close()
    if (next !== value) onChange(next)
  }

  function focusOption(index: number) {
    optionRefs.current[index]?.focus()
  }

  /** Typing jumps to the next option that starts with what was typed, like a native select. */
  function jumpTo(character: string, from: number) {
    window.clearTimeout(typeahead.current.timer)
    const query = typeahead.current.query + character.toLowerCase()
    typeahead.current = {
      query,
      timer: window.setTimeout(() => {
        typeahead.current.query = ''
      }, TYPEAHEAD_RESET_MS),
    }
    const start = query.length === 1 ? from + 1 : from
    for (let step = 0; step < items.length; step++) {
      const index = (start + step) % items.length
      if (items[index].label.toLowerCase().startsWith(query)) return focusOption(index)
    }
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
    }
  }

  function onOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      focusOption((index + direction + items.length) % items.length)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusOption(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusOption(items.length - 1)
    } else if (event.key === 'Escape' || event.key === 'Tab') {
      // Tab continues from the trigger, so the next field is the one after this control.
      close()
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // A space picks the focused option unless it's part of a label being typed ("Grade 1…").
      if (event.key === ' ' && !typeahead.current.query) return
      event.preventDefault()
      jumpTo(event.key, index)
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        inline && 'sm:flex-row sm:items-center sm:gap-3',
        className,
      )}
    >
      <label
        id={labelId}
        htmlFor={selectId}
        className={cn('text-xs font-semibold text-text-primary', inline && 'sm:shrink-0', hideLabel && 'sr-only')}
      >
        {label}
        {required && (
          <span className="text-error" aria-hidden="true">
            {' '}
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      <div ref={rootRef} className={cn('relative', inline && 'sm:min-w-0 sm:flex-1')}>
        <button
          ref={triggerRef}
          id={selectId}
          type="button"
          disabled={disabled}
          aria-labelledby={`${labelId} ${valueId}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(hintId, errorId) || undefined}
          onClick={() => setOpen((next) => !next)}
          onKeyDown={onTriggerKeyDown}
          className={dropdownTriggerClassName({ size, invalid: Boolean(error), className: 'w-full' })}
        >
          {/* Every label shares one grid cell, so the trigger is as wide as its longest option and
              doesn't resize when the selection changes. */}
          <span className="grid min-w-0 flex-1 text-left">
            <span id={valueId} className="col-start-1 row-start-1 truncate">
              {items[selectedIndex]?.label ?? placeholder}
            </span>
            {[...items, ...(placeholder !== undefined && !clearable ? [{ value: '', label: placeholder }] : [])].map((item) => (
              <span
                key={item.value}
                aria-hidden="true"
                className="invisible col-start-1 row-start-1 h-0 truncate"
              >
                {item.label}
              </span>
            ))}
          </span>
        </button>
        <Icon
          name="chevronDown"
          size={DROPDOWN_CHEVRON_SIZE}
          className={dropdownChevronClassName(open)}
        />
        {open && (
          <div
            ref={panelRef}
            id={listboxId}
            role="listbox"
            aria-labelledby={labelId}
            className={cn(DROPDOWN_PANEL, 'fixed overflow-y-auto scrollbar-thin')}
          >
            {items.map((item, index) => {
              const selected = index === selectedIndex
              return (
                <button
                  key={item.value}
                  ref={(node) => {
                    optionRefs.current[index] = node
                  }}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  tabIndex={-1}
                  value={item.value}
                  onClick={() => choose(item.value)}
                  onKeyDown={(event) => onOptionKeyDown(event, index)}
                  onKeyUp={(event) => {
                    // Browsers that activate a button on Space keyup: keep a typed space from selecting.
                    if (event.key === ' ' && typeahead.current.query) event.preventDefault()
                  }}
                  className={dropdownOptionClassName(selected)}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="text-xs text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  )
}
