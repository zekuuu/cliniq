import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { recordPrint, type SessionUser } from '../lib/mock-db'

let activePrintAudit = false
let printListeners = 0

/**
 * The moment the browser started printing (ISO timestamp), or `null` when not printing. Set on
 * `beforeprint` with `flushSync`, so a print-only tree mounts before the browser lays out the page
 * for paper; cleared on `afterprint`. Covers the Print buttons and the browser's own Print (Ctrl+P).
 * When a document title is supplied, the first `beforeprint` event records one audit entry for the
 * signed-in viewer. Print-only trees therefore cost nothing on screen and never render twice in tests.
 */
export function usePrinting(documentTitle?: string, viewer?: SessionUser, auditPrint = true): string | null {
  const [printedAt, setPrintedAt] = useState<string | null>(null)
  useEffect(() => {
    printListeners += 1
    const before = () => {
      flushSync(() => setPrintedAt(new Date().toISOString()))
      if (!activePrintAudit && auditPrint && documentTitle) {
        activePrintAudit = true
        void recordPrint(documentTitle, viewer)
      }
    }
    const after = () => {
      activePrintAudit = false
      setPrintedAt(null)
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
      printListeners -= 1
      if (!printListeners) activePrintAudit = false
    }
  }, [auditPrint, documentTitle, viewer])
  return printedAt
}
