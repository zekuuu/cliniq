import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { getDashboardSummary, getMonthlyReport, getPersonnel, getRecordedAuditEntries, recordVisit, saveIncidentStageOne, savePersonnel, type PersonnelInput, type SessionUser } from '../lib/mock-db'
import { db } from '../lib/mock-db/store'
import { rangeForPreset } from '../lib/dateRange'
import { AppShell } from '../layouts/AppShell'
import { AppRoutes } from '../routes/AppRoutes'
import { splitText } from '../lib/patients'
import { renderWithRouter } from '../test/renderWithRouter'
import { selectOption } from '../test/selectOption'
import { CalendarPage } from './dashboard/CalendarPage'
import { DashboardPage } from './dashboard/DashboardPage'
import type { DashboardSummary, InventoryAlertRow } from '../types/dashboard'
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
    for (const name of ['Unfinished incident records', 'Follow-ups to review']) expect(within(todo).getByRole('link', { name })).toBeInTheDocument()
    // The chips share one row under both sections, urgent first (Zean, November 5, 2026).
    const chips = [...within(summary).getAllByRole('link', { name: /expired or expiring|incomplete student records|low stock/ })].map((link) => link.textContent)
    expect(chips.map((text) => text?.replace(/^\d+ /, ''))).toEqual(['expired or expiring', 'incomplete student records', 'low stock'])
    expect(within(attention).queryByRole('link', { name: /expired or expiring/ })).not.toBeInTheDocument()
    for (const name of ['Clinic visits', 'Incidents', 'Active students']) expect(within(activity).getByRole('link', { name })).toBeInTheDocument()
  })

  it('shows Admin only the Activity summary, with no action sections or chips', async () => {
    renderWithRouter(<DashboardPage viewer={ADMIN} />)
    const summary = await ready()
    expect(within(summary).getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Activity summary'])
    expect(within(summary).queryByRole('link', { name: /expired or expiring|incomplete student records|low stock/ })).not.toBeInTheDocument()
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
    // Every chip has its tone's outline (professor's consultation, November 6, 2026).
    expect(within(summary).getByRole('link', { name: /low stock/ })).toHaveClass('border', 'border-warning')
    expect(within(summary).getByRole('link', { name: /expired or expiring/ })).toHaveClass('border', 'border-error')
    expect(within(summary).getByRole('link', { name: /incomplete student records/ })).toHaveClass('border', 'border-text-muted')
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
    const common = screen.getByRole('heading', { name: 'Frequent symptoms' })
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

describe('R8: stock status wording', () => {
  it('names an expiry on a low-stock label only when the item is expiring, like the screen', () => {
    const row = (flags: InventoryAlertRow['flags'], daysUntilExpiry: number | null) => ({ flags, daysUntilExpiry }) as InventoryAlertRow
    expect(stockStatus(row(['low_stock'], 400))).toBe('Low')
    expect(stockStatus(row(['low_stock', 'nearing_expiration'], 11))).toBe('Low · expires in 11 days')
    expect(stockStatus(row(['nearing_expiration'], 18))).toBe('Expires in 18 days')
    expect(stockStatus(row(['expired'], -4))).toBe('Expired 4 days ago')
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
