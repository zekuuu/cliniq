import { useRef, useState, type FormEvent } from 'react'
import { formatTime } from '../../lib/dates'
import { useLocation, useNavigate } from 'react-router'
import { Button, Input } from '../../components'
import { authenticateMockUser, beginPasswordChange, MockAuthError, type SessionUser } from '../../lib/mock-db'
import { useFocusFirstInvalid } from '../../hooks/useFocusFirstInvalid'
import { paths } from '../../routes/paths'
import { DemoAccounts } from './DemoAccounts'
import { LoginBackdrop } from './LoginBackdrop'

/** Only an in-app path is a safe place to return to after Login (never another origin). */
function returnPath(state: unknown): string | null {
  const from = (state as { from?: unknown } | null)?.from
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : null
}

export function LoginPage({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})
  const formRef = useRef<HTMLFormElement>(null)
  const invalid = useFocusFirstInvalid(formRef)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLockedUntil(null)
    // Inline messages like every other CLINIQ form, instead of the browser's native bubble.
    const nextFieldErrors = {
      username: username.trim() ? undefined : 'Enter your username.',
      password: password ? undefined : 'Enter your password.',
    }
    setFieldErrors(nextFieldErrors)
    const errorCount = Object.values(nextFieldErrors).filter(Boolean).length
    invalid.report(errorCount)
    if (errorCount) return
    setLoading(true)
    try {
      const result = await authenticateMockUser(username, password)
      if (result.mustChangePassword) {
        // No session yet: the account must set a new password before it can open any screen.
        beginPasswordChange(result.user.id)
        navigate(paths.forcePasswordChange, { replace: true })
        return
      }
      onLogin(result.user)
      navigate(returnPath(location.state) ?? paths.dashboard, { replace: true })
    } catch (cause) {
      if (cause instanceof MockAuthError && cause.reason === 'locked') {
        setLockedUntil(cause.lockedUntil ?? null)
        setError('This account is temporarily locked after repeated failed attempts. Try again in 30 minutes.')
      } else {
        setError('Unable to sign in with those credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  const lockMessage = lockedUntil ? `Locked until ${formatTime(lockedUntil)}.` : null
  return (
    // DOM order is panel then photo so Tab reaches the form before Demo Accounts; the photo is
    // drawn first on phones (a band on top) and second from md (filling the right side).
    <main data-login-page className="relative isolate flex min-h-dvh flex-col-reverse md:h-dvh md:flex-row">
      <div className="flex flex-1 flex-col bg-background px-4 py-8 md:w-[26rem] md:flex-none md:overflow-y-auto md:px-12 lg:w-[28rem] lg:px-16">
        <div className="mx-auto flex w-full max-w-[20rem] flex-1 flex-col">
          {/* The logo file has ~9% transparent padding; the negative margin puts its visible edge on the content edge. */}
          <div className="-ml-[0.3125rem] flex items-center gap-0.5">
            <img src="/Healware_Logo.png" alt="Healware logo" className="size-14 shrink-0 object-contain" />
            <span className="text-[1.75rem] leading-none font-bold tracking-tight whitespace-nowrap text-brand-green-dark">CLINIQ</span>
          </div>
          <div className="flex flex-1 flex-col justify-center py-10">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Sign In</h1>
            <form ref={formRef} className="mt-6 flex w-full flex-col gap-4" onSubmit={submit} noValidate>
              <p role="status" className="sr-only">{invalid.announcement}</p>
              <Input label="Username" icon="user" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} error={fieldErrors.username} required />
              <Input label="Password" icon="lock" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} error={fieldErrors.password} required />
              {error && <p role="alert" className="text-sm font-semibold text-error">{error}</p>}
              {lockMessage && <p className="text-xs text-text-secondary">{lockMessage}</p>}
              <Button type="submit" variant="primary" className="mt-2 w-full" loading={loading}>Sign In</Button>
            </form>
          </div>
          <p className="text-xs text-text-secondary">Mendez Christian Academy</p>
        </div>
      </div>
      <div className="relative h-36 shrink-0 md:h-auto md:flex-1">
        <LoginBackdrop className="absolute inset-0" />
        <DemoAccounts />
      </div>
    </main>
  )
}
