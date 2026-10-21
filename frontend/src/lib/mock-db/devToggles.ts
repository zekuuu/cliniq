/**
 * MOCK ONLY: dev switches for previewing loading, empty, and error states. They exist because the
 * universal skeleton/empty/error requirements (Design-System.md) can't be audited without them.
 * Read from the URL, like the rest of the app's preview switches (ADR-012: query = screen state):
 *
 *   ?mock=slow            every call waits 2.5 s (skeletons stay visible)
 *   ?mock=error           every call rejects (error states)
 *   ?mock=empty           every read returns empty collections (empty states)
 *   ?mockEmpty=visits,incidents   empty only those collections, e.g. a profile with no history
 *   ?mockLatency=1200     explicit latency in ms
 *   ?mockPersist=on|off   keep writes in localStorage across reloads (off clears the saved copy)
 *   ?mockReset=1          discard every write and reload from mock-db.json
 */

export type MockMode = 'normal' | 'error' | 'empty' | 'slow'

export type MockCollection =
  | 'users'
  | 'students'
  | 'visits'
  | 'incidents'
  | 'followUps'
  | 'inventoryItems'
  | 'reports'
  | 'backupLogs'
  | 'auditLog'
  | 'issueReports'
  | 'calendarEvents'
  | 'sportsReports'
  | 'holidays'

const DEFAULT_LATENCY_MS = 450
const SLOW_LATENCY_MS = 2500

function param(name: string): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(name)
}

export function mockMode(): MockMode {
  const mode = param('mock')
  return mode === 'error' || mode === 'empty' || mode === 'slow' ? mode : 'normal'
}

/** Collections a read should treat as empty right now. `null` means "all of them". */
export function emptiedCollections(): Set<MockCollection> | null {
  if (mockMode() === 'empty') return null
  const list = param('mockEmpty')
  return new Set((list ? list.split(',') : []).map((c) => c.trim()) as MockCollection[])
}

export function isEmptied(collection: MockCollection): boolean {
  const emptied = emptiedCollections()
  return emptied === null || emptied.has(collection)
}

export function latencyMs(): number {
  if (import.meta.env.MODE === 'test') return 0
  const explicit = Number(param('mockLatency'))
  if (Number.isFinite(explicit) && explicit >= 0 && param('mockLatency') !== null) return explicit
  return mockMode() === 'slow' ? SLOW_LATENCY_MS : DEFAULT_LATENCY_MS
}

/** Waits like a LAN request would, then rejects in `?mock=error` mode. Instant under Vitest. */
export async function simulateRequest(label: string): Promise<void> {
  const ms = latencyMs()
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms))
  if (mockMode() === 'error') throw new Error(`Mock failure: ${label}`)
}

export function persistParam(): 'on' | 'off' | null {
  const value = param('mockPersist')
  return value === 'on' || value === 'off' ? value : null
}

export function resetParam(): boolean {
  return param('mockReset') === '1'
}

/** Reads one query-string value, for in-screen state and preview switches (ADR-012). */
export function queryParam(name: string): string | null {
  return param(name)
}
