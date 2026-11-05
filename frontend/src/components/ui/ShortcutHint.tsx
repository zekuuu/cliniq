import { cn } from '../../lib/cn'

/**
 * A keyboard-shortcut tip beside a control's label (Zean, November 5, 2026). Shortcuts are a desktop
 * feature, so it shows from `md` only. Hidden from assistive tech: the control carries the same keys
 * in `aria-keyshortcuts`, so its accessible name stays its label. Inherits the control's text colour,
 * so it reads on a white row and on a green button alike.
 */
export function ShortcutHint({ keys, className }: { keys: string; className?: string }) {
  return (
    <kbd
      aria-hidden="true"
      className={cn(
        // Muted, with its outline kept (Zean, November 5, 2026): a quiet aside, not a second label.
        'ml-auto hidden shrink-0 rounded-sm border border-current/30 px-1.5 font-sans text-xs leading-5 font-normal whitespace-nowrap opacity-75 md:inline',
        className,
      )}
    >
      {keys}
    </kbd>
  )
}
