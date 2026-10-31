import { useId, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'onChange' | 'value'> {
  label: string
  /** Keeps the label for screen readers only, for a repeated field in a compact row. */
  hideLabel?: boolean
  value: string
  onChange: (value: string) => void
  error?: string
  id?: string
  className?: string
}

/** Multi-line field with the same label, border, hover, and error treatment as `Input`. */
export function Textarea({
  label,
  hideLabel = false,
  value,
  onChange,
  error,
  id,
  required,
  rows = 4,
  className,
  ...rest
}: TextareaProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const errorId = error ? `${fieldId}-error` : undefined
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={fieldId} className={hideLabel ? 'sr-only' : 'text-xs font-semibold text-text-primary'}>
        {label}
        {required && (
          <span className="text-error" aria-hidden="true">
            {' '}
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        required={required}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'resize-y rounded-md border bg-background px-3 py-2 text-sm text-text-primary shadow-card',
          'transition-colors duration-150 hover:border-brand-green motion-reduce:transition-none',
          error ? 'border-error' : 'border-border',
        )}
        {...rest}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  )
}
