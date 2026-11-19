import { useState, type FormEvent } from 'react'
import { notify } from '../../lib/notify'
import { scrollToTop } from '../../lib/scrollToTop'
import { BackButton, Button, Card, Input } from '../../components'
import { useCapsLock } from '../../hooks/useCapsLock'
import { changeOwnPassword, type SessionUser } from '../../lib/data'
import { paths } from '../../routes/paths'

/** Self-service password change for whoever is signed in (Module 1, Password Management). */
export function ChangePasswordPage({ viewer }: { viewer: SessionUser }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const capsLock = useCapsLock()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaved(false)
    // A form-level check stays beside the fields and is also the toast's text (ADR-083).
    const problem =
      nextPassword.length < 8
        ? 'Password must be at least 8 characters.'
        : nextPassword !== confirmation
          ? 'Passwords do not match.'
          : ''
    if (problem) {
      notify.checkFields(problem)
      return setError(problem)
    }
    setSaving(true)
    try {
      await changeOwnPassword(viewer.id, currentPassword, nextPassword)
      setCurrentPassword('')
      setNextPassword('')
      setConfirmation('')
      setSaved(true)
      notify.success('Password changed', { id: 'change-password' })
      scrollToTop()
    } catch (cause) {
      notify.apiError(cause, 'Unable to update the password. Please try again.', {
        id: 'change-password',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      <BackButton fallback={paths.dashboard} />
      <Card className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Change Password</h1>
        <form className="mt-6 flex flex-col gap-4" onSubmit={submit} noValidate>
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            hint={capsLock.hint}
            {...capsLock.handlers}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            hint={
              capsLock.hint ?? 'Use at least 8 characters. Your last 5 passwords cannot be reused.'
            }
            {...capsLock.handlers}
            value={nextPassword}
            onChange={(event) => setNextPassword(event.target.value)}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            hint={capsLock.hint}
            {...capsLock.handlers}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          {error && (
            <p role="alert" className="text-sm font-semibold text-error">
              {error}
            </p>
          )}
          <div className="mt-2 flex justify-end">
            <Button type="submit" variant="primary" loading={saving} done={Boolean(saved)}>
              Save Password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
