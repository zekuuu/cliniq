import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { getCalendarDays, getDashboardSummary, listIncidents, listVisits, recordVisit, type SessionUser } from '../lib/mock-db'
import { db } from '../lib/mock-db/store'
import { rangeForPreset } from '../lib/dateRange'
import { splitText } from '../lib/patients'
import { AppRoutes } from '../routes/AppRoutes'
import { DashboardPrint } from './dashboard/components/DashboardPrint'

/** Counts, Audit Log and Privacy Policy with staff patients (ADR-043 part 4). */

const STAFF: SessionUser = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }
const ALL = rangeForPreset('all', db().today)

afterEach(() => {
  act(() => {
    window.dispatchEvent(new Event('afterprint'))
  })
})

describe('totals include staff and show the split (D14)', () => {
  it('each split sums to its total and matches the lists for the same range', async () => {
    const summary = await getDashboardSummary({ range: ALL })
    const { split } = summary.counts
    expect(split.visits.students + split.visits.staff).toBe(summary.counts.visits)
    expect(split.incidents.students + split.incidents.staff).toBe(summary.counts.incidents)
    expect(split.inClinicNow.students + split.inClinicNow.staff).toBe(summary.counts.inClinicNow)
    expect(split.visits.staff).toBeGreaterThan(0)
    expect(split.incidents.staff).toBeGreaterThan(0)

    const counted = (await listVisits({ from: ALL.from, to: ALL.to })).filter((v) => !v.escalatedIncidentId)
    expect(counted.filter((v) => v.personnelId).length).toBe(split.visits.staff)
    expect((await listIncidents({ from: ALL.from, to: ALL.to })).filter((i) => i.personnelId).length).toBe(split.incidents.staff)
  })

  it('counts a staff visit on the calendar day and in the clinic now', async () => {
    const today = db().today
    const before = await getDashboardSummary({ range: { preset: 'today', from: today, to: today } })
    const [dayBefore] = await getCalendarDays(today, today)
    await recordVisit({ personnelId: 'personnel-0003', complaint: 'Headache', treatment: '', disposition: 'resting_in_clinic', followUp: null }, STAFF)
    const after = await getDashboardSummary({ range: { preset: 'today', from: today, to: today } })
    const [dayAfter] = await getCalendarDays(today, today)
    expect(after.counts.split.visits.staff).toBe(before.counts.split.visits.staff + 1)
    expect(after.counts.split.inClinicNow.staff).toBe(before.counts.split.inClinicNow.staff + 1)
    expect(dayAfter.visits).toBe(dayBefore.visits + 1)
  })

  it('leaves staff out of the sex and grade-level trends and the frequent-visitor panel', async () => {
    const before = await getDashboardSummary({ range: ALL })
    for (let i = 0; i < 4; i++)
      await recordVisit({ personnelId: 'personnel-0008', complaint: 'Headache', treatment: '', disposition: 'returned_to_class', followUp: null }, STAFF)
    const after = await getDashboardSummary({ range: ALL })
    expect(after.demographics).toEqual(before.demographics)
    expect(after.frequentVisitors).toEqual(before.frequentVisitors)
    expect(after.counts.split.visits.staff).toBe(before.counts.split.visits.staff + 4)
  })

  it('prints the split on the Clinic Overview Report', async () => {
    const summary = await getDashboardSummary({ range: ALL })
    render(<MemoryRouter><DashboardPrint summary={summary} range={ALL} viewer={STAFF} letters={[]} filterLabel="" /></MemoryRouter>)
    act(() => {
      window.dispatchEvent(new Event('beforeprint'))
    })
    const doc = document.body.querySelector<HTMLElement>('[data-print-document]')!
    expect(doc).toHaveTextContent(splitText(summary.counts.split.visits))
    expect(doc).toHaveTextContent(splitText(summary.counts.split.incidents))
  })
})

describe('Audit Log and Privacy Policy', () => {
  it('filters the Audit Log to Staff targets, shown by Staff No.', async () => {
    const user = userEvent.setup()
    const { savePersonnel } = await import('../lib/mock-db')
    await savePersonnel(
      { fullName: 'Audit Staff', type: 'Teacher', department: null, contactInfo: '', allergies: [], medicalConditions: [], emergencyContacts: [] },
      { actor: STAFF },
    )
    render(
      <MemoryRouter initialEntries={['/audit-log']}>
        <AppRoutes user={STAFF} onLogout={() => {}} />
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { name: 'Audit Log' })
    await user.click(screen.getByRole('button', { name: /target \/ module/i }))
    await user.click(screen.getByRole('checkbox', { name: 'Staff' }))
    await user.keyboard('{Escape}')
    expect(await screen.findByRole('link', { name: 'STF-0013' })).toHaveAttribute('href', '/staff/personnel-0013')
    expect(screen.queryByText('Audit Staff')).not.toBeInTheDocument()
  })

  it('says, provisionally, that staff health information is kept with consent', async () => {
    render(
      <MemoryRouter initialEntries={['/privacy-policy']}>
        <AppRoutes user={null} onLogout={() => {}} />
      </MemoryRouter>,
    )
    expect(await screen.findByText(/Teachers and school staff \(PROVISIONAL\)/)).toBeInTheDocument()
    expect(screen.getByText(/knowledge and consent/)).toBeInTheDocument()
  })
})
