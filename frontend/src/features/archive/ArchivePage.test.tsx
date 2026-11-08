import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { getArchive, getDashboardSummary, getRecordedAuditEntries, getSchoolYearSettings, endSchoolYear, resetMockDb, saveSchoolYearSettings, sportsReportWindowStart, startSchoolYear } from '../../lib/mock-db'
import { DashboardPage } from '../dashboard/DashboardPage'
import { db } from '../../lib/mock-db/store'
import { rangeForPreset } from '../../lib/dateRange'
import { todayISO } from '../../lib/dates'
import { DEFAULT_SCHOOL_YEAR } from '../../lib/schoolYear'
import { navGroupsFor } from '../../layouts/navigation'
import { paths } from '../../routes/paths'
import { renderWithRouter } from '../../test/renderWithRouter'
import { selectOption } from '../../test/selectOption'
import { StudentListPage } from '../student-records/StudentListPage'
import { StaffListPage } from '../staff-records/StaffListPage'
import { ArchivePage } from './ArchivePage'

/** The Archive by school year (professor's consultation, November 6, 2026; Zean, November 7, 2026 — 04:20 PHT). */

const STAFF = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' } as const
const ADMIN = { id: 'user-admin-01', name: 'Gilan Avelida', role: 'admin' } as const

async function openArchive(viewer: typeof STAFF | typeof ADMIN = STAFF) {
  const user = userEvent.setup()
  renderWithRouter(<ArchivePage viewer={viewer} />)
  await screen.findByRole("button", { name: /^School year (?!dates)/ })
  return user
}

