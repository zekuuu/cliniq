import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Button, Card, Input } from '../../components'
import { BrandLogo } from '../../layouts/Sidebar'
import { LoginBackdrop } from './LoginBackdrop'
import { changeMockPassword, getPendingPasswordChangeUser, getUser, type SessionUser } from '../../lib/mock-db'
import { useAsyncData } from '../../hooks/useAsyncData'
import { paths } from '../../routes/paths'

/**
 * Reachable only right after Login verified an account that must change its password: the account
 * comes from that verified step, never from the URL, so no one can set another account's password.
 */
export function ForcePasswordChangePage({ onComplete }: { onComplete: (user: SessionUser) => void }) {
  // Read once: completing the change starts the session and clears the pending marker, and this
  // screen must not bounce to Login in the moment before it navigates on.
  const [pending] = useState(() => getPendingPasswordChangeUser())
  if (!pending) return <Navigate to={paths.login} replace />
  return <ForcePasswordChangeForm userId={pending.id} onComplete={onComplete} />
}

function ForcePasswordChangeForm({ userId, onComplete }: { userId: string; onComplete: (user: SessionUser) => void }) {
  const navigate = useNavigate()
  const { data: account, status } = useAsyncData(`force-password-user:${userId}`, () => getUser(userId))
  const [nextPassword, setNextPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (nextPassword.length < 8) return setError('Password must be at least 8 characters.')
    if (nextPassword !== confirmation) return setError('Passwords do not match.')
    setSaving(true)
    try {
      await changeMockPassword(userId, nextPassword)
      const user = account ?? (await getUser(userId))
      onComplete({ id: user.id, name: user.name, role: user.role })
      navigate(user.role === 'instructor' ? paths.qrScan : paths.dashboard, { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update the password.')
    } finally {
      setSaving(false)
    }
  }

  // Same backdrop and card as Login, so the first sign-in reads as one flow.
  if (!account && status === 'loading') return <main className="relative isolate flex min-h-screen items-center justify-center px-4"><LoginBackdrop /><Card className="w-full max-w-md p-6 shadow-overlay!"><p role="status">Loading account…</p></Card></main>
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center px-4 py-8">
      <LoginBackdrop />
      <Card className="w-full max-w-md p-6 shadow-overlay!">
        <header>
          <BrandLogo />
          <p className="mt-6 border-t border-border pt-5 text-xs font-semibold uppercase tracking-[0.16em] text-brand-green-dark">Account setup</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">Change Your Password</h1>
          <p className="mt-1 text-sm text-text-secondary">Set a new password before opening CLINIQ for the first time.</p>
        </header>
        <form className="mt-6 flex flex-col gap-4" onSubmit={submit} noValidate>
          <Input label="New password" type="password" autoComplete="new-password" hint="Use at least 8 characters. Your last 5 passwords cannot be reused." value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} required />
          <Input label="Confirm new password" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required />
          {error && <p role="alert" className="text-sm font-semibold text-error">{error}</p>}
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="neutral" onClick={() => navigate(paths.login)}>Back to Sign In</Button>
            <Button type="submit" variant="primary" loading={saving}>Save Password</Button>
          </div>
        </form>
      </Card>
    </main>
  )
}
