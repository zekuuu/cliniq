import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Icon, type IconName } from '../icons/Icon'

/**
 * Badge: always icon + label, never color alone (Design-System.md, Accessibility / Color System).
 *
 * Tone → token mapping (every combination is contrast-checked; see src/index.css):
 * - solid info/success/error: semantic fill + white text (4.60–5.73:1, all pass for small text);
 *   solid warning is orange with text-primary (6.65:1). Use when the state needs to be noticed at a glance.
 * - soft (default for statuses): a 10% tint of the semantic color, icon in the semantic color, and a
 *   text-primary label (≥ 12:1). This is the reference mockup's pale-pill look. The tone's own color is
 *   never used for the small label, because tinted-on-tint text drops below 4.5:1.
 * - outline: white fill, semantic border + icon, text-primary label.
 * - neutral: surface fill, text-secondary (5.68:1).
 * - accent: brand-yellow fill + text-primary (13.49:1). Brand highlight, not a status.
 * - unfinished / letter: one meaning each (ADR-062), an unfinished incident record and a pending
 *   excuse letter.
 */
export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'accent' | 'unfinished' | 'letter'
export type BadgeVariant = 'solid' | 'soft' | 'outline'

const defaultIcons: Partial<Record<BadgeTone, IconName>> = {
  info: 'info',
  success: 'checkCircle',
  warning: 'alertTriangle',
  error: 'alertOctagon',
  unfinished: 'alertTriangle',
  letter: 'clock',
}

const solidClasses: Record<BadgeTone, string> = {
  neutral: 'bg-surface text-text-secondary border-border',
  info: 'bg-info text-white border-info',
  success: 'bg-success text-white border-success',
  warning: 'bg-warning text-text-primary border-warning',
  error: 'bg-error text-white border-error',
  accent: 'bg-brand-yellow text-text-primary border-brand-yellow-dark',
  unfinished: 'bg-unfinished text-text-primary border-unfinished',
  letter: 'bg-letter text-text-primary border-letter',
}

const softClasses: Record<BadgeTone, string> = {
  neutral: 'bg-surface text-text-secondary',
  info: 'bg-info/10 text-text-primary',
  success: 'bg-success/10 text-text-primary',
  warning: 'bg-warning-fill text-text-primary',
  error: 'bg-error/10 text-text-primary',
  accent: 'bg-brand-yellow/40 text-text-primary',
  unfinished: 'bg-unfinished-fill text-text-primary',
  letter: 'bg-letter-fill text-text-primary',
}

const outlineIconClasses: Record<BadgeTone, string> = {
  neutral: 'text-text-secondary',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning-text',
  error: 'text-error',
  accent: 'text-text-primary',
  unfinished: 'text-unfinished-text',
  letter: 'text-letter-text',
}

const outlineBorderClasses: Record<BadgeTone, string> = {
  neutral: 'border-border',
  info: 'border-info',
  success: 'border-success',
  warning: 'border-warning',
  error: 'border-error',
  accent: 'border-brand-yellow-dark',
  unfinished: 'border-unfinished',
  letter: 'border-letter',
}

export interface BadgeProps {
  tone?: BadgeTone
  variant?: BadgeVariant
  /** Overrides the tone's default icon. Pass `null` for a text-only neutral badge. */
  icon?: IconName | null
  children: ReactNode
  className?: string
}

export function Badge({
  tone = 'neutral',
  variant = 'solid',
  icon,
  children,
  className,
}: BadgeProps) {
  const iconName = icon === null ? undefined : (icon ?? defaultIcons[tone])
  const isOutline = variant === 'outline'
  const isSoft = variant === 'soft'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        isOutline
          ? cn('bg-background text-text-primary', outlineBorderClasses[tone])
          : isSoft
            ? cn('border-transparent', softClasses[tone])
            : solidClasses[tone],
        // Forced-colors / print: keep a visible outline so the badge still reads as a badge.
        'forced-colors:border-[CanvasText] print:border-current',
        className,
      )}
    >
      {iconName && (
        <Icon
          name={iconName}
          size={12}
          className={cn('shrink-0', (isOutline || isSoft) && outlineIconClasses[tone])}
        />
      )}
      {children}
    </span>
  )
}
