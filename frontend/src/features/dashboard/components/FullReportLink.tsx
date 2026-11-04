import { Link } from 'react-router'
import { Icon } from '../../../components'
import { cn } from '../../../lib/cn'
import { paths } from '../../../routes/paths'

/**
 * Opens the Reports tab behind a Dashboard summary, on the month that summary ends in. It sits in
 * a right-aligned footer row under the summary it belongs to, never in a card header beside the
 * card's own controls (Zean, November 4, 2026). Screen only.
 */
export function FullReportLink({ report, view, month, className }: { report: string; view: 'monthly' | 'health'; month: string; className?: string }) {
  return (
    <footer className={cn('flex justify-end print:hidden', className)}>
      <Link
        to={paths.reports}
        state={{ reportView: view, reportMonth: month }}
        aria-label={`View full report: ${report}`}
        className="group inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-sm text-sm font-semibold text-brand-green-dark underline underline-offset-2 transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none"
      >
        View full report
        <Icon name="arrowRight" size={14} className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </Link>
    </footer>
  )
}
