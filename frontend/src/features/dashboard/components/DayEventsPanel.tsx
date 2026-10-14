import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button, DatePicker, Icon, Input, Modal } from '../../../components'
import { DRILL_THROUGH_STATE } from '../../../hooks/useGoBack'
import { cn } from '../../../lib/cn'
import { formatDate, formatDateRange } from '../../../lib/dates'
import { paths } from '../../../routes/paths'
import type { CalendarDay, CalendarDayEvent, Holiday } from '../../../types/dashboard'
import type { ISODate } from '../../../types/entities'
import {
  CALENDAR_EVENT_TITLE_MAX,
  CalendarEventValidationError,
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
  validateCalendarEvent,
  type CalendarEventErrors,
} from '../api/dashboardApi'
import { eventChipClass, HOLIDAY_KIND_LABEL, holidayChipClass, holidayName } from '../lib/calendar'

type Mode =
  | { kind: 'view' }
  | { kind: 'form'; event: CalendarDayEvent | null }
  | { kind: 'confirm'; event: CalendarDayEvent }

/** Bare icon action (cliniq-interactive-states): sized to the glyph, color shift on hover. */
const iconAction =
  'inline-flex shrink-0 cursor-pointer rounded-sm text-text-secondary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none'

function EventForm({
  date,
  event,
  onCancel,
  onSaved,
}: {
  date: ISODate
  event: CalendarDayEvent | null
  onCancel: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState(event?.title ?? '')
  const [startDate, setStartDate] = useState<string>(event?.startDate ?? date)
  const [endDate, setEndDate] = useState<string>(event?.endDate ?? '')
  const [errors, setErrors] = useState<CalendarEventErrors>({})
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input = { title, startDate, endDate }
    const found = validateCalendarEvent(input)
    setErrors(found)
    setFailed(false)
    if (Object.keys(found).length) return
    setSaving(true)
    try {
      if (event) await updateCalendarEvent(event.id, input)
      else await createCalendarEvent(input)
      onSaved()
    } catch (error) {
      if (error instanceof CalendarEventValidationError) setErrors(error.errors)
      else setFailed(true)
      setSaving(false)
    }
  }

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-text-primary">
        {event ? 'Edit event' : 'Add event'}
      </h3>
      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={CALENDAR_EVENT_TITLE_MAX}
        hint={`Up to ${CALENDAR_EVENT_TITLE_MAX} characters.`}
        error={errors.title}
        required
        data-autofocus
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DatePicker
          label="Start date"
          value={startDate}
          onChange={setStartDate}
          error={errors.startDate}
          required
        />
        <DatePicker
          label="End date (optional)"
          value={endDate}
          onChange={setEndDate}
          min={startDate || undefined}
          hint="For an event over several days."
          error={errors.endDate}
        />
      </div>
      {failed && (
        <p role="alert" className="text-sm text-error">
          The event could not be saved. Try again.
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="neutral" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          {event ? 'Save Changes' : 'Add Event'}
        </Button>
      </div>
    </form>
  )
}

function ConfirmDelete({
  event,
  onCancel,
  onDeleted,
}: {
  event: CalendarDayEvent
  onCancel: () => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [failed, setFailed] = useState(false)
  async function confirm() {
    setDeleting(true)
    setFailed(false)
    try {
      await deleteCalendarEvent(event.id)
      onDeleted()
    } catch {
      setFailed(true)
      setDeleting(false)
    }
  }
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-text-primary">Delete this event?</h3>
      <p className="text-sm text-text-secondary">
        “{event.title}”
        {event.endDate ? ` (${formatDateRange(event.startDate, event.endDate)})` : ''} will be
        removed from every day it covers. This can&apos;t be undone.
      </p>
      {failed && (
        <p role="alert" className="text-sm text-error">
          The event could not be deleted. Try again.
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="neutral" onClick={onCancel} disabled={deleting} data-autofocus>
          Keep Event
        </Button>
        <Button variant="destructive" onClick={() => void confirm()} loading={deleting}>
          Delete Event
        </Button>
      </div>
    </div>
  )
}

/**
 * Staff's one entry point for a calendar day (ADR-019): the day's visit and incident counts (past
 * and today only), its holidays (read-only, ADR-020), its events with edit and delete, Add Event,
 * and a link to that day's visits. It runs on the shared Modal, so focus returns to the day that
 * opened it.
 */
export function DayEventsPanel({
  date,
  day,
  holidays,
  today,
  onClose,
  onChanged,
}: {
  date: ISODate
  day: CalendarDay | undefined
  /** That date's national holidays, shown read-only (ADR-020). */
  holidays: Holiday[]
  today: ISODate
  onClose: () => void
  onChanged: () => void
}) {
  const [mode, setMode] = useState<Mode>({ kind: 'view' })
  const bodyRef = useRef<HTMLDivElement>(null)
  // The Modal focuses a target only when it opens. Switching between the list, the form, and the
  // delete confirmation moves focus here instead.
  const switched = useRef(false)
  useEffect(() => {
    if (!switched.current) return
    switched.current = false
    bodyRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [mode])
  const go = (next: Mode) => {
    switched.current = true
    setMode(next)
  }
  const done = () => {
    onChanged()
    go({ kind: 'view' })
  }

  const past = date <= today
  const events = day?.events ?? []
  const tags = day?.eventTags ?? []
  const visits = day?.visits ?? 0
  const incidents = day?.incidents ?? 0

  return (
    <Modal
      open
      title={formatDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      onClose={onClose}
    >
      <div ref={bodyRef}>
        {mode.kind === 'form' ? (
          <EventForm
            date={date}
            event={mode.event}
            onCancel={() => go({ kind: 'view' })}
            onSaved={done}
          />
        ) : mode.kind === 'confirm' ? (
          <ConfirmDelete
            event={mode.event}
            onCancel={() => go({ kind: 'view' })}
            onDeleted={done}
          />
        ) : (
          <div className="flex flex-col gap-4">
            {past && (
              <p className="text-sm text-text-secondary">
                {visits} {visits === 1 ? 'visit' : 'visits'} · {incidents}{' '}
                {incidents === 1 ? 'incident' : 'incidents'}
              </p>
            )}
            {holidays.length > 0 && (
              // Read-only reference data (ADR-020): no edit or delete controls.
              <section aria-labelledby="day-holidays-heading" className="flex flex-col gap-2">
                <h3 id="day-holidays-heading" className="text-sm font-semibold text-text-primary">
                  Holidays
                </h3>
                <ul className="flex flex-col gap-2">
                  {holidays.map((h) => (
                    <li key={h.name} className="flex flex-col items-start gap-0.5">
                      <span className={holidayChipClass} title={`Holiday: ${holidayName(h)}`}>
                        Holiday: {holidayName(h)}
                      </span>
                      <span className="text-xs text-text-secondary">{HOLIDAY_KIND_LABEL[h.kind]}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section aria-labelledby="day-events-heading" className="flex flex-col gap-2">
              <h3 id="day-events-heading" className="text-sm font-semibold text-text-primary">
                Events
              </h3>
              {events.length === 0 ? (
                <p className="text-sm text-text-secondary">No events on this day.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {events.map((event) => (
                    <li key={event.id} className="flex items-center gap-3">
                      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                        <span className={eventChipClass} title={event.title}>
                          {event.title}
                        </span>
                        {event.endDate && (
                          <span className="text-xs text-text-secondary">
                            {formatDateRange(event.startDate, event.endDate)}
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        aria-label={`Edit ${event.title}`}
                        onClick={() => go({ kind: 'form', event })}
                        className={cn(iconAction, 'hover:text-brand-green-dark')}
                      >
                        <Icon name="pencil" size={18} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${event.title}`}
                        onClick={() => go({ kind: 'confirm', event })}
                        className={cn(iconAction, 'hover:text-error')}
                      >
                        <Icon name="trash" size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {tags.length > 0 && (
              <section aria-labelledby="day-tags-heading" className="flex flex-col gap-2">
                <h3 id="day-tags-heading" className="text-sm font-semibold text-text-primary">
                  Tags on visits and incidents
                </h3>
                <ul className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <li key={tag} className={eventChipClass} title={tag}>
                      {tag}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              {past ? (
                <Link
                  to={paths.visitsOnDate(date)}
                  state={DRILL_THROUGH_STATE}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green-dark underline decoration-brand-green-dark/40 underline-offset-2 transition-colors hover:text-brand-green hover:decoration-brand-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none"
                >
                  View visits <Icon name="chevronRight" size={12} />
                </Link>
              ) : (
                <span />
              )}
              <Button
                variant="primary"
                icon="plus"
                onClick={() => go({ kind: 'form', event: null })}
                data-autofocus
              >
                Add Event
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
