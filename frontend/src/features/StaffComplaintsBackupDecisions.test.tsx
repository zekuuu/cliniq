import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { todayISO } from '../lib/dates'
import { dispositionLabel } from '../lib/dispositions'
import {
  ExtraComplaintsError,
  getDashboardSummary,
  getMonthlyReport,
  getPersonnelTypes,
  getRecordedAuditEntries,
  listBackupLocations,
  listIncidents,
  recordBackupNow,
  recordVisit,
  resetMockDb,
  saveBackupLocation,
  saveIncidentStageOne,
  setBackupLocationEnabled,
  NoBackupLocationError,
  type SessionUser,
} from '../lib/mock-db'
import { migratePersistedState, type Saved } from '../lib/mock-db/store'
import { resolveSeed, seed } from '../lib/mock-db/seed'
import { renderWithRouter } from '../test/renderWithRouter'
import { BackupStatusPage } from './backup/BackupStatusPage'
import { PeSportsReferralPage } from './clinic-visits/PeSportsReferralPage'
import { VisitDetailPage } from './clinic-visits/VisitDetailPage'

const STAFF: SessionUser = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }
const ADMIN: SessionUser = { id: 'user-admin-01', name: 'Principal', role: 'admin' }

/** Decisions sheet, Part 6: staff wording, extra complaints and backup locations (ADR-052, ADR-053). */
describe('Staff wording, extra complaints and backup locations', () => {
  beforeEach(() => resetMockDb())

  it('marks the PE referral starting wording "to be confirmed" on screen, never on paper', async () => {
    renderWithRouter(<PeSportsReferralPage />)
    const note = await screen.findByText(/^Starting wording, to be confirmed/)
    expect(note).toHaveClass('print:hidden')
  })

  it('counts a visit with 2 extra tags once in the reports and shows the tags on Visit Details', async () => {
    const month = todayISO().slice(0, 7)
    const before = (await getMonthlyReport(month)).complaintCounts
    const total = (rows: typeof before) => rows.reduce((sum, row) => sum + row.count, 0)
    const { visit } = await recordVisit({ studentId: 'student-0001', complaint: 'Fever', extraComplaints: ['Headache', 'Chills', 'fever'], treatment: '', disposition: 'returned_to_class', followUp: null })
    // The main complaint is never repeated as a tag.
    expect(visit.extraComplaints).toEqual(['Headache', 'Chills'])
    const after = (await getMonthlyReport(month)).complaintCounts
    expect(total(after)).toBe(total(before) + 1)
    expect(after.find((row) => row.complaint === 'Headache')?.count ?? 0).toBe(before.find((row) => row.complaint === 'Headache')?.count ?? 0)

    renderWithRouter(<VisitDetailPage visitId={visit.id} />)
    expect(await screen.findByRole('heading', { name: 'Other complaints' })).toBeInTheDocument()
    expect(screen.getByText('Headache, Chills')).toBeInTheDocument()
  })

  it('refuses a fourth extra complaint with a clear message', async () => {
    await expect(
      recordVisit({ studentId: 'student-0001', complaint: 'Fever', extraComplaints: ['Headache', 'Chills', 'Dizziness', 'Toothache'], treatment: '', disposition: 'returned_to_class', followUp: null }),
    ).rejects.toBeInstanceOf(ExtraComplaintsError)
    await expect(
      recordVisit({ studentId: 'student-0001', complaint: 'Fever', extraComplaints: ['Headache', 'Chills', 'Dizziness', 'Toothache'], treatment: '', disposition: 'returned_to_class', followUp: null }),
    ).rejects.toThrow('Add at most 3 extra complaints.')
  })

  it('stops the field at 3 extra complaints and says so', async () => {
    const user = userEvent.setup()
    const { ExtraComplaintsField } = await import('./clinic-visits/ExtraComplaintsField')
    let value = ['Headache', 'Chills', 'Dizziness']
    renderWithRouter(<ExtraComplaintsField value={value} onChange={(next) => (value = next)} main="Fever" suggestions={['Toothache']} />)
    await user.type(screen.getByRole('combobox', { name: /Other complaints/ }), 'Toothache')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Up to 3 extra complaints. Remove one to add another.')
    expect(value).toHaveLength(3)
  })

  it('offers the staff type "Other", also in a saved copy that lacked it', async () => {
    expect(await getPersonnelTypes()).toEqual(['Teacher', 'Non-teaching staff', 'Utility worker', 'Other'])
    const state = resolveSeed(seed, todayISO())
    state.config.personnelTypes = ['Teacher', 'Non-teaching staff', 'Utility worker']
    const migrated = migratePersistedState({ state, seedAuditLength: 0 } as Saved)
    expect(migrated.state.config.personnelTypes).toContain('Other')
  })

  it('says "Returned to work" for a staff visit and "Returned to class" for a student', async () => {
    expect(dispositionLabel('returned_to_class', 'personnel')).toBe('Returned to work')
    expect(dispositionLabel('returned_to_class', 'student')).toBe('Returned to class')
    expect(dispositionLabel('sent_home', 'personnel')).toBe('Sent home')
    const { visit } = await recordVisit({ personnelId: 'personnel-0001', complaint: 'Fever', treatment: '', disposition: 'returned_to_class', followUp: null })
    expect(visit.disposition).toBe('returned_to_class')
    renderWithRouter(<VisitDetailPage visitId={visit.id} />)
    expect(await screen.findByText('Returned to work')).toBeInTheDocument()
  })

  it("matches the Admin's incident total to the Admin's Incident Log, while the clinician's counts staff too", async () => {
    await saveIncidentStageOne({ personnelId: 'personnel-0001', complaint: 'Fainting', vitals: {} })
    const range = { preset: 'all' as const, from: '2000-01-01', to: todayISO() }
    const admin = await getDashboardSummary({ range }, ADMIN)
    const staff = await getDashboardSummary({ range }, STAFF)
    expect(admin.counts.incidents).toBe((await listIncidents(range, ADMIN)).length)
    expect(staff.counts.incidents).toBe((await listIncidents(range, STAFF)).length)
    expect(staff.counts.incidents).toBe(admin.counts.incidents + staff.counts.split.incidents.staff)
    expect(staff.counts.split.incidents.staff).toBeGreaterThan(0)
  })

  it('adds, edits and disables a backup location, each audited, never deletes it, and backs up to each enabled one', async () => {
    const added = await saveBackupLocation({ label: 'USB stick', path: 'F:\\' }, { actor: STAFF })
    await saveBackupLocation({ label: 'USB stick (blue)', path: 'F:\\' }, { id: added.id, actor: STAFF })
    await setBackupLocationEnabled(added.id, false, STAFF)
    const entries = getRecordedAuditEntries().filter((entry) => entry.targetRecord?.type === 'backup-location')
    expect(entries.map((entry) => [entry.actionType, entry.summary])).toEqual([
      ['create', undefined],
      ['update', 'Updated label'],
      ['update', 'Disabled'],
    ])
    const { locations } = await listBackupLocations()
    expect(locations.find((location) => location.id === added.id)).toMatchObject({ label: 'USB stick (blue)', enabled: false })
    expect('deleteBackupLocation' in (await import('../lib/mock-db'))).toBe(false)

    await recordBackupNow(STAFF)
    const after = (await listBackupLocations()).locations
    for (const location of after.filter((l) => l.enabled)) expect(location).toMatchObject({ lastResult: 'ok', lastBackupAt: expect.stringContaining(todayISO()) })
    expect(after.find((location) => location.id === added.id)?.lastBackupAt).toBeNull()
  })

  it('warns when no location is enabled, and refuses to back up', async () => {
    for (const location of (await listBackupLocations()).locations) await setBackupLocationEnabled(location.id, false, STAFF)
    await expect(recordBackupNow(STAFF)).rejects.toBeInstanceOf(NoBackupLocationError)
    renderWithRouter(<BackupStatusPage />)
    expect(await screen.findByText(/^No backup location is enabled/)).toHaveAttribute('role', 'alert')
  })
})
