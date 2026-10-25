import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

// The mock session remembers a previewed `?role=` per tab, and every write lands in the shared
// in-memory store; don't let either leak between tests. The data layer is imported lazily so a test
// file can still `vi.mock('.../mock-db.json')` before anything loads the real seed.
afterEach(async () => {
  window.sessionStorage.clear()
  // The Admin's once-per-session record views (ADR-038 item 4).
  window.localStorage.removeItem('cliniq.viewedRecords')
  window.history.replaceState({}, '', '/')
  const { resetMockDb, setMockToday } = await import('../lib/mock-db')
  setMockToday(null)
  resetMockDb()
})
