import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { formatTime } from '../lib/dates'
import { confirmMockPassword, MockAuthError, type SessionUser } from '../lib/mock-db'
import { useCapsLock } from './useCapsLock'

/**
 * "Confirm it's you" (panel review AC-7, ADR-037): asks for the signed-in user's own password before
 * a sensitive action, then runs it. The default list (D7): archive a student record, disable or enable
 * an account, reset a password, change a role, approve an incident report. Ordinary work never asks.
 * A wrong password does nothing and counts toward the sign-in lockout; each success is audit-logged.
 */
export function useConfirmItsYou(viewer: SessionUser): {
  confirm: (purpose: string, action: () => unknown) => void
  dialog: ReactNode
} {
  const [purpose, setPurpose] = useState<string | null>(null)
  const action = useRef<() => unknown>(() => {})
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const capsLock = useCapsLock()

  function close() {
    setPurpose(null)
    setPassword('')
    setError('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!purpose) return
    if (!password) {
      setError('Enter your password.')
      return
    }
    setChecking(true)
    try {
      await confirmMockPassword(viewer.id, password, purpose)
      const run = action.current
      close()
      await run()
    } catch (cause) {
      if (!(cause instanceof MockAuthError)) throw cause
      setPassword('')
      setError(
        cause.reason === 'locked'
          ? `Too many wrong passwords. Try again ${cause.lockedUntil ? `at ${formatTime(cause.lockedUntil)}` : 'in 30 minutes'}. Nothing was changed.`
          : 'That password is not correct. Nothing was changed.',
      )
    } finally {
      setChecking(false)
    }
  }

  return {
    confirm: (nextPurpose, nextAction) => {
      action.current = nextAction
      setPassword('')
      setError('')
      setPurpose(nextPurpose)
    },
    dialog: (
      <Modal open={purpose !== null} title="Confirm it's you" onClose={close}>
        <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
          <p className="text-sm text-text-secondary">
            Enter your password to {purpose}. This is asked only before sensitive actions.
          </p>
          <Input
            data-autofocus
            label="Your password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            hint={capsLock.hint}
            error={error}
            onChange={(event) => {
              setPassword(event.target.value)
              setError('')
            }}
            {...capsLock.handlers}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="neutral" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={checking}>
              Confirm
            </Button>
          </div>
        </form>
      </Modal>
    ),
  }
}
