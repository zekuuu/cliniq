import { useState } from 'react'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'

const OTHER_VALUE = '__other__'

/**
 * A dropdown of familiar choices with an explicit "Other (type your own)" path
 * (cliniq-combobox-patterns): Other is always the first option, stays visibly selected, and reveals
 * a focused text field whose text is the value. The option label itself is never stored. Used by the
 * visit and incident Complaint fields and the Staff Form's department or role (ADR-043).
 */
export function SelectWithOther({
  label,
  otherLabel,
  value,
  onChange,
  options,
  placeholder,
  hint,
  error,
  maxLength,
  required = false,
  clearable = false,
  autoFocus = false,
}: {
  label: string
  /** Label of the revealed text field, e.g. "Specify other complaint". */
  otherLabel: string
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder: string
  hint?: string
  error?: string
  maxLength?: number
  required?: boolean
  /** The placeholder is also a real choice that clears the value (an optional field). */
  clearable?: boolean
  autoFocus?: boolean
}) {
  const [otherSelected, setOtherSelected] = useState(false)
  const usingOther = otherSelected || (Boolean(value) && !options.includes(value))
  return (
    <>
      <Select
        label={label}
        autoFocus={autoFocus}
        required={required}
        clearable={clearable}
        value={usingOther ? OTHER_VALUE : value}
        onChange={(next) => {
          setOtherSelected(next === OTHER_VALUE)
          onChange(next === OTHER_VALUE ? '' : next)
        }}
        options={[{ value: OTHER_VALUE, label: 'Other (type your own)' }, ...options.map((option) => ({ value: option, label: option }))]}
        placeholder={placeholder}
        hint={hint}
        error={usingOther ? undefined : error}
      />
      {usingOther && (
        <Input
          label={otherLabel}
          required={required}
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={maxLength}
          hint={hint}
          error={error}
        />
      )}
    </>
  )
}
