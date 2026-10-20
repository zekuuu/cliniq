import type { EmergencyContact } from '../types/entities'
import { Badge } from './ui/Badge'

/** Ordered student contacts: the first row is always the primary contact. */
export function EmergencyContactList({
  contacts,
  emptyMessage = 'No emergency contact recorded.',
}: {
  contacts: EmergencyContact[]
  emptyMessage?: string
}) {
  if (!contacts.length) return <p className="text-sm text-text-secondary">{emptyMessage}</p>
  return (
    <ol className="mt-2 flex flex-col gap-2">
      {contacts.map((contact, index) => (
        <li key={`${contact.name}-${contact.phone}-${index}`} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 rounded-md border border-border bg-surface p-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-text-primary">{contact.name}</p>
              {index === 0 && <Badge tone="info" variant="soft">Primary</Badge>}
            </div>
            <p className="text-xs text-text-secondary">{contact.relationship}</p>
            <p className="mt-2 text-sm font-semibold tabular-nums text-text-primary">
              <span className="sr-only">Phone: </span>
              {contact.phone}
            </p>
          </div>
          <Badge tone={contact.verified ? 'success' : 'warning'} variant="soft">
            {contact.verified ? 'Verified' : 'Needs verification'}
          </Badge>
        </li>
      ))}
    </ol>
  )
}
