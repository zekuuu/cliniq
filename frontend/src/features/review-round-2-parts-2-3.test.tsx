import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { getIncompleteRecordQueue, type SessionUser } from '../lib/mock-db'
import { renderWithRouter } from '../test/renderWithRouter'
import { db } from '../lib/mock-db/store'
import { StudentFormPage } from './student-records/StudentFormPage'
import { StudentProfilePage } from './student-records/StudentProfilePage'
import { AppRoutes } from '../routes/AppRoutes'
import { IncidentEntryPage } from './emergency-response/IncidentEntryPage'
import { resetMockDb } from '../lib/mock-db'
import { selectOption } from '../test/selectOption'
import { findDuplicateItem } from './inventory/api/inventoryApi'
import { createSportsReport, listInventory, setBackupLocationEnabled } from '../lib/mock-db'
import { useState } from 'react'
import { ComboboxWithOther, HealthListField, MaskedLrn, PatientNumber } from '../components'
import { maskLrn } from '../lib/lrn'
import { STARTER_ALLERGIES } from '../config/healthStarterList'
import { allergyMatches } from '../lib/itemsGiven'
import { getStudent, listStudents } from '../lib/mock-db'
import { missingRequiredFields } from '../lib/mock-db/selectors'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { StudentListPage } from './student-records/StudentListPage'

/* Frontend review, round 2 (groupmate's review, Monday, November 2, 2026), Parts 2 and 3. */

const STAFF: SessionUser = { id: 'user-staff-01', name: 'Demo Clinician', role: 'staff' }
const ADMIN: SessionUser = { id: 'user-admin-01', name: 'Demo Admin', role: 'admin' }

describe('R11: the Student List links to the incomplete records', () => {
  it('shows Staff the queue count as a link to the queue', async () => {
    renderWithRouter(<StudentListPage viewer={STAFF} />)
    const open = (await getIncompleteRecordQueue()).filter((row) => row.status === 'open').length
    const link = await screen.findByRole('link', { name: `Incomplete records (${open})` })
    expect(link).toHaveAttribute('href', '/students/incomplete')
  })

  it('goes back from the queue to the Student List, whichever page opened it (Zean, November 3, 2026)', async () => {
    render(<MemoryRouter initialEntries={['/dashboard', '/students/incomplete']} initialIndex={1}><AppRoutes user={STAFF} onLogout={() => {}} /></MemoryRouter>)
    const back = await screen.findByRole('link', { name: 'Back' }, { timeout: 5000 })
    expect(back).toHaveAttribute('href', '/students')
    // The underline starts at the chevron's tip, not at the edge of its icon box (Zean, November 3, 2026).
    expect(back.querySelector('svg')).toHaveClass('-ml-1.5')
  })

  it('gives the Admin no link, since the queue is Staff only (ADR-038)', async () => {
    renderWithRouter(<StudentListPage viewer={ADMIN} />)
    await screen.findByRole('heading', { name: 'Student List' })
    expect(screen.queryByRole('link', { name: /Incomplete records/ })).not.toBeInTheDocument()
  })
})

