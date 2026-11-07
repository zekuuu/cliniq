import { useEffect, useState, type FormEvent } from 'react'
import { Button, CodeInput, Input, Modal, NUMBERED_LIST } from '../../components'
import { PrintDocument, PrintSection } from '../../components/print/Print'
import { useAsyncData } from '../../hooks/useAsyncData'
import { confirmAuthenticatorSetup, getAuthenticatorStatus, RecoveryError, startAuthenticatorSetup, turnOffAuthenticator, type SessionUser } from '../../lib/mock-db'

type Step = { kind: 'status' } | { kind: 'prove'; then: 'replace' | 'off' } | { kind: 'scan'; secret: string; uri: string } | { kind: 'codes'; codes: string[] }

/** The setup key in groups of four, easier to type by hand. */
const grouped = (secret: string) => secret.match(/.{1,4}/g)?.join(' ') ?? secret

/** The QR code, drawn by `qrcode` loaded only here so the main bundle doesn't grow (ADR-072). */
function QrCode({ uri }: { uri: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let stale = false
    void import('qrcode').then(({ toDataURL }) => toDataURL(uri, { margin: 1, width: 192 })).then((url) => {
      if (!stale) setSrc(url)
    })
    return () => {
      stale = true
    }
  }, [uri])
  return src ? <img src={src} width={192} height={192} alt="QR code to scan with the authenticator app" className="rounded-md border border-border" /> : <div aria-hidden="true" className="size-48 animate-pulse rounded-md bg-surface motion-reduce:animate-none" />
}

/**
 * "Set up authenticator app" (ADR-072), from the account menu, for every role: a QR code and setup key,
 * a first code to confirm, then 8 one-time recovery codes shown once. When set up: Replace or Turn off,
 * each after the current code or a recovery code. The secret is never shown again after setup.
 */
