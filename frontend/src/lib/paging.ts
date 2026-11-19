import { sortTableRows, type TableSortState } from './tableSort'

/**
 * One page of a server-paged list (API-Contract.md "Filtering and pagination", ADR-082). The API
 * answers `data` with `meta: { page, perPage, total, lastPage }`; a page past the end has no rows
 * and the same meta.
 */
export interface Page<Row> {
  rows: Row[]
  page: number
  perPage: number
  total: number
  lastPage: number
}

/** What a paged list asks for: its own filters, the page, the search box and the sort. */
export interface PageRequest<Filters, SortKey extends string> {
  filters: Filters
  page: number
  perPage: number
  search: string
  sort: TableSortState<SortKey>
}

export function lastPageOf(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / perPage))
}

/** The API's `sort` value: the key, with `-` in front for descending. */
export function sortParam<Key extends string>(sort: TableSortState<Key>): string {
  return `${sort.direction === 'descending' ? '-' : ''}${sort.key}`
}

/**
 * The mock's page: the whole filtered list, sorted with the screens' own rule (`sortTableRows`),
 * then cut. Mock mode keeps the same shape as the API (ADR-080), and the same order as before.
 */
export function pageInMemory<Row, Key extends string>(
  rows: readonly Row[],
  request: { page: number; perPage: number; sort: TableSortState<Key> },
  valueFor: (row: Row, key: Key) => string | number | null | undefined,
): Page<Row> {
  const sorted = sortTableRows(rows, request.sort, valueFor)
  const start = (request.page - 1) * request.perPage
  return {
    rows: sorted.slice(start, start + request.perPage),
    page: request.page,
    perPage: request.perPage,
    total: sorted.length,
    lastPage: lastPageOf(sorted.length, request.perPage),
  }
}

/** The API's `{ data, meta }` as a `Page`. */
export function toPage<Row>(
  result: {
    data: Row[]
    meta?: { page: number; perPage: number; total: number; lastPage?: number }
  },
  request: { page: number; perPage: number },
): Page<Row> {
  const meta = result.meta ?? {
    page: request.page,
    perPage: request.perPage,
    total: result.data.length,
  }
  return {
    rows: result.data,
    page: meta.page,
    perPage: meta.perPage,
    total: meta.total,
    lastPage: meta.lastPage ?? lastPageOf(meta.total, meta.perPage),
  }
}
