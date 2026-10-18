import { useState } from 'react'
import { Input, Select } from '../../components'
import { COMPLAINT_MAX_LENGTH } from '../../lib/complaints'

/** How many complaint suggestions the list shows at once. */
const COMPLAINT_SUGGESTION_LIMIT = 8
const OTHER_VALUE = '__other__'

/**
 * The visit Complaint field (cliniq-combobox-patterns): a dropdown of familiar suggestions with
 * an explicit Other path. Used by New Visit and the Visit Detail edit form; both save through
 * `normalizeComplaint`.
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
  const [otherSelected, setOtherSelected] = useState(false)
  const options = [
    { value: OTHER_VALUE, label: 'Other (type your own)' },
    ...suggestions.slice(0, COMPLAINT_SUGGESTION_LIMIT).map((label) => ({ value: label, label })),
  ]
  const usingOther = otherSelected || (Boolean(value) && !suggestions.includes(value))
  return (
    <>
      <Select
        label="Complaint"
        autoFocus={autoFocus}
        required
        value={usingOther ? OTHER_VALUE : value}
        onChange={(nextValue) => {
          if (nextValue === OTHER_VALUE) {
            setOtherSelected(true)
            onChange('')
            return
          }
          setOtherSelected(false)
          onChange(nextValue)
        }}
        options={options}
        placeholder="Select complaint"
        hint="The complaint or symptom only. Don't include names."
        error={usingOther ? undefined : error}
      />
      {usingOther && (
        <Input
          label="Specify other complaint"
          required
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={COMPLAINT_MAX_LENGTH}
          hint="The complaint or symptom only. Don't include names."
          error={error}
        />
      )}
    </>
  )
}
