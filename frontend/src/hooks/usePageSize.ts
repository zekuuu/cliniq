import { useState } from 'react'

/** Rows-per-page choices for the shared `Pagination` (Sir Rey, October 25, 2026). */
export const PAGE_SIZE_OPTIONS = [10, 20] as const
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

const KEY = 'cliniq.pageSize'
const DEFAULT: PageSize = 10

function stored(): PageSize {
  try {
    const value = Number(window.sessionStorage.getItem(KEY))
    return (PAGE_SIZE_OPTIONS as readonly number[]).includes(value) ? (value as PageSize) : DEFAULT
  } catch {
    return DEFAULT
  }
}

/** The chosen page size, kept for this browser session and shared by every paged list. */
export function usePageSize(): [PageSize, (size: PageSize) => void] {
  const [size, setSize] = useState<PageSize>(stored)
  return [
    size,
    (next) => {
      setSize(next)
      try {
        window.sessionStorage.setItem(KEY, String(next))
      } catch {
        // Storage may be blocked; the choice still holds while the screen is open.
      }
    },
  ]
}
