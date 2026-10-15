import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

/**
 * The moment the browser started printing (ISO timestamp), or `null` when not printing. Set on
 * `beforeprint` with `flushSync`, so a print-only tree mounts before the browser lays out the page
 * for paper; cleared on `afterprint`. Covers the Print buttons and the browser's own Print (Ctrl+P).
 * Print-only trees therefore cost nothing on screen and never render twice in tests.
 */
export function usePrinting(): string | null {
  const [printedAt, setPrintedAt] = useState<string | null>(null)
  useEffect(() => {
    const before = () => flushSync(() => setPrintedAt(new Date().toISOString()))
    const after = () => setPrintedAt(null)
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])
  return printedAt
}
