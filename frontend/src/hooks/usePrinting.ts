import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { recordPrint, type PrintAuditRecord, type SessionUser } from '../lib/mock-db'

let activePrintAudit = false
let printListeners = 0

/**
 * The moment the browser started printing (ISO timestamp), or `null` when not printing. Set on
 * `beforeprint` with `flushSync`, so a print-only tree mounts before the browser lays out the page
 * for paper; cleared on `afterprint`. Covers the Print buttons and the browser's own Print (Ctrl+P).
 * When a document title is supplied, the first `beforeprint` event records one audit entry for the
 * signed-in viewer; `record` makes that entry name a record (e.g. a Sports Report and its student
 * count) instead of the title. Print-only trees therefore cost nothing on screen and never render twice in tests.
 */
export function usePrinting(documentTitle?: string, viewer?: SessionUser, record?: PrintAuditRecord): string | null {
  const [printedAt, setPrintedAt] = useState<string | null>(null)
  const recordType = record?.type
  const recordId = record?.id
  const recordSummary = record?.summary
  useEffect(() => {
    printListeners += 1
    const before = () => {
      flushSync(() => setPrintedAt(new Date().toISOString()))
      if (!activePrintAudit && documentTitle) {
        activePrintAudit = true
        void recordPrint(documentTitle, viewer, recordType && recordId ? { type: recordType, id: recordId, summary: recordSummary } : undefined)
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
  }, [documentTitle, viewer, recordType, recordId, recordSummary])
  return printedAt
}
