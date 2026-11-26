import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from '../icons/Icon'
import { ShortcutHint } from './ShortcutHint'
import { buttonClassName } from './buttonClassName'
import { DROPDOWN_PANEL, dropdownOptionClassName } from './dropdownClassName'

type ActionMenuItemBase = {
  key: string
  label: string
  icon: IconName
  variant?: 'default' | 'destructive'
  disabled?: boolean
  disabledReason?: string
  shortcut?: string
  dividerBefore?: boolean
}

export type ActionMenuItem = ActionMenuItemBase &
  (
    | { href: string; state?: unknown; onSelect?: never }
    | { onSelect: () => void | Promise<void>; href?: never }
  )

export interface ActionMenuProps {
  /** Full accessible name, such as "More actions for LRN ending in 1234". */
  label: string
  items: ReadonlyArray<ActionMenuItem>
  /** A page can keep the trigger busy through its own mutation and toast. */
  busy?: boolean
  className?: string
}

const GAP = 6
const EDGE = 16

/** A menu of record actions, distinct from a listbox that chooses one value. */
export function ActionMenu({ label, items, busy = false, className }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const [openingIndex, setOpeningIndex] = useState(0)
  const [internalBusy, setInternalBusy] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLElement | null>>([])
  const menuId = useId()

  // An empty or wholly unavailable menu should not leave an unexplained kebab on the row.
  const available = items.some((item) => !item.disabled)

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target))
        setOpen(false)
    }
    const focusOutside = (event: FocusEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target))
        setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', focusOutside)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', focusOutside)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const panel = panelRef.current
    if (!trigger || !panel) return
    const place = () => {
      const rect = trigger.getBoundingClientRect()
      const viewportWidth = document.documentElement.clientWidth
      const viewportHeight = document.documentElement.clientHeight
      const below = viewportHeight - rect.bottom - GAP - EDGE
      const above = rect.top - GAP - EDGE
      const openUp = panel.scrollHeight > below && above > below
      panel.style.maxHeight = `${Math.max(96, Math.min(256, openUp ? above : below))}px`
      panel.style.top = openUp ? '' : `${rect.bottom + GAP}px`
      panel.style.bottom = openUp ? `${viewportHeight - rect.top + GAP}px` : ''
      panel.style.left = `${Math.max(EDGE, Math.min(rect.right - panel.offsetWidth, viewportWidth - panel.offsetWidth - EDGE))}px`
    }
    place()
    const index = openingIndex < 0 ? items.length - 1 : openingIndex
    itemRefs.current[index]?.focus()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, openingIndex, items.length])

  if (!available) return null

  function close(returnFocus: boolean) {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  function openAt(index: number) {
    setOpeningIndex(index)
    setOpen(true)
  }

  function choose(item: ActionMenuItem) {
    if (item.disabled || !('onSelect' in item) || !item.onSelect) return
    close(true)
    const result = item.onSelect()
    if (result && typeof result.then === 'function') {
      setInternalBusy(true)
      void result.then(
        () => setInternalBusy(false),
        () => setInternalBusy(false),
      )
    }
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openAt(0)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      openAt(-1)
    }
  }

  function tabAway(backward: boolean) {
    const trigger = triggerRef.current
    if (!trigger) return
    const focusables = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter(
      (element) => element.getClientRects().length > 0 && !panelRef.current?.contains(element),
    )
    const index = focusables.indexOf(trigger)
    close(false)
    focusables[index + (backward ? -1 : 1)]?.focus()
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const nodes = itemRefs.current.filter((node): node is HTMLElement => node !== null)
    const current = nodes.indexOf(document.activeElement as HTMLElement)
    const move = (index: number) => {
      event.preventDefault()
      nodes[(index + nodes.length) % nodes.length]?.focus()
    }
    if (event.key === 'ArrowDown') move(current + 1)
    else if (event.key === 'ArrowUp') move(current - 1)
    else if (event.key === 'Home') move(0)
    else if (event.key === 'End') move(nodes.length - 1)
    else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close(true)
    } else if (event.key === 'Tab') {
      event.preventDefault()
      tabAway(event.shiftKey)
    }
  }

  const itemClass = (item: ActionMenuItem) =>
    cn(
      dropdownOptionClassName(false),
      'min-h-11 items-center gap-2.5 text-left font-medium focus-visible:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-green',
      item.variant === 'destructive' && 'text-error',
      item.disabled && 'cursor-not-allowed opacity-50',
    )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-busy={busy || internalBusy || undefined}
        disabled={busy || internalBusy}
        onClick={() => (open ? close(false) : openAt(0))}
        onKeyDown={onTriggerKeyDown}
        className={buttonClassName({
          variant: 'neutral',
          className: cn(
            'size-11 min-h-11 min-w-11 !border-0 !bg-transparent !p-0 shadow-none hover:!bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark print:hidden',
            className,
          ),
        })}
      >
        <Icon
          name={busy || internalBusy ? 'refresh' : 'moreVertical'}
          size={20}
          className={busy || internalBusy ? 'animate-spin motion-reduce:animate-none' : undefined}
        />
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKeyDown}
            className={cn(DROPDOWN_PANEL, 'fixed z-50 overflow-y-auto scrollbar-thin print:hidden')}
          >
            {items.map((item, index) => {
              const content = (
                <>
                  <Icon name={item.icon} size={16} className="shrink-0" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span>{item.label}</span>
                    {item.disabled && item.disabledReason && (
                      <span className="text-xs font-normal whitespace-normal text-text-secondary">
                        {item.disabledReason}
                      </span>
                    )}
                  </span>
                  {item.shortcut && <ShortcutHint keys={item.shortcut} />}
                </>
              )
              return (
                <div key={item.key} className="contents">
                  {(item.dividerBefore || item.variant === 'destructive') && index > 0 && (
                    <div role="separator" className="my-1 border-t border-border" />
                  )}
                  {'href' in item && item.href && !item.disabled ? (
                    <Link
                      ref={(node) => {
                        itemRefs.current[index] = node
                      }}
                      role="menuitem"
                      tabIndex={-1}
                      to={item.href}
                      state={item.state}
                      onClick={() => close(false)}
                      onAuxClick={() => close(false)}
                      className={itemClass(item)}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      ref={(node) => {
                        itemRefs.current[index] = node
                      }}
                      type="button"
                      role="menuitem"
                      tabIndex={-1}
                      aria-disabled={item.disabled || undefined}
                      aria-keyshortcuts={item.shortcut}
                      onClick={() => choose(item)}
                      className={itemClass(item)}
                    >
                      {content}
                    </button>
                  )}
                </div>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}
