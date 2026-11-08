import { useId, useState } from 'react'
import { Input } from './Input'

/**
 * A one-time code as separate boxes, the usual modern pattern (Zean, November 7, 2026). One real
 * `<input>` sits invisibly over the boxes, so typing, Backspace, paste, the phone's code autofill and
 * screen readers all work as on a normal field; the boxes only show it. Digits only. Centered, with
 * the label above, the hint below, and a 3 + 3 split so six digits read in two chunks (Zean,
 * November 8, 2026).
 */
export function CodeInput({
  label,
  value,
  onChange,
  onComplete,
  length = 6,
  hint,
  autoFocus = false,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  /** Called once the last digit is entered, for example to continue without a button press. */
  onComplete?: (value: string) => void
  length?: number
  hint?: string
  autoFocus?: boolean
  disabled?: boolean
}) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const [focused, setFocused] = useState(false)
  const active = Math.min(value.length, length - 1)
  const split = length % 2 === 0 ? length / 2 : -1
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <label htmlFor={id} className="text-sm font-semibold text-text-primary">
        {label}
      </label>
      <div className="relative w-fit">
        <div aria-hidden="true" className="flex gap-2">
          {Array.from({ length }, (_, index) => {
            const char = value[index] ?? ''
            const current = focused && index === active
            return (
              <div
                key={index}
                data-code-box
                className={`flex h-14 w-12 items-center justify-center rounded-md border bg-background text-2xl font-semibold text-text-primary tabular-nums shadow-card transition-colors motion-reduce:transition-none ${
                  index === split ? 'ml-3' : ''
                } ${current ? 'border-brand-green ring-2 ring-brand-green/30' : char ? 'border-text-muted' : 'border-border'} ${disabled ? 'opacity-50' : ''}`}
              >
                {char || (current && value.length < length ? <span className="h-7 w-px animate-pulse bg-text-primary motion-reduce:animate-none" /> : null)}
              </div>
            )
          })}
        </div>
        <input
          id={id}
          value={value}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={length}
          aria-describedby={hintId}
          data-autofocus={autoFocus || undefined}
          autoFocus={autoFocus}
          spellCheck={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => {
            const next = event.target.value.replace(/\D/g, '').slice(0, length)
            onChange(next)
            if (next.length === length && value.length !== length) onComplete?.(next)
          }}
          // Invisible but present: the caret always sits at the end, like the boxes show.
          className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none selection:bg-transparent disabled:cursor-not-allowed"
        />
      </div>
      {hint && (
        <p id={hintId} className="max-w-xs text-xs text-text-secondary">
          {hint}
        </p>
      )}
    </div>
  )
}

const LINK_BUTTON =
  'w-fit cursor-pointer rounded-sm text-sm font-semibold text-brand-green-dark underline underline-offset-2 transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none'

/**
 * The 6-digit authenticator code in code boxes, with "Use a recovery code instead" below to swap in
 * a recovery code (ABCD-EFGH). One look for Forgot password and for replacing or disabling the
 * authenticator (Zean, November 8, 2026).
 */
export function CodeOrRecoveryField({
  recovery,
  onRecoveryChange,
  value,
  onChange,
  onComplete,
  disabled = false,
}: {
  recovery: boolean
  onRecoveryChange: (recovery: boolean) => void
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      {recovery ? (
        <Input
          label="Recovery code"
          autoComplete="off"
          required
          value={value}
          maxLength={9}
          placeholder="ABCD-EFGH"
          autoFocus
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          clearable={false}
          className="w-full max-w-60"
          inputClassName="text-center font-mono tracking-wider"
        />
      ) : (
        <CodeInput
          label="6-digit code"
          value={value}
          autoFocus
          disabled={disabled}
          onChange={onChange}
          onComplete={onComplete}
          hint="If codes do not work, check that the phone's date and time are set automatically."
        />
      )}
      <button type="button" className={LINK_BUTTON} onClick={() => onRecoveryChange(!recovery)}>
        {recovery ? 'Use the authenticator app instead' : 'Use a recovery code instead'}
      </button>
    </div>
  )
}
