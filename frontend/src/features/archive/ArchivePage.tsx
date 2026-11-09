import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import {
  BackButton,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  Lrn,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Tabs,
  buttonClassName,
  type DataTableColumn,
} from '../../components'
import { usePageSize, type PageSize } from '../../hooks/usePageSize'
import { sortTableRows, toggleTableSort, type TableSortState } from '../../lib/tableSort'
import { SaveFeedback } from '../../components/forms/SaveFeedback'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useSaveFeedback } from '../../hooks/useSaveFeedback'
import { newestArchivedYear } from './newestArchivedYear'
import { addMonths, formatDate, formatDateTime, todayISO } from '../../lib/dates'
import {
  getArchive,
  saveSchoolYearSettings,
  SchoolYearSettingsError,
  endSchoolYear,
  startSchoolYear,
  type ArchivedRecordRow,
  type ArchiveView,
  type SessionUser,
} from '../../lib/mock-db'
import { schoolYearSettingsError, type SchoolYearSettings } from '../../lib/schoolYear'
import { paths } from '../../routes/paths'
import { SCHOOL_YEAR_CHANGED_EVENT } from '../../lib/accountEvents'
import { AuditLogPage } from '../audit-log/AuditLogPage'

type ArchiveTab = 'students' | 'staff' | 'reports' | 'audit'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const monthOptions = MONTHS.map((label, index) => ({ value: String(index + 1), label }))

function monthLabel(value: string) {
  return new Date(`${value}-01T00:00:00`).toLocaleDateString('en-PH', {
    month: 'long',
    year: 'numeric',
  })
}

/** The months of a school year up to today, newest first ("YYYY-MM"). */
function monthsOf(from: string, to: string, today: string): string[] {
  const last = (to < today ? to : today).slice(0, 7)
  const months: string[] = []
  for (let month = from.slice(0, 7); month <= last; month = addMonths(`${month}-01`, 1).slice(0, 7))
    months.push(month)
  return months.reverse()
}

type RecordSortKey = 'name' | 'number' | 'group' | 'date' | 'reason'

function recordColumns(
  kind: 'student' | 'personnel',
  sort: TableSortState<RecordSortKey>,
  onSort: (key: RecordSortKey) => void,
): Array<DataTableColumn<ArchivedRecordRow>> {
  const sortable = (key: RecordSortKey, label: string) => ({
    label,
    direction: sort.key === key ? sort.direction : undefined,
    onSort: () => onSort(key),
  })
  const number = kind === 'student' ? 'LRN' : 'Staff No.'
  const group = kind === 'student' ? 'Grade at the time' : 'Type'
  return [
    {
      key: 'name',
      header: 'Full name',
      rowHeader: true,
      width: '24%',
      sort: sortable('name', 'Full name'),
      cell: (row) => row.fullName,
    },
    // The LRN through the shared component, masked as on every list (ADR-040, ADR-044).
    {
      key: 'number',
      header: number,
      width: '16%',
      sort: sortable('number', number),
      cell: (row) =>
        kind === 'student' ? (
          <Lrn lrn={row.number} />
        ) : (
          <span className="tabular-nums">{row.number}</span>
        ),
    },
    {
      key: 'group',
      header: group,
      width: '16%',
      sort: sortable('group', group),
      cell: (row) => row.group,
    },
    {
      key: 'date',
      header: 'Archived',
      width: '18%',
      sort: sortable('date', 'Archived'),
      cell: (row) => (row.archivedAt ? formatDateTime(row.archivedAt) : 'Not recorded'),
    },
    {
      key: 'reason',
      header: 'Reason',
      width: '14%',
      sort: sortable('reason', 'Reason'),
      cell: (row) => row.archiveReason ?? 'Not recorded',
    },
    {
      key: 'open',
      header: 'Actions',
      width: '12%',
      cell: (row) => (
        <Link
          to={kind === 'student' ? paths.studentProfile(row.id) : paths.staffProfile(row.id)}
          className={buttonClassName({ size: 'sm' })}
          aria-label={`View profile: ${row.fullName}`}
        >
          View profile
        </Link>
      ),
    },
  ]
}

