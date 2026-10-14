import type { ReactNode } from 'react'
import { Link, type To } from 'react-router'
import { DRILL_THROUGH_STATE } from '../../hooks/useGoBack'
import { cn } from '../../lib/cn'
import { Icon } from '../icons/Icon'

export function ListItemLink({ to, children, className }: { to: To; children: ReactNode; className?: string }) {
  return (
    <Link
      to={to}
      state={DRILL_THROUGH_STATE}
      className={cn(
        'inline-flex max-w-full items-center gap-1 font-semibold text-brand-green-dark underline decoration-brand-green-dark/40 underline-offset-2 cursor-pointer transition-colors hover:text-brand-green hover:decoration-brand-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none',
        className,
      )}
    >
      <span className="min-w-0 truncate">{children}</span>
      <Icon name="chevronRight" size={14} className="shrink-0" />
    </Link>
  )
}
