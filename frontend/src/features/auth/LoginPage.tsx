import { useRef, useState, type FormEvent } from 'react'
import { formatTime } from '../../lib/dates'
import { Link, useLocation, useNavigate } from 'react-router'
import { Button, Input, Modal } from '../../components'
import { authenticateMockUser, beginPasswordChange, MockAuthError, type SessionUser } from '../../lib/mock-db'
import { useFocusFirstInvalid } from '../../hooks/useFocusFirstInvalid'
import { APP_VERSION } from '../../config/appVersion'
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
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})
  const formRef = useRef<HTMLFormElement>(null)
  const invalid = useFocusFirstInvalid(formRef)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
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
        const until = cause.lockedUntil ? `at ${formatTime(cause.lockedUntil)}` : 'in 30 minutes'
        setError(`This account is temporarily locked after repeated failed attempts. Try again ${until}.`)
      } else {
        setError('Unable to sign in with those credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    // DOM order is panel then photo so Tab reaches the form before Demo Accounts; the photo is
    // drawn first on phones (a band on top) and second from md (filling the right side).
    <main data-login-page className="relative isolate flex min-h-dvh flex-col-reverse md:h-dvh md:flex-row">
      <div className="flex flex-1 flex-col bg-background px-4 py-8 md:w-[26rem] md:flex-none md:overflow-y-auto md:px-12 lg:w-[28rem] lg:px-16">
        <div className="mx-auto flex w-full max-w-[20rem] flex-1 flex-col">
          {/* The logo file has ~9% transparent padding; the negative margin puts its visible edge on the content edge. */}
          <div className="-ml-[0.3125rem] flex items-center gap-0.5">
            <img src="/Healware_Logo.png" alt="Healware logo" className="size-14 shrink-0 object-contain" />
            <span className="flex flex-col gap-1">
              <span className="text-[1.75rem] leading-none font-bold tracking-tight whitespace-nowrap text-brand-green-dark">CLINIQ</span>
              <span className="text-sm leading-tight font-medium whitespace-nowrap text-text-secondary">Mendez Christian Academy</span>
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-center py-10">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Sign In</h1>
            <form ref={formRef} className="mt-6 flex w-full flex-col gap-4" onSubmit={submit} noValidate>
              <p role="status" className="sr-only">{invalid.announcement}</p>
              <Input label="Username" icon="user" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} error={fieldErrors.username} required />
              <Input label="Password" icon="lock" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => setCapsLock(event.getModifierState('CapsLock'))} onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))} onBlur={() => setCapsLock(false)} hint={capsLock ? 'Caps Lock is on.' : undefined} error={fieldErrors.password} required />
              {/* Help only: no reset flow until the team decides the recovery method (Issues-and-TODOs, "Forgot password" DECIDE). */}
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setForgotOpen(true)}
                className="-mt-2 min-h-6 cursor-pointer self-start rounded-sm text-sm font-semibold text-brand-green-dark underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark"
              >
                Forgot password?
              </button>
              {error && <p role="alert" className="text-sm font-semibold text-error">{error}</p>}
              <Button type="submit" variant="primary" className="mt-2 w-full" loading={loading}>Sign In</Button>
            </form>
          </div>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-text-secondary">
            <Link to={paths.privacyPolicy} className="cursor-pointer font-semibold text-brand-green-dark underline-offset-2 hover:underline">Privacy Policy</Link>
            <span aria-hidden="true">·</span>
            <span>Powered by HealWare™</span>
            <span aria-hidden="true">·</span>
            <span>v{APP_VERSION}</span>
          </p>
        </div>
      </div>
      <Modal open={forgotOpen} title="Forgot your password?" onClose={() => setForgotOpen(false)}>
        <p className="text-sm text-text-secondary">Password reset is not available in CLINIQ yet. Ask the person who manages CLINIQ accounts at the clinic for help signing in.</p>
        <div className="mt-4 flex justify-end">
          <Button variant="neutral" data-autofocus onClick={() => setForgotOpen(false)}>Close</Button>
        </div>
      </Modal>
      <div className="relative h-36 shrink-0 md:h-auto md:flex-1">
        <LoginBackdrop className="absolute inset-0" />
        <DemoAccounts />
      </div>
    </main>
  )
}
