import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** The divider between form sections and above a form's action row (Zean, November 5, 2026). */
export const FORM_DIVIDER = 'border-t border-text-muted/50'

/**
 * One titled group of a form's fields (Zean, November 5, 2026): a visible heading, an optional
 * one-line description, and a divider above every section after the first. Sections sit as
 * siblings in one card body, so `first-of-type` drops the first divider.
 */
export function FormSection({
  id,
  title,
  description,
  className,
  children,
}: {
  id: string
  title: string
  description?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn('flex flex-col gap-4 pt-5 first-of-type:border-t-0 first-of-type:pt-0', FORM_DIVIDER, className)}
    >
      <div>
        <h2 id={id} className="text-sm font-bold text-text-primary">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
      </div>
      {children}
    </section>
  )
}
