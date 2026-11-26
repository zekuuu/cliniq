import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as data from '../lib/data'
import { resetMockDb, type SessionUser } from '../lib/mock-db'
import { AppRoutes } from '../routes/AppRoutes'
import { paths } from '../routes/paths'

vi.mock('../lib/data', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/data')>()
  return {
    ...real,
    getOwnAccount: vi.fn(real.getOwnAccount),
    getIdleSignoutMinutes: vi.fn(real.getIdleSignoutMinutes),
    getSchoolYearReminder: vi.fn(real.getSchoolYearReminder),
    getAuthenticatorStatus: vi.fn(real.getAuthenticatorStatus),
  }
})

const STAFF: SessionUser = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }
// The shell's own reads: the account, the idle limit (ADR-078) and the reminders.
const SHELL_READS = [
  data.getOwnAccount,
  data.getIdleSignoutMinutes,
  data.getSchoolYearReminder,
  data.getAuthenticatorStatus,
] as unknown as ReturnType<typeof vi.fn>[]

beforeEach(() => {
  resetMockDb()
  SHELL_READS.forEach((read) => read.mockClear())
})

describe('App shell reads (rate limit, logged November 15, 2026)', () => {
  it('reads the account, idle limit and reminders once, not again on each route', async () => {
    const router = createMemoryRouter(
      [{ path: '*', element: <AppRoutes user={STAFF} onLogout={() => {}} /> }],
      { initialEntries: [paths.dashboard] },
    )
    render(<RouterProvider router={router} />)
    await screen.findAllByRole('navigation')
    const before = SHELL_READS.map((read) => read.mock.calls.length)
    expect(before.every((calls) => calls >= 1)).toBe(true)
    const titles = new Set<string>()
    for (const path of [paths.students, paths.visits, paths.inventory, paths.dashboard]) {
      await act(() => router.navigate(path))
      titles.add(document.title)
    }
    // Four real screens were shown, so the shell had four chances to read again.
    expect(titles.size).toBe(4)
    expect(SHELL_READS.map((read) => read.mock.calls.length)).toEqual(before)
  })
})
