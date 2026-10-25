import { SelectWithOther } from '../../components'
import { COMPLAINT_MAX_LENGTH } from '../../lib/complaints'

/** How many complaint suggestions the list shows at once. */
const COMPLAINT_SUGGESTION_LIMIT = 8

/**
 * The visit Complaint field (cliniq-combobox-patterns): a dropdown of familiar suggestions with
 * an explicit Other path (`SelectWithOther`). Used by New Visit and the Visit Detail edit form; both
 * save through `normalizeComplaint`.
 */
export function ComplaintField({
  value,
  onChange,
  suggestions,
  error,
  autoFocus = false,
}: {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  error?: string
  /** Focus the dropdown trigger when it is the first field in an identified-student visit. */
  autoFocus?: boolean
}) {
  return (
    <SelectWithOther
      label="Complaint"
      otherLabel="Specify other complaint"
      autoFocus={autoFocus}
      required
      value={value}
      onChange={onChange}
      options={suggestions.slice(0, COMPLAINT_SUGGESTION_LIMIT)}
      placeholder="Select complaint"
      hint="The complaint or symptom only. Don't include names."
      maxLength={COMPLAINT_MAX_LENGTH}
      error={error}
    />
  )
}
