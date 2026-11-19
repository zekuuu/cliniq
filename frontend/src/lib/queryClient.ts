import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api/client'

/**
 * The one TanStack Query client (ADR-082, superseding ADR-013 for the paged lists). It is passed to
 * each `useQuery` directly, so no provider is needed and the tests render screens as before.
 *
 * - A list shown again refetches (`refetchOnMount: 'always'`) but shows its last page at once.
 * - No refetch when the window regains focus: one clinic PC, one nurse (ADR-079).
 * - A refused request is retried only for 429 (too many requests) or a dropped connection, twice,
 *   after 1 s then 2 s; every other error shows at once, as before.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnMount: 'always',
      refetchOnWindowFocus: false,
      retry: (failureCount, error) =>
        failureCount < 2 &&
        error instanceof ApiError &&
        (error.status === 429 || error.status === 0),
      retryDelay: (attempt) => 1000 * 2 ** attempt,
    },
  },
})
