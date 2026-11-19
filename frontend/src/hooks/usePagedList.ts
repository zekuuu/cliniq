import { useCallback, useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { queryClient } from '../lib/queryClient'
import type { Page, PageRequest } from '../lib/paging'
import type { TableSortState } from '../lib/tableSort'
import { usePageSize, type PageSize } from './usePageSize'
import type { AsyncStatus } from './useAsyncData'

/** The search box waits this long after the last key before asking the server (ADR-082). */
export const SEARCH_DEBOUNCE_MS = 250

export interface PagedListOptions<P extends Page<unknown>, Filters, SortKey extends string> {
  /** Names the list in the cache, e.g. `visit-log`. */
  key: string
  /** The screen's own filters; a change goes back to page 1. Must be JSON-serialisable. */
  filters: Filters
  sortKeys: readonly SortKey[]
  defaultSort: TableSortState<SortKey>
  load: (request: PageRequest<Filters, SortKey>, signal: AbortSignal) => Promise<P>
  /** Shortest search sent; shorter text (except none) waits. Default 2. */
  minSearch?: number
  /** False while the screen can't ask yet (a role without access). */
  enabled?: boolean
}

export interface PagedList<P extends Page<unknown>, SortKey extends string> {
  /** The shown page; a list may carry more than its rows (the Audit Log's users). */
  page: P | undefined
  status: AsyncStatus
  /** A new page, search or sort is loading while the last page stays on screen. */
  isRefetching: boolean
  reload: () => void
  pageNumber: number
  setPage: (page: number) => void
  pageSize: PageSize
  setPageSize: (size: PageSize) => void
  /** What the search box shows; the server gets it after the debounce. */
  searchInput: string
  setSearch: (value: string) => void
  /** The search the shown page was asked with. */
  search: string
  sort: TableSortState<SortKey>
  setSort: (sort: TableSortState<SortKey>) => void
}

function readSort<Key extends string>(
  raw: string | null,
  keys: readonly Key[],
  fallback: TableSortState<Key>,
): TableSortState<Key> {
  if (!raw) return fallback
  const key = raw.replace(/^-/, '') as Key
  if (!keys.includes(key)) return fallback
  return { key, direction: raw.startsWith('-') ? 'descending' : 'ascending' }
}

/**
 * One server-paged list (ADR-082, `cliniq-pagination-patterns`).
 *
 * - The page, the search and the sort live in the address (`?page=`, `?q=`, `?sort=`; `URL-Parameters.md`),
 *   so a reload or Back opens the same page. The page size starts at 10 and stays out of the address
 *   (Zean, November 17, 2026).
 * - Only the shown page is fetched; the next one is fetched when the browser is idle.
 * - The last page stays on screen while the next loads (`isRefetching`), never an empty table.
 * - A new search waits {@link SEARCH_DEBOUNCE_MS} ms and needs `minSearch` characters; a request no
 *   longer wanted is cancelled.
 * - A change of filter, search, sort or page size goes back to page 1; a page left empty by a
 *   delete moves to the new last page.
 */
export function usePagedList<P extends Page<unknown>, Filters, SortKey extends string>(
  options: PagedListOptions<P, Filters, SortKey>,
): PagedList<P, SortKey> {
  const { key, filters, sortKeys, defaultSort, load, minSearch = 2, enabled = true } = options
  const [params, setParams] = useSearchParams()
  const [pageSize, setPageSizeState] = usePageSize()
  const urlPage = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)
  const search = params.get('q') ?? ''
  const sort = readSort(params.get('sort'), sortKeys, defaultSort)
  const [searchInput, setSearchInput] = useState(search)

  const writeParams = useCallback(
    (changes: Record<string, string | null>) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const [name, value] of Object.entries(changes)) {
            if (value === null) next.delete(name)
            else next.set(name, value)
          }
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  // A new filter, search, sort or page size starts again at page 1: the address's page counts only
  // while the list is as it was when that page was chosen (or opened, for a reload or Back). The
  // address is cleaned after the render, so another hook writing it in the same event is kept.
  const resetKey = JSON.stringify([filters, search, sort, pageSize])
  const [pageKey, setPageKey] = useState(resetKey)
  const pageNumber = pageKey === resetKey ? urlPage : 1
  useEffect(() => {
    if (pageKey !== resetKey && urlPage !== 1) writeParams({ page: null })
  }, [pageKey, resetKey, urlPage, writeParams])

  // The search box: the server is asked only once typing pauses.
  useEffect(() => {
    const value = searchInput.trim()
    if (value === search || (value !== '' && value.length < minSearch)) return
    const timer = window.setTimeout(() => writeParams({ q: value || null }), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [searchInput, search, minSearch, writeParams])

  const requestFor = useCallback(
    (page: number): PageRequest<Filters, SortKey> => ({
      filters,
      page,
      perPage: pageSize,
      search,
      sort,
    }),
    // `filters` and `sort` are compared by value through resetKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resetKey],
  )
  const queryKeyFor = (page: number) => [key, resetKey, page] as const

  const query = useQuery(
    {
      queryKey: queryKeyFor(pageNumber),
      queryFn: ({ signal }) => load(requestFor(pageNumber), signal),
      placeholderData: keepPreviousData,
      enabled,
    },
    queryClient,
  )
  const data = query.data

  // The next page, fetched while the person reads this one.
  useEffect(() => {
    if (!data || query.isPlaceholderData || data.page >= data.lastPage) return
    const next = data.page + 1
    const fetchNext = () =>
      void queryClient.prefetchQuery({
        queryKey: [key, resetKey, next],
        queryFn: ({ signal }) => load(requestFor(next), signal),
      })
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(fetchNext, { timeout: 2000 })
      return () => window.cancelIdleCallback(handle)
    }
    const timer = setTimeout(fetchNext, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, query.isPlaceholderData, key, resetKey])

  // A page emptied by a delete (or an old link) moves to the new last page.
  useEffect(() => {
    if (
      data &&
      !query.isPlaceholderData &&
      data.rows.length === 0 &&
      data.total > 0 &&
      data.page > 1
    )
      writeParams({ page: data.lastPage > 1 ? String(data.lastPage) : null })
  }, [data, query.isPlaceholderData, writeParams])

  const setPage = useCallback(
    (page: number) => {
      setPageKey(resetKey)
      writeParams({ page: page > 1 ? String(page) : null })
    },
    [writeParams, resetKey],
  )
  const setSort = useCallback(
    (next: TableSortState<SortKey>) =>
      writeParams({
        sort:
          next.key === defaultSort.key && next.direction === defaultSort.direction
            ? null
            : `${next.direction === 'descending' ? '-' : ''}${next.key}`,
      }),
    [writeParams, defaultSort.key, defaultSort.direction],
  )

  let status: AsyncStatus = 'loading'
  if (query.isError && !data) status = 'error'
  else if (data) status = 'success'

  return {
    page: data,
    status,
    isRefetching: Boolean(data) && (query.isPlaceholderData || query.isFetching),
    reload: () => void query.refetch(),
    pageNumber: data && !query.isPlaceholderData ? data.page : pageNumber,
    setPage,
    pageSize,
    setPageSize: setPageSizeState,
    searchInput,
    setSearch: setSearchInput,
    search,
    sort,
    setSort,
  }
}
