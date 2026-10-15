import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from '../icons/Icon'

export interface TabItem<V extends string> {
  value: V
  label: string
  icon?: IconName
  /** Extra content after the label, inside the tab (e.g. a count badge); part of its accessible name. */
  badge?: ReactNode
  panel: ReactNode
}

export interface TabsProps<V extends string> {
  /** Accessible name of the tablist, e.g. "Dashboard view". */
  label: string
  tabs: ReadonlyArray<TabItem<V>>
  value: V
  onChange: (value: V) => void
  /**
   * Every panel stays mounted (hidden ones keep their state and don't refetch) and laid out at full
   * width, so a chart in a hidden panel sizes itself as if shown. With `printAll`, hidden panels
   * still print and the tablist doesn't (`index.css`, `[role='tabpanel'][hidden]`).
   */
  printAll?: boolean
  className?: string
}

/**
 * Page-level view switcher, built as ARIA tabs: Tab lands on the selected tab, and Arrow keys,
 * Home, and End move the selection (automatic activation; panels are already mounted). The
 * selected tab uses fill, ring, and weight together, never color alone. It's the larger sibling
 * of `SegmentedControl`, which stays for in-card toggles.
 */
export function Tabs<V extends string>({
  label,
  tabs,
  value,
  onChange,
  printAll = false,
  className,
}: TabsProps<V>) {
  const id = useId()
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const tabId = (v: V) => `${id}-tab-${v}`
  const panelId = (v: V) => `${id}-panel-${v}`

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const keyMap: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    }
    if (!(event.key in keyMap)) return
    event.preventDefault()
    const next = (keyMap[event.key] + tabs.length) % tabs.length
    onChange(tabs[next].value)
    refs.current[next]?.focus()
  }

  return (
    <>
      <div
        role="tablist"
        aria-label={label}
        className={cn(
          // Content-sized tabs sharing the row, so a tab with a badge gets room instead of truncating.
          'flex gap-1 rounded-md border border-border bg-surface p-1 sm:inline-flex sm:self-start',
          printAll && 'print:hidden',
          className,
        )}
      >
        {tabs.map((tab, index) => {
          const selected = tab.value === value
          return (
            <button
              key={tab.value}
              ref={(el) => {
                refs.current[index] = el
              }}
              type="button"
              role="tab"
              id={tabId(tab.value)}
              aria-selected={selected}
              aria-controls={panelId(tab.value)}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.value)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn(
                'inline-flex h-11 min-w-0 flex-auto cursor-pointer items-center justify-center gap-1.5 rounded-sm px-2 text-sm transition-colors duration-150 motion-reduce:transition-none sm:h-10 sm:min-w-36 sm:px-4',
                selected
                  ? // Same raised chip as SegmentedControl, one size up; ring + weight carry the state.
                    'bg-background font-semibold text-brand-green-dark shadow-card ring-1 ring-brand-green hover:bg-surface'
                  : 'font-medium text-text-secondary hover:bg-background hover:text-text-primary',
              )}
            >
              {tab.icon && <Icon name={tab.icon} size={16} className="hidden shrink-0 sm:block" />}
              <span className="truncate">{tab.label}</span>
              {tab.badge}
            </button>
          )
        })}
      </div>
      {/* Containing block for the hidden panels, which stay laid out at this width (index.css). */}
      <div className="relative print:space-y-6">
        {tabs.map((tab) => (
          <div
            key={tab.value}
            role="tabpanel"
            id={panelId(tab.value)}
            aria-labelledby={tabId(tab.value)}
            hidden={tab.value !== value}
            data-print-all={printAll || undefined}
            className="flex flex-col gap-6 print:block print:space-y-6"
          >
            {tab.panel}
          </div>
        ))}
      </div>
    </>
  )
}