describe('R12: student sex as a choice of two', () => {
  it('asks with two radio buttons, required, and works by keyboard', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithRouter(<StudentFormPage />)
    const group = await screen.findByRole('radiogroup', { name: /^sex/i })
    expect(within(group).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(['female', 'male'])
    expect(screen.queryByRole('checkbox', { name: /female|male/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Student' }))
    expect(await within(group.parentElement!).findByText('Select the sex recorded by the school.')).toBeInTheDocument()
    within(group).getByRole('radio', { name: 'Male' }).focus()
    await user.keyboard(' ')
    expect(within(group).getByRole('radio', { name: 'Male' })).toBeChecked()
    await user.keyboard('{ArrowLeft}')
    expect(within(group).getByRole('radio', { name: 'Female' })).toBeChecked()
  })
})

describe('R13: Record a visit and Record an incident from the Student Profile', () => {
  it('links Staff to both forms for this student', async () => {
    renderWithRouter(<StudentProfilePage viewer={STAFF} studentId="student-0001" />)
    expect(await screen.findByRole('link', { name: 'Record a visit' })).toHaveAttribute('href', '/visits/new?student=student-0001')
    expect(screen.getByRole('link', { name: 'Record an incident' })).toHaveAttribute('href', '/incidents/new?student=student-0001')
  })

  it('hides them from the Admin and on an archived record', async () => {
    const { unmount } = renderWithRouter(<StudentProfilePage viewer={ADMIN} studentId="student-0001" />)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('link', { name: 'Record a visit' })).not.toBeInTheDocument()
    unmount()
    db().students.find((s) => s.id === 'student-0002')!.archived = true
    renderWithRouter(<StudentProfilePage viewer={STAFF} studentId="student-0002" />)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('link', { name: 'Record an incident' })).not.toBeInTheDocument()
    db().students.find((s) => s.id === 'student-0002')!.archived = false
  })

  it.each([['/visits/new?student=student-0001'], ['/incidents/new?student=student-0001']])('opens %s with the student already chosen', async (route) => {
    const student = await getStudent('student-0001')
    render(<MemoryRouter initialEntries={[route]}><AppRoutes user={STAFF} onLogout={() => {}} /></MemoryRouter>)
    expect(await screen.findByText(new RegExp(`^${student.fullName} · `), {}, { timeout: 8000 })).toBeInTheDocument()
  }, 15000)
})

describe('R14: a missing birthdate makes the record incomplete', () => {
  it('lists Birthdate as missing, like a missing contact, without blocking a save', async () => {
    const student = db().students.find((s) => s.id === 'student-0005')!
    expect(student.birthDate).toBeNull()
    expect(missingRequiredFields(student)).toEqual(['Birthdate'])
    const incomplete = await listStudents({ recordStatus: 'incomplete', limit: 200 })
    expect(incomplete.map((row) => row.id)).toContain('student-0005')
    // Seed: 3 incomplete before the rule, 8 after (5 more have no birthdate).
    expect(db().students.filter((s) => missingRequiredFields(s).length > 0)).toHaveLength(8)
  })
})

describe('R15: a contact relationship of "Other" says which', () => {
  function Harness({ error }: { error?: string }) {
    const [value, setValue] = useState('')
    return (
      <>
        <ComboboxWithOther label="Relationship" otherOption="Other" otherLabel="Say which relationship" aria-label="Primary emergency contact relationship" value={value} options={['Mother', 'Father']} error={error} onValueChange={setValue} />
        <output data-testid="value">{value}</output>
      </>
    )
  }

  it('shows a required box when Other is picked, and stores what is typed there', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithRouter(<Harness error="Enter the contact relationship." />)
    expect(screen.queryByRole('textbox', { name: /Say which relationship/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Primary emergency contact relationship' }))
    await user.click(screen.getByRole('option', { name: 'Other' }))
    const which = screen.getByRole('textbox', { name: /Say which relationship/ })
    expect(which).toBeRequired()
    expect(which).toHaveAccessibleDescription('Enter the contact relationship.')
    await user.type(which, 'Tita')
    expect(screen.getByTestId('value')).toHaveTextContent(/^Tita$/)
    expect(screen.getByRole('combobox', { name: 'Primary emergency contact relationship' })).toHaveValue('Other')
  })

  it('is on the student and the staff forms', async () => {
    const user = userEvent.setup({ delay: null })
    for (const route of ['/students/new', '/staff/new']) {
      const { unmount } = render(<MemoryRouter initialEntries={[route]}><AppRoutes user={STAFF} onLogout={() => {}} /></MemoryRouter>)
      await user.click(await screen.findByRole('combobox', { name: 'Primary emergency contact relationship' }))
      await user.click(screen.getByRole('option', { name: 'Other' }))
      expect(screen.getByRole('textbox', { name: /Say which relationship/ })).toBeInTheDocument()
      unmount()
    }
  })
})

describe('R16: allergies and conditions from a starter list', () => {
  function Harness() {
    const [value, setValue] = useState('')
    return (
      <>
        <HealthListField label="Allergies" list={STARTER_ALLERGIES} value={value} onValueChange={setValue} />
        <output data-testid="value">{value}</output>
      </>
    )
  }

  it('finds an allergen by its English or Filipino name and stores the English name', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithRouter(<Harness />)
    const field = screen.getByRole('combobox', { name: 'Allergies' })
    await user.type(field, 'hip')
    await user.click(screen.getByRole('option', { name: /^Shrimp/ }))
    expect(screen.getByTestId('value')).toHaveTextContent(/^Shrimp,$/)
    await user.type(field, 'pean')
    await user.click(screen.getByRole('option', { name: /^Peanut/ }))
    expect(screen.getByTestId('value')).toHaveTextContent(/^Shrimp, Peanut,$/)
  })

  it('keeps a free-text entry and marks it as typed by hand', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithRouter(<Harness />)
    await user.type(screen.getByRole('combobox', { name: 'Allergies' }), 'Shrimp, Mango')
    expect(screen.getByText('Typed by hand, not on the starter list: Mango')).toBeInTheDocument()
  })

  it('still warns at the medicine picker for a Filipino name typed by hand (ADR-049)', () => {
    expect(allergyMatches({ avoidIfAllergicTo: ['shrimp'] }, ['Hipon'])).toEqual(['shrimp'])
    expect(allergyMatches({ avoidIfAllergicTo: ['penicillin'] }, ['Penicillin'])).toEqual(['penicillin'])
    expect(allergyMatches({ avoidIfAllergicTo: ['shrimp'] }, ['Peanut'])).toEqual([])
  })

  it('is on the student and the staff forms', async () => {
    for (const route of ['/students/new', '/staff/new']) {
      const { unmount } = render(<MemoryRouter initialEntries={[route]}><AppRoutes user={STAFF} onLogout={() => {}} /></MemoryRouter>)
      expect(await screen.findByRole('combobox', { name: 'Allergies' })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: 'Medical conditions' })).toBeInTheDocument()
      unmount()
    }
  })
})

