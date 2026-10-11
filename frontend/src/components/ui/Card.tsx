import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * The shared panel surface: white, rounded-md, soft shadow, no outline (reference-mockup style).
 * Print and forced-colors modes get a real border back, since shadows don't survive either.
 * Use this class for any custom container (skeletons included) so every panel matches.
 */
export const CARD_SURFACE =
  'rounded-md bg-background shadow-card forced-colors:border print:border print:border-border print:shadow-none'

export function Card({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={cn(CARD_SURFACE, 'print:break-inside-avoid', className)} {...rest} />
}

export interface CardHeaderProps {
  /** Rendered as an h2 by default; pass `headingLevel` to fit the page outline. */
  title: ReactNode
  titleId?: string
  headingLevel?: 2 | 3
  description?: ReactNode
  /** Leading icon element, shown before the title. */
  icon?: ReactNode
  /** Right-aligned controls (toggles, counts). */
  actions?: ReactNode
  className?: string
}

export function CardHeader({
  title,
  titleId,
  headingLevel = 2,
  description,
  icon,
  actions,
  className,
}: CardHeaderProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pt-5 pb-3',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {icon && <span className="shrink-0 text-brand-green-dark [&>svg]:size-8">{icon}</span>}
        <div className="min-w-0">
          <Heading id={titleId} className="text-base font-semibold text-text-primary">
            {title}
          </Heading>
          {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2 print:hidden">{actions}</div>}
    </div>
  )
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...rest} />
}
