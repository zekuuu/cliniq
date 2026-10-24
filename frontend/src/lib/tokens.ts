/**
 * Reads a color token from the CSS custom properties defined in src/index.css. Canvas charts can't
 * use Tailwind classes, so they read the same variables here and index.css stays the single source.
 */
export type ColorToken =
  | 'brand-green'
  | 'brand-green-dark'
  | 'brand-green-light'
  | 'text-primary'
  | 'text-secondary'
  | 'text-muted'
  | 'border'
  | 'surface'
  | 'background'
  | 'warning'
  | 'error'
  | 'info'
  | 'chart-female'
  | 'chart-male'
  | 'white'

export function colorToken(name: ColorToken): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim()
}
