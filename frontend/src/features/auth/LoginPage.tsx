import { useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Button, Input } from '../../components'
import { ForgotPasswordDialog } from './ForgotPasswordDialog'
import { lockedMessage, withAttemptsLeft } from './lockMessage'
import { useCapsLock } from '../../hooks/useCapsLock'
import {
  authenticateMockUser,
  beginPasswordChange,
  MockAuthError,
  type SessionUser,
} from '../../lib/mock-db'
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

export function LoginPage({
  onLogin,
  signedOutAfterMinutes,
}: {
  onLogin: (user: SessionUser) => void
  signedOutAfterMinutes?: number | null
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const capsLock = useCapsLock()
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})
  const formRef = useRef<HTMLFormElement>(null)
  const invalid = useFocusFirstInvalid(formRef)
  // ADR-048: the Admin's idle sign-out says why the session ended.
  // From the app (an idle sign-out, ADR-078), or from router state.
  const idleMinutes =
    signedOutAfterMinutes ??
    (location.state as { signedOutAfterMinutes?: unknown } | null)?.signedOutAfterMinutes

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
        setError(lockedMessage(cause.lockedUntil))
      } else {
        setError(
          withAttemptsLeft(
            'Unable to sign in with those credentials.',
            cause instanceof MockAuthError ? cause.remaining : undefined,
          ),
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    // DOM order is panel then photo so Tab reaches the form before Demo Accounts; the photo is
    // drawn first on phones (a band on top) and first from md too (filling the left side, form on the
    // right — Zean, November 6, 2026).
    <main
      data-login-page
      className="relative isolate flex min-h-dvh flex-col-reverse md:h-dvh md:flex-row-reverse"
    >
      {/* On phones the panel rises over the photo band with a rounded top (Zean, November 5, 2026). Plain
          white: the faint green glow was removed (Zean, November 6, 2026). */}
      <div className="relative z-10 -mt-6 flex flex-1 flex-col rounded-t-3xl bg-background px-4 py-8 md:mt-0 md:w-[26rem] md:flex-none md:overflow-y-auto md:rounded-none md:px-12 lg:w-1/3 lg:min-w-[28rem] lg:px-16">
        <div className="mx-auto flex w-full max-w-[24rem] flex-1 flex-col">
          {/* Phones only: from md the lockup sits centered on the photo instead (PhotoLockup). */}
          <div className="flex items-center justify-center gap-3 md:hidden">
            <img
              src="/MCA_Logo.png"
              alt="Mendez Christian Academy logo"
              className="size-14 shrink-0 object-contain"
            />
            <span className="flex flex-col gap-1">
              <span className="font-brand text-[1.75rem] leading-none font-bold tracking-wide whitespace-nowrap text-brand-green-dark">
                CLINIQ
              </span>
              <span className="text-sm leading-tight font-medium whitespace-nowrap text-text-secondary">
                Mendez Christian Academy
              </span>
            </span>
          </div>
          <div className="flex flex-1 flex-col justify-center py-10">
            {/* Heading block centered on the panel's axis (Zean, November 6, 2026); field labels stay left-aligned for scanning. */}
            <h1 className="text-center text-3xl font-bold tracking-tight text-text-primary">
              Sign In
            </h1>
            <p className="mt-2 text-center text-sm text-text-secondary">
              Use your CLINIQ account to open the clinic records.
            </p>
            {typeof idleMinutes === 'number' && (
              <p
                role="status"
                className="mt-4 rounded-md border border-info bg-info/10 px-3 py-2 text-sm text-text-primary"
              >
                You were signed out after {idleMinutes} minutes of inactivity. Sign in again.
              </p>
            )}
            <form
              ref={formRef}
              className="mt-8 flex w-full flex-col gap-4"
              onSubmit={submit}
              noValidate
            >
              <p role="status" className="sr-only">
                {invalid.announcement}
              </p>
              <Input
                label="Username"
                icon="user"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                error={fieldErrors.username}
                clearable={false}
                required
              />
              <Input
                label="Password"
                icon="lock"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                {...capsLock.handlers}
                hint={capsLock.hint}
                error={fieldErrors.password}
                required
              />
              {notice && !error && (
                <p role="status" className="text-sm font-semibold text-success">
                  {notice}
                </p>
              )}
              {error && (
                <p role="alert" className="text-sm font-semibold text-error">
                  {error}
                </p>
              )}
              <Button type="submit" variant="primary" className="mt-2 w-full" loading={loading}>
                Sign In
              </Button>
              {/* Password recovery with an authenticator app (ADR-072); the Admin's reset stays the fallback. */}
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setForgotOpen(true)}
                className="min-h-6 cursor-pointer self-center rounded-sm text-sm text-text-secondary underline-offset-2 hover:text-brand-green-dark hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark"
              >
                Forgot password?
              </button>
            </form>
          </div>
          <p className="flex flex-wrap items-center justify-center gap-x-2 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <img src="/Healware_Logo.png" alt="" className="size-5 shrink-0 object-contain" />
              Powered by HealWare™
            </span>
            <span aria-hidden="true">·</span>
            <Link
              to={paths.privacyPolicy}
              className="cursor-pointer font-semibold text-brand-green-dark underline-offset-2 hover:underline"
            >
              Privacy Policy
            </Link>
            <span aria-hidden="true">·</span>
            <span>v{APP_VERSION}</span>
          </p>
        </div>
      </div>
      <ForgotPasswordDialog
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        onReset={(name) => {
          setUsername(name)
          setPassword('')
          setError('')
          setNotice('Password changed. You can sign in.')
        }}
      />
      <div className="relative h-36 shrink-0 md:h-auto md:flex-1">
        <LoginBackdrop className="absolute inset-0" />
        <PhotoLockup />
        <LoginSeam />
        {import.meta.env.DEV && <DemoAccounts />}
      </div>
    </main>
  )
}

