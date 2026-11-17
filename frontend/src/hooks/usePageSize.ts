import { useState } from 'react'

/** Rows-per-page choices for the shared `Pagination` (Sir Rey, October 25, 2026). */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

/**
 * The list's page size: 10 every time the screen opens. A change holds only while the screen stays
 * open; nothing is stored and nothing goes in the URL (Zean, November 17, 2026).
 */
export function usePageSize() {
  return useState<PageSize>(10)
}
