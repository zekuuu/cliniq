import type { CalledContact, EmergencyContact, ParentNotificationOutcome } from '../../types/entities'

/** The one list of parent-notification outcomes (panel review IN-6, D6), for every incident screen. */
export const PARENT_NOTIFICATION_OUTCOMES = [
  { value: 'reached', label: 'Reached' },
  { value: 'no_answer', label: 'No answer' },
  { value: 'left_message_or_voicemail', label: 'Left message or voicemail' },
  { value: 'wrong_number', label: 'Wrong number' },
] satisfies Array<{ value: ParentNotificationOutcome; label: string }>

export const OUTCOME_LABELS = Object.fromEntries(
  PARENT_NOTIFICATION_OUTCOMES.map((item) => [item.value, item.label]),
) as Record<ParentNotificationOutcome, string>

/** "Maria Santos (Mother) · 0917 123 4567", or "Not recorded" for attempts saved before the field existed. */
export function calledContactText(contact: CalledContact | null | undefined): string {
  if (!contact) return 'Not recorded'
  return `${contact.name}${contact.relationship ? ` (${contact.relationship})` : ''} · ${contact.phone}`
}

export const OTHER_CONTACT = 'other'

export interface CalledContactDraft {
  /** The contact's index in the student's saved order, or "other". */
  choice: string
  name: string
  phone: string
}

export interface CalledContactErrors {
  calledName?: string
  calledPhone?: string
}

/** Starts on the primary contact, or on "Other" when the student has none. */
export function initialCalledDraft(contacts: EmergencyContact[]): CalledContactDraft {
  return { choice: contacts.length ? '0' : OTHER_CONTACT, name: '', phone: '' }
}

/** The snapshot to save, or the errors that stop the attempt from being added. */
export function resolveCalledContact(
  draft: CalledContactDraft,
  contacts: EmergencyContact[],
): { contact: CalledContact; errors: null } | { contact: null; errors: CalledContactErrors } {
  if (draft.choice !== OTHER_CONTACT) {
    const picked = contacts[Number(draft.choice)]
    if (picked) return { contact: { name: picked.name, relationship: picked.relationship, phone: picked.phone, source: 'emergency_contact' }, errors: null }
  }
  const errors: CalledContactErrors = {}
  if (!draft.name.trim()) errors.calledName = 'Enter the name of the person called.'
  if (!draft.phone.trim()) errors.calledPhone = 'Enter the number called.'
  if (errors.calledName || errors.calledPhone) return { contact: null, errors }
  return { contact: { name: draft.name.trim(), relationship: null, phone: draft.phone.trim(), source: 'other' }, errors: null }
}
