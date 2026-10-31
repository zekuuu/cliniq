import { Link, type To } from 'react-router'
import { DRILL_THROUGH_STATE } from '../../hooks/useGoBack'
import { cn } from '../../lib/cn'
import { Icon } from '../icons/Icon'

/**
 * Turns a widget's own name (stat-card label, list-card title) into its drill-down link. It keeps
 * the name's color at rest and shows the open-link icon so touch users can still see it's a link;
 * hover adds an underline that runs under the icon too, and shifts color. `darken` suits tinted/grey labels; `brand` turns
 * near-black titles (which can't get visibly darker) brand green, never grey.
 */
export function TitleLink({
  to,
  children,
  hover = 'darken',
  className,
}: {
  to: To
  children: string
  hover?: 'darken' | 'brand'
  className?: string
}) {
  // The last word and the icon share a no-wrap span, so a wrapped title never strands the icon alone.
  const split = children.lastIndexOf(' ') + 1
  return (
    <Link
      to={to}
      state={DRILL_THROUGH_STATE}
      className={cn(
        'text-current underline-offset-2 cursor-pointer transition-[color,filter] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none',
        hover === 'darken' ? 'hover:brightness-75' : 'hover:text-brand-green-dark',
        className,
      )}
    >
      {children.slice(0, split)}
      <span className="whitespace-nowrap">
        {children.slice(split)}
        {/* Underline skips an SVG, so a spaced-out no-break space in ::after carries it beneath the icon. */}
        <span className="relative after:tracking-[13px] after:content-['\00a0']">
          <Icon name="externalLink" size={12} strokeWidth={3} className="absolute right-0 top-1/2 -translate-y-1/2" />
        </span>
      </span>
    </Link>
  )
}
