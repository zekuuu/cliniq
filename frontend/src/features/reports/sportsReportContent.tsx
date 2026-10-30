import type { PrintColumn } from '../../components'
import { formatDate } from '../../lib/dates'
import type { SportsReportContent, SportsReportContentRow, SportsReportWindow } from '../../lib/mock-db'

/* Wording and table columns shared by the Sports Report screen and its printout (ADR-034), so the preview is the paper. */

/** ADR-034's line, shown on the screen only: the printout's footer is the page number alone (ADR-046). */
export const SPORTS_REPORT_CONFIDENTIALITY =
  'Confidential: for the PE/Sports Instructor named above. Do not post or share. Shows only what CLINIQ recorded; this is not a medical clearance.'

export const NO_ENTRIES_TEXT = 'No visits or incidents recorded in this period'

export function windowLabel(window: SportsReportWindow): string {
  return window === 'school_year' ? 'This school year' : `Last ${window} days`
}

export function windowDates(content: Pick<SportsReportContent, 'from' | 'to'>): string {
  return `${formatDate(content.from)} to ${formatDate(content.to)}`
}

export function windowRange(content: Pick<SportsReportContent, 'from' | 'to'>): string {
  return `Visits and incidents from ${windowDates(content)}`
}

/** Students left out of the printout, by count only. */
export function leftOutText({ leftOut }: Pick<SportsReportContent, 'leftOut'>): string | null {
  const parts = [
    leftOut.archived && `${leftOut.archived} archived student record${leftOut.archived === 1 ? '' : 's'}`,
    leftOut.missing && `${leftOut.missing} student record${leftOut.missing === 1 ? '' : 's'} no longer in CLINIQ`,
  ].filter(Boolean)
  return parts.length ? `Left out of this report: ${parts.join(' and ')}.` : null
}

/**
 * The visits and incidents of one student, newest first, in three aligned columns: date, what
 * happened, outcome. Every entry uses the same column template, so wrapped text stays in its column.
 * Shared by the preview and the printout.
 */
/** On screen only (ADR-051): a tick per entry, all ticked to start; an unticked one does not print. */
export interface EntrySelection {
  excluded: ReadonlySet<string>
  onToggle: (entryId: string) => void
}

function entriesCell(row: SportsReportContentRow, select?: EntrySelection) {
  if (!row.entries.length) return <>{NO_ENTRIES_TEXT}</>
  return (
    <ul className="flex flex-col gap-1">
      {row.entries.map((entry) => {
        const date = formatDate(entry.dateTime.slice(0, 10))
        return (
          <li key={entry.id} className={select ? 'grid grid-cols-[1.25rem_6.5em_minmax(0,1fr)_minmax(0,0.75fr)] items-start gap-x-2' : 'grid grid-cols-[6.5em_minmax(0,1fr)_minmax(0,0.75fr)] gap-x-2'}>
            {select && (
              <input
                type="checkbox"
                aria-label={`Include ${entry.kind.toLowerCase()} of ${date} (${entry.what}) for ${row.fullName}`}
                checked={!select.excluded.has(entry.id)}
                onChange={() => select.onToggle(entry.id)}
                className="mt-1 size-4 cursor-pointer accent-brand-green-dark"
              />
            )}
            <span className="font-semibold tabular-nums">{date}</span>
            <span>{entry.kind}: {entry.what}</span>
            <span>{entry.outcome}</span>
          </li>
        )
      })}
    </ul>
  )
}

function conditionsCell(row: SportsReportContentRow) {
  const conditions = row.conditions
  if (!conditions) return null
  return (
    <>
      <span className="block">Conditions: {conditions.medicalConditions.length ? conditions.medicalConditions.join(', ') : 'None recorded'}</span>
      <span className="block">Allergies: {conditions.allergies.length ? conditions.allergies.join(', ') : 'None recorded'}</span>
    </>
  )
}

/** The columns of the report table, in the order ADR-034 sets; the conditions column only when ticked. */
export function sportsReportColumns(includeConditions: boolean, select?: EntrySelection): Array<PrintColumn<SportsReportContentRow>> {
  const columns: Array<PrintColumn<SportsReportContentRow>> = [
    { header: 'Student', width: includeConditions ? '20%' : '24%', cell: (row) => <><span className="block font-semibold">{row.fullName}</span>{row.gradeLevel}</> },
    { header: 'Recent visits and incidents', width: includeConditions ? '38%' : '46%', cell: (row) => entriesCell(row, select) },
    { header: "Clinician's note", width: includeConditions ? '22%' : '30%', cell: (row) => <span className="whitespace-pre-line">{row.note ?? ''}</span> },
  ]
  if (includeConditions) columns.push({ header: 'Recorded conditions and allergies', width: '20%', cell: (row) => conditionsCell(row) })
  return columns
}

/** The report as it prints: only the entries the clinician left ticked (ADR-051). */
export function withChosenEntries(content: SportsReportContent, excluded: ReadonlySet<string>): SportsReportContent {
  return { ...content, rows: content.rows.map((row) => ({ ...row, entries: row.entries.filter((entry) => !excluded.has(entry.id)) })) }
}
