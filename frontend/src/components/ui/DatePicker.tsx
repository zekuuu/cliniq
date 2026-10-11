import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { cn } from '../../lib/cn'
import {
  addDays,
  addMonths,
  formatDate,
  formatLongDate,
  formatMonthYear,
  parseISODate,
  startOfMonth,
  startOfWeek,
  todayISO,
} from '../../lib/dates'
import type { ISODate } from '../../types/entities'
import { Icon } from '../icons/Icon'
import { DROPDOWN_CHEVRON_SIZE, dropdownTriggerClassName } from './dropdownClassName'

export interface DatePickerProps {
  /** A real, visible label. */
  label: string
  /** `YYYY-MM-DD` for day pickers, `YYYY-MM` for month pickers, or '' when empty. */
  value: string
  onChange: (value: string) => void
  /** `month` picks a whole month (value `YYYY-MM`), in place of a native month input. */
  granularity?: 'day' | 'month'
  /** Earliest and latest selectable value, in the same format as `value`. */
  min?: string
  max?: string
  placeholder?: string
  hint?: string
  error?: string
  id?: string
  required?: boolean
  /** Offers Clear in the calendar footer. Defaults to on for optional fields. */
  clearable?: boolean
  disabled?: boolean
  className?: string
  'aria-describedby'?: string
}

type View = 'days' | 'months' | 'years'

const PANEL_GAP = 6
const VIEWPORT_MARGIN = 16
const YEARS_PER_PAGE = 12
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function monthKey(value: ISODate): string {
  return value.slice(0, 7)
}

function yearOf(value: ISODate): number {
  return Number(value.slice(0, 4))
}

function withYear(value: ISODate, year: number): ISODate {
  return addMonths(value, (year - yearOf(value)) * 12)
}

/**
 * Pins the calendar to its trigger in viewport coordinates, so a card, table, or another popover
 * (the date-range custom panel) can't clip it. It opens upward when there's more room above.
 */
function placePanel(trigger: HTMLElement, panel: HTMLElement) {
  const rect = trigger.getBoundingClientRect()
  const viewportWidth = document.documentElement.clientWidth
  const viewportHeight = document.documentElement.clientHeight
  const below = viewportHeight - rect.bottom - PANEL_GAP - VIEWPORT_MARGIN
  const above = rect.top - PANEL_GAP - VIEWPORT_MARGIN
  const openUp = panel.offsetHeight > below && above > below
  panel.style.top = openUp ? '' : `${rect.bottom + PANEL_GAP}px`
  panel.style.bottom = openUp ? `${viewportHeight - rect.top + PANEL_GAP}px` : ''
  const maxLeft = viewportWidth - panel.offsetWidth - VIEWPORT_MARGIN
  panel.style.left = `${Math.max(VIEWPORT_MARGIN, Math.min(rect.left, maxLeft))}px`
}

const CELL =
  'flex cursor-pointer items-center justify-center rounded-md text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-green disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent motion-reduce:transition-none'

function cellClassName({
  selected,
  current,
  outside = false,
}: {
  selected: boolean
  current: boolean
  outside?: boolean
}) {
  return cn(
    CELL,
    selected
      ? 'bg-brand-green-dark font-semibold text-white hover:bg-brand-green-dark'
      : cn(
          'hover:bg-surface',
          current ? 'font-semibold text-brand-green-dark ring-1 ring-brand-green ring-inset' : '',
          outside ? 'text-text-muted' : !current && 'text-text-primary',
        ),
  )
}

const NAV_BUTTON =
  'inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors duration-150 hover:bg-surface hover:text-brand-green-dark focus-visible:outline-2 focus-visible:outline-brand-green disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent motion-reduce:transition-none'

const FOOTER_BUTTON =
  'cursor-pointer rounded-sm px-2 py-1 text-xs font-semibold text-brand-green-dark transition-colors duration-150 hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-green disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none'

/**
 * Themed date and month picker (cliniq-input-patterns), in place of the browser's native date and
 * month inputs whose calendar is operating-system chrome. The trigger matches the shared 40px
 * dropdown look; the calendar is a keyboard-navigable grid (arrows, Home/End, PageUp/PageDown,
 * Shift+PageUp/PageDown for years, Escape) with month and year views for quick jumps.
 */
