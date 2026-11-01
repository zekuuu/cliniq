import { cn } from '../../lib/cn'
import { Icon } from '../icons/Icon'
import { Button } from './Button'

/**
 * Failed-to-load message with a retry action. Plain language only; never surface a raw API error
 * (Design-System.md, Feedback & System States).
 */
export function ErrorState({
  title = 'Unable to load this information.',
  description = 'Check that the clinic server is running, then try again.',
  onRetry,
  className,
  asPageTitle = false,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
  /** The screen failed before its own heading rendered, so this title is its `h1`. */
  asPageTitle?: boolean
}) {
  const Title = asPageTitle ? 'h1' : 'p'
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-2 rounded-md border border-error bg-background px-4 py-6 text-center',
        className,
      )}
    >
      <Icon name="alertOctagon" size={20} className="text-error" />
      <Title className="text-sm font-semibold text-text-primary">{title}</Title>
      <p className="text-xs text-text-secondary">{description}</p>
      {onRetry && (
        <Button variant="primary" size="sm" icon="refresh" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  )
}
