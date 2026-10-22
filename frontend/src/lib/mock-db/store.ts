import { todayISO } from '../dates'
import type { AuditLogEntry, ISODate } from '../../types/entities'
import { persistParam, resetParam } from './devToggles'
import { checkSeedIntegrity } from './integrity'
import { resolveSeed, seed } from './seed'
import type { DbState } from './types'

/**
 * The in-memory store: `mock-db.json` resolved against one "today", plus every write made since.
 * The JSON file itself is never written at runtime; hand-editing it is how seed data changes.
 *
 * - "Today" is injectable (`setMockToday`) so tests and demos can pin a date. Default: the real
 *   local date.
 * - Persistence is opt-in (`?mockPersist=on`, or `setMockPersistence(true)`): writes then survive
 *   reloads via localStorage. Default is off, so a reload is a clean slate.
 * - `resetMockDb()` is the one-call reset to seed. In dev it's also on `window.cliniqMockDb`.
 */

const STATE_KEY = 'cliniq.mockDb.state.v2'
const PERSIST_KEY = 'cliniq.mockDb.persist'

let todayOverride: ISODate | null = null
let state: DbState | null = null
let seedAuditLength = 0
let bootChecked = false

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function persistenceEnabled(): boolean {
  try {
    return storage()?.getItem(PERSIST_KEY) === 'on'
  } catch {
    return false
  }
}

function applyUrlToggles() {
  if (bootChecked) return
  bootChecked = true
  const persist = persistParam()
  if (persist) setMockPersistence(persist === 'on')
  if (resetParam()) clearSaved()
}

function clearSaved() {
  try {
    storage()?.removeItem(STATE_KEY)
  } catch {
    // Storage may be blocked (private mode, previews); nothing to clear.
  }
}

export interface Saved {
  state: DbState
  seedAuditLength: number
}

function loadSaved(): Saved | null {
  if (!persistenceEnabled()) return null
  try {
    const raw = storage()?.getItem(STATE_KEY)
    return raw ? (JSON.parse(raw) as Saved) : null
  } catch {
    return null
  }
}

/** Migrates persisted mock state without losing legacy inventory or newly-required Sex data. Exported for its test. */
export function migratePersistedState(saved: Saved): Saved {
  for (const item of saved.state.inventoryItems as unknown as Array<Record<string, unknown>>) {
    if (Array.isArray(item.batches)) continue
    const currentStock = typeof item.currentStock === 'number' ? item.currentStock : 0
    const expirationDate = typeof item.expirationDate === 'string' ? item.expirationDate : null
    item.batches = [{ id: `${String(item.id)}-batch-0001`, quantity: currentStock, expirationDate, receivedDate: saved.state.today }]
    delete item.currentStock
    delete item.expirationDate
  }
  for (const [index, student] of (saved.state.students as unknown as Array<Record<string, unknown>>).entries()) {
    if (student.sex === 'male' || student.sex === 'female') continue
    student.sex = index % 2 === 0 ? 'female' : 'male'
  }
  // Panel review IN-6 (D6): the outcome list was reworded. These old values exist only here, so a
  // browser that saved them before the change reads the new ones.
  const renamedOutcomes: Record<string, string> = {
    not_reached: 'no_answer',
    voicemail: 'left_message_or_voicemail',
    left_message: 'left_message_or_voicemail',
  }
  for (const incident of saved.state.incidents)
    for (const attempt of incident.parentNotifications as Array<{ outcome: string }>)
      attempt.outcome = renamedOutcomes[attempt.outcome] ?? attempt.outcome
  return saved
}

export function getMockToday(): ISODate {
  return todayOverride ?? todayISO()
}

/** Pins "today" (tests, demos). Passing `null` returns to the real date. Re-seeds the store. */
export function setMockToday(date: ISODate | null) {
  todayOverride = date
  state = null
}

/** Discards every write and re-seeds from `mock-db.json` (and clears any persisted copy). */
export function resetMockDb() {
  state = null
  clearSaved()
}

export function setMockPersistence(enabled: boolean) {
  try {
    if (enabled) storage()?.setItem(PERSIST_KEY, 'on')
    else {
      storage()?.removeItem(PERSIST_KEY)
      clearSaved()
    }
  } catch {
    // Storage blocked: persistence simply stays off.
  }
}

function build(): DbState {
  const problems = checkSeedIntegrity(seed)
  if (problems.length) {
    // Fail loudly on a bad hand-edit instead of rendering subtly wrong screens.
    throw new Error(`mock-db.json failed its integrity check:\n- ${problems.join('\n- ')}`)
  }
  const fresh = resolveSeed(seed, getMockToday())
  seedAuditLength = fresh.auditLog.length
  return fresh
}

/** The live store. Internal to the data layer: pages and feature `api/` modules never call this. */
export function db(): DbState {
  applyUrlToggles()
  if (!state) {
    const saved = todayOverride ? null : loadSaved()
    if (saved) {
      const migrated = migratePersistedState(saved)
      state = migrated.state
      // A copy saved before calendar events existed has no collection for them.
      state.frontendOnly.calendarEvents ??= []
      state.frontendOnly.sportsReports ??= []
      seedAuditLength = migrated.seedAuditLength
    } else {
      state = build()
    }
  }
  return state
}

/** Puts back a snapshot taken before a write that failed, so a rejected write leaves no trace. */
export function restoreDb(snapshot: DbState) {
  state = snapshot
}

/** Called after every write. Persists only when persistence is on. */
export function commit() {
  if (!state || !persistenceEnabled()) return
  try {
    storage()?.setItem(STATE_KEY, JSON.stringify({ state, seedAuditLength }))
  } catch {
    // Quota or blocked storage: the in-memory store still holds the write.
  }
}

/** Audit entries written since the last reset (the seed's own history excluded). For tests/dev. */
export function getRecordedAuditEntries(): AuditLogEntry[] {
  return db().auditLog.slice(seedAuditLength)
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).cliniqMockDb = {
    reset: resetMockDb,
    setToday: setMockToday,
    setPersistence: setMockPersistence,
    snapshot: () => structuredClone(db()),
    // Replaces the in-memory store, e.g. with `scripts/generate-load-data.mjs` output for a load check.
    load: (next: DbState) => restoreDb(next),
  }
}