export function AuthenticatorDialog({ open, viewer, onClose, onChanged }: { open: boolean; viewer: SessionUser; onClose: () => void; onChanged: () => void }) {
  const [step, setStep] = useState<Step>({ kind: 'status' })
  const [version, setVersion] = useState(0)
  const status = useAsyncData(`authenticator|${viewer.id}|${version}|${open}`, () => (open ? getAuthenticatorStatus() : Promise.resolve(null)))
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const [saved, setSaved] = useState(false)
  const [notice, setNotice] = useState('')

  function reset() {
    setStep({ kind: 'status' })
    setCode('')
    setError('')
    setSaved(false)
  }

  function requestClose() {
    // The codes are shown once: closing first needs "I have saved the codes".
    if (step.kind === 'codes' && !saved) return setError('Tick "I have saved the codes" before closing.')
    reset()
    setNotice('')
    onClose()
  }

  async function run(action: () => Promise<void>) {
    setWorking(true)
    setError('')
    try {
      await action()
    } catch (cause) {
      setError(cause instanceof RecoveryError ? cause.message : 'That did not work. Try again.')
    } finally {
      setWorking(false)
    }
  }

  const begin = (proof?: string) => run(async () => {
    const started = await startAuthenticatorSetup(proof)
    setCode('')
    setStep({ kind: 'scan', ...started })
  })

  function submitProof(event: FormEvent, then: 'replace' | 'off') {
    event.preventDefault()
    if (!code.trim()) return setError('Enter the 6-digit code from the app, or a recovery code.')
    if (then === 'replace') return void begin(code)
    void run(async () => {
      await turnOffAuthenticator(code)
      reset()
      setNotice('Authenticator app turned off. Ask the Administrator if you forget your password.')
      setVersion((v) => v + 1)
      onChanged()
    })
  }

  function submitFirstCode(event: FormEvent) {
    event.preventDefault()
    void run(async () => {
      const { recoveryCodes } = await confirmAuthenticatorSetup(code)
      setCode('')
      setStep({ kind: 'codes', codes: recoveryCodes })
      setVersion((v) => v + 1)
      onChanged()
    })
  }

  const enabled = status.data?.enabled ?? false
  const adminNote = viewer.role === 'admin' && (
    <p className="rounded-md border border-warning bg-warning-fill px-3 py-2 text-sm text-text-primary">
      As the Administrator, set this up and keep the recovery codes safe: nobody else can reset your password.
    </p>
  )
  const errorLine = error && <p role="alert" className="text-sm font-semibold text-error">{error}</p>

  let body
  if (step.kind === 'status')
    body = (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">Use an authenticator app on your phone (such as Google Authenticator). It lets you reset your password here without internet. Signing in still uses your username and password.</p>
        {adminNote}
        {notice && <p role="status" className="text-sm font-semibold text-success">{notice}</p>}
        {status.data && (
          <p className="text-sm text-text-primary">
            {enabled ? `Authenticator app: set up. ${status.data.recoveryCodesLeft} of 8 recovery codes left.` : 'Authenticator app: not set up.'}
          </p>
        )}
        {errorLine}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="neutral" onClick={requestClose}>Close</Button>
          {enabled ? (
            <>
              <Button variant="secondary" onClick={() => { setCode(''); setError(''); setStep({ kind: 'prove', then: 'off' }) }}>Turn off</Button>
              <Button variant="primary" onClick={() => { setCode(''); setError(''); setStep({ kind: 'prove', then: 'replace' }) }}>Replace</Button>
            </>
          ) : (
            <Button variant="primary" loading={working} loadingText="Starting…" disabled={!status.data} onClick={() => void begin()}>Set up</Button>
          )}
        </div>
      </div>
    )
  else if (step.kind === 'prove')
    body = (
      <form noValidate onSubmit={(event) => submitProof(event, step.then)} className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">{step.then === 'replace' ? 'To replace the authenticator, enter the current 6-digit code or a recovery code. You get a new key and new recovery codes.' : 'To turn the authenticator off, enter the current 6-digit code or a recovery code.'}</p>
        <Input label="Code" autoComplete="one-time-code" required value={code} maxLength={11} data-autofocus onChange={(event) => setCode(event.target.value)} clearable={false} />
        {errorLine}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="neutral" onClick={reset}>Back</Button>
          <Button type="submit" variant="primary" loading={working} loadingText="Checking…">{step.then === 'replace' ? 'Continue' : 'Turn off'}</Button>
        </div>
      </form>
    )
  else if (step.kind === 'scan')
    body = (
      <form noValidate onSubmit={submitFirstCode} className="flex flex-col gap-4">
        <ol className={`text-sm text-text-primary ${NUMBERED_LIST}`}>
          <li>Open the authenticator app and add an account by scanning this QR code.</li>
          <li>Or type the setup key by hand: it is a time-based key for CLINIQ.</li>
          <li>Enter the 6-digit code the app shows.</li>
        </ol>
        <div className="flex flex-wrap items-center gap-4">
          <QrCode uri={step.uri} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-text-secondary">Setup key</p>
            <p className="font-mono text-sm break-all text-text-primary">{grouped(step.secret)}</p>
          </div>
        </div>
        {/* The same code boxes as Forgot password (Zean, November 7, 2026). */}
        <CodeInput label="6-digit code" value={code} autoFocus onChange={setCode} hint="If codes do not work, check that the phone's date and time are set automatically." />
        {errorLine}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="neutral" onClick={reset}>Cancel</Button>
          <Button type="submit" variant="primary" loading={working} disabled={code.length !== 6}>Confirm</Button>
        </div>
      </form>
    )
  else
    body = (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-semibold text-text-primary">Keep these in a safe place. Each works once if you lose your phone.</p>
        <ul aria-label="Recovery codes" className="grid grid-cols-2 gap-2 rounded-md border border-border bg-surface p-3 font-mono text-sm text-text-primary">
          {step.codes.map((recovery) => <li key={recovery}>{recovery}</li>)}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon="fileText" onClick={() => void navigator.clipboard?.writeText(step.codes.join('\n')).then(() => setNotice('Codes copied.'))}>Copy</Button>
          <Button variant="secondary" icon="printer" onClick={() => window.print()}>Print</Button>
        </div>
        {notice && <p role="status" className="text-sm text-text-secondary">{notice}</p>}
        <label className="flex cursor-pointer items-start gap-2 text-sm text-text-primary">
          <input type="checkbox" checked={saved} onChange={(event) => { setSaved(event.target.checked); setError('') }} className="mt-0.5 size-4 cursor-pointer accent-brand-green-dark" />
          I have saved the codes
        </label>
        {errorLine}
        <div className="flex justify-end">
          <Button variant="primary" disabled={!saved} onClick={requestClose}>Done</Button>
        </div>
        {/* Only the codes print; never the key (cliniq-print-patterns: a purpose-built page). */}
        <PrintDocument title="CLINIQ recovery codes" viewer={viewer} scope={`For ${viewer.name}. Each code works once. Keep this page in a safe place.`}>
          <PrintSection title="Recovery codes">
            <ul className="grid grid-cols-2 gap-[2mm] font-mono text-[12pt]">{step.codes.map((recovery) => <li key={recovery}>{recovery}</li>)}</ul>
          </PrintSection>
        </PrintDocument>
      </div>
    )

  return (
    <Modal open={open} title={step.kind === 'codes' ? 'Save your recovery codes' : 'Authenticator app'} onClose={requestClose}>
      {body}
    </Modal>
  )
}
