import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Children, isValidElement, useEffect, type ReactElement, type ReactNode } from 'react'
import { matchPath, MemoryRouter, Navigate, useLocation, type InitialEntry } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { SessionUser } from '../lib/mock-db'
import type { UserRole } from '../types/entities'
import { AppRoutes } from './AppRoutes'
import { paths } from './paths'

// jsdom has no canvas. Replace the chart with a stub that keeps its accessible label.
vi.mock('react-chartjs-2', () => {
  const Stub = (props: { 'aria-label'?: string }) => (
    <div role="img" aria-label={props['aria-label']} />
  )
  return { Bar: Stub, Line: Stub }
})

const USERS: Record<UserRole, SessionUser> = {
  staff: { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' },
  admin: { id: 'usr-principal', name: 'Principal', role: 'admin' },
}

/**
 * Screens that deliberately have no Back, keyed by "role path". Every other route in the route table
 * must render one (`cliniq-back-navigation-patterns`), so a new screen can't ship without it.
 */
const NO_BACK: Record<string, string> = {
  'staff /': 'Dashboard: Staff home screen, nothing above it.',
  'admin /': 'Dashboard: Admin home screen, nothing above it.',
  'staff /students': 'Top-level sidebar destination; Back only after a drill-through link.',
  'staff /visits': 'Top-level sidebar destination; Back only after a drill-through link.',
  'staff /incidents': 'Top-level sidebar destination; Back only after a drill-through link.',
  'staff /inventory': 'Top-level sidebar destination; Back only after a drill-through link.',
  'staff /follow-ups': 'Top-level sidebar destination; Back only after a drill-through link.',
  'staff /reports': 'Top-level sidebar destination.',
  'admin /reports': 'Top-level sidebar destination.',
  'staff /audit-log': 'Top-level sidebar destination.',
  'admin /audit-log': 'Top-level sidebar destination.',
  'staff /users': 'Top-level sidebar destination.',
  'staff /backup': 'Top-level sidebar destination.',
}

/** A real record for each route parameter, from the mock seed. */
const SAMPLE: Record<string, string> = {
  studentNumber: '2026-00001',
  visitId: 'visit-0157',
  incidentId: 'incident-0022',
  userId: 'user-staff-01',
}

/** Walks the real route table: the `<Route>`s `AppRoutes` renders for this viewer. */
function routeTable(user: SessionUser): { path: string; allowed: boolean }[] {
  const routes = AppRoutes({ user, onLogout: () => {} }) as ReactElement<{ children: ReactNode }>
  const table: { path: string; allowed: boolean }[] = []
  Children.forEach(routes.props.children, (route) => {
    if (!isValidElement<{ path: string; element: ReactElement }>(route)) return
    const { path, element } = route.props
    if (path === paths.login || path === paths.forcePasswordChange || path === '*') return
    table.push({ path, allowed: element.type !== Navigate })
  })
  return table
}

const CASES = (Object.keys(USERS) as UserRole[]).flatMap((role) =>
  routeTable(USERS[role])
    .filter((route) => route.allowed)
    .map((route) => ({ role, path: route.path })),
)

/** Every path the router showed, including any it redirected away from. */
function PathLog({ log }: { log: string[] }) {
  const { pathname } = useLocation()
  useEffect(() => {
    log.push(pathname)
  }, [log, pathname])
  return null
}

function renderApp(user: SessionUser, entries: InitialEntry[]) {
  const log: string[] = []
  render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <AppRoutes user={user} onLogout={() => {}} />
      <PathLog log={log} />
    </MemoryRouter>,
  )
  return log
}

const BACK = /^Back\b/
async function findBack(): Promise<HTMLElement> {
  let back: HTMLElement | undefined
  await waitFor(
    () => {
      back = [
        ...screen.queryAllByRole('button', { name: BACK }),
        ...screen.queryAllByRole('link', { name: BACK }),
      ][0]
      expect(back).toBeDefined()
    },
    { timeout: 5000 },
  )
  return back!
}

describe('Back on every route (route coverage)', () => {
  it('finds every route in the table for every role', () => {
    expect(CASES.length).toBeGreaterThan(30)
    for (const key of Object.keys(NO_BACK)) {
      expect(CASES.map((c) => `${c.role} ${c.path}`)).toContain(key)
    }
  })

  it.each(CASES)(
    '$role $path: has Back, and opened directly its fallback is a screen this role can open',
    async ({ role, path }) => {
      if (NO_BACK[`${role} ${path}`]) return
      const allowed = routeTable(USERS[role]).filter((route) => route.allowed)
      const url = path.replace(/:(\w+)/g, (_, name: string) => SAMPLE[name])
      const log = renderApp(USERS[role], [url])

      // The loading skeleton has its own Back; wait for the screen itself before using it.
      await screen.findByRole('heading', { level: 1 }, { timeout: 5000 })
      const back = await findBack()
      // The label never names a student or a Student Number.
      expect(back.textContent).toMatch(/^Back( to (Sign In|Dashboard))?$/)
      expect(back).toHaveClass('print:hidden')

      const start = log.length
      await userEvent.setup().click(back)
      // The next screen may still be loading its lazy chunk; wait until the router has moved, then
      // let any guard redirect settle.
      await waitFor(() => expect(log.length).toBeGreaterThan(start), { timeout: 5000 })
      await screen.findByRole('heading', { level: 1 }, { timeout: 5000 })

      const visited = log.slice(start)
      for (const landed of visited) {
        // A disallowed fallback would show here before the guard redirected it home.
        expect(allowed.some((route) => matchPath(route.path, landed))).toBe(true)
      }
      expect(visited[0]).not.toBe(url.split('?')[0])
    },
    20000,
  )
})

describe('Back in dead ends and drill-throughs', () => {
  it.each([
    ['an unknown address', '/no-such-screen', 'Page Not Found', paths.dashboard],
    [
      'a Student Number that does not exist',
      '/students/1999-99999',
      'Unable to load the student profile.',
      paths.students,
    ],
    [
      'a visit that does not exist',
      '/visits/visit-9999',
      'Unable to load visit detail.',
      paths.visits,
    ],
    [
      'an incident that does not exist',
      '/incidents/incident-9999/report',
      'Unable to load the incident report.',
      paths.incidents,
    ],
  ])(
    '%s shows Back to a screen the role can open',
    async (_name, url, message, fallback) => {
      const log = renderApp(USERS.staff, [url])
      expect(await screen.findByText(message, {}, { timeout: 5000 })).toBeInTheDocument()
      await userEvent.setup().click(await findBack())
      await waitFor(() => expect(log.at(-1)).toBe(fallback))
    },
    20000,
  )

  it('a list opened from a Dashboard stat card shows Back to the Dashboard; opened from the sidebar it does not', async () => {
    const user = userEvent.setup()
    renderApp(USERS.staff, [paths.dashboard])
    await user.click(await screen.findByRole('link', { name: /^Clinic visits/ }, { timeout: 5000 }))
    expect(
      await screen.findByRole('heading', { name: 'Visit Log' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(await screen.findByRole('heading', { name: 'Clinic Overview' })).toBeInTheDocument()

    await user.click(
      within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', {
        name: 'Visits',
      }),
    )
    expect(await screen.findByRole('heading', { name: 'Visit Log' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
  }, 20000)
})
