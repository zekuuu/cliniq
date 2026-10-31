import { PAGE_SIZE_OPTIONS, type PageSize } from '../../hooks/usePageSize'
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
        <Button variant="secondary" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 1}>Previous</Button>
        <span className="text-sm font-semibold tabular-nums text-text-primary" aria-current="page">Page {page} of {pageCount}</span>
        <Button variant="secondary" size="sm" onClick={() => onPageChange(page + 1)} disabled={page === pageCount}>Next</Button>
      </div>
    </nav>
  )
}
