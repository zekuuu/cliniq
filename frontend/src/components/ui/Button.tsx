import { useEffect, useState, type ButtonHTMLAttributes, type Ref } from 'react'
import { Icon, type IconName } from '../icons/Icon'
import { busyLabel, buttonClassName, doneLabel, type ButtonSize, type ButtonVariant } from './buttonClassName'

export type { ButtonSize, ButtonVariant }

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Leading icon, always shown alongside the visible label (icon + text). */
  icon?: IconName
  /** Shows a busy state, reads the action's "-ing" form ("Saving…"), and blocks repeat clicks. */
  loading?: boolean
  /** The busy label when the default from the visible label doesn't fit. */
  loadingText?: string
  /**
   * The action worked: when this turns true, the button reads its past form ("Saved", "Copied") with a
   * check icon for `DONE_MS`, then returns to its label. Pass the screen's own success signal.
   */
  done?: boolean
  /** The done label when the default from the visible label doesn't fit. */
  doneText?: string
  /** React 19 passes `ref` as a prop; it reaches the `<button>` through `rest`. */
  ref?: Ref<HTMLButtonElement>
}

/** How long a button shows its done state (Zean, November 8, 2026). */
export const DONE_MS = 2000

/** True for `DONE_MS` each time `done` turns true; false again at once if `done` turns false. */
function useDoneFlash(done: boolean): boolean {
  const [previous, setPrevious] = useState(done)
  const [shown, setShown] = useState(false)
  // Adjusted while rendering when `done` changes (React's pattern for state derived from a prop).
  if (done !== previous) {
    setPrevious(done)
    setShown(done)
  }
  useEffect(() => {
    if (!shown) return
    const timer = setTimeout(() => setShown(false), DONE_MS)
    return () => clearTimeout(timer)
  }, [shown])
  return shown
}

/** Variant hierarchy and colors are documented in `./buttonClassName.ts`. */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  loadingText,
  done = false,
  doneText,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const label = typeof children === 'string' ? children : null
  const doneShown = useDoneFlash(done) && !loading
  const doneWords = doneShown ? (doneText ?? (label ? doneLabel(label) : null)) : null
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClassName({ variant, size, className })}
      {...rest}
    >
      {loading ? (
        <Icon name="refresh" className="animate-spin motion-reduce:animate-none" />
      ) : doneShown ? (
        <Icon name="check" />
      ) : (
        icon && <Icon name={icon} />
      )}
      {(loading && (loadingText ?? (label ? busyLabel(label) : null))) || doneWords || children}
    </button>
  )
}
