import { useState, type FormEvent } from 'react'
import { formatTime } from '../../lib/dates'
import { useLocation, useNavigate } from 'react-router'
import { Button, Card, Input } from '../../components'
import { authenticateMockUser, beginPasswordChange, MockAuthError, type SessionUser } from '../../lib/mock-db'
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
    if (nextFieldErrors.username || nextFieldErrors.password) return
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
    <main className="relative isolate flex min-h-dvh flex-col overflow-x-hidden px-4 pt-8 pb-20">
      <LoginBackdrop />
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="w-full max-w-[23rem]">
          <div className="relative z-10 -mb-7 ml-[14px] flex h-[6.75rem] items-center gap-px">
            <img src="/Healware_Logo.png" alt="Healware logo" className="size-[6.75rem] shrink-0 object-contain" />
            <span className="truncate text-[2.625rem] leading-none font-bold tracking-tight text-white drop-shadow-[0_2px_4px_rgb(0_53_31_/_0.9)]">CLINIQ</span>
          </div>
          {/* The logo overlaps the card; the top padding reserves clear space before the heading. */}
          <Card className="w-full rounded-md p-6 pt-[52px] shadow-card!">
            <header>
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">Sign In</h1>
            </header>
            <form className="mt-6 flex w-full flex-col gap-4 sm:w-[20rem]" onSubmit={submit} noValidate>
              <Input label="Username" icon="user" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} error={fieldErrors.username} required />
              <Input label="Password" icon="lock" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} error={fieldErrors.password} required />
              {error && <p role="alert" className="text-sm font-semibold text-error">{error}</p>}
              {lockMessage && <p className="text-xs text-text-secondary">{lockMessage}</p>}
              <Button type="submit" variant="primary" className="mt-2 w-full" loading={loading}>Sign In</Button>
            </form>
          </Card>
        </div>
      </div>
      <DemoAccounts />
    </main>
  )
}
