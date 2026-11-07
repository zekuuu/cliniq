import type { ButtonHTMLAttributes, Ref } from 'react'
import { Icon, type IconName } from '../icons/Icon'
import { busyLabel, buttonClassName, type ButtonSize, type ButtonVariant } from './buttonClassName'

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
  /** React 19 passes `ref` as a prop; it reaches the `<button>` through `rest`. */
  ref?: Ref<HTMLButtonElement>
}

/** Variant hierarchy and colors are documented in `./buttonClassName.ts`. */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  loadingText,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
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
      ) : (
        icon && <Icon name={icon} />
      )}
      {(loading && (loadingText ?? (typeof children === 'string' ? busyLabel(children) : null))) || children}
    </button>
  )
}
