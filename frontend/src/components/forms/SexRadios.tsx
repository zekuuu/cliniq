import { useId } from 'react'
import type { StudentSex } from '../../types/entities'

const OPTIONS: Array<{ value: StudentSex; label: string }> = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
]

/** Sex as one answer of two (ADR-063): native radio buttons, so arrow keys and Space work as expected. */
export function SexRadios({
  value,
  error,
  onChange,
}: {
  value: StudentSex | ''
  error?: string
  onChange: (value: StudentSex) => void
}) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className="flex flex-col gap-1">
      <span id={id} className="text-sm font-semibold text-text-primary">
        Sex{' '}
        <span aria-hidden="true" className="text-error">
          *
        </span>
      </span>
      <div
        role="radiogroup"
        aria-labelledby={id}
        aria-required="true"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="flex min-h-10 flex-wrap items-center gap-4"
      >
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold text-text-primary"
          >
            <input
              type="radio"
              name={id}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="size-4 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark"
            />
            {option.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="text-xs font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  )
}