export function DatePicker({
  label,
  value,
  onChange,
  granularity = 'day',
  min,
  max,
  placeholder,
  hint,
  error,
  id,
  required,
  clearable = !required,
  disabled,
  className,
  'aria-describedby': describedBy,
}: DatePickerProps) {
  const autoId = useId()
  const pickerId = id ?? autoId
  const valueId = `${pickerId}-value`
  const hintId = hint ? `${pickerId}-hint` : undefined
  const errorId = error ? `${pickerId}-error` : undefined
  const dialogId = `${pickerId}-calendar`
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const isMonth = granularity === 'month'
  const minView: View = isMonth ? 'months' : 'days'
  const today = todayISO()
  const selected: ISODate | '' = value ? (isMonth ? `${value}-01` : value) : ''

  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>(minView)
  // The focused cell; also decides which month, year, or year page is on screen.
  const [cursor, setCursor] = useState<ISODate>(selected || today)
  // Set by keyboard and view changes; the next render moves focus to the cursor cell.
  const focusPending = useRef(false)

  const minDay = min ? (isMonth ? `${min}-01` : min) : undefined
  const maxDay = max ? (isMonth ? `${max}-01` : max) : undefined
  const minMonth = minDay && monthKey(minDay)
  const maxMonth = maxDay && monthKey(maxDay)
  const dayDisabled = (day: ISODate) =>
    (minDay !== undefined && day < minDay) || (maxDay !== undefined && day > maxDay)
  const monthDisabled = (day: ISODate) =>
    (minMonth !== undefined && monthKey(day) < minMonth) ||
    (maxMonth !== undefined && monthKey(day) > maxMonth)
  const yearDisabled = (year: number) =>
    (minDay !== undefined && year < yearOf(minDay)) ||
    (maxDay !== undefined && year > yearOf(maxDay))

  // Keeps the cursor on an enabled value, so it can always take focus (a disabled cell can't, and the
  // grid then never receives arrow keys).
  const clamp = (day: ISODate): ISODate =>
    minDay !== undefined && day < minDay ? minDay : maxDay !== undefined && day > maxDay ? maxDay : day

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
    const place = () => placePanel(trigger, panel)
    place()
    window.addEventListener('resize', place)
    // Capture phase: also follows a scroll inside any container, not just the page.
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, view])

  useEffect(() => {
    if (!open || !focusPending.current) return
    focusPending.current = false
    panelRef.current?.querySelector<HTMLButtonElement>('[data-cursor="true"]')?.focus()
  })

  function openPanel() {
    setCursor(clamp(selected || today))
    setView(minView)
    setOpen(true)
    focusPending.current = true
  }

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function commit(day: ISODate | '') {
    const next = day ? (isMonth ? monthKey(day) : day) : ''
    close()
    if (next !== value) onChange(next)
  }

  function moveCursor(next: ISODate) {
    setCursor(clamp(next))
    focusPending.current = true
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      openPanel()
    }
  }

  function onGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = { days: [1, 7], months: [1, 4], years: [1, 4] }[view]
    const move = (amount: number) =>
      view === 'days'
        ? addDays(cursor, amount)
        : view === 'months'
          ? addMonths(cursor, amount)
          : withYear(cursor, yearOf(cursor) + amount)
    const page = (direction: number) =>
      view === 'days'
        ? addMonths(cursor, event.shiftKey ? direction * 12 : direction)
        : withYear(cursor, yearOf(cursor) + direction * (view === 'months' ? 1 : YEARS_PER_PAGE))
    let next: ISODate | undefined
    switch (event.key) {
      case 'ArrowLeft':
        next = move(-step[0])
        break
      case 'ArrowRight':
        next = move(step[0])
        break
      case 'ArrowUp':
        next = move(-step[1])
        break
      case 'ArrowDown':
        next = move(step[1])
        break
      case 'PageUp':
        next = page(-1)
        break
      case 'PageDown':
        next = page(1)
        break
      case 'Home':
        next = view === 'days' ? startOfWeek(cursor) : undefined
        break
      case 'End':
        next = view === 'days' ? addDays(startOfWeek(cursor), 6) : undefined
        break
    }
    if (next) {
      event.preventDefault()
      moveCursor(next)
    }
  }

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      // Keep Escape from also dismissing a surrounding popover, such as the custom date range.
      event.stopPropagation()
      event.preventDefault()
      if (view !== minView) {
        setView(minView)
        focusPending.current = true
      } else {
        close()
      }
    }
  }

  function zoomOut() {
    setView(view === 'days' ? 'months' : 'years')
    focusPending.current = true
  }

  function chooseMonth(day: ISODate) {
    if (isMonth) {
      commit(day)
    } else {
      setCursor(day)
      setView('days')
      focusPending.current = true
    }
  }

  function chooseYear(year: number) {
    setCursor(withYear(cursor, year))
    setView('months')
    focusPending.current = true
  }

  const yearPageStart = Math.floor(yearOf(cursor) / YEARS_PER_PAGE) * YEARS_PER_PAGE
  const heading =
    view === 'days'
      ? formatMonthYear(cursor)
      : view === 'months'
        ? String(yearOf(cursor))
        : `${yearPageStart} – ${yearPageStart + YEARS_PER_PAGE - 1}`
  const previous =
    view === 'days'
      ? { label: 'Previous month', to: addMonths(cursor, -1), disabled: monthDisabled(addMonths(startOfMonth(cursor), -1)) }
      : view === 'months'
        ? { label: 'Previous year', to: withYear(cursor, yearOf(cursor) - 1), disabled: yearDisabled(yearOf(cursor) - 1) }
        : { label: 'Previous years', to: withYear(cursor, yearOf(cursor) - YEARS_PER_PAGE), disabled: yearDisabled(yearPageStart - 1) }
  const next =
    view === 'days'
      ? { label: 'Next month', to: addMonths(cursor, 1), disabled: monthDisabled(addMonths(startOfMonth(cursor), 1)) }
      : view === 'months'
        ? { label: 'Next year', to: withYear(cursor, yearOf(cursor) + 1), disabled: yearDisabled(yearOf(cursor) + 1) }
        : { label: 'Next years', to: withYear(cursor, yearOf(cursor) + YEARS_PER_PAGE), disabled: yearDisabled(yearPageStart + YEARS_PER_PAGE) }

  const display = selected
    ? isMonth
      ? formatMonthYear(selected)
      : formatDate(selected)
    : (placeholder ?? (isMonth ? 'Select month' : 'Select date'))
  const todayAllowed = isMonth ? !monthDisabled(today) : !dayDisabled(today)

  return (
    <div ref={rootRef} className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={pickerId} className="text-xs font-semibold text-text-primary">
        {label}
        {required && (
          <span className="text-error" aria-hidden="true">
            {' '}
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      <div className="relative flex">
        <button
          ref={triggerRef}
          id={pickerId}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? dialogId : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(valueId, describedBy, hintId, errorId)}
          onClick={() => (open ? setOpen(false) : openPanel())}
          onKeyDown={onTriggerKeyDown}
          className={dropdownTriggerClassName({
            invalid: Boolean(error),
            className: 'w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green',
          })}
        >
          <span id={valueId} className={cn('min-w-0 flex-1 truncate text-left', !selected && 'font-normal text-text-muted')}>
            {display}
          </span>
        </button>
        <Icon
          name="calendar"
          size={DROPDOWN_CHEVRON_SIZE + 2}
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-brand-green-dark"
        />
        {open && (
          <div
            ref={panelRef}
            id={dialogId}
            role="dialog"
            aria-label={`Choose ${label.toLowerCase()}`}
            onKeyDown={onPanelKeyDown}
            className="fixed z-40 w-72 rounded-md border border-border bg-background p-3 shadow-raised"
          >
            <div className="mb-2 flex items-center justify-between gap-1">
              <button
                type="button"
                aria-label={previous.label}
                disabled={previous.disabled}
                onClick={() => setCursor(previous.to)}
                className={NAV_BUTTON}
              >
                <Icon name="chevronLeft" size={16} />
              </button>
              <button
                type="button"
                aria-live="polite"
                aria-label={view === 'years' ? heading : `${heading}, choose ${view === 'days' ? 'month' : 'year'}`}
                disabled={view === 'years'}
                onClick={zoomOut}
                className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md px-2 text-sm font-semibold text-text-primary transition-colors duration-150 hover:bg-surface hover:text-brand-green-dark focus-visible:outline-2 focus-visible:outline-brand-green disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-text-primary motion-reduce:transition-none"
              >
                {heading}
                {view !== 'years' && <Icon name="chevronDown" size={12} className="text-brand-green-dark" />}
              </button>
              <button
                type="button"
                aria-label={next.label}
                disabled={next.disabled}
                onClick={() => setCursor(next.to)}
                className={NAV_BUTTON}
              >
                <Icon name="chevronRight" size={16} />
              </button>
            </div>

            {view === 'days' && (
              <DaysGrid
                cursor={cursor}
                selected={selected}
                today={today}
                isDisabled={dayDisabled}
                onChoose={commit}
                onKeyDown={onGridKeyDown}
              />
            )}
            {view === 'months' && (
              <div role="group" aria-label={`Months of ${yearOf(cursor)}`} onKeyDown={onGridKeyDown} className="grid grid-cols-4 gap-1">
                {Array.from({ length: 12 }, (_, index) => {
                  const day = `${yearOf(cursor)}-${String(index + 1).padStart(2, '0')}-01`
                  const isCursor = monthKey(day) === monthKey(cursor)
                  return (
                    <button
                      key={day}
                      type="button"
                      tabIndex={isCursor ? 0 : -1}
                      data-cursor={isCursor}
                      aria-label={formatMonthYear(day)}
                      aria-pressed={selected !== '' && monthKey(day) === monthKey(selected)}
                      disabled={monthDisabled(day)}
                      onClick={() => chooseMonth(day)}
                      className={cn(
                        'h-10',
                        cellClassName({
                          selected: selected !== '' && monthKey(day) === monthKey(selected),
                          current: monthKey(day) === monthKey(today),
                        }),
                      )}
                    >
                      {formatDate(day, { month: 'short' })}
                    </button>
                  )
                })}
              </div>
            )}
            {view === 'years' && (
              <div role="group" aria-label={heading} onKeyDown={onGridKeyDown} className="grid grid-cols-4 gap-1">
                {Array.from({ length: YEARS_PER_PAGE }, (_, index) => {
                  const year = yearPageStart + index
                  const isCursor = year === yearOf(cursor)
                  const isSelected = selected !== '' && year === yearOf(selected)
                  return (
                    <button
                      key={year}
                      type="button"
                      tabIndex={isCursor ? 0 : -1}
                      data-cursor={isCursor}
                      aria-pressed={isSelected}
                      disabled={yearDisabled(year)}
                      onClick={() => chooseYear(year)}
                      className={cn(
                        'h-10 tabular-nums',
                        cellClassName({ selected: isSelected, current: year === yearOf(today) }),
                      )}
                    >
                      {year}
                    </button>
                  )
                })}
              </div>
            )}

            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              {clearable && value ? (
                <button type="button" onClick={() => commit('')} className={FOOTER_BUTTON}>
                  Clear
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                disabled={!todayAllowed}
                onClick={() => commit(today)}
                className={FOOTER_BUTTON}
              >
                {isMonth ? 'This month' : 'Today'}
              </button>
            </div>
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

/** Month picker: the same control with a month grid, value `YYYY-MM`. */
export function MonthPicker(props: Omit<DatePickerProps, 'granularity'>) {
  return <DatePicker {...props} granularity="month" />
}

function DaysGrid({
  cursor,
  selected,
  today,
  isDisabled,
  onChoose,
  onKeyDown,
}: {
  cursor: ISODate
  selected: ISODate | ''
  today: ISODate
  isDisabled: (day: ISODate) => boolean
  onChoose: (day: ISODate) => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}) {
  const first = startOfWeek(startOfMonth(cursor))
  // Always six weeks, so the panel height never jumps between months.
  const weeks = Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(first, week * 7 + day)),
  )
  const month = monthKey(cursor)
  return (
    <div role="grid" aria-label={formatMonthYear(cursor)} onKeyDown={onKeyDown}>
      <div role="row" className="mb-1 grid grid-cols-7">
        {WEEKDAYS.map((day, index) => (
          <span
            key={day}
            role="columnheader"
            aria-label={WEEKDAY_NAMES[index]}
            className="py-1 text-center text-xs font-semibold text-text-secondary"
          >
            {day}
          </span>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0]} role="row" className="grid grid-cols-7 gap-0.5">
          {week.map((day) => {
            const isCursor = day === cursor
            const isSelected = day === selected
            return (
              <span key={day} role="gridcell" aria-selected={isSelected}>
                <button
                  type="button"
                  tabIndex={isCursor ? 0 : -1}
                  data-cursor={isCursor}
                  aria-label={formatLongDate(day)}
                  aria-current={day === today ? 'date' : undefined}
                  disabled={isDisabled(day)}
                  onClick={() => onChoose(day)}
                  className={cn(
                    'h-9 w-full tabular-nums',
                    cellClassName({
                      selected: isSelected,
                      current: day === today,
                      outside: monthKey(day) !== month,
                    }),
                  )}
                >
                  {parseISODate(day).getDate()}
                </button>
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}
