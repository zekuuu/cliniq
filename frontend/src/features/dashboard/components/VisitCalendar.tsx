import { useId, useMemo, useState, type ReactNode } from 'react'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  ErrorState,
  Icon,
  SegmentedControl,
  Skeleton,
  type DataTableColumn,
} from '../../../components'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { cn } from '../../../lib/cn'
import { formatDate, parseISODate } from '../../../lib/dates'
import { sortTableRows, toggleTableSort, type TableSortState } from '../../../lib/tableSort'
import type { ISODate } from '../../../types/entities'
import { fetchCalendarDays, fetchHolidays } from '../api/dashboardApi'
import { DayEventsPanel } from './DayEventsPanel'
import {
  dayLabels,
  eventChipClass,
  HOLIDAY_KIND_LABEL,
  holidayChipClass,
  holidayName,
  holidaysByDate,
  heatClasses,
  isNoClassHoliday,
  heatLevel,
  heatScale,
  legendSteps,
  MAX_DAY_LABELS,
  monthGrid,
  noClassDayClass,
  periodFor,
  shiftAnchor,
  type CalendarView,
  type HeatScale,
} from '../lib/calendar'
import type { CalendarDay, Holiday, HolidayFeed } from '../../../types/dashboard'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const NO_HOLIDAYS: Holiday[] = []

// Today: a dashed brand-green outline 2px outside the cell, plus a "Today" label, never the outline
// alone. Dashed sets it apart from every solid edge in the grid and from the black "has an event"
// outline (dotted was too faint on narrow cells). An outline takes no space, so the cell's content and
// padding are unchanged; the grid's 6px spacing leaves room for it.
const TODAY_BORDER = 'outline-2 outline-dashed outline-offset-2 outline-brand-green-dark'
const TODAY_PILL = 'w-fit rounded-sm bg-brand-green-dark px-1.5 text-xs font-bold text-white'

/** A day's visits plus incidents. "Visits" alone would undercount what the number holds. */
function casesLabel(total: number): string {
  return `${total} ${total === 1 ? 'case' : 'cases'}`
}

function casesBreakdown(day: CalendarDay): string {
  return `${day.visits} ${day.visits === 1 ? 'visit' : 'visits'}, ${day.incidents} ${day.incidents === 1 ? 'incident' : 'incidents'}`
}

function describeDay(day: CalendarDay, today: ISODate, holidays: Holiday[] = NO_HOLIDAYS): string {
  const parts =
    day.date <= today
      ? [
          `${day.visits} ${day.visits === 1 ? 'visit' : 'visits'}`,
          `${day.incidents} ${day.incidents === 1 ? 'incident' : 'incidents'}`,
        ]
      : []
  for (const h of holidays) parts.unshift(`holiday: ${holidayName(h)} (${HOLIDAY_KIND_LABEL[h.kind]})`)
  const labels = dayLabels(day)
  if (labels.length) parts.push(`${labels.length === 1 ? 'event' : 'events'}: ${labels.join(', ')}`)
  const date = formatDate(day.date, { weekday: 'long', month: 'long', day: 'numeric' })
  return parts.length ? `${date}: ${parts.join(', ')}` : date
}

/** A no-class holiday with no visits or incidents gets the faint stripes (ADR-020). */
function noClassEmpty(holidays: Holiday[], total: number): boolean {
  return total === 0 && holidays.some(isNoClassHoliday)
}

