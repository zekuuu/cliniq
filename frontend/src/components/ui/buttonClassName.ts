import { cn } from '../../lib/cn'

/**
 * Button hierarchy (Design-System.md, "Button Hierarchy & Color"):
 * - primary: the one likely action. Filled brand-green-dark with white text. Button labels are
 *   14px, which counts as *small* text, and the contrast rules only allow small white text on
 *   brand-green-dark (9.19:1), not brand-green (3.74:1). Hover lightens the fill slightly (still
 *   about 6.9:1), since there is no darker brand token to step down to.
 * - secondary: quieter outline with brand-green-dark text (brand-green text is only 3.74:1).
 * - neutral: cancel / go back. Visible, never competing.
 * - destructive: filled error red, reserved for genuinely irreversible actions only.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'neutral' | 'destructive'
export type ButtonSize = 'sm' | 'md'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-green-dark text-white border border-brand-green-dark shadow-raised hover:brightness-125',
  secondary:
    'bg-background text-brand-green-dark border border-brand-green shadow-card hover:bg-surface',
  neutral:
    'bg-background text-text-secondary border border-border hover:bg-surface hover:text-text-primary',
  destructive: 'bg-error text-white border border-error hover:brightness-90',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 gap-1.5 text-sm',
  md: 'h-10 px-4 gap-2 text-sm',
}

/**
 * The Button look as a class string, for a router `<Link>` that navigates but should read as a
 * button (e.g. "View Details", "Edit"). Real navigation stays a link for middle-click/open-in-tab.
 */
export function buttonClassName({
  variant = 'secondary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return cn(
    'inline-flex items-center justify-center rounded-md font-semibold whitespace-nowrap',
    'transition-[color,background-color,border-color,filter] duration-150 motion-reduce:transition-none',
    'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
    variantClasses[variant],
    sizeClasses[size],
    className,
  )
}

/** Each action verb's "-ing" form, for the busy label ("Save Visit" reads "Saving…"). */
const BUSY_VERBS: Record<string, string> = {
  add: 'Adding',
  apply: 'Applying',
  approve: 'Approving',
  back: 'Backing up',
  change: 'Changing',
  complete: 'Completing',
  confirm: 'Confirming',
  create: 'Creating',
  disable: 'Disabling',
  dispense: 'Dispensing',
  enable: 'Enabling',
  import: 'Importing',
  mark: 'Marking',
  record: 'Recording',
  report: 'Reporting',
  reset: 'Resetting',
  restock: 'Restocking',
  save: 'Saving',
  send: 'Sending',
  set: 'Setting',
  sign: 'Signing in',
  submit: 'Submitting',
  turn: 'Turning',
  update: 'Updating',
}

/**
 * The label a busy button reads (professor's consultation, November 6, 2026: no silent saves): the
 * action's own "-ing" form with an ellipsis, or the label unchanged when it isn't a known action.
 */
export function busyLabel(label: string): string | null {
  const verb = BUSY_VERBS[label.trim().split(/\s+/)[0]?.toLowerCase() ?? '']
  return verb ? `${verb}…` : null
}

/** Each action verb's past form, for the done label ("Save Changes" reads "Saved"). */
const DONE_VERBS: Record<string, string> = {
  add: 'Added',
  apply: 'Applied',
  approve: 'Approved',
  back: 'Backed up',
  change: 'Changed',
  complete: 'Completed',
  confirm: 'Confirmed',
  copy: 'Copied',
  create: 'Created',
  disable: 'Disabled',
  dispense: 'Dispensed',
  enable: 'Enabled',
  import: 'Imported',
  mark: 'Marked',
  record: 'Recorded',
  report: 'Reported',
  reset: 'Reset',
  restock: 'Restocked',
  save: 'Saved',
  send: 'Sent',
  set: 'Set',
  submit: 'Submitted',
  update: 'Updated',
  verify: 'Verified',
}

/**
 * The label a button reads for a moment after its action worked (Zean, November 8, 2026: "the same
 * concept as Copied … everywhere"): the action's past form, or null when it isn't a known action.
 */
export function doneLabel(label: string): string | null {
  return DONE_VERBS[label.trim().split(/\s+/)[0]?.toLowerCase() ?? ''] ?? null
}
