import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { getInventoryItem, getVisit, recordVisit, saveIncidentStageOne, searchPatients, type SessionUser } from '../lib/mock-db'
import { db } from '../lib/mock-db/store'
import { AppRoutes } from '../routes/AppRoutes'
import { selectOption } from '../test/selectOption'
import { fetchIncidentLog } from './emergency-response/api/incidentLogApi'
import { fetchVisitLog } from './clinic-visits/api/visitLogApi'

/** Staff patients in the clinical flows (ADR-043 part 3). */

const STAFF: SessionUser = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }
const ADMIN: SessionUser = { id: 'user-admin-01', name: 'Gilan Avelida', role: 'admin' }
const STAFF_NAMES = () => db().personnel.map((p) => p.fullName)

function renderAt(route: string, user: SessionUser = STAFF) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppRoutes user={user} onLogout={() => {}} />
    </MemoryRouter>,
  )
}

describe('the patient picker', () => {
  it('returns students and staff, each labelled, with nothing medical', async () => {
    const results = await searchPatients('ar')
    expect(results.some((r) => r.kind === 'student')).toBe(true)
    expect(results.some((r) => r.kind === 'personnel')).toBe(true)
    expect(JSON.stringify(results)).not.toMatch(/Penicillin|Hypertension/)
  })

  it('records a staff visit from New Visit, with the staff member chosen from the profile link and no excuse letter', async () => {
    const user = userEvent.setup()
    renderAt('/visits/new?staff=personnel-0002')
    expect(await screen.findByText('Dindo Arcega · STF-0002 · Teacher · Science department')).toBeInTheDocument()
    // The allergy beside the medicine picker works for staff.
    expect(await screen.findByText(/Penicillin/)).toBeInTheDocument()
    await selectOption(user, screen.getByLabelText(/^Complaint/), 'Headache')
    await user.click(screen.getByRole('radio', { name: 'Sent home' }))
    expect(screen.queryByText('Prepare an excuse letter')).not.toBeInTheDocument()
    expect(screen.getByText('This staff member needs a follow-up')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))
    expect(await screen.findByText(/Visit saved/)).toBeInTheDocument()
    const saved = db().visits.at(-1)!
    expect(saved).toMatchObject({ studentId: null, personnelId: 'personnel-0002', disposition: 'sent_home', excuseLetterDraft: null })
  })
})

describe('lists never show a staff name', () => {
  it('shows the Staff No. and a chip on the Visit Log, and filters Everyone / Students / Staff', async () => {
    const user = userEvent.setup()
    renderAt('/visits')
    const table = await screen.findByRole('table', { name: /visit/i })
    expect(within(table).getAllByText('Staff').length).toBeGreaterThan(0)
    expect(within(table).getAllByText('Student').length).toBeGreaterThan(0)
    for (const name of STAFF_NAMES()) expect(screen.queryByText(name)).not.toBeInTheDocument()

    await selectOption(user, screen.getByLabelText('Patient'), 'Staff')
    expect(within(await screen.findByRole('table', { name: /visit/i })).queryAllByText('Student')).toHaveLength(0)

    const range = { from: '2000-01-01', to: '2100-01-01' }
    const all = await fetchVisitLog({ ...range, search: '', disposition: 'all' })
    const staffOnly = await fetchVisitLog({ ...range, search: '', disposition: 'all', patient: 'staff' })
    const studentsOnly = await fetchVisitLog({ ...range, search: '', disposition: 'all', patient: 'students' })
    expect(staffOnly.length + studentsOnly.length).toBe(all.length)
    expect(staffOnly.every((row) => row.patient.kind === 'personnel' && /^STF-\d{4}$/.test(row.patient.number))).toBe(true)
  })
})

describe('single-person screens for a staff patient', () => {
  it('Visit Details shows the name and the Staff No., and no excuse-letter card', async () => {
    renderAt('/visits/visit-0164')
    expect(await screen.findByText('Bong Saldivar')).toBeInTheDocument()
    expect(screen.getByText('STF-0007')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Excuse letter' })).not.toBeInTheDocument()
    expect(screen.queryByText('Prepare excuse letter')).not.toBeInTheDocument()
  })

  it('the Incident Report and the notification log say emergency contact, not parent or guardian', async () => {
    renderAt('/incidents/incident-0025/report')
    expect(await screen.findByRole('heading', { name: 'Emergency contact notification attempts' })).toBeInTheDocument()
    expect(screen.queryByText(/parent notification/i)).not.toBeInTheDocument()
  })

  it('escalates a staff visit to an incident for the same staff member', async () => {
    const { visit } = await recordVisit({ personnelId: 'personnel-0006', complaint: 'Fainting', treatment: '', disposition: 'resting_in_clinic', followUp: null }, STAFF)
    const incident = await saveIncidentStageOne({ personnelId: 'personnel-0006', complaint: 'Fainting', vitals: {}, sourceVisitId: visit.id }, STAFF)
    expect(incident).toMatchObject({ studentId: null, personnelId: 'personnel-0006', sourceVisitId: visit.id })
    expect((await getVisit(visit.id)).escalatedIncidentId).toBe(incident.id)
    await expect(saveIncidentStageOne({ studentId: 'student-0001', complaint: 'Fainting', vitals: {}, sourceVisitId: visit.id }, STAFF)).rejects.toThrow(/another patient/)
  })

  it('takes stock when medicine is given to a staff member', async () => {
    const before = (await getInventoryItem('item-0010')).currentStock
    await recordVisit({ personnelId: 'personnel-0011', complaint: 'Minor wound', treatment: '', disposition: 'returned_to_class', followUp: null, itemsGiven: [{ itemId: 'item-0010', quantity: 2 }] }, STAFF)
    expect((await getInventoryItem('item-0010')).currentStock).toBe(before - 2)
    expect(db().frontendOnly.inventoryTransactions.at(-1)).toMatchObject({ personnelId: 'personnel-0011', studentId: null })
  })
})

describe('the Admin and staff incidents (D15)', () => {
  it('leaves staff incidents out of the Admin incident log and refuses one by address', async () => {
    const range = { from: '2000-01-01', to: '2100-01-01' }
    const forAdmin = await fetchIncidentLog({ ...range, search: '', completion: 'all' }, ADMIN)
    const forStaff = await fetchIncidentLog({ ...range, search: '', completion: 'all' }, STAFF)
    expect(forAdmin.some((row) => row.patient.kind === 'personnel')).toBe(false)
    expect(forStaff.some((row) => row.patient.kind === 'personnel')).toBe(true)

    renderAt('/incidents/incident-0025/report', ADMIN)
    expect(await screen.findByText('Unable to load the incident report.')).toBeInTheDocument()
  })
})
