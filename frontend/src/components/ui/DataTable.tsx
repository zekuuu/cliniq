import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon } from '../icons/Icon'

export type DataTableSortDirection = 'ascending' | 'descending'

export interface DataTableColumn<Row> {
  key: string
  header: ReactNode
  cell: (row: Row) => ReactNode
  /** Fixed column width used when the table opts into `fixedLayout`. */
  width?: string
  align?: 'left' | 'right'
  /** Marks the column that names each row (rendered as a row header, `<th scope="row">`). */
  rowHeader?: boolean
  /** Optional accessible sort control for a column header. */
  sort?: {
    label: string
    direction?: DataTableSortDirection
    onSort: () => void
  }
}

export interface DataTableProps<Row> {
  caption: string
  /** Visually hide the caption when a card heading already says the same thing. */
  hideCaption?: boolean
  columns: ReadonlyArray<DataTableColumn<Row>>
  rows: ReadonlyArray<Row>
  rowKey: (row: Row) => string
  /** Prevent filtered row content from redistributing column positions. */
  fixedLayout?: boolean
  /**
   * Explicit minimum table width, for a fixed-layout table that must grow past its scroller (pass
   * the sum of its column widths). Use this instead of `min-width: max-content`, whose result on a
   * `table-layout: fixed` table isn't defined consistently across browsers.
   */
  minTableWidth?: string
  /** Keep the leftmost column opaque and visible while the table scrolls horizontally. */
  stickyFirstColumn?: boolean
  /** Keep the rightmost column opaque and visible while the table scrolls horizontally. */
  stickyLastColumn?: boolean
  className?: string
}

/**
 * Plain semantic table. It's the accessible, low-spec fallback every chart must offer (Screen
 * Inventory #31: "Charts should have a simple table fallback"). Scrolls horizontally inside its
 * own container, so the page itself never scrolls sideways.
 */
export function DataTable<Row>({
  caption,
  hideCaption = true,
  columns,
  rows,
  rowKey,
  fixedLayout = false,
  minTableWidth,
  stickyFirstColumn = false,
  stickyLastColumn = false,
  className,
}: DataTableProps<Row>) {
  return (
    <div
      tabIndex={0}
      onFocus={
        stickyFirstColumn || stickyLastColumn
          ? (event) => {
              // Keyboard focus is scrolled into view (main.tsx) clear of the pinned columns, which
              // would otherwise cover a focused cell and its ring.
              const scroller = event.currentTarget
              const head = scroller.querySelectorAll<HTMLElement>('thead th')
              const ring = 6
              if (stickyFirstColumn) scroller.style.scrollPaddingLeft = `${(head[0]?.offsetWidth ?? 0) + ring}px`
              if (stickyLastColumn) scroller.style.scrollPaddingRight = `${(head[head.length - 1]?.offsetWidth ?? 0) + ring}px`
            }
          : undefined
      }
      className={cn(
        // -mx-1 px-1: 4px inside the scroller for the focus ring of a cell flush with its edge;
        // scroll-px-1.5 keeps that room (plus sub-pixel slack) when focus scrolls a cell into view.
        // Pinned columns skip it: they stick inside that padding, leaving a gap scrolled cells show through.
        'relative scroll-px-1.5 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green',
        !(stickyFirstColumn || stickyLastColumn) && '-mx-1 px-1',
        className,
      )}
    >
      <table
        className={cn('w-full border-collapse text-sm', fixedLayout && 'table-fixed')}
        style={minTableWidth ? { minWidth: minTableWidth } : undefined}
      >
        {fixedLayout && (
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={col.width ? { width: col.width } : undefined} />
            ))}
          </colgroup>
        )}
        <caption
          className={cn('pb-2 text-left text-xs text-text-secondary', hideCaption && 'sr-only')}
        >
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-border">
            {columns.map((col, columnIndex) => (
              <th
                key={col.key}
                scope="col"
                aria-sort={col.sort?.direction}
                className={cn(
                  'px-2 py-1.5 text-xs font-semibold whitespace-nowrap text-text-secondary',
                  col.align === 'right' ? 'text-right' : 'text-left',
                  stickyFirstColumn &&
                    columnIndex === 0 &&
                    'sticky left-0 z-20 border-r border-border bg-background',
                  stickyLastColumn &&
                    columnIndex === columns.length - 1 &&
                    'sticky right-0 z-20 border-l border-border bg-background',
                )}
              >
                {col.sort ? (
                  <button
                    type="button"
                    onClick={col.sort.onSort}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-sm transition-colors duration-150 hover:text-brand-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none"
                    aria-label={`Sort by ${col.sort.label}${col.sort.direction ? `, currently ${col.sort.direction}` : ''}`}
                  >
                    {col.header}
                    {col.sort.direction ? (
                      <Icon
                        name={col.sort.direction === 'ascending' ? 'arrowUp' : 'arrowDown'}
                        size={13}
                      />
                    ) : (
                      <span aria-hidden="true" className="flex flex-col -space-y-1">
                        <Icon name="arrowUp" size={10} />
                        <Icon name="arrowDown" size={10} />
                      </span>
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-border last:border-b-0">
              {columns.map((col, columnIndex) => {
                const Cell = col.rowHeader ? 'th' : 'td'
                return (
                  <Cell
                    key={col.key}
                    scope={col.rowHeader ? 'row' : undefined}
                    className={cn(
                      'px-2 py-1.5 text-text-primary tabular-nums',
                      col.rowHeader ? 'font-semibold' : 'font-normal',
                      col.align === 'right' ? 'text-right' : 'text-left',
                      stickyFirstColumn &&
                        columnIndex === 0 &&
                        'sticky left-0 z-10 border-r border-border bg-background',
                      stickyLastColumn &&
                        columnIndex === columns.length - 1 &&
                        'sticky right-0 z-10 border-l border-border bg-background',
                    )}
                  >
                    {col.cell(row)}
                  </Cell>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
