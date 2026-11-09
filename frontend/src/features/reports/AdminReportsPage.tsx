import { useEffect, useRef, useState, type RefObject } from 'react'
import {
  BackButton,
  Button,
  Card,
  ErrorState,
  Select,
  Skeleton,
  type SelectOption,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { addMonths, todayISO } from '../../lib/dates'
import { SYMPTOM, symptom } from '../../lib/labels'
import type { SessionUser } from '../../lib/mock-db'
import { schoolYearOf, type SchoolYearSettings } from '../../lib/schoolYear'
import { fetchMonthlyReport, fetchReportMonthSetup } from './api/reportsApi'
import { ReportsPrint, type ReportView } from './components/ReportsPrint'

/*
 * The Admin's Reports page (ADR-077): a Report month drop-down, the four monthly reports of ADR-074,
 * and each report read on screen as its paper sheet. View only: printing and saving stay with Staff
 * (ADR-038 item 3). The sheet is the Staff printout component itself, so the figures cannot differ.
 */

/** The four monthly reports, in the order and with the names Staff see (ADR-074). */
const REPORTS: Array<{ view: ReportView; title: string; description: string }> = [
  {
    view: 'monthly',
    title: 'Monthly Report',
    description:
      'Totals for the month, visits by sex and by week, follow-ups, medicines given and incidents.',
  },
  {
    view: 'incidents',
    title: 'Incident register',
    description:
      'Every incident in the month with its stage. Students by masked LRN, staff by Staff No.',
  },
  {
    view: 'health',
    title: `${SYMPTOM} summary`,
    description: `Clinic visits per ${symptom}, with each one's share. Counts only.`,
  },
  {
    view: 'inventory',
    title: 'Inventory sheet',
    description: 'Medicines and supplies: new purchases, total available and ending inventory.',
  },
]

function monthLabel(month: string) {
  return new Date(`${month}-01T00:00:00`).toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric',
  })
}

function monthsNewestFirst(from: string, to: string) {
  const months: string[] = []
  for (
    let month = to.slice(0, 7);
    month >= from.slice(0, 7);
    month = addMonths(`${month}-01`, -1).slice(0, 7)
  )
    months.push(month)
  return months
}

/** The current school year's months up to today, newest first, then each earlier recorded year's months, labelled with the year (ADR-075). */
function reportMonthOptions(settings: SchoolYearSettings, today: string): SelectOption[] {
  const current = schoolYearOf(today, settings)
  const options = monthsNewestFirst(current.from, today).map((month) => ({
    value: month,
    label: monthLabel(month),
  }))
  const earlier = [...(settings.schoolYearStarts ?? [])]
    .filter((start) => start.startedOn < current.from)
    .sort((a, b) => b.startedOn.localeCompare(a.startedOn))
  for (const start of earlier) {
    const year = schoolYearOf(start.startedOn, settings)
    for (const month of monthsNewestFirst(year.from, year.to))
      if (!options.some((option) => option.value === month))
        options.push({ value: month, label: `${monthLabel(month)} (${year.label})` })
  }
  return options
}

function ReportList({
  month,
  listRef,
  onOpen,
}: {
  month: string
  listRef: RefObject<HTMLUListElement | null>
  onOpen: (view: ReportView) => void
}) {
  return (
    <ul
      ref={listRef}
      aria-label={`Reports for ${monthLabel(month)}`}
      className="flex flex-col divide-y divide-border rounded-md border border-border"
    >
      {REPORTS.map((item) => (
        <li key={item.view} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-text-primary">{item.title}</h2>
            <p className="text-xs text-text-secondary">{item.description}</p>
          </div>
          <Button
            size="sm"
            data-report={item.view}
            aria-label={`Open ${item.title}`}
            onClick={() => onOpen(item.view)}
          >
            Open
          </Button>
        </li>
      ))}
    </ul>
  )
}

export function AdminReportsPage({ viewer }: { viewer: SessionUser }) {
  const today = todayISO()
  const setup = useAsyncData('admin-report-months', fetchReportMonthSetup)
  const options = setup.data ? reportMonthOptions(setup.data.settings, today) : []
  const [chosen, setChosen] = useState<string | null>(null)
  const month =
    chosen ??
    (setup.data && options.some((o) => o.value === setup.data!.latest)
      ? setup.data.latest
      : today.slice(0, 7))
  const report = useAsyncData(`report|${month}`, () => fetchMonthlyReport(month))
  const [open, setOpen] = useState<ReportView | null>(null)
  const lastOpened = useRef<ReportView | null>(null)
  const backRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (open) {
      backRef.current?.querySelector('button')?.focus()
      // The browser's suggested file name, should anyone use the browser's own print (ADR-077).
      const before = document.title
      document.title = `CLINIQ ${REPORTS.find((r) => r.view === open)!.title}, ${monthLabel(month)}`
      return () => {
        document.title = before
      }
    }
    if (lastOpened.current)
      listRef.current
        ?.querySelector<HTMLButtonElement>(`[data-report="${lastOpened.current}"]`)
        ?.focus()
  }, [open, month])

  const page = 'mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8'

  if (open) {
    const data = report.data
    return (
      <div className={page}>
        <div ref={backRef}>
          <BackButton onBack={() => setOpen(null)} />
        </div>
        {report.status === 'error' ? (
          <ErrorState title="Unable to show this report." onRetry={report.reload} />
        ) : !data ? (
          <>
            <p className="sr-only" role="status">
              Loading report...
            </p>
            <Skeleton className="mx-auto h-[60vh] w-full max-w-[210mm]" />
          </>
        ) : (
          <ReportsPrint
            readOnly
            view={open}
            data={data}
            month={monthLabel(month)}
            previousMonth={monthLabel(addMonths(`${month}-01`, -1).slice(0, 7))}
            archiveRows={data.incidents}
            archiveOrder="date, newest first"
            viewer={viewer}
          />
        )}
      </div>
    )
  }

  const empty = report.data && report.data.counts.visits === 0
  return (
    <div className={page}>
      <Card className="p-5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Reports</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Choose a month to see its reports. You can read them here; printing and saving are done by
          the clinic staff.
        </p>
      </Card>
      <Card className="flex flex-col gap-4 p-5">
        {setup.status === 'error' ? (
          <ErrorState title="Unable to load the report months." onRetry={setup.reload} />
        ) : !setup.data ? (
          <>
            <p className="sr-only" role="status">
              Loading report months...
            </p>
            <Skeleton className="h-10 w-full max-w-80" />
            <Skeleton className="h-64 w-full" />
          </>
        ) : (
          <>
            <Select
              id="report-month"
              label="Report month"
              className="max-w-80"
              value={month}
              options={options}
              onChange={setChosen}
            />
            {empty && (
              <p
                role="status"
                className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-text-primary"
              >
                <span className="font-semibold">No visits recorded this month</span>
                <span className="text-text-secondary"> — the reports below show zero visits.</span>
              </p>
            )}
            <ReportList
              month={month}
              listRef={listRef}
              onOpen={(view) => {
                lastOpened.current = view
                setOpen(view)
              }}
            />
          </>
        )}
      </Card>
    </div>
  )
}
