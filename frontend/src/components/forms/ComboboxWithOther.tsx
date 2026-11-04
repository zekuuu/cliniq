import { useState } from 'react'
import type { IconName } from '../icons/Icon'
import { Combobox } from '../ui/Combobox'
import { Input } from '../ui/Input'

/**
 * A type-ahead of known values with an "Other" action (review round 2, R15 and R19): typing lists the
 * values that start with it, and the Other option, which is never stored, shows a required box whose
 * text is the value. A saved value outside the list opens as Other with its text in the box. Used for
 * an emergency contact's relationship and the staff department or role.
 */
export function ComboboxWithOther({
  label,
  'aria-label': ariaLabel,
  icon,
  value,
  options,
  otherOption,
  otherLabel,
  required = false,
  hint,
  maxLength,
  pickOnly = false,
  error,
  onValueChange,
}: {
  label: string
  'aria-label'?: string
  icon?: IconName
  value: string
  /** The known values, without the Other action. */
  options: string[]
  /** The action's label, e.g. "Other" or "Other (specify)". */
  otherOption: string
  /** Label of the box it shows, e.g. "Say which relationship". */
  otherLabel: string
  required?: boolean
  hint?: string
  maxLength?: number
  /** True: typing only filters, so the value is a listed one or what the Other box holds (R19). */
  pickOnly?: boolean
  error?: string
  onValueChange: (value: string) => void
}) {
  const [other, setOther] = useState(() => Boolean(value) && !options.includes(value))
  // pickOnly: what is typed, kept apart from the value until a pick.
  const [query, setQuery] = useState(value)
  const text = pickOnly ? query : value
  const typed = other ? '' : text.trim().toLowerCase()
  const unmatched = pickOnly && !other && query.trim() !== '' && !options.includes(query)
  // Other is always the first option, whatever is typed (Zean, November 5, 2026), as in SelectWithOther.
  const shown = [otherOption, ...options.filter((option) => option.toLowerCase().startsWith(typed))]
  return (
    <div className="flex flex-col gap-2">
      <Combobox
        label={label}
        icon={icon}
        aria-label={ariaLabel}
        required={required}
        hint={hint}
        maxLength={maxLength}
        value={other ? otherOption : text}
        options={shown}
        optionKey={(option) => option}
        optionLabel={(option) => option}
        allowFreeText
        error={other ? undefined : error}
        onPick={(option) => {
          if (option !== otherOption) {
            setOther(false)
            setQuery(option)
            return
          }
          setOther(true)
          onValueChange('')
          return false
        }}
        onValueChange={(next) => {
          setOther(false)
          setQuery(next)
          if (!pickOnly) onValueChange(next)
          else onValueChange(options.find((option) => option.toLowerCase() === next.trim().toLowerCase()) ?? '')
        }}
      />
      {unmatched && <p className="text-xs text-text-secondary">Not saved until picked: choose one from the list, or {otherOption} for a new one.</p>}
      {other && (
        <Input
          label={otherLabel}
          aria-label={ariaLabel ? `${otherLabel} (${ariaLabel})` : undefined}
          required
          autoFocus
          maxLength={maxLength}
          value={value}
          error={error}
          onChange={(event) => onValueChange(event.target.value)}
        />
      )}
    </div>
  )
}
