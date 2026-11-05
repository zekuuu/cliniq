import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { getDashboardSummary, listPendingExcuseLetters, getMonthlyReport, getPersonnel, getRecordedAuditEntries, recordVisit, saveIncidentStageOne, savePersonnel, type PersonnelInput, type SessionUser } from '../lib/mock-db'
import { db } from '../lib/mock-db/store'
import { rangeForPreset, type DateRange } from '../lib/dateRange'
import { AppShell } from '../layouts/AppShell'
import { AppRoutes } from '../routes/AppRoutes'
import { splitText } from '../lib/patients'
import { renderWithRouter } from '../test/renderWithRouter'
import { selectOption } from '../test/selectOption'
import { CalendarPage } from './dashboard/CalendarPage'
import { DashboardPage } from './dashboard/DashboardPage'
import { DashboardPrint } from './dashboard/components/DashboardPrint'
import type { DashboardSummary, DueFollowUpRow, InventoryAlertRow } from '../types/dashboard'
import { stockStatus } from './dashboard/lib/alerts'
import { openAccountMenu } from '../test/accountMenu'

/** Groupmate's frontend review, round 2, Part 1 (ADR-062, ADR-063). */

vi.mock('react-chartjs-2', () => {
  const Stub = (props: { 'aria-label'?: string }) => <div role="img" aria-label={props['aria-label']} />
  return { Bar: Stub, Doughnut: Stub, Line: Stub }
})

const STAFF: SessionUser = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }
const ADMIN: SessionUser = { id: 'user-admin-01', name: 'Principal', role: 'admin' }
const ALL = rangeForPreset('all', db().today)

const ready = () => screen.findByRole('region', { name: 'Summary counts' })

function printed(summary: DashboardSummary, range: DateRange, letters: Parameters<typeof DashboardPrint>[0]['letters'] = []) {
  render(<MemoryRouter><DashboardPrint summary={summary} range={range} viewer={STAFF} letters={letters} filterLabel="" view="overview" /></MemoryRouter>)
  act(() => {
    window.dispatchEvent(new Event('beforeprint'))
  })
  return document.body.querySelector<HTMLElement>('[data-print-document]')!
}

