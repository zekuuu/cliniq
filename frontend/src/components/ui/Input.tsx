import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from 'react'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from '../icons/Icon'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  /** A real, visible label. Placeholder text never stands in for one. */
  label: string
  hint?: string
  /** Plain-language validation message, shown under the field. */
  error?: string
  /** Decorative leading icon inside the field; the visible label still names it. */
  icon?: IconName
  id?: string
  className?: string
  inputClassName?: string
  /** Set false to drop the clear (X) button, e.g. the login username. */
  clearable?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    icon,
    id,
    type,
    required,
    disabled,
    className,
    inputClassName,
    clearable: clearableProp = true,
    ...rest
  }: InputProps,
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  // Every password field can be revealed, so a typo can be checked before it counts toward lockout.
  const isPassword = type === 'password'
  const [revealed, setRevealed] = useState(false)
  // A search field (Zean, November 4, 2026): what is typed reaches the page 250ms after typing stops, and a
  // clear button shows whenever there is text (the browser's own shows only on hover or focus).
  const isSearch = type === 'search'
  const { value, onChange, ...fieldProps } = rest
  const [draft, setDraft] = useState(String(value ?? ''))
  const timer = useRef<number | undefined>(undefined)
  // A change from outside (Clear Filters, a link that sets the search) shows at once.
  useEffect(() => {
    if (isSearch) setDraft(String(value ?? ''))
  }, [isSearch, value])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const searchProps = isSearch
    ? {
        value: draft,
        onChange: (event: ChangeEvent<HTMLInputElement>) => {
          setDraft(event.target.value)
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => onChange?.(event), 250)
        },
      }
    : { value, onChange }
  // Every editable text field has a clear button while it holds text (Zean, November 5, 2026): not
  // passwords (the reveal eye sits there), dates and times (their own pickers), read-only or disabled fields.
  const clearable =
    clearableProp &&
    (isSearch ||
      (['text', 'tel', 'email', 'url', 'number', undefined].includes(type) && !fieldProps.readOnly))
  const shown = isSearch ? draft : String(value ?? '')
  const showClear = clearable && shown !== '' && !disabled
  function clearSearch() {
    window.clearTimeout(timer.current)
    setDraft('')
    onChange?.({
      target: { value: '' },
      currentTarget: { value: '' },
    } as ChangeEvent<HTMLInputElement>)
    document.getElementById(inputId)?.focus()
  }
  const field = (
    <input
      id={inputId}
      ref={ref}
      type={isPassword && revealed ? 'text' : type}
      required={required}
      disabled={disabled}
      aria-invalid={error ? true : undefined}
      aria-describedby={cn(hintId, errorId) || undefined}
      className={cn(
        'h-10 rounded-md border bg-background px-3 text-sm font-semibold text-text-primary shadow-card transition-colors duration-150 hover-field:border-brand-green hover-field:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none',
        error ? 'border-error' : 'border-border',
        icon && 'pl-9',
        // Edge draws its own reveal eye; hide it so the field never shows two.
        isPassword && 'pr-10 [&::-ms-reveal]:hidden',
        isSearch && '[&::-webkit-search-cancel-button]:hidden',
        clearable && 'pr-9',
        inputClassName,
      )}
      {...fieldProps}
      {...searchProps}
    />
  )
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={inputId} className="text-sm font-semibold text-text-primary">
        {label}
        {required && (
          <span className="text-error" aria-hidden="true">
            {' '}
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {icon || isPassword || clearable ? (
        <div className="relative flex flex-col">
          {icon && (
            <Icon
              name={icon}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-secondary"
            />
          )}
          {field}
          {showClear && (
            <button
              type="button"
              aria-label={isSearch ? 'Clear search' : 'Clear'}
              aria-controls={inputId}
              onClick={clearSearch}
              className="absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-text-secondary transition-colors hover:text-brand-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none"
            >
              <Icon name="x" size={16} />
            </button>
          )}
          {isPassword && (
            <button
              type="button"
              aria-label="Show password"
              aria-pressed={revealed}
              aria-controls={inputId}
              disabled={disabled}
              onClick={() => setRevealed((value) => !value)}
              className="absolute top-1/2 right-3 inline-flex -translate-y-1/2 cursor-pointer rounded-sm text-text-secondary transition-colors hover:text-brand-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              <Icon name={revealed ? 'eyeOff' : 'eye'} />
            </button>
          )}
        </div>
      ) : (
        field
      )}
      {hint && !error && (
        <p id={hintId} className="text-xs text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  )
})