describe('Archive page', () => {
  beforeEach(() => resetMockDb())

  it('lists every school year with records, defaults to the newest archived one, and switches', async () => {
    const data = await getArchive(STAFF)
    expect(data.years.map((y) => y.label)).toEqual(expect.arrayContaining(['2026–2027', '2025–2026']))
    expect(data.defaultYear).toBe('2026–2027')
    const user = await openArchive()
    expect(screen.getByRole("button", { name: /^School year (?!dates)/ })).toHaveTextContent('2026–2027')
    const students = screen.getByRole('table', { name: 'Students archived in 2026–2027' })
    // Seed: two not on the new list and one transfer in 2026–2027.
    expect(within(students).getAllByRole('row')).toHaveLength(4)
    expect(within(students).getAllByText('Not on the new list')).toHaveLength(2)
    await selectOption(user, screen.getByRole("button", { name: /^School year (?!dates)/ }), '2025–2026')
    expect(within(screen.getByRole('table', { name: 'Students archived in 2025–2026' })).getByText('Transferred')).toBeInTheDocument()
  })

  it('searches, filters by reason, sorts and pages the archived records (Zean, November 7, 2026)', async () => {
    const user = await openArchive()
    const table = () => screen.getByRole('table', { name: 'Students archived in 2026–2027' })
    const names = () => within(table()).getAllByRole('rowheader').map((cell) => cell.textContent)
    // Full name, A to Z, by default (Zean, November 8, 2026).
    expect(within(table()).getByRole('columnheader', { name: /Full name/ })).toHaveAttribute('aria-sort', 'ascending')
    expect(names()).toEqual([...names()].sort((a, b) => a!.localeCompare(b!)))
    expect(screen.getByText('3 of 3 shown')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument()

    await selectOption(user, screen.getByRole('button', { name: /^Reason/ }), 'Not on the new list')
    expect(screen.getByText('2 of 3 shown')).toBeInTheDocument()
    expect(within(table()).queryByText('Transferred')).not.toBeInTheDocument()

    const first = names()[0]!
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), first.split(' ')[0])
    expect(names()).toContain(first)
    await user.clear(screen.getByRole('searchbox', { name: 'Search' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'zzzz')
    expect(await screen.findByText('No archived students match')).toBeInTheDocument()
    await user.clear(screen.getByRole('searchbox', { name: 'Search' }))
    await screen.findByRole('table', { name: 'Students archived in 2026–2027' })

    await user.click(within(table()).getByRole('button', { name: /Full name/ }))
    const sorted = names()
    expect(sorted).toEqual([...sorted].sort((a, b) => b!.localeCompare(a!)))
  })

  it('shows archived staff, the year\'s monthly reports and its audit entries, with no editing controls', async () => {
    const user = await openArchive()
    await user.click(screen.getByRole('tab', { name: /^Staff/ }))
    expect(within(screen.getByRole('table', { name: 'Staff archived in 2026–2027' })).getByText('Resigned')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Reports' }))
    const months = screen.getByRole('list', { name: 'Monthly reports of 2026–2027' })
    expect(within(months).getAllByRole('link', { name: /^Open the Monthly Report for / })[0]).toHaveAttribute('href', paths.reports)
    expect(within(months).getAllByRole('listitem').at(-1)).toHaveTextContent('June 2026')
    await user.click(screen.getByRole('tab', { name: 'Audit log' }))
    // In the Archive's one card the entries have no card or heading of their own (Zean, November 8, 2026).
    expect(await screen.findByRole('table', { name: 'Filtered audit log' })).toBeInTheDocument()
    expect(screen.getByText(/entr(y|ies) shown · /)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^(Edit|Archive|Restore|Delete)\b/ })).not.toBeInTheDocument()
  })

  it('lets the Admin read it: no Staff tab, the dates read-only', async () => {
    await openArchive(ADMIN)
    expect(screen.queryByRole('tab', { name: /^Staff/ })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /^Students/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save dates' })).not.toBeInTheDocument()
    expect((await getArchive(ADMIN)).staff).toEqual([])
  })

  it('has two doors: the sidebar and the Student List', async () => {
    for (const role of ['staff', 'admin'] as const)
      expect(navGroupsFor(role).find((group) => group.label === 'Administration')?.items.map((item) => item.key)).toContain('archive')
    renderWithRouter(<StudentListPage viewer={ADMIN} />)
    expect(await screen.findByRole('link', { name: /^Archive \(3\)$/ })).toHaveAttribute('href', paths.archive)
  })

  it('opens the right tab with Back from the Student and Staff Lists Archive buttons (Zean, November 8, 2026)', async () => {
    for (const [List, name, tab] of [[StudentListPage, /^Archive \(\d+\)$/, /^Students/], [StaffListPage, /^Archive \(\d+\)$/, /^Staff/]] as const) {
      const user = userEvent.setup()
      const { unmount } = render(
        <MemoryRouter initialEntries={[paths.students]}>
          <Routes>
            <Route path={paths.students} element={<List viewer={STAFF} />} />
            <Route path={paths.archive} element={<ArchivePage viewer={STAFF} />} />
          </Routes>
        </MemoryRouter>,
      )
      // The button counts what the Archive opens to: the newest year with that list's records.
      const link = await screen.findByRole('link', { name })
      const count = link.textContent!.match(/\((\d+)\)/)![1]
      await user.click(link)
      expect(await screen.findByRole('tab', { name: tab, selected: true })).toHaveTextContent(`(${count})`)
      expect(screen.getByRole('button', { name: /^Back/ })).toBeInTheDocument()
      unmount()
    }
  })

  it('keeps archived records out of the active totals', async () => {
    const summary = await getDashboardSummary({ range: rangeForPreset('today', todayISO()) }, STAFF)
    expect(summary.counts.activeStudents).toBe(db().students.filter((student) => !student.archived).length)
  })
})

describe('school-year settings', () => {
  beforeEach(() => resetMockDb())

  it('defaults to June 15 to April 14, saves for Staff only, and audits field names only', async () => {
    expect(await getSchoolYearSettings()).toEqual(DEFAULT_SCHOOL_YEAR)
    await expect(saveSchoolYearSettings({ ...DEFAULT_SCHOOL_YEAR, schoolYearStartMonth: 8, schoolYearStartDay: 1 }, ADMIN)).rejects.toThrow(/Only the clinic staff/)
    await expect(saveSchoolYearSettings({ ...DEFAULT_SCHOOL_YEAR, schoolYearStartDay: 31 }, STAFF)).rejects.toThrow(/not a date in that month/)
    await saveSchoolYearSettings({ ...DEFAULT_SCHOOL_YEAR, schoolYearStartMonth: 8, schoolYearStartDay: 1 }, STAFF)
    const entry = getRecordedAuditEntries().at(-1)!
    expect(entry).toMatchObject({ actionType: 'update', targetRecord: { type: 'school-year' }, summary: 'Updated start month and start day' })
    expect(entry.summary).not.toMatch(/\d/)
  })

  it('never moves an archived record when the dates change, while reports and the audit follow the new dates', async () => {
    await saveSchoolYearSettings({ schoolYearStartMonth: 1, schoolYearStartDay: 1, schoolYearEndMonth: 11, schoolYearEndDay: 30 }, STAFF)
    const data = await getArchive(STAFF)
    // Archived March 20, 2026: a January start would make that 2026–2027, but the stored year stays.
    expect(data.students.find((row) => row.id === 'student-0052')?.archivedSchoolYear).toBe('2025–2026')
    // The current year was started by hand, so new dates only move when the next one is due (Zean, November 7, 2026).
    expect(data.current).toMatchObject({ label: '2026–2027', from: '2026-06-15' })
    expect(data.step).toMatchObject({ kind: 'end', label: '2026–2027', dueOn: '2026-11-30' })
  })

  it('moves the Sports Report "school year" window with the setting', () => {
    expect(sportsReportWindowStart('school_year', '2026-10-07')).toBe('2026-06-15')
    expect(sportsReportWindowStart('school_year', '2026-10-07', { ...DEFAULT_SCHOOL_YEAR, schoolYearStartMonth: 8, schoolYearStartDay: 1 })).toBe('2026-08-01')
  })

  it('saves from the Archive page\'s School year dates card', async () => {
    // One button opens the dates in a dialog (Zean, November 8, 2026).
    const user = await openArchive()
    expect(screen.queryByRole('region', { name: 'School year dates' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'School year dates' }))
    const dialog = screen.getByRole('dialog', { name: 'School year dates' })
    await user.clear(within(dialog).getByLabelText(/^Starts: day/))
    await user.type(within(dialog).getByLabelText(/^Starts: day/), '16')
    await user.click(within(dialog).getByRole('button', { name: 'Save dates' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText(/^School year dates saved\./)).toBeInTheDocument()
    expect((await getSchoolYearSettings()).schoolYearStartDay).toBe(16)
  })
})

describe('ending and starting a school year by hand (Zean, November 7, 2026)', () => {
  beforeEach(() => resetMockDb())
  const summaryOn = (day: string, viewer: typeof STAFF | typeof ADMIN = STAFF) => getDashboardSummary({ range: rangeForPreset('today', day) }, viewer)

  it('never ends a year by itself: past the last class day it stays in session, and Staff get a reminder', async () => {
    db().today = '2027-04-20'
    const data = await getArchive(STAFF)
    expect(data.current).toMatchObject({ label: '2026–2027', from: '2026-06-15', endedOn: null })
    expect(data.step).toEqual({ kind: 'end', label: '2026–2027', dueOn: '2027-04-14', due: true, soon: false })
    expect((await summaryOn('2027-04-20')).schoolYearReminder).toEqual({ kind: 'end', label: '2026–2027', dueOn: '2027-04-14', overdue: true })
    expect((await summaryOn('2027-04-20', ADMIN)).schoolYearReminder).toBeNull()
    renderWithRouter(<DashboardPage viewer={STAFF} />)
    // A banner under the header, short, with one action (Zean, November 7, 2026).
    const banner = await screen.findByText('School year 2026–2027 was due to end Apr 14, 2027.')
    const box = banner.closest('[role="status"]')!
    expect(box).toHaveClass('border-warning')
    expect(within(box as HTMLElement).getByRole('link', { name: 'Go to Archive' })).toHaveAttribute('href', paths.archive)
    expect(screen.getByRole('region', { name: 'Summary counts' }).contains(box)).toBe(false)
  })

  it('reminds Staff a week before a due day, as an info banner, and not before that', async () => {
    db().today = '2027-04-06'
    expect((await summaryOn('2027-04-06')).schoolYearReminder).toBeNull()
    db().today = '2027-04-07'
    expect((await summaryOn('2027-04-07')).schoolYearReminder).toEqual({ kind: 'end', label: '2026–2027', dueOn: '2027-04-14', overdue: false })
    renderWithRouter(<DashboardPage viewer={STAFF} />)
    const banner = (await screen.findByText('School year 2026–2027 ends Apr 14, 2027.')).closest('[role="status"]')!
    expect(banner).toHaveClass('border-info')
  })

  it('ends the year (Staff only, audited); the break belongs to it; the next start is reminded a week before', async () => {
    db().today = '2027-04-14'
    await expect(endSchoolYear(ADMIN)).rejects.toThrow(/Only the clinic staff/)
    await expect(startSchoolYear(STAFF)).rejects.toThrow(/End school year 2026–2027 first/)
    expect(await endSchoolYear(STAFF)).toMatchObject({ label: '2026–2027', endedOn: '2027-04-14' })
    expect(getRecordedAuditEntries().at(-1)).toMatchObject({ actionType: 'update', targetRecord: { type: 'school-year' }, summary: 'Ended school year 2026–2027' })
    await expect(endSchoolYear(STAFF)).rejects.toThrow(/already ended/)
    await expect(startSchoolYear(STAFF)).rejects.toThrow(/from tomorrow/)
    db().today = '2027-05-20'
    expect((await getArchive(STAFF)).current).toMatchObject({ label: '2026–2027', endedOn: '2027-04-14' })
    expect((await summaryOn('2027-05-20')).schoolYearReminder).toBeNull()
    db().today = '2027-06-08'
    expect((await summaryOn('2027-06-08')).schoolYearReminder).toEqual({ kind: 'start', label: '2027–2028', dueOn: '2027-06-15', overdue: false })
    db().today = '2027-06-20'
    expect((await summaryOn('2027-06-20')).schoolYearReminder).toEqual({ kind: 'start', label: '2027–2028', dueOn: '2027-06-15', overdue: true })
  })

  it('starts the next year after the break (Staff only, audited); the year before ends yesterday', async () => {
    db().today = '2027-04-14'
    await endSchoolYear(STAFF)
    db().today = '2027-06-20'
    await expect(startSchoolYear(ADMIN)).rejects.toThrow(/Only the clinic staff/)
    expect(await startSchoolYear(STAFF)).toMatchObject({ label: '2027–2028', from: '2027-06-20', endedOn: null })
    expect(getRecordedAuditEntries().at(-1)).toMatchObject({ actionType: 'create', summary: 'Started school year 2027–2028' })
    await expect(startSchoolYear(STAFF)).rejects.toThrow(/End school year 2027–2028 first/)
    const data = await getArchive(STAFF)
    expect(data.years.find((y) => y.label === '2026–2027')).toMatchObject({ from: '2026-06-15', to: '2027-06-19' })
    expect(data.step).toMatchObject({ kind: 'end', label: '2027–2028', due: false })
  })

  it('ends then starts from the Archive page, each after a confirmation', async () => {
    db().today = '2027-04-20'
    const user = await openArchive()
    let card = screen.getByRole('region', { name: /^Current school year: 2026–2027/ })
    expect(card).toHaveTextContent('Ending school year 2026–2027 was due on')
    await user.click(within(card).getByRole('button', { name: 'End school year 2026–2027' }))
    let dialog = await screen.findByRole('dialog', { name: 'End school year 2026–2027?' })
    await user.click(within(dialog).getByRole('button', { name: 'End school year' }))
    card = await screen.findByRole('region', { name: /^Current school year: 2026–2027/ })
    expect(await within(card).findByText(/on break/)).toBeInTheDocument()
    db().today = '2027-06-20'
    await user.click(await within(card).findByRole('button', { name: 'Start school year 2027–2028' }))
    dialog = await screen.findByRole('dialog', { name: 'Start school year 2027–2028?' })
    await user.click(within(dialog).getByRole('button', { name: 'Start school year' }))
    expect(await screen.findByRole('region', { name: /^Current school year: 2027–2028/ })).toBeInTheDocument()
  })

  it('highlights and focuses the End or Start button when opened from the Dashboard reminder, until pressed', async () => {
    db().today = '2027-04-20'
    const user = userEvent.setup()
    renderWithRouter(<ArchivePage viewer={STAFF} />, { route: { pathname: paths.archive, state: { highlightSchoolYearStep: true } } as never })
    const button = await screen.findByRole('button', { name: 'End school year 2026–2027' })
    await waitFor(() => expect(button).toHaveFocus())
    expect(button).toHaveAttribute('data-highlight', 'true')
    expect(button).toHaveClass('animate-halo', 'motion-reduce:animate-none')
    expect(button).not.toHaveClass('animate-pulse')
    await user.click(button)
    expect(button).not.toHaveAttribute('data-highlight')
  })

  it('does not highlight it when opened another way', async () => {
    db().today = '2027-04-20'
    await openArchive()
    expect(screen.getByRole('button', { name: 'End school year 2026–2027' })).not.toHaveAttribute('data-highlight')
  })

  it('gives the Admin no End or Start button', async () => {
    await openArchive(ADMIN)
    expect(screen.queryByRole('button', { name: /^(End|Start) school year/ })).not.toBeInTheDocument()
  })
})