describe('R17: the Student Health Record printout', () => {
  it('names the student once, in the identity block, with bold black field titles and the full LRN', async () => {
    const student = await getStudent('student-0001')
    renderWithRouter(<StudentProfilePage viewer={STAFF} studentId="student-0001" />)
    await screen.findByRole('heading', { level: 1 })
    act(() => {
      window.dispatchEvent(new Event('beforeprint'))
    })
    const doc = document.body.querySelector<HTMLElement>('[data-print-document]')!
    expect(doc.querySelector('[data-print-scope]')).not.toHaveTextContent(student.fullName)
    expect(doc.textContent!.split(student.fullName)).toHaveLength(2)
    expect(doc).toHaveTextContent(student.lrn)
    const title = within(doc).getByText('Full name')
    expect(title).toHaveClass('font-bold', 'text-text-primary')
    expect(title).not.toHaveClass('text-text-secondary')
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
  })
})

describe('R19: the staff department or role, from those in use', () => {
  it('lists the departments starting with what is typed, picks one, or takes Other (specify)', async () => {
    const user = userEvent.setup({ delay: null })
    render(<MemoryRouter initialEntries={['/staff/new']}><AppRoutes user={STAFF} onLogout={() => {}} /></MemoryRouter>)
    const field = await screen.findByRole('combobox', { name: /^Department or role/ })
    await user.type(field, 'g')
    const options = screen.getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['Other (specify)', 'Grade 4 adviser', 'Grade 9 adviser', 'Grounds'])
    await user.click(screen.getByRole('option', { name: 'Grounds' }))
    expect(field).toHaveValue('Grounds')
    await user.clear(field)
    await user.click(field)
    await user.click(screen.getByRole('option', { name: 'Other (specify)' }))
    expect(screen.getByRole('textbox', { name: /^Specify other department or role/ })).toBeRequired()
  })
})

