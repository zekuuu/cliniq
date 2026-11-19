import { notify } from '../lib/notify'

/**
 * TEMPORARY, development only (Zean, Thursday, November 19, 2026: "add test button to show toast notfi
 * temporarily"): buttons that send each kind of toast, to check their look and timing (ADR-083).
 * Production builds and tests render nothing. Remove this file and its line in `App.tsx` when done.
 */
const SAMPLES: Array<{ label: string; send: () => void }> = [
  { label: 'Success', send: () => notify.success('Visit recorded', { id: 'preview-success' }) },
  {
    label: 'Error',
    send: () => notify.error('The visit was not saved. Please try again.', { id: 'preview-error' }),
  },
  {
    label: 'Warning',
    send: () =>
      notify.warning('Some stock is now below zero. Recount and restock in Inventory.', {
        id: 'preview-warning',
      }),
  },
  {
    label: 'Info',
    send: () => notify.info('Backups now go to Blue USB too', { id: 'preview-info' }),
  },
  {
    label: 'With action',
    send: () =>
      notify.success('Student record created', {
        id: 'preview-action',
        description: '3 items taken from stock · Follow-up created',
        action: { label: 'Open record', onClick: () => notify.info('Action pressed') },
      }),
  },
  {
    label: 'Loading',
    send: () =>
      void notify
        .promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
          id: 'preview-loading',
          loading: 'Backing up…',
          success: 'Backup recorded',
          error: 'The backup did not run.',
        })
        .catch(() => undefined),
  },
]

export function ToastPreview() {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return null
  return (
    <details className="fixed bottom-2 left-1/2 z-[100] -translate-x-1/2 rounded border border-border bg-background px-2 py-1 text-xs text-text-secondary print:hidden">
      <summary className="cursor-pointer">Test toasts</summary>
      <div className="mt-1 flex flex-col gap-1">
        {SAMPLES.map(({ label, send }) => (
          <button
            key={label}
            type="button"
            onClick={send}
            className="cursor-pointer rounded-sm border border-border px-2 py-1 text-left text-text-primary hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand-green-dark"
          >
            {label}
          </button>
        ))}
      </div>
    </details>
  )
}
