import { useState, type FormEvent } from 'react'
import { Button, CodeInput, Input, Modal } from '../../components'
import { checkRecoveryAccount, MockAuthError, RecoveryError, resetPasswordWithRecovery, verifyPasswordRecovery, RECOVERY_FAILED_MESSAGE } from '../../lib/mock-db'
import { lockedMessage } from './lockMessage'

type Step = 'account' | 'code' | 'reset'

/**
 * Forgot password (ADR-073): the username first, checked before anything else (Zean, November 7,
 * 2026), then a 6-digit code from the authenticator app in code boxes, or a recovery code, then a new
 * password. Works offline. Without an authenticator, the Administrator resets the password, as before.
 */
export function ForgotPasswordDialog({ open, onClose, onReset }: { open: boolean; onClose: () => void; onReset: (username: string) => void }) {
  const [step, setStep] = useState<Step>('account')
  const [username, setUsername] = useState('')
  const [code, setCode] = useState('')
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  function close() {
    setStep('account')
    setCode('')
    setUseRecoveryCode(false)
    setToken('')
    setPassword('')
    setConfirm('')
    setError('')
    onClose()
  }

  function showFailure(cause: unknown) {
    if (cause instanceof MockAuthError && cause.reason === 'locked') setError(lockedMessage(cause.lockedUntil))
    else if (cause instanceof RecoveryError) setError(cause.message)
    else setError(RECOVERY_FAILED_MESSAGE)
  }

  async function checkAccount(event: FormEvent) {
    event.preventDefault()
    if (!username.trim()) return setError('Enter your username.')
    setWorking(true)
    setError('')
    try {
      await checkRecoveryAccount(username)
      setStep('code')
    } catch (cause) {
      showFailure(cause)
    } finally {
      setWorking(false)
    }
  }

  async function verify(proof: string) {
    if (!proof.trim()) return setError(useRecoveryCode ? 'Enter a recovery code.' : 'Enter the 6-digit code.')
    if (working) return
    setWorking(true)
    setError('')
    try {
      setToken(await verifyPasswordRecovery(username, proof))
      setCode('')
      setStep('reset')
    } catch (cause) {
      setCode('')
      showFailure(cause)
    } finally {
      setWorking(false)
    }
  }

  async function reset(event: FormEvent) {
    event.preventDefault()
    if (password.trim().length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('The two passwords do not match.')
    setWorking(true)
    setError('')
    try {
      await resetPasswordWithRecovery(token, password)
      onReset(username.trim())
      close()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The password was not changed. Try again.')
    } finally {
      setWorking(false)
    }
  }

  const errorLine = error && <p role="alert" className="text-sm font-semibold text-error">{error}</p>
  const linkButton = 'w-fit cursor-pointer rounded-sm text-sm font-semibold text-brand-green-dark underline underline-offset-2 transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none'

  let body
  if (step === 'account')
    body = (
      <form noValidate onSubmit={checkAccount} className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Recover your password with the authenticator app on your phone. No internet is needed. If you never set one up, ask the
          Administrator to reset your password.
        </p>
        <Input label="Username" autoComplete="username" required value={username} data-autofocus onChange={(event) => { setUsername(event.target.value); setError('') }} clearable={false} />
        {errorLine}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="neutral" onClick={close}>Cancel</Button>
          <Button type="submit" variant="primary" loading={working} loadingText="Checking…">Continue</Button>
        </div>
      </form>
    )
  else if (step === 'code')
    body = (
      <form noValidate onSubmit={(event) => { event.preventDefault(); void verify(code) }} className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          Account <span className="font-semibold text-text-primary">{username.trim()}</span>.{' '}
          {useRecoveryCode ? 'Enter one of your recovery codes. Each works once.' : 'Open the authenticator app and enter the 6-digit code it shows for CLINIQ.'}
        </p>
        {useRecoveryCode ? (
          <Input label="Recovery code" autoComplete="off" required value={code} maxLength={9} placeholder="ABCD-EFGH" autoFocus onChange={(event) => { setCode(event.target.value.toUpperCase()); setError('') }} clearable={false} />
        ) : (
          // Continues by itself once the sixth digit is in.
          <CodeInput label="6-digit code" value={code} autoFocus disabled={working} onChange={(value) => { setCode(value); setError('') }} onComplete={(value) => void verify(value)} hint="If codes do not work, check that the phone's date and time are set automatically." />
        )}
        <button type="button" className={linkButton} onClick={() => { setUseRecoveryCode((value) => !value); setCode(''); setError('') }}>
          {useRecoveryCode ? 'Use the authenticator app instead' : 'Use a recovery code instead'}
        </button>
        {errorLine}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="neutral" onClick={() => { setStep('account'); setCode(''); setError('') }}>Back</Button>
          <Button type="submit" variant="primary" loading={working} loadingText="Checking…">Continue</Button>
        </div>
      </form>
    )
  else
    body = (
      <form noValidate onSubmit={reset} className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">Choose a new password: at least 8 characters, and not one of your last 5.</p>
        <Input label="New password" type="password" autoComplete="new-password" required value={password} data-autofocus onChange={(event) => setPassword(event.target.value)} />
        <Input label="Confirm new password" type="password" autoComplete="new-password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        {errorLine}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="neutral" onClick={close}>Cancel</Button>
          <Button type="submit" variant="primary" loading={working} loadingText="Changing…">Change password</Button>
        </div>
      </form>
    )

  return (
    <Modal open={open} title="Forgot your password?" onClose={close}>
      {body}
    </Modal>
  )
}