describe('R20: no "In clinic now" badge on the Visit Log', () => {
  it('keeps the filter and the ?inClinic=1 link, and shows the disposition only', async () => {
    render(<MemoryRouter initialEntries={['/visits?inClinic=1']}><AppRoutes user={STAFF} onLogout={() => {}} /></MemoryRouter>)
    const table = await screen.findByRole('table', {}, { timeout: 5000 })
    expect(within(table).getAllByText('Resting in clinic').length).toBeGreaterThan(0)
    expect(within(table).queryByText('In clinic now')).not.toBeInTheDocument()
  })
})

describe('R21: New Visit shows the conditions next to the allergies', () => {
  it.each([
    ['/visits/new?student=student-0006', 'Allergies: Penicillin', 'Medical conditions: Asthma'],
    ['/visits/new?staff=personnel-0001', 'Allergies: None recorded', 'Medical conditions: Hypertension'],
  ])('for %s', async (route, allergies, conditions) => {
    render(<MemoryRouter initialEntries={[route]}><AppRoutes user={STAFF} onLogout={() => {}} /></MemoryRouter>)
    const banner = await screen.findByTestId('patient-health', {}, { timeout: 8000 })
    expect(within(banner).getByText(allergies)).toHaveClass('text-warning-text')
    expect(within(banner).getByText(conditions)).toBeInTheDocument()
  }, 15000)
})

describe('R22: the Staff chip is grey, so it stands apart from Student', () => {
  it('fills Staff grey and leaves Student outlined', () => {
    renderWithRouter(
      <>
        <PatientNumber patient={{ kind: 'personnel', number: 'STF-0002' }} />
        <PatientNumber patient={{ kind: 'student', number: '000000260001' }} />
      </>,
    )
    expect(screen.getByText('Staff')).toHaveClass('bg-surface', 'text-text-secondary')
    expect(screen.getByText('Student')).not.toHaveClass('bg-surface')
  })
})

