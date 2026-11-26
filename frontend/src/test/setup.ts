import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { preventLabelActivation } from '../lib/labelActivation'

document.addEventListener('click', preventLabelActivation, true)

// The pickers' typing pause (useDebouncedValue) is skipped so tests can pick right after typing;
// useDebouncedValue.test.ts checks the pause itself.
vi.mock('../hooks/useDebouncedValue', () => ({ useDebouncedValue: <T>(value: T) => value }))

// The mock session remembers a previewed `?role=` per tab, and every write lands in the shared
// in-memory store; don't let either leak between tests. The data layer is imported lazily so a test
// file can still `vi.mock('.../mock-db.json')` before anything loads the real seed.
// jsdom has no scrolling; the app scrolls to the top after a save and on a new screen (ADR-083).
window.scrollTo = () => {}
// Sonner captures the pointer on a toast (swipe to dismiss); jsdom has no pointer capture.
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}

// The app's one toast stack (ADR-083), so every test can read a screen's result toast. A test that
// renders the whole App gets a second one, so it reads a toast with `findAllByText`.
beforeEach(async () => {
  const [{ render }, { createElement }, { Toaster }] = await Promise.all([
    import('@testing-library/react'),
    import('react'),
    import('../components/ui/Toaster'),
  ])
  render(createElement(Toaster))
})

afterEach(async () => {
  const { notify } = await import('../lib/notify')
  notify.dismiss()
  window.sessionStorage.clear()
  // The Admin's once-per-session record views (ADR-038 item 4).
  window.localStorage.removeItem('cliniq.viewedRecords')
  window.history.replaceState({}, '', '/')
  const { resetMockDb, setMockToday } = await import('../lib/mock-db')
  setMockToday(null)
  resetMockDb()
  // The paged lists' cache (ADR-082): each test starts with none.
  const { queryClient } = await import('../lib/queryClient')
  queryClient.clear()
})