describe('R2 and R3: the Dashboard cards', () => {
  it('puts what needs doing before the totals', async () => {
    renderWithRouter(<DashboardPage viewer={STAFF} />)
    const summary = await ready()
    expect(within(summary).getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Needs attention now', 'To do', 'Activity summary'])
    const attention = within(summary).getByRole('region', { name: 'Needs attention now' })
    const todo = within(summary).getByRole('region', { name: 'To do' })
    const activity = within(summary).getByRole('region', { name: 'Activity summary' })
    // Today's work apart from what can wait: Stage 2 is optional (ADR-065), follow-ups have their own dates.
    expect(within(attention).getByRole('link', { name: 'Pending excuse letters' })).toBeInTheDocument()
    expect(within(attention).getByRole('link', { name: /expired or expiring/ })).toBeInTheDocument()
    for (const name of ['Unfinished incident records', 'Follow-ups to review']) expect(within(todo).getByRole('link', { name })).toBeInTheDocument()
    for (const name of [/incomplete student records/, /low stock/]) expect(within(todo).getByRole('link', { name })).toBeInTheDocument()
    for (const name of ['Clinic visits', 'Incidents', 'Active students']) expect(within(activity).getByRole('link', { name })).toBeInTheDocument()
  })

  it('keeps the whole card clickable while hovered', async () => {
    renderWithRouter(<DashboardPage viewer={STAFF} />)
    const summary = await ready()
    // A filter on the link would shrink its stretched ::after to the label, and the hover would flicker.
    expect(within(summary).getByRole('link', { name: 'Clinic visits' }).className).not.toMatch(/brightness|blur|backdrop|transform|translate|scale|will-change/)
  })

  it('marks a clickable card with a drop shadow and a whole-card hover', async () => {
    const { container } = renderWithRouter(<DashboardPage viewer={STAFF} />)
    await ready()
    const cards = [...container.querySelectorAll<HTMLElement>('[data-stat-card]')]
    expect(cards).toHaveLength(6)
    for (const card of cards) {
      expect(card.className).toMatch(/-fill/)
      expect(card).toHaveClass('border-l-4', 'shadow-clickable', 'hover:shadow-overlay')
      expect(card).not.toHaveClass('hover:brightness-90')
    }
  })

  it('colours the attention chips like the same data elsewhere', async () => {
    renderWithRouter(<DashboardPage viewer={STAFF} />)
    const summary = await ready()
    // Student profiles with missing details, not the incident records on the pink card.
    expect(within(summary).getByRole('link', { name: /incomplete student records/ })).not.toHaveClass('bg-unfinished/35')
    expect(within(summary).getByRole('link', { name: /incomplete student records/ })).toHaveClass('shadow-clickable')
    expect(within(summary).getByRole('link', { name: /low stock/ })).toHaveClass('bg-warning-fill')
    expect(within(summary).getByRole('link', { name: /expired or expiring/ })).toHaveClass('bg-error-fill')
    expect(within(summary).getByRole('link', { name: /low stock/ })).not.toHaveClass('border')
  })

  it('puts the number first in a students and staff split', () => {
    expect(splitText({ students: 3, staff: 2 })).toBe('3 students · 2 staff')
    expect(splitText({ students: 1, staff: 0 })).toBe('1 student · 0 staff')
  })

  it('gives the Admin no action cards, and only the links ADR-038 allows', async () => {
    renderWithRouter(<DashboardPage viewer={ADMIN} />)
    const summary = await ready()
    expect(within(summary).queryByText('Follow-ups to review')).not.toBeInTheDocument()
    expect(within(summary).queryByText('Pending excuse letters')).not.toBeInTheDocument()
    expect(within(summary).queryByText('Unfinished incident records')).not.toBeInTheDocument()
    expect(within(summary).getByRole('link', { name: 'Incidents' })).toBeInTheDocument()
    expect(within(summary).queryByRole('link', { name: 'Clinic visits' })).not.toBeInTheDocument()
  })

  it('makes the whole card one link, reachable by keyboard, with the label as its name', async () => {
    const user = userEvent.setup()
    renderWithRouter(<DashboardPage viewer={STAFF} />)
    const summary = await ready()
    const link = within(summary).getByRole('link', { name: 'Follow-ups to review' })
    expect(link.className).toContain('after:inset-0')
    const card = link.closest<HTMLElement>('[data-stat-card]')!
    expect(card.className).toContain('relative')
    expect(within(card).getAllByRole('link')).toHaveLength(1)
    expect(within(card).queryByRole('button')).not.toBeInTheDocument()
    while (document.activeElement !== link) await user.tab()
    expect(link).toHaveFocus()
  })

  it('opens the Incident Log on the unfinished records', async () => {
    renderWithRouter(<DashboardPage viewer={STAFF} />)
    const summary = await ready()
    expect(within(summary).getByRole('link', { name: 'Unfinished incident records' })).toHaveAttribute('href', '/incidents?completion=needs_completion')
  })
})

describe('R4: Trends order', () => {
  it('shows complaints and the visit trend before the demographic charts', async () => {
    renderWithRouter(<DashboardPage viewer={STAFF} />, { route: '/?view=trends' })
    const trend = await screen.findByRole('heading', { name: /Visits trend/ })
    const demographic = screen.getByRole('region', { name: 'Demographic analysis' })
    expect(trend.compareDocumentPosition(demographic) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const common = screen.getByRole('heading', { name: 'Common complaints' })
    expect(common.compareDocumentPosition(demographic) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('R5: staff patients record sex (ADR-063)', () => {
  const newStaff = (over: Partial<PersonnelInput> = {}): PersonnelInput => ({
    firstName: 'Sam', lastName: 'Test', middleName: null, type: 'Teacher', sex: 'male', department: '', contactInfo: '', allergies: [], medicalConditions: [], emergencyContacts: [], ...over,
  })

  it('refuses a new staff record with no sex', async () => {
    await expect(savePersonnel(newStaff({ sex: null }), { actor: STAFF })).rejects.toThrow(/sex/i)
  })

  it('asks for sex with two radio buttons on the form, by keyboard too', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/staff/new']}><AppRoutes user={STAFF} onLogout={() => {}} /></MemoryRouter>)
    const group = await screen.findByRole('radiogroup', { name: /^sex/i })
    expect(within(group).getAllByRole('radio').map((r) => r.getAttribute('value'))).toEqual(['female', 'male'])
    await user.type(screen.getByLabelText(/^first name/i), 'Radio')
    await user.type(screen.getByLabelText(/^last name/i), 'Test')
    await selectOption(user, screen.getByLabelText(/^type/i), 'Teacher')
    await user.click(screen.getByRole('button', { name: 'Save Staff' }))
    expect(await within(group.parentElement!).findByText('Choose the sex.')).toBeInTheDocument()
    within(group).getByRole('radio', { name: 'Female' }).focus()
    await user.keyboard(' ')
    expect(within(group).getByRole('radio', { name: 'Female' })).toBeChecked()
  })

  it('shows sex on the Staff Profile, and "Sex not recorded" when there is none', async () => {
    const person = db().personnel[0]
    render(<MemoryRouter initialEntries={[`/staff/${person.id}`]}><AppRoutes user={STAFF} onLogout={() => {}} /></MemoryRouter>)
    const overview = await screen.findByRole('region', { name: 'Overview' })
    expect(within(overview).getByText('Sex')).toBeInTheDocument()
    expect(within(overview).getByText(person.sex === 'female' ? 'Female' : 'Male')).toBeInTheDocument()
  })

  it('audits the field name and never the value', async () => {
    const person = await getPersonnel('personnel-0002')
    await savePersonnel({ ...person, sex: person.sex === 'male' ? 'female' : 'male' }, { personnelId: person.id, actor: STAFF })
    const entry = getRecordedAuditEntries().at(-1)!
    expect(entry.summary).toMatch(/sex/i)
    expect(entry.summary).not.toMatch(/\b(female|male)\b/i)
  })

  it('counts staff by sex with the split shown, in the exact totals', async () => {
    const before = await getDashboardSummary({ range: ALL }, STAFF)
    await recordVisit({ personnelId: 'personnel-0002', complaint: 'Headache', treatment: '', disposition: 'returned_to_class', followUp: null }, STAFF)
    const after = await getDashboardSummary({ range: ALL }, STAFF)
    const sex = (await getPersonnel('personnel-0002')).sex
    const row = (s: DashboardSummary) => s.demographics.sex.find((r) => r.key === sex)!
    expect(row(after).staff).toBe(row(before).staff! + 1)
    expect(row(after).students).toBe(row(before).students)
    expect(row(after).count).toBe(row(after).students! + row(after).staff!)
    expect(after.demographics.sex.reduce((sum, r) => sum + r.count, 0)).toBe(after.counts.visits + after.counts.incidents)
    expect(after.demographics.gradeLevel).toEqual(before.demographics.gradeLevel)
    expect(after.complaintTrends.series).toEqual(before.complaintTrends.series)
  })

  it('leaves staff incidents out of the Admin by-sex counts, and keeps them for the clinician', async () => {
    const before = { staff: await getDashboardSummary({ range: ALL }, STAFF), admin: await getDashboardSummary({ range: ALL }, ADMIN) }
    await saveIncidentStageOne({ personnelId: 'personnel-0002', complaint: 'Fainting', vitals: db().incidents[0].vitals }, STAFF)
    const staffTotal = (s: DashboardSummary) => s.demographics.sex.reduce((sum, r) => sum + r.incidents, 0)
    const after = { staff: await getDashboardSummary({ range: ALL }, STAFF), admin: await getDashboardSummary({ range: ALL }, ADMIN) }
    expect(staffTotal(after.admin)).toBe(after.admin.counts.split.incidents.students)
    expect(staffTotal(after.admin)).toBe(staffTotal(before.admin))
    expect(staffTotal(after.staff)).toBe(after.staff.counts.incidents)
  })

  it('adds a "No sex recorded" row only when such a record exists', async () => {
    const quiet = await getDashboardSummary({ range: ALL }, STAFF)
    expect(quiet.demographics.sex.map((r) => r.key)).toEqual(['female', 'male'])
    db().personnel[3].sex = null
    await recordVisit({ personnelId: db().personnel[3].id, complaint: 'Headache', treatment: '', disposition: 'returned_to_class', followUp: null }, STAFF)
    const summary = await getDashboardSummary({ range: ALL }, STAFF)
    expect(summary.demographics.sex.at(-1)).toMatchObject({ key: 'none', label: 'No sex recorded' })
    expect(summary.demographics.sex.at(-1)!.count).toBeGreaterThan(0)
  })

  it('splits the Monthly Report visits by sex into students and staff', async () => {
    const report = await getMonthlyReport(db().today.slice(0, 7))
    const { female, male, noSexRecorded } = report.visitsBySex
    expect(female.students + male.students + female.staff + male.staff + noSexRecorded).toBe(report.complaintCounts.reduce((sum, row) => sum + row.count, 0))
  })
})

describe('R6: Sign out', () => {
  function shell(onLogout: () => void) {
    renderWithRouter(<AppShell user={STAFF} active="dashboard" onLogout={onLogout}><div>Screen</div></AppShell>)
  }

  it('asks first, with Cancel focused', async () => {
    const user = userEvent.setup()
    const onLogout = vi.fn()
    shell(onLogout)
    await openAccountMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    const dialog = await screen.findByRole('dialog', { name: 'Sign out of CLINIQ?' })
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    expect(onLogout).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onLogout).not.toHaveBeenCalled()
  })

  it('signs out once confirmed', async () => {
    const user = userEvent.setup()
    const onLogout = vi.fn()
    shell(onLogout)
    await openAccountMenu(user)
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sign Out' }))
    await waitFor(() => expect(onLogout).toHaveBeenCalledOnce())
  })

  // ADR-066: both moved into the account menu; Sign out stays last, after a separator, and still confirms.
  it('leaves Change password without a confirmation, and apart from Sign out', async () => {
    const user = userEvent.setup()
    shell(vi.fn())
    const menu = await openAccountMenu(user)
    const items = within(menu).getAllByRole('menuitem')
    const lock = within(menu).getByRole('menuitem', { name: 'Change password' })
    const signOut = within(menu).getByRole('menuitem', { name: 'Sign out' })
    expect(lock).toHaveAttribute('href', '/account/password')
    expect(items.at(-1)).toBe(signOut)
    expect(signOut.previousElementSibling).toHaveAttribute('role', 'separator')
    // Compact 36px rows (Zean, November 5, 2026).
    for (const control of [lock, signOut]) expect(control.className).toContain('min-h-9')
  })
})

describe('the Overview tab', () => {
  it('shows no alert count, since how it counted was unclear (Zean, November 3, 2026)', async () => {
    renderWithRouter(<DashboardPage viewer={STAFF} />)
    const tab = await screen.findByRole('tab', { name: 'Overview' })
    expect(tab).toHaveAccessibleName('Overview')
    expect(tab.textContent).toBe('Overview')
  })
})

describe('R8: the Clinic Overview printout', () => {
  it('names an expiry on a low-stock label only when the item is expiring, like the screen', () => {
    const row = (flags: InventoryAlertRow['flags'], daysUntilExpiry: number | null) => ({ flags, daysUntilExpiry }) as InventoryAlertRow
    expect(stockStatus(row(['low_stock'], 400))).toBe('Low')
    expect(stockStatus(row(['low_stock', 'nearing_expiration'], 11))).toBe('Low · expires in 11 days')
    expect(stockStatus(row(['nearing_expiration'], 18))).toBe('Expires in 18 days')
    expect(stockStatus(row(['expired'], -4))).toBe('Expired 4 days ago')
  })

  it('prints stock status as a pale tag with no outline, like the inspiration', async () => {
    const year = rangeForPreset('thisYear', db().today)
    const doc = printed(await getDashboardSummary({ range: year }, STAFF), year)
    const tags = [...doc.querySelectorAll<HTMLElement>('[data-print-stock] [data-stock-tag]')]
    expect(tags.length).toBeGreaterThan(0)
    for (const tag of tags) {
      expect(tag.className.split(' ')).not.toContain('border')
      expect(tag.className).toMatch(/bg-(error|warning)-fill/)
    }
    expect(tags.find((tag) => /^Expired/.test(tag.textContent ?? ''))).toHaveClass('bg-error-fill', 'text-error-text')
    expect(tags.find((tag) => tag.textContent === 'Low')).toHaveClass('bg-warning-fill', 'text-warning-text')
  })

  it('embeds the letterhead logo, so it is not blank when printing starts', async () => {
    const year = rangeForPreset('thisYear', db().today)
    const doc = printed(await getDashboardSummary({ range: year }, STAFF), year)
    expect(doc.querySelector('header img')?.getAttribute('src')).toMatch(/^data:image[/]png/)
  })

  it('keeps the page calm: short muted labels, a labelled attention line, one heading size', async () => {
    const year = rangeForPreset('thisYear', db().today)
    const doc = printed(await getDashboardSummary({ range: year }, STAFF), year, await listPendingExcuseLetters())
    const strip = doc.querySelector('[data-print-strip]')!
    const labels = [...strip.querySelectorAll('dt')]
    expect(labels.map((dt) => dt.textContent)).toEqual(['Visits', 'Incidents', 'Active students', 'Excuse letters', 'Follow-ups'])
    for (const dt of labels) expect(dt).toHaveClass('text-text-secondary')
    expect(strip.textContent).toContain('Awaiting approval')
    expect(strip.textContent).toContain('Excludes archived')
    expect(doc.querySelector('[data-print-attention]')?.textContent).toMatch(/^Needs attention: /)
    expect(doc.querySelector('[data-print-letters]')?.textContent ?? '').toMatch(/Visit [A-Z][a-z]{2} \d/)
    // No rule under a heading: the page had too many lines (Zean, November 3, 2026).
    for (const h2 of doc.querySelectorAll('h2')) {
      expect(h2).toHaveClass('text-[12pt]')
      expect(h2).not.toHaveClass('border-b')
    }
  })

  it('runs in action order for a year', async () => {
    const year = rangeForPreset('thisYear', db().today)
    const summary = await getDashboardSummary({ range: year }, STAFF)
    const doc = printed(summary, year)
    expect(within(doc).getByRole('heading', { level: 1, name: 'Clinic Overview' })).toBeInTheDocument()
    expect(doc.querySelector('[data-print-summary]')?.textContent).toMatch(/^\d+ visits? and \d+ incidents? this period\./)
    const order = ['[data-print-strip]', '[data-print-attention]', '[data-print-followups]', '[data-print-letters]', '[data-print-stock]', '[data-print-details]']
    const nodes = order.map((selector) => doc.querySelector(selector)!)
    nodes.forEach((node) => expect(node).toBeInTheDocument())
    for (let i = 1; i < nodes.length; i++) expect(nodes[i - 1].compareDocumentPosition(nodes[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(doc.querySelector('[data-print-attention]')?.textContent).toMatch(/\d+ incomplete records · \d+ low stock · \d+ expired or expiring/)
  })

  it('has no summary sentence for one day', async () => {
    const day = rangeForPreset('today', db().today)
    const doc = printed(await getDashboardSummary({ range: day }, STAFF), day)
    expect(doc.querySelector('[data-print-summary]')).toBeNull()
    expect(doc).toHaveTextContent('Visits and incidents for today')
  })

  it('groups follow-ups with relative wording', async () => {
    const summary = await getDashboardSummary({ range: ALL }, STAFF)
    const row = (daysFromToday: number, dueState: DueFollowUpRow['dueState']): DueFollowUpRow => ({
      followUp: { id: `f${daysFromToday}`, followUpDate: daysFromToday < 0 ? '2026-10-28' : daysFromToday === 0 ? '2026-11-01' : '2026-11-03', reason: 'Recheck', status: 'pending', relatedRecord: null } as never,
      patient: { kind: 'student', id: 's', number: '123456789012' },
      dueState,
      daysFromToday,
    })
    const groups = printed({ ...summary, dueFollowUps: [row(-4, 'overdue'), row(0, 'due_today'), row(2, 'upcoming')] }, ALL).querySelector<HTMLElement>('[data-print-followups]')!
    expect(groups).toHaveTextContent('Overdue · 1')
    expect(groups).toHaveTextContent('Due today · 1')
    expect(groups).toHaveTextContent('Upcoming · 1')
    expect(groups).toHaveTextContent('Oct 28 · 4 days ago')
    expect(groups).toHaveTextContent('Today')
    expect(groups).toHaveTextContent('Nov 3 · in 2 days')
  })

  it('leaves the excuse letters off the version without them, and uses no grey fill', async () => {
    // The Admin cannot print at all (ADR-038), so the Admin's version is only the letters-free shape.
    const doc = printed(await getDashboardSummary({ range: ALL }, ADMIN), ALL, null as never)
    expect(doc.querySelector('[data-print-letters]')).toBeNull()
    expect(doc.querySelector('[data-print-strip]')!.className).not.toMatch(/bg-/)
  })
})

describe('R9: the yearly Activity calendar', () => {
  async function yearly() {
    const user = userEvent.setup()
    renderWithRouter(<CalendarPage />)
    await screen.findByRole('radiogroup', { name: 'Calendar period' })
    await user.click(screen.getByRole('radio', { name: 'Yearly' }))
    await screen.findByText(/Activity, event, and holiday days/)
    return user
  }

  it('marks holidays in a text label and the legend', async () => {
    await yearly()
    expect(await screen.findAllByText(/^Holidays:/)).not.toHaveLength(0)
    expect(screen.getByText('Holiday')).toBeInTheDocument()
  })

  it('drops the year from the table months, with Total centred', async () => {
    const user = await yearly()
    await user.click(screen.getByRole('radio', { name: 'Table' }))
    const table = await screen.findByRole('table', { name: /per month/ })
    expect(within(table).getByRole('rowheader', { name: 'December' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: /^Total/ }).className).toContain('text-center')
    expect(within(table).getByRole('columnheader', { name: /^Visits/ }).className).toContain('text-left')
  })
})
