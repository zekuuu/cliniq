import { useEffect, useState } from 'react'
import { createBrowserRouter, RouterProvider, useNavigate } from 'react-router'
import { getAuthenticatedUser, startMockSession, type SessionUser } from './lib/data'
import { AppRoutes } from './routes/AppRoutes'
import { KeyboardShortcuts } from './components/KeyboardShortcuts'
import { paths } from './routes/paths'
import { ACCOUNT_CHANGED_EVENT } from './lib/accountEvents'
import { DevDataMode } from './lib/api/DevDataMode'
import { PASSWORD_CHANGE_REQUIRED_EVENT, SESSION_ENDED_EVENT } from './lib/api/client'
import {
  forgetApiSession,
  lastIdleMinutes,
  notePendingPasswordChange,
  noteSessionEnded,
} from './lib/api/http/auth'

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

  // Minutes of the last idle sign-out, for Login's message; cleared on the next sign-in (ADR-078).
  const [idleSignedOut, setIdleSignedOut] = useState<number | null>(null)

  // API mode (ADR-080): the server ended the session (401), or wants a password change first (403).
  useEffect(() => {
    const ended = (event: Event) => {
      const code = (event as CustomEvent<string>).detail
      forgetApiSession()
      if (code !== 'session_idle') noteSessionEnded()
      const idleMinutes = code === 'session_idle' ? (lastIdleMinutes() ?? undefined) : undefined
      setIdleSignedOut(idleMinutes ?? null)
      setUser(null)
      navigate(paths.login, {
        replace: true,
        state: idleMinutes ? { signedOutAfterMinutes: idleMinutes } : null,
      })
    }
    const mustChange = () => {
      const current = getAuthenticatedUser()
      if (current) notePendingPasswordChange(current)
      setUser(null)
      navigate(paths.forcePasswordChange, { replace: true })
    }
    window.addEventListener(SESSION_ENDED_EVENT, ended)
    window.addEventListener(PASSWORD_CHANGE_REQUIRED_EVENT, mustChange)
    return () => {
      window.removeEventListener(SESSION_ENDED_EVENT, ended)
      window.removeEventListener(PASSWORD_CHANGE_REQUIRED_EVENT, mustChange)
    }
  }, [navigate])

  function signIn(nextUser: SessionUser) {
    setIdleSignedOut(null)
    startMockSession(nextUser)
    setUser(nextUser)
  }

  // The shell's Log out control (or the idle sign-out, ADR-048 and ADR-078) has already audited the
  // logout and cleared the stored session.
  function signOut(idleMinutes?: number) {
    // Held here, not only in router state: the old route's Login redirect replaced that state and the
    // "signed out after N minutes" message was lost (ADR-078).
    setIdleSignedOut(idleMinutes ?? null)
    setUser(null)
    navigate(paths.login, {
      replace: true,
      state: idleMinutes ? { signedOutAfterMinutes: idleMinutes } : null,
    })
  }

  return (
    <>
      <AppRoutes
        user={user}
        onLogin={signIn}
        onLogout={signOut}
        signedOutAfterMinutes={idleSignedOut}
      />
      <KeyboardShortcuts />
      <DevDataMode />
    </>
  )
}

export default function App() {
  // A data router, so a dirty form can block leaving (ADR-021). The route table stays in `AppRoutes`.
  const [router] = useState(() => createBrowserRouter([{ path: '*', element: <AppContent /> }]))
  return <RouterProvider router={router} />
}
