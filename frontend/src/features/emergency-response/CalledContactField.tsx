import { Input, Select } from '../../components'
import type { EmergencyContact } from '../../types/entities'
import { OTHER_CONTACT, type CalledContactDraft, type CalledContactErrors } from './notificationOutcomes'

/** "Who was called" for one notification attempt (panel review IN-6): a saved emergency contact, or Other. */
export function CalledContactField({
  contacts,
  draft,
  onChange,
  errors,
}: {
  contacts: EmergencyContact[]
  draft: CalledContactDraft
  onChange: (draft: CalledContactDraft) => void
  errors: CalledContactErrors
}) {
  return (
    <div className="flex flex-col gap-3">
      <Select
        label="Who was called"
        value={draft.choice}
        onChange={(choice) => onChange({ ...draft, choice })}
        options={[
          ...contacts.map((contact, index) => ({
            value: String(index),
            label: `${contact.name} (${contact.relationship}) · ${contact.phone}`,
          })),
          { value: OTHER_CONTACT, label: 'Other (type the name and number)' },
        ]}
      />
      {draft.choice === OTHER_CONTACT && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Name of person called"
            required
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            error={errors.calledName}
          />
          <Input
            type="tel"
            label="Number called"
            required
            value={draft.phone}
            onChange={(event) => onChange({ ...draft, phone: event.target.value })}
            error={errors.calledPhone}
          />
        </div>
      )}
    </div>
  )
}
