import { useState } from 'react'
import type { EmergencyContact } from '../types/entities'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'

/**
 * Ordered student contacts: the first row is always the primary contact. With `onVerify` (Staff, on a
 * profile), each contact gets "Mark verified" or "Mark unverified" under its badge (Module 2).
 */
export function EmergencyContactList({
  contacts,
  emptyMessage = 'No emergency contact recorded.',
  onVerify,
}: {
  contacts: EmergencyContact[]
  emptyMessage?: string
  onVerify?: (index: number, verified: boolean) => Promise<unknown>
}) {
  const [busy, setBusy] = useState<number | null>(null)
  const [failed, setFailed] = useState<number | null>(null)

  async function verify(index: number, verified: boolean) {
    if (!onVerify) return
    setBusy(index)
    setFailed(null)
    try {
      await onVerify(index, verified)
    } catch {
      setFailed(index)
    } finally {
      setBusy(null)
    }
  }

  if (!contacts.length) return <p className="text-sm text-text-secondary">{emptyMessage}</p>
  return (
    <ol className="mt-2 flex flex-col gap-2">
      {contacts.map((contact, index) => (
        <li
          key={`${contact.name}-${contact.phone}-${index}`}
          className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 rounded-md border border-border bg-surface p-3"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-text-primary">{contact.name}</p>
              {index === 0 && (
                <Badge tone="info" variant="soft">
                  Primary
                </Badge>
              )}
            </div>
            <p className="text-xs text-text-secondary">{contact.relationship}</p>
            <p className="mt-2 text-sm font-semibold tabular-nums text-text-primary">
              <span className="sr-only">Phone: </span>
              {contact.phone}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge tone={contact.verified ? 'success' : 'warning'} variant="soft">
              {contact.verified ? 'Verified' : 'Needs verification'}
            </Badge>
            {onVerify && (
              <Button
                size="sm"
                variant={contact.verified ? 'neutral' : 'secondary'}
                loading={busy === index}
                loadingText="Marking…"
                aria-label={`${contact.verified ? 'Mark unverified' : 'Mark verified'}: ${contact.name}`}
                onClick={() => void verify(index, !contact.verified)}
                className="print:hidden"
              >
                {contact.verified ? 'Mark unverified' : 'Mark verified'}
              </Button>
            )}
            {failed === index && (
              <p role="alert" className="text-xs text-error">
                Could not save the change. Try again.
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
