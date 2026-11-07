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
        // Muted plain text, no outline (Zean, November 5, 2026): a quiet aside, not a second label.
        'ml-auto hidden shrink-0 pl-3 font-sans text-xs leading-5 font-normal whitespace-nowrap opacity-75 md:inline',
        className,
      )}
    >
      {/* Spaced ("Alt + D") so the keys don't run together; aria-keyshortcuts keeps "Alt+D". */}
      {keys.replaceAll('+', ' + ')}
    </kbd>
  )
}
