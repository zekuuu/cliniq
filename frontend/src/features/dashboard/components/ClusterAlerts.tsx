import { Link } from 'react-router'
import { Icon } from '../../../components'
import { formatDateRange } from '../../../lib/dates'
import type { ClusterAlert } from '../../../lib/mock-db'
import { paths } from '../../../routes/paths'

/**
 * ADR-050: a possible cluster, for the clinician only. A flag to look at, not a finding; nothing is
 * sent to anyone. Counts only, so no student is named or listed here (ADR-004).
 */
export function ClusterAlerts({ alerts }: { alerts: ClusterAlert[] }) {
  if (!alerts.length) return null
  return (
    <section aria-label="Possible clusters" className="flex flex-col gap-2">
      {alerts.map((alert) => (
        <p
          key={`${alert.complaint}|${alert.gradeLevel}`}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-warning bg-warning/10 px-3 py-2 text-sm text-text-primary"
        >
          <span className="flex items-start gap-2">
            <Icon name="alertTriangle" size={16} className="mt-0.5 shrink-0 text-warning" />
            <span>
              <span className="font-semibold">Possible cluster:</span> {alert.students} {alert.gradeLevel} students with {alert.complaint} ({formatDateRange(alert.from, alert.to)}).
            </span>
          </span>
          <Link to={paths.visitsInRange(alert.from, alert.to)} className="font-semibold text-brand-green-dark underline underline-offset-2 hover:brightness-75">
            View visits
          </Link>
        </p>
      ))}
    </section>
  )
}
