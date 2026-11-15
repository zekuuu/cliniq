import { useState } from 'react'
import { flushSync } from 'react-dom'
import { apiMode, type ApiModule } from '../lib/api/mode'

/**
 * The Print button of a printout that carries the full LRN (ADR-044). In mock mode the screen's data
 * already holds it, so this prints at once. On the API the screen holds masked LRNs; the button first
 * loads the full-LRN copy (that request is the print's audit entry), renders it, then prints, and
 * drops it after printing. Ctrl+P alone prints the masked copy (Zean, Sunday, November 15, 2026,
 * ADR-080). If the load fails, the masked copy prints rather than nothing.
 */
export function useFullLrnPrint<T>(module: ApiModule, load: () => Promise<T>) {
  const [full, setFull] = useState<T | null>(null)
  async function print() {
    if (apiMode(module) !== 'api') return window.print()
    try {
      const data = await load()
      flushSync(() => setFull(data))
      window.addEventListener('afterprint', () => setFull(null), { once: true })
    } catch {
      // The masked copy still prints; the screen keeps working.
    }
    window.print()
  }
  return { full, print }
}
