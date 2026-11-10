import { useId, useState } from 'react'
import { NAME_PART_MAX } from '../../lib/personName'
import { cn } from '../../lib/cn'
import { Input } from '../ui/Input'

export interface NameValues {
  firstName: string
  lastName: string
  middleName: string
}

type NameKey = keyof NameValues

/**
 * First name, Last name and Middle name (optional, unmarked), in that order (Zean, November 4, 2026; ADR-064).
 * The placeholders are examples of what to type, never data that looks real. Two columns from
 * `md`, stacked below it. Errors come from the form, keyed `firstName`, `lastName`, `middleName`.
 */
export function NameFields({
  values,
  errors,
  onChange,
  hint,
  className,
}: {
  values: NameValues
  errors: Partial<Record<NameKey, string>>
  onChange: (field: NameKey, value: string) => void
  /** Shown under the three fields, for example where the name should come from. */
  hint: string
  className?: string
}) {
  const hintId = useId()
  // "No middle name" (Zean, November 5, 2026): ticking it clears and locks the field, so a blank
  // middle name is a stated answer, not one left out. Starts unticked; the value stays '' either way.
  const [noMiddle, setNoMiddle] = useState(false)
  const field = (key: NameKey) => ({
    value: values[key],
    error: errors[key],
    maxLength: NAME_PART_MAX[key],
    autoComplete: 'off',
    onChange: (event: { target: { value: string } }) => onChange(key, event.target.value),
  })
  return (
    <fieldset className={cn('flex flex-col gap-2', className)} aria-describedby={hintId}>
      <legend className="sr-only">Name</legend>
      {/* Three columns, in line with the other fields on the form; the placeholders stay short so none is cut off. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Input
          label="First name"
          required
          placeholder="e.g. Maria Angela"
          {...field('firstName')}
        />
        <Input label="Last name" required placeholder="e.g. Dela Cruz" {...field('lastName')} />
        <div className="flex flex-col gap-2">
          <Input
            label="Middle name"
            placeholder={noMiddle ? 'None' : 'e.g. Santos (optional)'}
            disabled={noMiddle}
            {...field('middleName')}
          />
          <label className="inline-flex cursor-pointer items-center gap-2 self-start text-sm text-text-primary">
            <input
              type="checkbox"
              checked={noMiddle}
              onChange={(event) => {
                setNoMiddle(event.target.checked)
                if (event.target.checked) onChange('middleName', '')
              }}
              className="size-4 cursor-pointer accent-brand-green-dark"
            />
            No middle name
          </label>
        </div>
      </div>
      <p id={hintId} className="text-xs text-text-secondary">
        {hint}
      </p>
    </fieldset>
  )
}
