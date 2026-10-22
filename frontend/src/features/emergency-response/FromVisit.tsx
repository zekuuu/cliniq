import { Link } from 'react-router'
import { buttonClassName } from '../../components'
import { formatItemGiven } from '../../lib/itemsGiven'
import { paths } from '../../routes/paths'
import type { ItemGivenLine } from '../../types/entities'

/**
 * An incident escalated from a visit (ADR-036): a link back, and what was given at the visit. The
 * medicines stay on the visit and are not copied, so stock was deducted once.
 */
export function FromVisit({ visitId, given }: { visitId: string; given: ItemGivenLine[] }) {
  return (
    <section aria-labelledby="from-visit-title" className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="from-visit-title" className="text-sm font-semibold text-text-primary">From visit</h2>
        <Link to={paths.visitDetail(visitId)} className={buttonClassName({ size: 'sm' })}>
          Open the visit
        </Link>
      </div>
      <p className="mt-2 text-xs font-semibold text-text-secondary">Given at the visit</p>
      {given.length ? (
        <ul className="mt-1 flex flex-col gap-1 text-sm text-text-primary">
          {given.map((line) => <li key={line.itemId}>{formatItemGiven(line)}</li>)}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-text-secondary">Nothing recorded.</p>
      )}
    </section>
  )
}
