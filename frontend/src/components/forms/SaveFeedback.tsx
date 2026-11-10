import type { SaveResult } from '../../hooks/useSaveFeedback'
import { cn } from '../../lib/cn'
import { Icon } from '../icons/Icon'

/**
 * The message beside a save button (`useSaveFeedback`): a polite `role="status"` on success, a
 * `role="alert"` on failure. An icon and the words carry the meaning, never colour alone (ADR-062).
 */
export function SaveFeedback({ result, className }: { result: SaveResult; className?: string }) {
  if (!result) return null
  const failed = result.kind === 'failed'
  return (
    <p
      role={failed ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-text-primary',
        failed ? 'border-error bg-error/10' : 'border-success bg-success/10',
        className,
      )}
    >
      <Icon
        name={failed ? 'alertTriangle' : 'checkCircle'}
        size={16}
        className={cn('mt-0.5 shrink-0', failed ? 'text-error' : 'text-success')}
      />
      {result.message}
    </p>
  )
}