function Legend({ scale }: { scale: HeatScale }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
      <span>Cases per day (visits + incidents):</span>
      <ul className="flex flex-wrap items-center gap-2">
        {legendSteps(scale).map((step) => (
          <li key={step.level} className="flex items-center gap-1">
            <span
              aria-hidden="true"
              className={cn(
                'inline-block size-3.5 rounded-sm border border-border',
                heatClasses[step.level],
              )}
            />
            {step.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * A day's chips: gray holidays first, then yellow calendar events and visit/incident tags, up to
 * MAX_DAY_LABELS and then "+N more". Spans, not a list, because Staff's day cells are buttons; the
 * button's accessible name (describeDay) carries every label, and every cell's `title` does too.
 */
function DayLabels({
  day,
  holidays = NO_HOLIDAYS,
  className,
}: {
  day: CalendarDay
  holidays?: Holiday[]
  className?: string
}) {
  const chips = [
    ...holidays.map((h) => ({ key: `holiday:${h.name}`, text: `Holiday: ${holidayName(h)}`, holiday: true })),
    ...dayLabels(day).map((label) => ({ key: label, text: label, holiday: false })),
  ]
  if (!chips.length) return null
  const hidden = chips.length - MAX_DAY_LABELS
  return (
    <span className={cn('flex min-w-0 flex-wrap gap-1', className)}>
      {chips.slice(0, MAX_DAY_LABELS).map((chip) =>
        chip.holiday ? (
          <span key={chip.key} className={holidayChipClass} title={chip.text}>
            {chip.text}
          </span>
        ) : (
          <span key={chip.key} className={eventChipClass} title={chip.text}>
            <span className="sr-only">Event: </span>
            {chip.text}
          </span>
        ),
      )}
      {hidden > 0 && (
        <span
          className="text-xs leading-tight font-semibold text-text-primary"
          title={chips.slice(MAX_DAY_LABELS).map((c) => c.text).join(', ')}
        >
          +{hidden} more
        </span>
      )}
    </span>
  )
}

/**
 * A day's contents. For Staff it's one button that opens the day panel (the single entry point,
 * ADR-019); for Admin it's static. The hover/focus ring sits inside the cell, so it never collides
 * with today's dashed outline outside it.
 */
function DayTarget({
  day,
  holidays,
  today,
  canEdit,
  onSelectDay,
  className,
  children,
}: {
  day: CalendarDay | undefined
  holidays: Holiday[]
  today: ISODate
  canEdit: boolean
  onSelectDay: (date: ISODate) => void
  className: string
  children: ReactNode
}) {
  if (!canEdit || !day) return <div className={className}>{children}</div>
  return (
    <button
      type="button"
      aria-label={`${describeDay(day, today, holidays)}. Open day`}
      onClick={() => onSelectDay(day.date)}
      className={cn(
        className,
        'w-full cursor-pointer text-left transition-shadow hover:ring-2 hover:ring-brand-green-dark hover:ring-inset focus-visible:ring-2 focus-visible:ring-brand-green-dark focus-visible:ring-inset focus-visible:outline-none motion-reduce:transition-none',
      )}
    >
      {children}
    </button>
  )
}

function WeekView({
  days,
  holidaysOn,
  scale,
  today,
  canEdit,
  onSelectDay,
}: {
  days: CalendarDay[]
  holidaysOn: Map<ISODate, Holiday[]>
  scale: HeatScale
  today: ISODate
  canEdit: boolean
  onSelectDay: (date: ISODate) => void
}) {
  return (
    <ol className="grid grid-cols-1 gap-2 sm:grid-cols-7" aria-label="Days of the week">
      {days.map((day) => {
        const future = day.date > today
        const total = day.visits + day.incidents
        const holidays = holidaysOn.get(day.date) ?? NO_HOLIDAYS
        return (
          <li
            key={day.date}
            className={cn(
              'flex rounded-md',
              future ? heatClasses[0] : heatClasses[heatLevel(total, scale)],
              noClassEmpty(holidays, total) && noClassDayClass,
              day.date === today ? TODAY_BORDER : 'border-border',
            )}
          >
            <DayTarget
              day={day}
              holidays={holidays}
              today={today}
              canEdit={canEdit}
              onSelectDay={onSelectDay}
              className="flex min-h-28 flex-col gap-1 rounded-md p-2.5"
            >
              <span className={day.date === today ? TODAY_PILL : 'text-xs font-semibold'}>
                {day.date === today && 'Today · '}
                {formatDate(day.date, { month: 'short', day: 'numeric' })}
              </span>
              {future ? (
                <span className="text-xs">Not yet</span>
              ) : (
                <>
                  <span className="text-xl font-semibold">
                    {casesLabel(total)}
                    <span className="sr-only">: {casesBreakdown(day)}</span>
                  </span>
                </>
              )}
              <DayLabels day={day} holidays={holidays} />
            </DayTarget>
          </li>
        )
      })}
    </ol>
  )
}

function MonthView({
  monthStart,
  byDate,
  holidaysOn,
  scale,
  today,
  label,
  canEdit,
  onSelectDay,
}: {
  monthStart: ISODate
  byDate: Map<ISODate, CalendarDay>
  holidaysOn: Map<ISODate, Holiday[]>
  scale: HeatScale
  today: ISODate
  label: string
  canEdit: boolean
  onSelectDay: (date: ISODate) => void
}) {
  return (
    // Scrolls sideways on phones; focusable so keyboard users can scroll it even when no day is a button (Admin).
    <div
      role="region"
      aria-label={`Calendar grid, ${label}`}
      tabIndex={0}
      className="relative overflow-x-auto rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
    >
      <table className="w-full min-w-[36rem] table-fixed border-separate border-spacing-1.5">
        <caption className="sr-only">Visits and incidents per day, {label}</caption>
        <thead>
          <tr>
            {WEEKDAYS.map((w, i) => (
              <th key={w} scope="col" className="text-xs font-semibold text-text-secondary">
                <abbr title={WEEKDAYS_LONG[i]} className="no-underline">
                  {w}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(monthStart).map((week, wi) => (
            <tr key={wi}>
              {week.map((date, di) => {
                if (!date) return <td key={di} aria-hidden="true" />
                const day = byDate.get(date)
                const future = date > today
                const total = day ? day.visits + day.incidents : 0
                const holidays = holidaysOn.get(date) ?? NO_HOLIDAYS
                return (
                  <td
                    key={date}
                    title={day ? describeDay(day, today, holidays) : undefined}
                    className={cn(
                      'h-16 rounded-md p-0 align-top',
                      future || !day ? heatClasses[0] : heatClasses[heatLevel(total, scale)],
                      noClassEmpty(holidays, total) && noClassDayClass,
                      date === today ? TODAY_BORDER : 'border-border',
                    )}
                  >
                    <DayTarget
                      day={day}
                      holidays={holidays}
                      today={today}
                      canEdit={canEdit}
                      onSelectDay={onSelectDay}
                      className="flex h-full min-h-16 flex-col rounded-md p-2"
                    >
                      <span className="flex items-start justify-between gap-1">
                        {date === today ? (
                          <span className={TODAY_PILL}>
                            Today
                            <span className="sr-only">
                              {' '}
                              ({formatDate(date, { month: 'short', day: 'numeric' })})
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs">
                            {formatDate(date, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        {!future && day && (
                          <span className="text-sm font-semibold">
                            {casesLabel(total)}
                            <span className="sr-only">
                              : {casesBreakdown(day)}
                            </span>
                          </span>
                        )}
                      </span>
                      {day && <DayLabels day={day} holidays={holidays} className="mt-1" />}
                    </DayTarget>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function YearView({
  year,
  byDate,
  holidaysOn,
  scale,
  today,
  canEdit,
  onSelectDay,
}: {
  year: string
  byDate: Map<ISODate, CalendarDay>
  holidaysOn: Map<ISODate, Holiday[]>
  scale: HeatScale
  today: ISODate
  canEdit: boolean
  onSelectDay: (date: ISODate) => void
}) {
  const months = Array.from(
    { length: 12 },
    (_, m) => `${year}-${String(m + 1).padStart(2, '0')}-01`,
  )
  const holidaysFor = (date: ISODate) => holidaysOn.get(date) ?? NO_HOLIDAYS
  // The day list is long, so it opens on request; it is the grid's accessible equivalent, so it
  // stays one keyboard step away and always prints in full.
  const [showDays, setShowDays] = useState(false)
  const dayListId = useId()
  const activeDays = [...byDate.values()].filter(
    (d) => d.visits + d.incidents > 0 || dayLabels(d).length > 0 || holidaysFor(d.date).length > 0,
  )
  return (
    <div className="flex flex-col gap-4">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {months.map((monthStart) => {
          const days = [...byDate.values()].filter(
            (d) => d.date.slice(0, 7) === monthStart.slice(0, 7),
          )
          const visits = days.reduce((s, d) => s + d.visits, 0)
          const incidents = days.reduce((s, d) => s + d.incidents, 0)
          return (
            <li key={monthStart} className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-text-primary">
                {formatDate(monthStart, { month: 'long' })}
                <span className="font-normal text-text-secondary">
                  {' '}
                  · {visits} {visits === 1 ? 'visit' : 'visits'} · {incidents}{' '}
                  {incidents === 1 ? 'incident' : 'incidents'}
                </span>
              </p>
              {/* The mini grid is a visual summary only. The line above, the tagged-day list, and
                  the Table view carry the same information for screen readers. */}
              <div aria-hidden="true" className="grid w-fit grid-cols-7 gap-0.5">
                {monthGrid(monthStart)
                  .flat()
                  .map((date, i) => {
                    if (!date) return <span key={`blank-${i}`} className="size-3" />
                    const day = byDate.get(date)
                    const total = day ? day.visits + day.incidents : 0
                    const future = date > today
                    const holidays = holidaysFor(date)
                    return (
                      <span
                        key={date}
                        title={day ? describeDay(day, today, holidays) : undefined}
                        className={cn(
                          'size-3 rounded-[2px] border',
                          future ? heatClasses[0] : heatClasses[heatLevel(total, scale)],
                          noClassEmpty(holidays, total) && noClassDayClass,
                          date === today
                            ? 'border-2 border-brand-green'
                            : day && dayLabels(day).length
                              ? 'border-text-primary'
                              : 'border-border',
                        )}
                      />
                    )
                  })}
              </div>
            </li>
          )
        })}
      </ul>
      <div>
        <p className="text-xs font-semibold text-text-primary">
          Activity, event, and holiday days in {year}
        </p>
        <p className="text-xs text-text-secondary">
          Outlined squares above mark days with an event; today has a green ring. Striped squares mark no-class holidays
          with no visits.
        </p>
        {activeDays.length === 0 ? (
          <p className="text-xs text-text-secondary">No clinic activity, events, or holidays this year.</p>
        ) : (
          <>
            <button
              type="button"
              aria-expanded={showDays}
              aria-controls={dayListId}
              onClick={() => setShowDays((open) => !open)}
              className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-sm text-xs font-semibold text-brand-green-dark transition-colors hover:text-brand-green hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none print:hidden"
            >
              <Icon name="chevronDown" size={14} className={cn('transition-transform motion-reduce:transition-none', showDays && 'rotate-180')} />
              {showDays ? 'Hide day list' : 'Show day list'} ({activeDays.length} {activeDays.length === 1 ? 'day' : 'days'})
            </button>
            <ul
              id={dayListId}
              className={cn('mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-primary', !showDays && 'hidden print:flex')}
            >
              {activeDays.map((d) => (
                <li key={d.date}>
                  {canEdit ? (
                    <button
                      type="button"
                      aria-label={`${describeDay(d, today, holidaysFor(d.date))}. Open day`}
                      onClick={() => onSelectDay(d.date)}
                      className="inline-flex items-center gap-1 font-semibold text-brand-green-dark underline decoration-brand-green-dark/40 underline-offset-2 cursor-pointer transition-colors hover:text-brand-green hover:decoration-brand-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none"
                    >
                      {formatDate(d.date, { month: 'short', day: 'numeric' })}
                      <Icon name="chevronRight" size={12} />
                    </button>
                  ) : (
                    <time dateTime={d.date} className="font-semibold">
                      {formatDate(d.date, { month: 'short', day: 'numeric' })}
                    </time>
                  )}{' '}
                  {d.date <= today ? casesLabel(d.visits + d.incidents) : 'Upcoming'}
                  {holidaysFor(d.date).map((h) => ` · Holiday: ${holidayName(h)}`).join('')}
                  {dayLabels(d).length ? ` · ${dayLabels(d).join(', ')}` : ''}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

function CalendarTable({
  view,
  days,
  holidaysOn,
}: {
  view: CalendarView
  days: CalendarDay[]
  holidaysOn: Map<ISODate, Holiday[]>
}) {
  const holidayText = (date: ISODate) =>
    (holidaysOn.get(date) ?? NO_HOLIDAYS).map(holidayName).join(', ')
  const [sort, setSort] = useState<TableSortState<string>>({
    key: view === 'year' ? 'month' : 'date',
    direction: 'descending',
  })
  const effectiveSort = view === 'year' && sort.key === 'date'
    ? { key: 'month', direction: 'descending' as const }
    : view !== 'year' && sort.key === 'month'
      ? { key: 'date', direction: 'descending' as const }
      : sort
  const sortColumn = (key: string, label: string) => ({
    label,
    direction: effectiveSort.key === key ? effectiveSort.direction : undefined,
    onSort: () => setSort((current) => toggleTableSort(current, key)),
  })
  if (view === 'year') {
    const byMonth = new Map<
      string,
      { key: string; visits: number; incidents: number; holidays: string[]; tags: string[] }
    >()
    for (const d of days) {
      const key = d.date.slice(0, 7)
      const row = byMonth.get(key) ?? { key, visits: 0, incidents: 0, holidays: [], tags: [] }
      row.visits += d.visits
      row.incidents += d.incidents
      for (const h of holidaysOn.get(d.date) ?? NO_HOLIDAYS) row.holidays.push(holidayName(h))
      for (const t of dayLabels(d)) if (!row.tags.includes(t)) row.tags.push(t)
      byMonth.set(key, row)
    }
    const rows = [...byMonth.values()]
    const columns: Array<DataTableColumn<(typeof rows)[number]>> = [
      {
        key: 'month',
        header: 'Month',
        rowHeader: true,
        sort: sortColumn('month', 'Month'),
        cell: (r) => formatDate(`${r.key}-01`, { month: 'long', year: 'numeric' }),
      },
      { key: 'visits', header: 'Visits', align: 'right', sort: sortColumn('visits', 'Visits'), cell: (r) => r.visits },
      { key: 'incidents', header: 'Incidents', align: 'right', sort: sortColumn('incidents', 'Incidents'), cell: (r) => r.incidents },
      { key: 'total', header: 'Total', align: 'right', sort: sortColumn('total', 'Total'), cell: (r) => r.visits + r.incidents },
      { key: 'holidays', header: 'Holidays', sort: sortColumn('holidays', 'Holidays'), cell: (r) => r.holidays.join(', ') || '—' },
      { key: 'tags', header: 'Events', sort: sortColumn('tags', 'Events'), cell: (r) => r.tags.join(', ') || '—' },
    ]
    const sortedRows = sortTableRows(rows, effectiveSort, (row, key) => {
      if (key === 'month') return row.key
      if (key === 'visits') return row.visits
      if (key === 'incidents') return row.incidents
      if (key === 'total') return row.visits + row.incidents
      if (key === 'holidays') return row.holidays.join(', ')
      return row.tags.join(', ')
    })
    return (
      <DataTable
        caption="Visits and incidents per month"
        columns={columns}
        rows={sortedRows}
        rowKey={(r) => r.key}
        fixedLayout
      />
    )
  }
  const rows = days.filter(
    (d) => d.visits + d.incidents > 0 || dayLabels(d).length > 0 || holidaysOn.has(d.date),
  )
  const columns: Array<DataTableColumn<CalendarDay>> = [
    {
      key: 'date',
      header: 'Date',
      rowHeader: true,
      sort: sortColumn('date', 'Date'),
      cell: (d) => formatDate(d.date, { weekday: 'short', month: 'short', day: 'numeric' }),
    },
    { key: 'visits', header: 'Visits', align: 'right', sort: sortColumn('visits', 'Visits'), cell: (d) => d.visits },
    { key: 'incidents', header: 'Incidents', align: 'right', sort: sortColumn('incidents', 'Incidents'), cell: (d) => d.incidents },
    { key: 'total', header: 'Total', align: 'right', sort: sortColumn('total', 'Total'), cell: (d) => d.visits + d.incidents },
    { key: 'holidays', header: 'Holidays', sort: sortColumn('holidays', 'Holidays'), cell: (d) => holidayText(d.date) || '—' },
    { key: 'tags', header: 'Events', sort: sortColumn('tags', 'Events'), cell: (d) => dayLabels(d).join(', ') || '—' },
  ]
  const sortedRows = sortTableRows(rows, effectiveSort, (row, key) => {
    if (key === 'date') return row.date
    if (key === 'visits') return row.visits
    if (key === 'incidents') return row.incidents
    if (key === 'total') return row.visits + row.incidents
    if (key === 'holidays') return holidayText(row.date)
    return dayLabels(row).join(', ')
  })
  return rows.length ? (
    <DataTable
      caption="Days with clinic activity, an event, or a holiday"
      columns={columns}
      rows={sortedRows}
      rowKey={(d) => d.date}
      fixedLayout
    />
  ) : (
    <p className="text-sm text-text-secondary">No clinic activity, events, or holidays in this period.</p>
  )
}

/**
 * Loading placeholder shaped like the selected view. The day grid itself (weekdays, dates, month
 * names) is known before any data arrives, so it's drawn for real; only the per-day counts, event
 * tags, and legend are placeholder bars.
 */
function CalendarSkeleton({ view, periodFrom }: { view: CalendarView; periodFrom: ISODate }) {
  const legend = (
    <div className="flex items-center gap-2">
      <Skeleton className="h-3 w-36" />
      <Skeleton className="h-3 w-40" />
    </div>
  )
  if (view === 'week') {
    const start = periodFrom
    return (
      <div aria-hidden="true" data-skeleton="calendar-week" className="flex flex-col gap-3">
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => {
            const d = parseISODate(start)
            d.setDate(d.getDate() + i)
            return (
              <li key={i} className="flex min-h-28 flex-col gap-2 rounded-md bg-surface p-2.5">
                <span className="text-xs font-semibold text-text-secondary">
                  {WEEKDAYS_LONG[d.getDay()]},{' '}
                  {d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                </span>
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-3 w-24 max-w-full" />
              </li>
            )
          })}
        </ol>
        {legend}
      </div>
    )
  }
  if (view === 'year') {
    const year = periodFrom.slice(0, 4)
    return (
      <div aria-hidden="true" data-skeleton="calendar-year" className="flex flex-col gap-4">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }, (_, m) => {
            const monthStart = `${year}-${String(m + 1).padStart(2, '0')}-01`
            return (
              <li key={monthStart} className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                  {formatDate(monthStart, { month: 'long' })}
                  <Skeleton className="h-3 w-20" />
                </span>
                <div className="grid w-fit grid-cols-7 gap-0.5">
                  {monthGrid(monthStart)
                    .flat()
                    .map((date, i) =>
                      date ? (
                        <span key={date} className="size-3 rounded-[2px] bg-border" />
                      ) : (
                        <span key={`blank-${i}`} className="size-3" />
                      ),
                    )}
                </div>
              </li>
            )
          })}
        </ul>
        {legend}
      </div>
    )
  }
  return (
    <div aria-hidden="true" data-skeleton="calendar-month" className="flex flex-col gap-3">
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[36rem] table-fixed border-separate border-spacing-1.5">
          <thead>
            <tr>
              {WEEKDAYS.map((w) => (
                <th key={w} className="text-xs font-semibold text-text-secondary">
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthGrid(periodFrom).map((week, wi) => (
              <tr key={wi}>
                {week.map((date, di) =>
                  date ? (
                    <td key={date} className="h-16 rounded-md bg-surface p-2 align-top">
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xs text-text-secondary">
                          {parseISODate(date).getDate()}
                        </span>
                        <Skeleton className="h-4 w-5" />
                      </div>
                    </td>
                  ) : (
                    <td key={di} />
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {legend}
    </div>
  )
}

/**
 * Where the holidays came from (ADR-020), shown to Staff and Admin. The warning variant appears when
 * the source has nothing for the current year, so a stale list is never silently trusted.
 */
function HolidaySourceLine({
  feed,
  failed,
  today,
}: {
  feed: HolidayFeed | undefined
  failed: boolean
  today: ISODate
}) {
  if (!feed && !failed) return null
  const year = Number(today.slice(0, 4))
  const missing = failed || !feed?.years.includes(year)
  return (
    <p
      className={cn(
        'flex flex-wrap items-center gap-1 text-xs',
        missing ? 'font-semibold text-warning' : 'text-text-secondary',
      )}
    >
      {missing && <Icon name="alertTriangle" size={14} />}
      {missing && !failed && <span>No holidays loaded for {year}.</span>}
      {feed && !failed ? (
        <span>
          Holidays updated{' '}
          {formatDate(feed.lastUpdated, { month: 'short', day: 'numeric', year: 'numeric' })} ·
          Source {feed.source}
        </span>
      ) : (
        <span>Holidays could not be loaded.</span>
      )}
    </p>
  )
}

const viewNoun: Record<CalendarView, string> = { week: 'week', month: 'month', year: 'year' }
/** Button labels are Title Case (Design-System.md): "Previous Month", "Next Year". */
const viewNounTitle: Record<CalendarView, string> = { week: 'Week', month: 'Month', year: 'Year' }

export interface VisitCalendarProps {
  today: ISODate
  /** The date the calendar opens on (the end of the dashboard's date range). */
  initialAnchor: ISODate
  /**
   * Staff open a day to see its counts and add, edit, or delete events, and can page into future
   * periods. Admin sees the same chips as a static summary (ADR-019).
   */
  canNavigate: boolean
}

/**
 * Calendar view (Reference 1, item 5; Module 9): a weekly/monthly/yearly toggle and a heatmap of
 * visits + incidents per day, with Staff's school events and the free-text event tags on visits and
 * incidents shown as yellow chips on each day.
 * It pages through time on its own (Previous / Next / Today) and loads only the visible period.
 */
export function VisitCalendar({ today, initialAnchor, canNavigate }: VisitCalendarProps) {
  const headingId = useId()
  const [view, setView] = useState<CalendarView>('month')
  const [display, setDisplay] = useState<'calendar' | 'table'>('calendar')
  const [anchor, setAnchor] = useState<ISODate>(initialAnchor)
  const [selectedDate, setSelectedDate] = useState<ISODate | null>(null)
  // When the dashboard date range changes, jump to its end date but keep the chosen view.
  const [lastInitial, setLastInitial] = useState(initialAnchor)
  if (lastInitial !== initialAnchor) {
    setLastInitial(initialAnchor)
    setAnchor(initialAnchor)
  }
  const period = periodFor(view, anchor)
  const { data, status, isRefetching, reload } = useAsyncData(`${period.from}|${period.to}`, () =>
    fetchCalendarDays(period.from, period.to),
  )

  const holidayFeed = useAsyncData(`holidays|${period.from}|${period.to}`, () =>
    fetchHolidays(period.from, period.to),
  )
  const holidaysOn = useMemo(
    () => holidaysByDate(holidayFeed.data?.holidays ?? []),
    [holidayFeed.data],
  )

  const byDate = useMemo(() => new Map((data ?? []).map((d) => [d.date, d])), [data])
  const scale = useMemo(
    () => heatScale((data ?? []).filter((d) => d.date <= today).map((d) => d.visits + d.incidents)),
    [data, today],
  )
  // Admin's calendar stops at today; Staff page ahead to add events on future dates.
  const nextDisabled = !canNavigate && period.to >= today

  return (
    <Card aria-labelledby={headingId}>
      <CardHeader
        titleId={headingId}
        icon={<Icon name="calendar" />}
        title="Calendar"
        description={
          canNavigate
            ? 'Visits and incidents per day, with national holidays, school events, and visit or incident tags. Select a day to add or edit its events.'
            : 'Visits and incidents per day, with national holidays, school events, and visit or incident tags.'
        }
        actions={
          <>
            <SegmentedControl
              label="Calendar period"
              value={view}
              onChange={setView}
              options={[
                { value: 'week', label: 'Weekly' },
                { value: 'month', label: 'Monthly' },
                { value: 'year', label: 'Yearly' },
              ]}
            />
            <SegmentedControl
              label="Show calendar as"
              value={display}
              onChange={setDisplay}
              options={[
                { value: 'calendar', label: 'Calendar', icon: 'calendar' },
                { value: 'table', label: 'Table', icon: 'table' },
              ]}
            />
          </>
        }
      />
      <CardBody className="flex flex-col gap-3">
        <p className="text-xs text-text-secondary">
          The calendar has its own period; the Date range at the top of the page doesn't change it.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-text-primary" aria-live="polite">
            {period.label}
          </h3>
          <div className="flex items-center gap-2 print:hidden">
            <Button
              size="sm"
              variant="neutral"
              icon="chevronLeft"
              onClick={() => setAnchor(shiftAnchor(view, anchor, -1))}
            >
              Previous<span className="sr-only"> {viewNounTitle[view]}</span>
            </Button>
            <Button size="sm" variant="neutral" onClick={() => setAnchor(today)}>
              Today
            </Button>
            <Button
              size="sm"
              variant="neutral"
              disabled={nextDisabled}
              onClick={() => setAnchor(shiftAnchor(view, anchor, 1))}
            >
              Next<span className="sr-only"> {viewNounTitle[view]}</span>
              <Icon name="chevronRight" />
            </Button>
          </div>
        </div>

        {status === 'error' ? (
          <ErrorState title="Unable to load the calendar." onRetry={reload} />
        ) : status === 'loading' && !data ? (
          <>
            <p className="sr-only" role="status">
              Loading calendar…
            </p>
            <CalendarSkeleton view={view} periodFrom={period.from} />
          </>
        ) : (
          <div
            aria-busy={isRefetching}
            className={cn(
              'flex flex-col gap-3 transition-opacity motion-reduce:transition-none',
              isRefetching && 'opacity-60',
            )}
          >
            {display === 'table' ? (
              <CalendarTable view={view} days={data ?? []} holidaysOn={holidaysOn} />
            ) : (
              <>
                {view === 'week' && (
                  <WeekView
                    days={data ?? []}
                    holidaysOn={holidaysOn}
                    scale={scale}
                    today={today}
                    canEdit={canNavigate}
                    onSelectDay={setSelectedDate}
                  />
                )}
                {view === 'month' && (
                  <MonthView
                    monthStart={period.from}
                    byDate={byDate}
                    holidaysOn={holidaysOn}
                    scale={scale}
                    today={today}
                    label={period.label}
                    canEdit={canNavigate}
                    onSelectDay={setSelectedDate}
                  />
                )}
                {view === 'year' && (
                  <YearView
                    year={period.label}
                    byDate={byDate}
                    holidaysOn={holidaysOn}
                    scale={scale}
                    today={today}
                    canEdit={canNavigate}
                    onSelectDay={setSelectedDate}
                  />
                )}
                <Legend scale={scale} />
              </>
            )}
            {scale.max === 0 && (
              <p className="text-xs text-text-secondary">
                No visits or incidents were recorded in this {viewNoun[view]}.
              </p>
            )}
          </div>
        )}
        <HolidaySourceLine
          feed={holidayFeed.data}
          failed={holidayFeed.status === 'error'}
          today={today}
        />
      </CardBody>
      {canNavigate && selectedDate && (
        <DayEventsPanel
          key={selectedDate}
          date={selectedDate}
          day={byDate.get(selectedDate)}
          holidays={holidaysOn.get(selectedDate) ?? NO_HOLIDAYS}
          today={today}
          onClose={() => setSelectedDate(null)}
          onChanged={reload}
        />
      )}
    </Card>
  )
}
