import { useEffect, useState } from 'react'
import { createBrowserRouter, RouterProvider, useNavigate } from 'react-router'
import { getAuthenticatedUser, startMockSession, type SessionUser } from './lib/mock-db'
import { AppRoutes } from './routes/AppRoutes'
import { KeyboardShortcuts } from './components/KeyboardShortcuts'
import { paths } from './routes/paths'
import { ACCOUNT_CHANGED_EVENT } from './lib/accountEvents'

/**
 * Root: path-based routing with React Router (Development-Phases.md §0). The route
 * guards and shell placement live in `routes/AppRoutes.tsx`; URLs are built in
 * `routes/paths.ts`.
 */
function AppContent() {
  const navigate = useNavigate()
  // Nobody is signed in until Login succeeds; there is no default account (ADR-002 clarification).
  const [user, setUser] = useState<SessionUser | null>(() => getAuthenticatedUser())
  // Edit profile changed the name: read the signed-in user again (ADR-066).
  useEffect(() => {
    const refresh = () => setUser(getAuthenticatedUser())
    window.addEventListener(ACCOUNT_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(ACCOUNT_CHANGED_EVENT, refresh)
  }, [])

  function signIn(nextUser: SessionUser) {
    startMockSession(nextUser)
    setUser(nextUser)
  }

  // The shell's Log out control (or the Admin's idle sign-out, ADR-048) has already audited the
  // logout and cleared the stored session.
  function signOut(idleMinutes?: number) {
    setUser(null)
    navigate(paths.login, { replace: true, state: idleMinutes ? { signedOutAfterMinutes: idleMinutes } : null })
  }

  return (
    <>
      <AppRoutes
        user={user}
        onLogin={signIn}
        onLogout={signOut}
      />
      <KeyboardShortcuts />
    </>
  )
}

export default function App() {
  // A data router, so a dirty form can block leaving (ADR-021). The route table stays in `AppRoutes`.
  const [router] = useState(() => createBrowserRouter([{ path: '*', element: <AppContent /> }]))
  return <RouterProvider router={router} />
}
