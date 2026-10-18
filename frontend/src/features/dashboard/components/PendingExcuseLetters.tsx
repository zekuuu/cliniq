import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router'
import { buttonClassName, ListCard, ListItemLink, ListRow } from '../../../components'
import { formatDateRange, formatDateTime } from '../../../lib/dates'
import type { PendingExcuseLetter } from '../../../lib/mock-db'
import { paths } from '../../../routes/paths'

export const PENDING_EXCUSE_LETTERS_ID = 'pending-excuse-letters'

/**
 * Staff-only list of excuse-letter drafts saved with visits and not yet approved, so a draft can't
 * be forgotten after leaving New Visit. Navigation only (ADR-011: the Dashboard stays view-only).
 * Admin/Principal can't open the letter page, so this isn't rendered for that role.
 * A multi-student list: Student Number, never the name (ADR-004). Shown only while drafts exist.
 * The Dashboard loads the letters, so its printout lists the same ones.
 * The "Pending excuse letters" stat card links here by hash; the router doesn't scroll to a hash, so
 * the list scrolls itself into view and takes focus (on every click: each one is a new location key).
 */
export function PendingExcuseLetters({ data }: { data: PendingExcuseLetter[] | undefined }) {
  const { hash, key } = useLocation()
  const ref = useRef<HTMLDivElement>(null)
  const shown = Boolean(data?.length)
  useEffect(() => {
    if (hash !== `#${PENDING_EXCUSE_LETTERS_ID}` || !ref.current) return
    // jsdom has no scrollIntoView.
    ref.current.scrollIntoView?.({ block: 'start' })
    ref.current.focus({ preventScroll: true })
  }, [hash, key, shown])
  if (!data?.length) return null
  return (
    <div id={PENDING_EXCUSE_LETTERS_ID} ref={ref} tabIndex={-1} className="scroll-mt-20 focus:outline-none">
      <ListCard
        title="Excuse letters awaiting approval"
        icon="fileText"
        count={data.length}
        maxHeightClass="max-h-80"
        description="Drafts saved with a visit. Review and approve each one on its letter page. Oldest visit first."
        empty={{ title: 'No excuse letters awaiting approval' }}
      >
        {data.map((row) => (
          <ListRow
          key={row.visitId}
          primary={<ListItemLink to={paths.studentProfile(row.studentNumber)}>{row.studentNumber}</ListItemLink>}
          secondary={`Excused ${formatDateRange(row.excusedFrom, row.excusedUntil)}`}
          meta={`Visit ${formatDateTime(row.visitDateTime)}`}
          trailing={
            <Link
              to={paths.excuseLetter(row.visitId)}
              aria-label={`Review excuse letter for ${row.studentNumber}`}
              className={buttonClassName({ size: 'sm' })}
            >
              Review letter
            </Link>
          }
          />
        ))}
      </ListCard>
    </div>
  )
}
