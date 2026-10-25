import { todayISO } from '../../lib/dates'
import { getMockSessionUser, type SessionUser } from '../../lib/mock-db'
import { VisitCalendar } from './components/VisitCalendar'

/** Calendar is a top-level operational screen, separate from the Dashboard's summary and trends. */
export function CalendarPage({ viewer = getMockSessionUser() }: { viewer?: SessionUser }) {
  const today = todayISO()
  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Clinic calendar</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Review visits, incidents, holidays, and school events by day.
        </p>
      </header>
      <VisitCalendar today={today} initialAnchor={today} canNavigate showVisitsLink={viewer.role === 'staff'} />
    </div>
  )
}
