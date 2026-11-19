import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { pageInMemory, type Page, type PageRequest } from '../lib/paging'
import { SEARCH_DEBOUNCE_MS, usePagedList } from './usePagedList'

/** Server-side paging (ADR-082): one page at a time, its state in the address. */

const ROWS = Array.from({ length: 35 }, (_, index) => ({ id: index + 1, name: `Row ${index + 1}` }))
type Row = (typeof ROWS)[number]
type Filters = { kind: string }

function fakeServer() {
  const load = vi.fn(async (request: PageRequest<Filters, 'name'>): Promise<Page<Row>> =>
    pageInMemory(
      ROWS.filter((row) => !request.search || row.name.includes(request.search)),
      request,
      (row) => row.id,
    ),
  )
  return load
}

/** The address's query string, shown so a test can read it. */
function Location() {
  return <output data-testid="location">{useLocation().search}</output>
}
const location = () => screen.getByTestId('location').textContent

function wrapper(route: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>
      {children}
      <Location />
    </MemoryRouter>
  )
}

function useList(load: ReturnType<typeof fakeServer>, kind = 'all') {
  return usePagedList({
    key: `test-list|${kind}`,
    filters: { kind },
    sortKeys: ['name'] as const,
    defaultSort: { key: 'name', direction: 'ascending' },
    load,
  })
}

describe('pageInMemory', () => {
  it('sorts with the screen rule, cuts one page and counts the whole list', () => {
    const page = pageInMemory(
      ROWS,
      { page: 4, perPage: 10, sort: { key: 'id', direction: 'descending' } },
      (row, key) => row[key as 'id'],
    )
    expect(page).toMatchObject({ page: 4, perPage: 10, total: 35, lastPage: 4 })
    expect(page.rows.map((row) => row.id)).toEqual([5, 4, 3, 2, 1])
  })

  it('answers a page past the end with no rows and the same meta, not an error', () => {
    expect(
      pageInMemory(
        ROWS,
        { page: 9, perPage: 10, sort: { key: 'id', direction: 'ascending' } },
        (row) => row.id,
      ),
    ).toMatchObject({ rows: [], total: 35, lastPage: 4 })
  })
})

describe('usePagedList', () => {
  it('asks only for the shown page, opens on the page in the address, and fetches the next one', async () => {
    const load = fakeServer()
    const { result } = renderHook(() => useList(load), { wrapper: wrapper('/?page=2') })
    await waitFor(() => expect(result.current.page?.rows[0].id).toBe(11))
    expect(result.current.page?.rows).toHaveLength(10)
    expect(load.mock.calls[0][0]).toMatchObject({ page: 2, perPage: 10 })
    // The next page is asked for ahead of time, while the person reads this one.
    await waitFor(() => expect(load.mock.calls.some(([request]) => request.page === 3)).toBe(true))
  })

  it('keeps the page in the address and goes back to page 1 when a filter changes', async () => {
    const load = fakeServer()
    let kind = 'all'
    const { result, rerender } = renderHook(() => useList(load, kind), { wrapper: wrapper('/') })
    await waitFor(() => expect(result.current.status).toBe('success'))
    act(() => result.current.setPage(3))
    await waitFor(() => expect(result.current.page?.page).toBe(3))
    expect(location()).toBe('?page=3')
    kind = 'other'
    rerender()
    await waitFor(() => expect(result.current.page?.page).toBe(1))
    await waitFor(() => expect(location()).toBe(''))
  })

  it('waits for typing to pause before searching, and puts the search in the address', async () => {
    const load = fakeServer()
    function Screen() {
      const list = useList(load)
      return (
        <>
          <input
            aria-label="Search"
            value={list.searchInput}
            onChange={(event) => list.setSearch(event.target.value)}
          />
          <p>{list.page?.total ?? '…'} shown</p>
        </>
      )
    }
    render(<Screen />, { wrapper: wrapper('/') })
    await screen.findByText('35 shown')
    const callsBefore = load.mock.calls.length
    await userEvent.type(screen.getByLabelText('Search'), 'Row 3')
    // Five keys, one search: none was sent between the keys.
    // "Row 3" and "Row 30" to "Row 35".
    await screen.findByText('7 shown', {}, { timeout: SEARCH_DEBOUNCE_MS * 8 })
    const searches = load.mock.calls.slice(callsBefore).map(([request]) => request.search)
    // The idle prefetch of the unsearched list's page 2 may still run; no half-typed search was sent.
    expect(new Set(searches.filter(Boolean))).toEqual(new Set(['Row 3']))
    expect(location()).toBe('?q=Row+3')
  })

  it('moves to the new last page when the shown page comes back empty', async () => {
    const load = fakeServer()
    const { result } = renderHook(() => useList(load), { wrapper: wrapper('/?page=9') })
    await waitFor(() => expect(result.current.page?.page).toBe(4))
    expect(location()).toBe('?page=4')
  })
})