/**
 * From md, the school logo and CLINIQ name centered on the photo (Zean, November 6, 2026). A soft
 * brand-green-dark glow sits behind them so the white text holds its contrast where the photo is
 * lightest. Right padding offsets the seam so the lockup looks centered in the visible photo.
 */
function PhotoLockup() {
  return (
    <div className="absolute inset-0 hidden items-center justify-center p-8 md:flex md:pr-20 print:hidden">
      <div className="flex flex-col items-center gap-5 bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-brand-green-dark)_65%,transparent),transparent)] px-16 py-12 text-center">
        <img
          src="/MCA_Logo.png"
          alt="Mendez Christian Academy logo"
          className="size-28 object-contain drop-shadow-lg lg:size-32"
        />
        <span className="flex flex-col items-center gap-2 text-white drop-shadow-md">
          <span className="font-brand text-5xl leading-none font-bold tracking-wide lg:text-6xl">
            CLINIQ
          </span>
          <span className="text-lg font-medium lg:text-xl">Mendez Christian Academy</span>
        </span>
      </div>
    </div>
  )
}

/**
 * The seam between the white panel and the photo (Zean, November 5, 2026: "make it curvy or
 * diagonal"): from md, the panel's white flows into the photo as one gentle S-curve, with a thin
 * brand-green line tracing it a little further in. Stretched to the full height; the stroke keeps its
 * width at any height. Decorative only.
 */
function LoginSeam() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 96 800"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-24 -scale-x-100 md:block print:hidden"
    >
      <path
        d="M0 0H52C18 170 84 300 46 440C14 560 76 690 40 800H0Z"
        fill="var(--color-background)"
      />
      <path
        d="M60 0C26 170 92 300 54 440C22 560 84 690 48 800"
        fill="none"
        stroke="var(--color-brand-green-light)"
        strokeWidth="2"
        strokeOpacity="0.9"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
