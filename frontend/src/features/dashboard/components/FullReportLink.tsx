import { Link } from 'react-router'
import { paths } from '../../../routes/paths'

/** Opens the Reports tab behind a Dashboard summary, on the month that summary ends in. */
export function FullReportLink({ report, view, month }: { report: string; view: 'monthly' | 'health'; month: string }) {
  return (
    <Link
      to={paths.reports}
      state={{ reportView: view, reportMonth: month }}
      aria-label={`View full report: ${report}`}
      className="cursor-pointer rounded-sm text-sm font-semibold text-brand-green-dark underline underline-offset-2 transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none print:hidden"
    >
      View full report
    </Link>
  )
}
