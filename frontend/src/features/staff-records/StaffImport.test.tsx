import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyStaffImport, getPersonnel, getRecordedAuditEntries, getStaffIncompleteQueue, listPersonnel, previewStaffImport, resetMockDb } from '../../lib/mock-db'
import { guessStaffMapping, mapStaffRows, parseCsv, type StaffImportRow } from '../../lib/staffImport'
import { renderWithRouter } from '../../test/renderWithRouter'
import SAMPLE from '../../../sample-data/staff-list-sample.csv?raw'
import { StaffImportPage } from './StaffImportPage'

/** Staff list import (ADR-069). */
const STAFF = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' } as const

const CSV = [
  'Staff No.,Last Name,First Name,Middle Name,Sex,Type,Department,Contact Number,Emergency Contact Name,Relationship,Emergency Contact Phone',
  // By Staff No.: Liza Pangilinan has no emergency contact; the file adds one, which completes her record.
  'STF-0005,Pangilinan,Liza,,F,Teacher,Grade 9 adviser,,Ana Pangilinan,Sister,0917-111-2222',
  // By name and type, no Staff No.: a department change.
  ',Arcega,Dindo,,M,Teacher,Math department,,,,',
  // New.
  ',Reyes,Carla,,F,Non-teaching staff,Guidance office,0918-000-1111,,,',
  // Problems.
  'STF-0999,Nobody,Here,,M,Teacher,,,,,',
  ',Lopez,Ben,,X,Teacher,,,,,',
  ',Cruz,Ann,,F,Janitor,,,,,',
  ',Diaz,Rey,,M,Teacher,,,Mom,,,',
].join('\n')

const rowsOf = (text: string): StaffImportRow[] => {
  const [headers, ...rows] = parseCsv(text)
  return mapStaffRows(rows, guessStaffMapping(headers))
}

describe('Staff list import (ADR-069)', () => {
  beforeEach(() => resetMockDb())

  it('guesses the columns, keeping the emergency phone apart from the contact number', () => {
    const [headers] = parseCsv(CSV)
    const mapping = guessStaffMapping(headers)
    expect(mapping.contactInfo).toBe(7)
    expect(mapping.contactPhone).toBe(10)
    expect(mapping.staffNumber).toBe(0)
  })

  it('previews new, matched and skipped rows', async () => {
    const preview = await previewStaffImport(rowsOf(CSV), STAFF)
    expect(preview).toMatchObject({ newCount: 1, continuingCount: 2, changedCount: 2 })
    expect(preview.problems.map((p) => [p.line, p.problem])).toEqual([
      [5, 'No staff record has the Staff No. STF-0999. Leave it blank to add a new staff member.'],
      [6, 'Sex must be Male or Female.'],
      [7, '"Janitor" is not a staff type (Teacher, Non-teaching staff, Utility worker, Other).'],
      [8, 'The emergency contact needs a name, relationship and phone.'],
    ])
  })

  it('applies: updates by Staff No. and by name, adds with a new Staff No., resolves a completed record, and audits counts only', async () => {
    const result = await applyStaffImport(rowsOf(CSV), { fileName: 'staff.csv', actor: STAFF })
    expect(result).toEqual({ created: 1, updated: 2, flagged: 4 })
    const liza = await getPersonnel('personnel-0005')
    expect(liza.emergencyContacts).toEqual([{ name: 'Ana Pangilinan', relationship: 'Sister', phone: '0917-111-2222', verified: false }])
    expect((await getStaffIncompleteQueue()).find((row) => row.person.id === 'personnel-0005')?.status).toBe('resolved')
    expect((await listPersonnel({ search: 'Dindo' }))[0].department).toBe('Math department')
    const carla = (await listPersonnel({ search: 'Carla Reyes' }))[0]
    expect(carla).toMatchObject({ staffNumber: 'STF-0013', type: 'Non-teaching staff', contactInfo: '0918-000-1111' })
    expect(getRecordedAuditEntries().at(-1)!.summary).toBe('1 added, 2 updated, 4 flagged')
  })

  it("never replaces a contact CLINIQ already has, and writes nothing when nothing changes", async () => {
    const rows = rowsOf('Staff No.,Last Name,First Name,Sex,Type,Emergency Contact Name,Relationship,Emergency Contact Phone\nSTF-0002,Arcega,Dindo,M,Teacher,New Person,Friend,0917-999-0000')
    const before = (await getPersonnel('personnel-0002')).emergencyContacts
    const audits = getRecordedAuditEntries().length
    expect(await applyStaffImport(rows, { fileName: 'x.csv', actor: STAFF })).toEqual({ created: 0, updated: 0, flagged: 0 })
    expect((await getPersonnel('personnel-0002')).emergencyContacts).toEqual(before)
    expect(getRecordedAuditEntries()).toHaveLength(audits)
  })

  it('imports the sample file with nothing skipped', async () => {
    const preview = await previewStaffImport(rowsOf(SAMPLE), STAFF)
    expect(preview).toMatchObject({ newCount: 4, continuingCount: 3, changedCount: 3, problems: [] })
  })

  it('walks the page from file to applied list', async () => {
    const user = userEvent.setup()
    renderWithRouter(<StaffImportPage viewer={STAFF} />)
    await user.upload(screen.getByLabelText('Staff list (CSV)'), new File([CSV], 'staff.csv', { type: 'text/csv' }))
    await user.click(await screen.findByRole('button', { name: 'Preview' }))
    expect(await screen.findByText('Rows with a problem')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apply List' }))
    await user.click(screen.getAllByRole('button', { name: 'Apply List' }).at(-1)!)
    expect(await screen.findByText('List applied: 1 added, 2 updated, 4 left out.')).toBeInTheDocument()
  })
})
