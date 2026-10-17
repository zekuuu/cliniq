import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cn } from '../../lib/cn'
import {
  DROPDOWN_PANEL,
  dropdownOptionClassName,
  dropdownTriggerClassName,
  placeDropdownPanel,
} from './dropdownClassName'

export interface ComboboxProps<T> {
  label: string
  /** The text in the field. */
  value: string
  onValueChange: (text: string) => void
  /** The suggestions to list, already filtered and capped by the caller. */
  options: ReadonlyArray<T>
  optionKey: (option: T) => string
  /** Plain text of an option; it fills the field when an option is picked in free-text mode. */
  optionLabel: (option: T) => string
  /** Richer option content; defaults to `optionLabel`. */
  renderOption?: (option: T) => ReactNode
  /**
   * Called when an option is picked (click, or Enter on the highlighted option).
   * Return `false` when the option is an action rather than a value, so free-text mode keeps its
   * current value. This lets callers offer an action such as "Other" without storing its label.
   */
  onPick?: (option: T) => boolean | void
  /** True: whatever is typed is the value, suggestions only help. False: only a pick counts. */
  allowFreeText: boolean
  /** Highlights the first option without arrowing to it, so Enter picks it. */
  autoHighlight?: boolean
  /** Opens the suggestions when the field takes focus, not only once typing starts. */
  openOnFocus?: boolean
  loading?: boolean
  /** The suggestions couldn't load. Shown in the panel; the field itself stays usable. */
  loadError?: string
  /** Shown in the panel when there are no options. `null` keeps the panel closed instead. */
  noMatchesText?: string | null
  placeholder?: string
  hint?: string
  /** Validation message for the field, shown under it. */
  error?: string
  required?: boolean
  maxLength?: number
  autoFocus?: boolean
  id?: string
  className?: string
}

/**
 * Text field with a suggestion list (cliniq-combobox-patterns), in the shared dropdown look
 * (cliniq-dropdown-patterns). ARIA 1.2 combobox: focus stays in the field; Down/Up open the list and
 * move through it, Enter picks the highlighted option, Escape closes the list (or clears the field
 * when it's already closed), Tab moves on. Enter never submits the surrounding form.
 *
 * Filtering is the caller's job, so one primitive serves a local list (complaints) and an async
 * search (StudentPicker) alike.
 */
export function Combobox<T>({
  label,
  value,
  onValueChange,
  options,
  optionKey,
  optionLabel,
  renderOption,
  onPick,
  allowFreeText,
  autoHighlight = false,
  openOnFocus = true,
  loading = false,
  loadError,
  noMatchesText = 'No matches',
  placeholder,
  hint,
  error,
  required,
  maxLength,
  autoFocus,
  id,
  className,
}: ComboboxProps<T>) {
  const autoId = useId()
  const inputId = id ?? autoId
  const listboxId = `${inputId}-listbox`
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [moved, setMoved] = useState(-1)
  const optionId = (index: number) => `${inputId}-option-${index}`

  // The highlight is whatever the user arrowed to, or the first option when auto-highlighting.
  const active = moved >= 0 && moved < options.length ? moved : autoHighlight && options.length ? 0 : -1
  const message = loading ? 'Searching…' : loadError ? loadError : options.length ? null : noMatchesText
  const showPanel = open && (options.length > 0 || message !== null)

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
    if (!showPanel || !input || !panel) return
    const place = () => placeDropdownPanel(input, panel)
    place()
    window.addEventListener('resize', place)
    // Capture phase: also follows a scroll inside any container, not just the page.
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [showPanel, options.length, message])

  useEffect(() => {
    if (showPanel && active >= 0) document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' })
    // optionId is derived from the stable useId value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPanel, active])

  function pick(option: T) {
    const shouldSetValue = onPick?.(option) !== false
    if (allowFreeText && shouldSetValue) onValueChange(optionLabel(option))
    setMoved(-1)
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      if (!options.length) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      // Opening with Down lands on the first option; Up from nothing wraps to the last.
      if (!open && active >= 0) return setMoved(active)
      setMoved(active < 0 ? (step > 0 ? 0 : options.length - 1) : (active + step + options.length) % options.length)
    } else if (event.key === 'Enter') {
      // Never submit the surrounding form from this field.
      event.preventDefault()
      if (showPanel && active >= 0) pick(options[active])
      else setOpen(false)
    } else if (event.key === 'Escape') {
      if (showPanel) {
        event.preventDefault()
        setOpen(false)
      } else if (value) {
        event.preventDefault()
        onValueChange('')
      }
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={inputId} className="text-xs font-semibold text-text-primary">
        {label}
        {required && (
          <span className="text-error" aria-hidden="true">
            {' '}
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      <div ref={rootRef} className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          value={value}
          placeholder={placeholder}
          maxLength={maxLength}
          required={required}
          autoFocus={autoFocus}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-activedescendant={showPanel && active >= 0 ? optionId(active) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(hintId, errorId) || undefined}
          onFocus={() => openOnFocus && setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            onValueChange(event.target.value)
            setMoved(-1)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
          className={dropdownTriggerClassName({
            invalid: Boolean(error),
            className:
              // No chevron: it would promise a list the field may not have yet (StudentPicker lists nothing on focus).
              'w-full cursor-text pr-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green',
          })}
        />
        {showPanel && (
          <div ref={panelRef} className={cn(DROPDOWN_PANEL, 'fixed overflow-y-auto scrollbar-thin')}>
            <div id={listboxId} role="listbox" aria-label={label}>
              {options.map((option, index) => (
                <div
                  key={optionKey(option)}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === active}
                  // Keep focus in the field while clicking an option.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(option)}
                  onMouseMove={() => setMoved(index)}
                  className={cn(dropdownOptionClassName(false), index === active && 'bg-surface')}
                >
                  {renderOption ? renderOption(option) : optionLabel(option)}
                </div>
              ))}
            </div>
            {message !== null && (
              <p
                role={loadError && !loading ? 'alert' : 'status'}
                className={cn(
                  'px-2.5 py-1.5 text-sm',
                  loadError && !loading ? 'font-semibold text-error' : 'text-text-secondary',
                )}
              >
                {message}
              </p>
            )}
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
