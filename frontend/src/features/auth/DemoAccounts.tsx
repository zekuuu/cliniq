import { useState } from 'react'
import { Button, Icon, Modal } from '../../components'

const DEMO_ACCOUNTS = [
  { role: 'School Clinician', username: 'demo.nurse', password: 'demo-nurse', note: 'Standard Staff access' },
  { role: 'Admin / Principal', username: 'demo.principal', password: 'demo-admin', note: 'Reports and Dashboard access' },
  { role: 'School Clinician', username: 'demo.new', password: 'demo-change', note: 'Force Password Change scenario' },
]

/**
 * Frontend-demo helper for Login: a trigger at the bottom right of the photo region (never over the form) that opens the sample accounts and the
 * simulated-authentication notice in the shared Modal (the trigger + Modal pattern
 * KeyboardShortcuts used before its floating button moved into the shell header). Self-contained
 * on purpose: when the Sanctum API is connected, deleting this component removes both.
 */
export function DemoAccounts() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="absolute right-4 bottom-4 z-20 inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-semibold text-text-secondary shadow-card transition-colors hover:bg-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark motion-reduce:transition-none print:hidden"
      >
        <Icon name="users" className="text-brand-green-dark" />
        Demo Accounts
      </button>
      {/* Capped and scrollable: on a phone the four accounts are taller than the screen, and the
          shared Modal's overlay doesn't scroll, so its Close controls would otherwise be unreachable. */}
      <Modal open={open} title="Demo accounts" onClose={() => setOpen(false)}>
        <p className="text-sm text-text-secondary">Frontend demo only: authentication is simulated until the Laravel Sanctum API is connected.</p>
        <p className="mt-1 text-xs text-text-secondary">Synthetic credentials only. These are not real clinic accounts or production passwords.</p>
        <div className="mt-4 grid gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <div key={account.username} className="rounded-md border border-border bg-surface px-3 py-2 text-xs">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-semibold text-text-primary">{account.role}</span>
                <span className="text-text-secondary">{account.note}</span>
              </div>
              <dl className="mt-1 grid gap-x-3 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)]">
                <dt className="font-semibold text-text-secondary">Username</dt>
                <dd className="break-all font-mono text-text-primary">{account.username}</dd>
                <dt className="font-semibold text-text-secondary">Password</dt>
                <dd className="break-all font-mono text-text-primary">{account.password}</dd>
              </dl>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="neutral" data-autofocus onClick={() => setOpen(false)}>Close</Button>
        </div>
      </Modal>
    </>
  )
}