/**
 * One year's archived students or staff, with the lists' usual tools (Zean, November 7, 2026): search
 * by name or number, a grade level (students) or type (staff) filter as on the Student and Staff Lists
 * (Zean, November 8, 2026), a reason filter, sortable columns (Full name ascending by default, Zean, November 8, 2026) and pages, as on the
 * Staff List. Keyed by year, so a new year starts on page 1 with no filters.
 */
function RecordsTable({
  rows,
  kind,
  year,
}: {
  rows: ArchivedRecordRow[]
  kind: 'student' | 'personnel'
  year: string
}) {
  const [search, setSearch] = useState('')
  const [reason, setReason] = useState('')
  const [group, setGroup] = useState('')
  const [sort, setSort] = useState<TableSortState<RecordSortKey>>({
    key: 'name',
    direction: 'ascending',
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = usePageSize()
  const people = kind === 'student' ? 'students' : 'staff'
  if (!rows.length) return <EmptyState icon="archive" title={`No ${people} archived in ${year}`} />

  const reasons = [...new Set(rows.map((row) => row.archiveReason ?? 'Not recorded'))].sort()
  // The grade or type when archived, so the options come from the rows ("Grade 2" before "Grade 10").
  const groups = [...new Set(rows.map((row) => row.group))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const groupLabel = kind === 'student' ? 'Grade level' : 'Type'
  const query = search.trim().toLowerCase()
  const listed = rows.filter(
    (row) =>
      (!group || row.group === group) &&
      (!reason || (row.archiveReason ?? 'Not recorded') === reason) &&
      // A masked LRN still matches its last four digits.
      (!query ||
        row.fullName.toLowerCase().includes(query) ||
        row.number.toLowerCase().includes(query)),
  )
  const sorted = sortTableRows(listed, sort, (row, key) =>
    key === 'name'
      ? row.fullName
      : key === 'number'
        ? row.number.slice(-4)
        : key === 'group'
          ? row.group
          : key === 'date'
            ? (row.archivedAt ?? '')
            : (row.archiveReason ?? ''),
  )
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const changePageSize = (size: PageSize) => {
    setPageSize(size)
    setPage(1)
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_14rem_14rem]">
        <Input
          label="Search"
          type="search"
          value={search}
          placeholder={kind === 'student' ? 'Name or last 4 of LRN' : 'Name or Staff No.'}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
        />
        <Select
          label={groupLabel}
          value={group}
          placeholder={kind === 'student' ? 'All grade levels' : 'All types'}
          clearable
          options={groups.map((value) => ({ value, label: value }))}
          onChange={(value) => {
            setGroup(value)
            setPage(1)
          }}
        />
        <Select
          label="Reason"
          value={reason}
          placeholder="All reasons"
          clearable
          options={reasons.map((value) => ({ value, label: value }))}
          onChange={(value) => {
            setReason(value)
            setPage(1)
          }}
        />
      </div>
      <p className="text-sm text-text-secondary" role="status">
        {listed.length.toLocaleString('en-PH')} of {rows.length.toLocaleString('en-PH')} shown
      </p>
      {listed.length ? (
        <>
          <DataTable
            caption={`${kind === 'student' ? 'Students' : 'Staff'} archived in ${year}`}
            columns={recordColumns(kind, sort, (key) =>
              setSort((current) => toggleTableSort(current, key)),
            )}
            rows={pageRows}
            rowKey={(row) => row.id}
            fixedLayout
            minTableWidth="48rem"
          />
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            total={sorted.length}
            pageSize={pageSize}
            onPageSizeChange={changePageSize}
            itemLabel={people}
            onPageChange={setPage}
          />
        </>
      ) : (
        <EmptyState
          icon="archive"
          title={`No archived ${people} match`}
          description="Try a different search or filter."
        />
      )}
    </div>
  )
}

/**
 * The Archive (professor's consultation, November 6, 2026): one read-only page by school year, kept
 * simple. Archived students and staff, that year's monthly reports and its audit entries. Staff and
 * the Admin (read-only, no Staff tab: ADR-043); nothing here edits a record. Reached from the sidebar
 * and the Student and Staff Lists' Archive buttons, which open their own tab scrolled into view
 * (`state.section`, Zean, November 8, 2026), past the school-year cards.
 */
export function ArchivePage({ viewer }: { viewer: SessionUser }) {
  const { data, status, reload } = useAsyncData(`archive|${viewer.role}`, () => getArchive(viewer))
  const [chosenYear, setChosenYear] = useState<string | null>(null)
  const section = (useLocation().state as { section?: 'students' | 'staff' } | null)?.section
  const [tab, setTab] = useState<ArchiveTab>(section ?? 'students')
  const records = useRef<HTMLDivElement>(null)
  const loaded = Boolean(data)
  useEffect(() => {
    if (!section || !loaded) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    records.current?.scrollIntoView?.({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
  }, [section, loaded])
  const header = (
    <Card className="p-5">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Archive</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Archived records, reports and audit entries by school year. Read only; nothing is deleted.
      </p>
    </Card>
  )
  // A sidebar destination: Back shows only after the Student List's Archive button (cliniq-back-navigation-patterns).
  const shell = (children: ReactNode) => (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      <BackButton fallback={paths.dashboard} drillThroughOnly />
      {header}
      {children}
    </div>
  )
  if (status === 'error')
    return shell(<ErrorState title="Unable to load the archive." onRetry={reload} />)
  if (!data)
    return shell(
      <>
        <p className="sr-only" role="status">
          Loading archive…
        </p>
        <Skeleton className="h-64" />
      </>,
    )

  // From a list's Archive button: the newest year with that list's archived records, as its count says.
  const sectionYear = section
    ? newestArchivedYear(section === 'staff' ? data.staff : data.students)
    : null
  const year =
    data.years.find(
      (y) => y.label === (chosenYear ?? sectionYear ?? data.defaultYear ?? data.current.label),
    ) ?? data.years[0]
  const students = data.students.filter((row) => row.archivedSchoolYear === year.label)
  const staff = data.staff.filter((row) => row.archivedSchoolYear === year.label)
  const months = monthsOf(year.from, year.to, todayISO())
  const tabs = [
    {
      value: 'students' as const,
      label: `Students (${students.length})`,
      icon: 'users' as const,
      panel: (
        <RecordsTable
          key={`students|${year.label}`}
          rows={students}
          kind="student"
          year={year.label}
        />
      ),
    },
    ...(viewer.role === 'staff'
      ? [
          {
            value: 'staff' as const,
            label: `Staff (${staff.length})`,
            icon: 'user' as const,
            panel: (
              <RecordsTable
                key={`staff|${year.label}`}
                rows={staff}
                kind="personnel"
                year={year.label}
              />
            ),
          },
        ]
      : []),
    {
      value: 'reports' as const,
      label: 'Reports',
      icon: 'fileText' as const,
      panel: months.length ? (
        <ul
          aria-label={`Monthly reports of ${year.label}`}
          className="divide-y divide-border rounded-md border border-border"
        >
          {months.map((month) => (
            <li
              key={month}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm text-text-primary"
            >
              {monthLabel(month)}
              <Link
                to={paths.reports}
                state={{ reportView: 'monthly', reportMonth: month }}
                className={buttonClassName({ size: 'sm' })}
                aria-label={`Open the Monthly Report for ${monthLabel(month)}`}
              >
                Open report
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="fileText" title={`No months of ${year.label} have started yet`} />
      ),
    },
    // The log is kept 10 years (ADR-057): nothing is archived out of it; this tab only narrows the dates.
    {
      value: 'audit' as const,
      label: 'Audit log',
      icon: 'clipboardList' as const,
      panel: (
        <AuditLogPage
          key={year.label}
          viewer={viewer}
          embedded
          range={{ from: year.from, to: year.to }}
        />
      ),
    },
  ]

  return shell(
    <>
      {/* Above the switcher and the tables, which can grow long (Zean, November 7, 2026). */}
      <CurrentSchoolYearCard data={data} viewer={viewer} onChanged={reload} />
      {/* One card (Zean, November 8, 2026): the year, then the sections, then the open section's records.
          scroll-mt clears the 64px sticky top bar when a list's Archive button scrolls here. */}
      <div ref={records} className="scroll-mt-20">
        <Card aria-labelledby="archive-records-title">
          <CardHeader
            titleId="archive-records-title"
            title={`Records of ${year.label}`}
            description={
              data.defaultYear
                ? `${formatDate(year.from)} to ${formatDate(year.to)}`
                : 'No records have been archived yet.'
            }
            icon={<Icon name="archive" />}
            actions={
              <Select
                label="School year"
                className="w-56"
                value={year.label}
                options={data.years.map((y) => ({
                  value: y.label,
                  label: y.label === data.current.label ? `${y.label} (current)` : y.label,
                }))}
                onChange={(value) => setChosenYear(value)}
              />
            }
          />
          <CardBody className="flex flex-col gap-4">
            <Tabs
              label="Archive section"
              value={tab === 'staff' && viewer.role !== 'staff' ? 'students' : tab}
              onChange={setTab}
              tabs={tabs}
              className="flex-wrap"
            />
          </CardBody>
        </Card>
      </div>
    </>,
  )
}

/**
 * The current school year and, for Staff, the one button for the next step (Zean, November 7, 2026: a
 * year starts and ends by hand, with the break in between). In session: End it (today is its last class
 * day). Ended: Start the next (it begins today). Both are confirmed.
 */
function CurrentSchoolYearCard({
  data,
  viewer,
  onChanged,
}: {
  data: ArchiveView
  viewer: SessionUser
  onChanged: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  // Opened from the Dashboard's reminder: the button glows and takes focus, which scrolls it into view (Zean, November 7, 2026).
  const location = useLocation()
  const [highlight, setHighlight] = useState(
    Boolean(
      (location.state as { highlightSchoolYearStep?: boolean } | null)?.highlightSchoolYearStep,
    ),
  )
  const stepButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!highlight) return
    stepButton.current?.focus()
    // Two halos (3.2 s), then it ends; with reduced motion, a still ring for the same time.
    const timer = setTimeout(() => setHighlight(false), 3200)
    return () => clearTimeout(timer)
  }, [highlight])
  const feedback = useSaveFeedback()
  // The dates live behind one button (Zean, November 8, 2026); their save message shows here once the dialog closes.
  const [editingDates, setEditingDates] = useState(false)
  const datesFeedback = useSaveFeedback()
  const { current, step } = data
  const ending = step.kind === 'end'
  const verb = ending ? 'End' : 'Start'
  async function confirm() {
    const result = await feedback.run(
      () => (ending ? endSchoolYear(viewer) : startSchoolYear(viewer)),
      {
        saved: `School year ${step.label} ${ending ? 'ended. The break has begun.' : 'started.'}`,
        failed: (cause) => (cause instanceof SchoolYearSettingsError ? cause.message : undefined),
      },
    )
    setConfirming(false)
    if (result.ok) {
      onChanged()
      window.dispatchEvent(new Event(SCHOOL_YEAR_CHANGED_EVENT))
    }
  }
  const started = `Started ${formatDate(current.from)}${data.currentStartedBy ? ` by ${data.currentStartedBy}` : ''}.`
  const state = current.endedOn
    ? ` Ended ${formatDate(current.endedOn)}${data.currentEndedBy ? ` by ${data.currentEndedBy}` : ''}; on break.`
    : ' In session.'
  const when = step.due
    ? `${verb}ing school year ${step.label} was due on ${formatDate(step.dueOn)}.`
    : `School year ${step.label} is due to ${ending ? 'end' : 'start'} on ${formatDate(step.dueOn)}. It does not ${ending ? 'end' : 'start'} by itself.`
  return (
    <Card aria-labelledby="current-school-year-title">
      <CardHeader
        titleId="current-school-year-title"
        title={`Current school year: ${current.label}`}
        description={
          `${current.started ? started : ''}${current.started ? state : ''}`.trim() || undefined
        }
        icon={<Icon name="calendarClock" />}
      />
      <CardBody>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-secondary">{when}</p>
          <SaveFeedback result={feedback.result} />
          {!editingDates && <SaveFeedback result={datesFeedback.result} />}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" icon="calendar" onClick={() => setEditingDates(true)}>
              School year dates
            </Button>
            {viewer.role === 'staff' && (
              <Button
                ref={stepButton}
                variant={step.due ? 'primary' : 'secondary'}
                data-highlight={highlight || undefined}
                // A halo around the button, twice; the button itself stays as it is (Zean, November 7, 2026).
                className={
                  highlight
                    ? 'animate-halo motion-reduce:animate-none motion-reduce:shadow-[0_0_0_6px_rgb(3_153_53/0.45)]'
                    : undefined
                }
                onClick={() => {
                  setHighlight(false)
                  setConfirming(true)
                }}
              >
                {verb} school year {step.label}
              </Button>
            )}
          </div>
        </div>
      </CardBody>
      {/* Mounted only while open, so each opening starts from the saved dates. */}
      {editingDates && (
        <SchoolYearDatesDialog
          open
          data={data}
          viewer={viewer}
          feedback={datesFeedback}
          onClose={() => setEditingDates(false)}
          onSaved={onChanged}
        />
      )}
      <Modal
        open={confirming}
        title={`${verb} school year ${step.label}?`}
        onClose={() => setConfirming(false)}
      >
        <p className="text-sm text-text-secondary">
          {ending
            ? `Today, ${formatDate(todayISO())}, becomes the last class day of ${step.label}. The break begins tomorrow; records made in the break stay in ${step.label} until the next year is started. This cannot be undone here.`
            : `${step.label} starts today, ${formatDate(todayISO())}, and ${current.label} (with its break) ends yesterday. Records already filed keep their school year. This cannot be undone here.`}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirming(false)} data-autofocus>
            Cancel
          </Button>
          <Button variant="primary" loading={feedback.saving} onClick={confirm}>
            {verb} school year
          </Button>
        </div>
      </Modal>
    </Card>
  )
}

/**
 * The school year's dates (Staff edit, the Admin reads), in a dialog from the Current school year
 * card's "School year dates" button (Zean, November 8, 2026; was its own card). Used only for when the
 * next year is due, for the Dashboard reminder. Changing them never moves an archived record.
 */
function SchoolYearDatesDialog({
  open,
  data,
  viewer,
  feedback,
  onClose,
  onSaved,
}: {
  open: boolean
  data: ArchiveView
  viewer: SessionUser
  feedback: ReturnType<typeof useSaveFeedback>
  onClose: () => void
  onSaved: () => void
}) {
  const canEdit = viewer.role === 'staff'
  const [values, setValues] = useState<SchoolYearSettings>(data.settings)
  const [error, setError] = useState('')
  const set = (key: keyof SchoolYearSettings, value: string) => {
    setValues((current) => ({ ...current, [key]: Number(value) }))
    setError('')
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    const problem = schoolYearSettingsError(values)
    if (problem) return setError(problem)
    const result = await feedback.run(() => saveSchoolYearSettings(values, viewer), {
      saved:
        'School year dates saved. Archived records keep the school year they were filed under.',
      failed: (cause) => (cause instanceof SchoolYearSettingsError ? cause.message : undefined),
    })
    if (result.ok) {
      onClose()
      onSaved()
      window.dispatchEvent(new Event(SCHOOL_YEAR_CHANGED_EVENT))
    }
  }
  return (
    <Modal open={open} title="School year dates" onClose={onClose}>
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-text-secondary">
          When a school year is due to start and end. The Dashboard reminds Staff a week before and
          once the day has passed; a year never starts or ends by itself.
        </p>
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
          <Select
            label="Starts: month"
            value={String(values.schoolYearStartMonth)}
            options={monthOptions}
            disabled={!canEdit}
            onChange={(value) => set('schoolYearStartMonth', value)}
          />
          <Input
            label="Starts: day"
            type="number"
            min="1"
            max="31"
            value={String(values.schoolYearStartDay)}
            disabled={!canEdit}
            onChange={(event) => set('schoolYearStartDay', event.target.value)}
          />
          <Select
            label="Last class day: month"
            value={String(values.schoolYearEndMonth)}
            options={monthOptions}
            disabled={!canEdit}
            onChange={(value) => set('schoolYearEndMonth', value)}
          />
          <Input
            label="Last class day: day"
            type="number"
            min="1"
            max="31"
            value={String(values.schoolYearEndDay)}
            disabled={!canEdit}
            onChange={(event) => set('schoolYearEndDay', event.target.value)}
          />
        </div>
        <p className="text-xs text-text-secondary">
          A school year runs from the day it is started; ending it starts the break, which belongs
          to that year until the next one is started.
        </p>
        {error && (
          <p role="alert" className="text-sm font-semibold text-error">
            {error}
          </p>
        )}
        {feedback.result?.kind === 'failed' && <SaveFeedback result={feedback.result} />}
        <div className="flex justify-end gap-2">
          <Button variant="neutral" onClick={onClose}>
            {canEdit ? 'Cancel' : 'Close'}
          </Button>
          {canEdit && (
            <Button type="submit" variant="primary" loading={feedback.saving}>
              Save dates
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}
