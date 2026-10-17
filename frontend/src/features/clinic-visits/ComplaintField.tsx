import { Combobox } from '../../components'
import { cleanComplaint, COMPLAINT_MAX_LENGTH } from '../../lib/complaints'

/** How many complaint suggestions the list shows at once. */
const COMPLAINT_SUGGESTION_LIMIT = 8
const OTHER_OPTION = { kind: 'other' as const, label: 'Other (type your own)' }
type ComplaintOption = typeof OTHER_OPTION | { kind: 'suggestion'; label: string }

/**
 * The visit Complaint field (cliniq-combobox-patterns): free text with suggestions, filtered by a
 * case-insensitive "contains" match. Used by New Visit and the Visit Detail edit form; both save
 * through `normalizeComplaint`.
 */
export function ComplaintField({
  value,
  onChange,
  suggestions,
  error,
}: {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  error?: string
}) {
  const typed = cleanComplaint(value).toLowerCase()
  const matches = suggestions.filter((label) => label.toLowerCase().includes(typed)).slice(0, COMPLAINT_SUGGESTION_LIMIT)
  const options: ComplaintOption[] = [OTHER_OPTION, ...matches.map((label) => ({ kind: 'suggestion' as const, label }))]
  return (
    <Combobox
      label="Complaint"
      required
      allowFreeText
      value={value}
      onValueChange={onChange}
      options={options}
      optionKey={(option) => option.kind === 'other' ? option.kind : option.label}
      optionLabel={(option) => option.label}
      onPick={(option) => {
        if (option.kind !== 'other') return
        onChange('')
        return false
      }}
      noMatchesText="No matching suggestion. What you typed is saved as is."
      maxLength={COMPLAINT_MAX_LENGTH}
      placeholder="e.g. Headache"
      hint="The complaint or symptom only. Don't include names."
      error={error}
    />
  )
}
