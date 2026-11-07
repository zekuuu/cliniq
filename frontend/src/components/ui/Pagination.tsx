import { useState } from 'react'
import { PAGE_SIZE_OPTIONS, type PageSize } from '../../hooks/usePageSize'
import { Icon, type IconName } from '../icons/Icon'
import { Button } from './Button'
import { Select } from './Select'

export interface PaginationProps {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  itemLabel: string
  /** Shows the "Rows per page" choice; the caller returns to page 1 when it changes. */
  onPageSizeChange?: (size: PageSize) => void
}

/** A compact, semantic pager for growing operational lists. */
export function Pagination({ page, pageCount, total, pageSize, onPageChange, itemLabel, onPageSizeChange }: PaginationProps) {
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return (
    <nav aria-label={`${itemLabel} pagination`} className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 print:hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-sm text-text-secondary">Showing {from}–{to} of {total.toLocaleString('en-PH')} {itemLabel}</p>
        {onPageSizeChange && (
          <Select
            inline
            size="sm"
            label="Rows per page"
            value={String(pageSize)}
            options={PAGE_SIZE_OPTIONS.map((size) => ({ value: String(size), label: String(size) }))}
            onChange={(value) => onPageSizeChange(Number(value) as PageSize)}
          />
        )}
      </div>
      <div className="flex items-center gap-2">
        {/* Arrows without tails, and double arrows to the first and last page (Zean, November 5, 2026). */}
        <PageArrow icon="chevronsLeft" label="First page" disabled={page === 1} onClick={() => onPageChange(1)} />
        <PageArrow icon="chevronLeft" label="Previous page" disabled={page === 1} onClick={() => onPageChange(page - 1)} />
        {/* The page field shows on every list, one page or many, so the pager looks the same everywhere (Zean, November 5, 2026). */}
        <PageField page={page} pageCount={pageCount} onPageChange={onPageChange} />
        <PageArrow icon="chevronRight" label="Next page" disabled={page === pageCount} onClick={() => onPageChange(page + 1)} />
        <PageArrow icon="chevronsRight" label="Last page" disabled={page === pageCount} onClick={() => onPageChange(pageCount)} />
      </div>
    </nav>
  )
}

/** A square, icon-only pager button; its name is the label, also shown as a tooltip. */
function PageArrow({ icon, label, disabled, onClick }: { icon: IconName; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <Button variant="secondary" size="sm" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="w-8 px-0!">
      <Icon name={icon} size={16} />
    </Button>
  )
}

/**
 * "Page [ 3 ] of 12" (Zean, November 4, 2026): Enter or leaving the field jumps; Escape, an empty
 * field or a non-number restores the current page; a number out of range goes to the nearest end.
 */
function PageField({ page, pageCount, onPageChange }: Pick<PaginationProps, 'page' | 'pageCount' | 'onPageChange'>) {
  const [draft, setDraft] = useState(String(page))
  // Previous, Next and a filter resetting to page 1 change `page` from outside: the field follows.
  const [shown, setShown] = useState(page)
  if (shown !== page) {
    setShown(page)
    setDraft(String(page))
  }
  function apply() {
    const typed = draft.trim()
    const number = Number(typed)
    if (!typed || !Number.isInteger(number)) return setDraft(String(page))
    const target = Math.min(pageCount, Math.max(1, number))
    setDraft(String(target))
    if (target !== page) onPageChange(target)
  }
  return (
    <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-text-primary" aria-current="page">
      <span aria-hidden="true">Page</span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label="Page number"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={apply}
        onKeyDown={(event) => {
          if (event.key === 'Enter') apply()
          if (event.key === 'Escape') setDraft(String(page))
        }}
        // Sized for the page count's digits, so the field never changes width while typing.
        style={{ width: `calc(${String(pageCount).length}ch + 1.5rem)` }}
        className="h-11 rounded-md border border-border bg-background px-2 text-center text-sm font-semibold tabular-nums text-text-primary transition-colors duration-150 hover:border-brand-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none sm:h-8"
      />
      <span>of {pageCount}</span>
      <span className="sr-only" role="status" aria-live="polite">Page {page} of {pageCount}</span>
    </span>
  )
}