describe('R23: Escape on a half-filled notification attempt', () => {
  it.each([['Escape']])('discards it with %s, logging nothing', async (how) => {
    resetMockDb()
    const user = userEvent.setup({ delay: null })
    renderWithRouter(<IncidentEntryPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Complete Incident Record' })
    await selectOption(user, screen.getByLabelText('Outcome'), 'No answer')
    await user.type(screen.getByLabelText('Attempt note'), 'Line busy')
    if (how === 'Escape') await user.keyboard('{Escape}')
    expect(screen.getByLabelText('Attempt note')).toHaveValue('')
    expect(screen.getByLabelText('Outcome')).toHaveTextContent('Reached')
    expect(screen.queryByText('No answer', { selector: 'li *' })).not.toBeInTheDocument()
  })
})

describe('An added notification attempt can be removed before Complete Incident (Zean, November 5, 2026)', () => {
  it('shows an X on each added attempt that takes it off the list, and the Cancel button is gone', async () => {
    resetMockDb()
    const user = userEvent.setup({ delay: null })
    renderWithRouter(<IncidentEntryPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Complete Incident Record' })
    expect(screen.queryByRole('button', { name: 'Cancel attempt' })).not.toBeInTheDocument()
    await selectOption(user, screen.getByLabelText('Outcome'), 'No answer')
    await user.type(screen.getByLabelText('Attempt note'), 'Line busy')
    await user.click(screen.getByRole('button', { name: 'Add Attempt' }))
    const remove = await screen.findByRole('button', { name: /^Remove attempt: No answer at / })
    await user.click(remove)
    expect(screen.queryByRole('button', { name: /^Remove attempt/ })).not.toBeInTheDocument()
    expect(screen.getByText('No notification attempts added yet.')).toBeInTheDocument()
  })
})

describe('R25: a new item named like an existing one', () => {
  it('matches ignoring case, spaces and generic or branded wording, never the item being edited', async () => {
    const items = (await listInventory()) as Parameters<typeof findDuplicateItem>[0]
    for (const typed of ['paracetamol 500 MG', 'Paracetamol 500mg (Generic)', 'Branded paracetamol 500mg'])
      expect(findDuplicateItem(items, typed)?.name).toBe('Paracetamol 500mg')
    expect(findDuplicateItem(items, 'Paracetamol 250mg')).toBeNull()
    expect(findDuplicateItem(items, 'Paracetamol 500mg generic', 'item-0001')).toBeNull()
  })
})

describe('R26: the Inventory list is paged', () => {
  it('shows ten items a page, keeps searching across pages, and goes back to page 1 on a new search', async () => {
    resetMockDb()
    window.sessionStorage.clear()
    const user = userEvent.setup({ delay: null })
    render(<MemoryRouter initialEntries={['/inventory']}><AppRoutes user={STAFF} onLogout={() => {}} /></MemoryRouter>)
    const table = await screen.findByRole('table', { name: 'Inventory items' }, { timeout: 5000 })
    const total = (await listInventory()).length
    expect(total).toBeGreaterThan(10)
    expect(within(table).getAllByRole('row')).toHaveLength(11)
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(within(screen.getByRole('table', { name: 'Inventory items' })).getAllByRole('row')).toHaveLength(total - 10 + 1)
    await user.type(screen.getByLabelText('Search'), 'para')
    expect(await screen.findByText('Page 1 of 1')).toBeInTheDocument()
  })
})

describe('R27: Expired does not look like Low stock on the Inventory list', () => {
  it('shows Expired solid red with light text and Low stock in the warning style, both in words', async () => {
    resetMockDb()
    window.sessionStorage.setItem('cliniq.pageSize', '50')
    render(<MemoryRouter initialEntries={['/inventory']}><AppRoutes user={STAFF} onLogout={() => {}} /></MemoryRouter>)
    const table = await screen.findByRole('table', { name: 'Inventory items' }, { timeout: 5000 })
    const expired = within(table).getAllByText('Expired', { selector: 'span *, span' }).find((el) => el.closest('.bg-error'))!.closest('.bg-error')!
    expect(expired).toHaveClass('bg-error', 'text-white')
    const low = within(table).getAllByText('Low stock')[0].closest('[class*="bg-warning"]')!
    expect(low).toHaveClass('bg-warning-fill')
    expect(low).not.toHaveClass('bg-error')
  })
})

describe('R28: the report month sits beside the report heading', () => {
  it('puts the month picker in the card header, after the heading in keyboard order', async () => {
    render(<MemoryRouter initialEntries={['/reports']}><AppRoutes user={STAFF} onLogout={() => {}} /></MemoryRouter>)
    const heading = await screen.findByRole('heading', { name: 'Monthly Report', level: 2 }, { timeout: 5000 })
    const header = heading.closest('header, [data-card-header]') ?? heading.parentElement!.parentElement!.parentElement!
    const month = screen.getByLabelText('Report month')
    expect(header).toContainElement(month)
    expect(heading.compareDocumentPosition(month) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('R29 and R30: complaint figures print once', () => {
  async function printReport(tab: string) {
    const user = userEvent.setup({ delay: null })
    render(<MemoryRouter initialEntries={['/reports']}><AppRoutes user={STAFF} onLogout={() => {}} /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Monthly Report', level: 2 }, { timeout: 5000 })
    if (tab !== 'Monthly Report') await user.click(screen.getByRole('tab', { name: tab }))
    // Print only once the report's data is on screen.
    await screen.findAllByText(tab === 'Monthly Report' ? 'Clinic visits' : /Most common/, {}, { timeout: 5000 })
    act(() => {
      window.dispatchEvent(new Event('beforeprint'))
    })
    return document.body.querySelector<HTMLElement>('[data-print-document]')!
  }

  // Zean, November 5, 2026: R29 dropped the chart but left two complaint tables; only the weekly one stays.
  it('prints the Monthly Report complaints once, as the weekly table only', async () => {
    const doc = await printReport('Monthly Report')
    expect(within(doc).queryByRole('figure')).not.toBeInTheDocument()
    expect(within(doc).queryByRole('table', { name: 'Clinic visits by symptom, with share' })).not.toBeInTheDocument()
    expect(within(doc).getAllByRole('table', { name: 'Clinic visits by symptom and week' })).toHaveLength(1)
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
  })

  it('prints the Complaint Summary chart above its table, not side by side, and no weekly table', async () => {
    const doc = await printReport('Symptom summary')
    const figure = within(doc).getByRole('figure')
    const table = within(doc).getByRole('table', { name: 'Clinic visits by symptom, with share' })
    expect(figure.parentElement!.className).not.toMatch(/grid-cols-2/)
    expect(figure.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(doc).queryByRole('table', { name: 'Clinic visits by symptom and week' })).not.toBeInTheDocument()
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
  })
})

describe('R31: "Include recorded conditions and allergies" switched off on Edit', () => {
  it('prints no recorded allergy or condition on the screen or the printout once unticked', async () => {
    resetMockDb()
    const user = userEvent.setup({ delay: null })
    const oliver = await getStudent('student-0002')
    const report = await createSportsReport({ title: 'Tryouts', activity: '', requestedBy: 'Coach', window: 'school_year', includeConditions: true, students: [{ studentId: oliver.id }] }, STAFF)
    const recorded = [...oliver.allergies, ...oliver.medicalConditions]
    expect(recorded.length).toBeGreaterThan(0)

    render(<MemoryRouter initialEntries={[`/reports/sports/${report.id}/edit`]}><AppRoutes user={STAFF} onLogout={() => {}} /></MemoryRouter>)
    const box = await screen.findByRole('checkbox', { name: /Include recorded conditions and allergies/ }, { timeout: 5000 })
    expect(box).toBeChecked()
    expect(screen.getByText(/symptoms always print/)).toBeInTheDocument()
    await user.click(box)
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    const page = await screen.findByRole('table', { name: 'Sports Report preview' }, { timeout: 5000 })
    for (const word of recorded) expect(page).not.toHaveTextContent(word)

    act(() => {
      window.dispatchEvent(new Event('beforeprint'))
    })
    const doc = document.body.querySelector<HTMLElement>('[data-print-document]')!
    expect(doc).toHaveTextContent(oliver.fullName)
    for (const word of recorded) expect(doc).not.toHaveTextContent(word)
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
  }, 15000)
})

describe('R32: the last enabled backup location cannot be disabled', () => {
  it('refuses in the data layer, with a clear message, and allows it again once another is enabled', async () => {
    resetMockDb()
    await setBackupLocationEnabled('backup-location-0002', false, STAFF)
    await expect(setBackupLocationEnabled('backup-location-0001', false, STAFF)).rejects.toThrow('Enable another backup location before disabling the last one.')
    expect(db().frontendOnly.backupLocations.find((l) => l.id === 'backup-location-0001')!.enabled).toBe(true)
    await setBackupLocationEnabled('backup-location-0002', true, STAFF)
    await expect(setBackupLocationEnabled('backup-location-0001', false, STAFF)).resolves.toMatchObject({ enabled: false })
  })

  it('turns the button off with the reason on the screen', async () => {
    resetMockDb()
    const user = userEvent.setup({ delay: null })
    render(<MemoryRouter initialEntries={['/backup']}><AppRoutes user={STAFF} onLogout={() => {}} /></MemoryRouter>)
    await user.click(await screen.findByRole('button', { name: 'Disable External drive' }, { timeout: 5000 }))
    const last = await screen.findByRole('button', { name: 'Disable Internal drive' })
    await waitFor(() => expect(last).toBeDisabled())
    expect(last).toHaveAccessibleDescription('The only enabled location. Enable another one first.')
    await user.click(screen.getByRole('button', { name: 'Enable External drive' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Disable Internal drive' })).toBeEnabled())
  })
})

describe('the masked LRN reads lighter', () => {
  it('uses small bullets, not bold black circles (Zean, November 3, 2026)', () => {
    expect(maskLrn('000000250032')).toBe('••••••••0032')
    renderWithRouter(<MaskedLrn lrn="000000250032" />)
    // Inter's case alternates raise the bullets to the digits' centre (Zean, November 3, 2026: "not visually aligned").
    expect(screen.getByText('••••••••0032')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-lrn-dots] circle')).toHaveLength(8)
    expect(document.body.textContent).not.toContain('●')
  })
})
