import { cn } from '../../lib/cn'

/**
 * The one dropdown look (cliniq-dropdown-patterns), taken from the Dashboard's date-range control:
 * a semibold trigger with a small brand chevron, and a floating panel of compact rows where the
 * selected row is marked by a surface tint, weight, and brand-green-dark text, never an icon.
 * `DateRangePicker`, `Select`, and `MultiSelect` all build on these, so a change lands everywhere.
 */
export type DropdownSize = 'sm' | 'md'

const triggerSizeClasses: Record<DropdownSize, string> = {
  // `sm` sits beside 32px inputs and small buttons (form grids, table rows).
  sm: 'h-8 pr-8 pl-2',
  md: 'h-10 pr-8 pl-3',
}

export function dropdownTriggerClassName({
  size = 'md',
  invalid = false,
  className,
}: { size?: DropdownSize; invalid?: boolean; className?: string } = {}): string {
  return cn(
    'inline-flex items-center rounded-md border bg-background text-sm font-semibold text-text-primary shadow-card',
    'cursor-pointer transition-colors duration-150 hover-field:border-brand-green hover-field:bg-surface motion-reduce:transition-none',
    'disabled:cursor-not-allowed disabled:opacity-50',
    invalid ? 'border-error' : 'border-border',
    triggerSizeClasses[size],
    className,
  )
}

export const DROPDOWN_CHEVRON_SIZE = 14

/** The chevron sits over the trigger's right padding and flips while the panel is open. */
export function dropdownChevronClassName(open: boolean): string {
  return cn(
    'pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-brand-green-dark transition-transform duration-150 motion-reduce:transition-none',
    open && 'rotate-180',
  )
}

/** Panel surface only. Each dropdown adds its own positioning and trigger-width minimum. */
export const DROPDOWN_PANEL =
  'z-30 w-max max-w-[calc(100vw-2rem)] rounded-md border border-border bg-background p-1 shadow-raised animate-expand-down motion-reduce:animate-none'

const OPTION_ROW =
  'flex w-full cursor-pointer whitespace-nowrap rounded-sm px-2.5 py-1.5 text-left text-sm transition-colors duration-150 motion-reduce:transition-none'

/** One row of a single-choice listbox. */
export function dropdownOptionClassName(selected: boolean): string {
  return cn(
    OPTION_ROW,
    selected
      ? 'bg-surface font-semibold text-brand-green-dark'
      : 'text-text-primary hover:bg-surface',
  )
}

const PANEL_GAP = 6
const VIEWPORT_MARGIN = 16
const PANEL_MAX_HEIGHT = 256

/**
 * Pins an option panel to its trigger in viewport coordinates, so a scrolling table or card can't
 * clip it. It opens upward when there's more room above, and never runs past the viewport edge.
 * Used by `Select`, `Combobox`, and `InventoryItemPicker`.
 */
export function placeDropdownPanel(trigger: HTMLElement, panel: HTMLElement) {
  const rect = trigger.getBoundingClientRect()
  const viewportWidth = document.documentElement.clientWidth
  const viewportHeight = document.documentElement.clientHeight
  const below = viewportHeight - rect.bottom - PANEL_GAP - VIEWPORT_MARGIN
  const above = rect.top - PANEL_GAP - VIEWPORT_MARGIN
  panel.style.minWidth = `${rect.width}px`
  panel.style.maxHeight = `${PANEL_MAX_HEIGHT}px`
  const openUp = panel.offsetHeight > below && above > below
  panel.style.maxHeight = `${Math.min(PANEL_MAX_HEIGHT, Math.max(openUp ? above : below, 96))}px`
  panel.style.top = openUp ? '' : `${rect.bottom + PANEL_GAP}px`
  panel.style.bottom = openUp ? `${viewportHeight - rect.top + PANEL_GAP}px` : ''
  const maxLeft = viewportWidth - panel.offsetWidth - VIEWPORT_MARGIN
  panel.style.left = `${Math.max(VIEWPORT_MARGIN, Math.min(rect.left, maxLeft))}px`
}

/** One checkbox row of a multi-select panel; the checkbox itself carries the selected state. */
export const DROPDOWN_CHECK_ROW = cn(
  OPTION_ROW,
  'items-center gap-2 text-text-primary hover:bg-surface',
)
