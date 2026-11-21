import { useEffect, useState } from 'react'
import { SEARCH_DEBOUNCE_MS } from './usePagedList'

/** `value`, once it has stopped changing for `delay` ms: a search runs only after typing pauses. */
export function useDebouncedValue<T>(value: T, delay = SEARCH_DEBOUNCE_MS): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return settled
}
