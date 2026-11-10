import { formatPersonName } from '../../lib/personName'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyStudentImport,
  getRecordedAuditEntries,
  listStudents,
  previewStudentImport,
  resetMockDb,
} from '../../lib/mock-db'
import { db } from '../../lib/mock-db/store'
import {
  guessMapping,
  mapRows,
  missingImportFields,
  parseCsv,
  type ImportRow,
} from '../../lib/studentImport'
import { renderWithRouter } from '../../test/renderWithRouter'
import SAMPLE from '../../../sample-data/student-list-sample.csv?raw'
import { StudentImportPage } from './StudentImportPage'

const STAFF = { id: 'user-staff-01', name: 'Demo Clinician', role: 'staff' } as const
const ADMIN = { id: 'user-admin-01', name: 'Principal', role: 'admin' } as const

const sampleRows = () => {
  const [headers, ...rows] = parseCsv(SAMPLE)
  return mapRows(rows, guessMapping(headers))
}
const row = (over: Partial<ImportRow> = {}): ImportRow => ({
  lrn: '100000000009',
  lastName: 'Test',
  firstName: 'Row',
  middleName: '',
  fullName: '',
  sex: 'F',
  birthDate: '',
  gradeLevel: 'Grade 7',
  section: '',
  ...over,
})

describe('reading the CSV', () => {
  it('handles quotes, commas and blank lines, and guesses the columns', () => {
    expect(parseCsv('a,"b,c","d ""e"" f"\r\n\r\n1,2,3\n')).toEqual([
      ['a', 'b,c', 'd "e" f'],
      ['1', '2', '3'],
    ])
    expect(sampleRows()[1]).toMatchObject({
      lrn: '100000000002',
      firstName: 'Ben, Jr.',
      lastName: 'Sample',
      sex: 'M',
      gradeLevel: 'Grade 7',
      section: 'Rizal',
    })
  })
})

describe('student list import (ADR-047)', () => {
  beforeEach(() => resetMockDb())

  it.each([
    ['bad LRN', row({ lrn: '123' }), '12 digits'],
    ['wrong grade', row({ gradeLevel: 'Grade 99' }), 'not a grade level'],
    ['no name', row({ firstName: '' }), 'incomplete'],
    ['bad sex', row({ sex: 'X' }), 'Sex must be'],
    ['bad birth date', row({ birthDate: '2099-01-01' }), 'birth date'],
  ])('flags a row: %s', async (_name, input, text) => {
    const preview = await previewStudentImport([input], STAFF)
    expect(preview.problems).toHaveLength(1)
    expect(preview.problems[0]).toMatchObject({ line: 2 })
    expect(preview.problems[0].problem).toContain(text)
    expect(preview.newCount).toBe(0)
  })

  it('flags both rows of a duplicate LRN', async () => {
    expect((await previewStudentImport([row(), row()], STAFF)).problems).toHaveLength(2)
  })

  it('changes nothing on preview, and applies only what the review ticked', async () => {
    const before = db().students.length
    const preview = await previewStudentImport(sampleRows(), STAFF)
    expect(db().students).toHaveLength(before)
    expect(preview.newCount).toBe(2)
    const [first, second] = preview.missing
    const result = await applyStudentImport(sampleRows(), {
      fileName: 'list.csv',
      archiveIds: [first.id],
      actor: STAFF,
    })
    expect(result).toEqual({ created: 2, updated: 0, archived: 1, flagged: 0 })
    expect(db().students.find((student) => student.id === first.id)?.archived).toBe(true)
    // The Archive page files it under the school year of the import, with its reason (professor's consultation, November 6, 2026).
    expect(db().students.find((student) => student.id === first.id)).toMatchObject({
      archiveReason: 'Not on the new list',
      archivedSchoolYear: expect.stringMatching(/^\d{4}–\d{4}$/),
      archivedAt: expect.any(String),
    })
    expect(db().students.find((student) => student.id === second.id)?.archived).toBe(false)
    expect(db().frontendOnly.studentImportBatches).toHaveLength(1)
    const entry = getRecordedAuditEntries().at(-1)!
    expect(entry.summary).toBe('2 added, 0 updated, 1 archived, 0 flagged')
    expect(entry.targetRecord?.type).toBe('student-import')
  })

  it('updates grade and section of a continuing student, never the name or LRN', async () => {
    const student = db().students[0]
    const name = formatPersonName(student)
    const [input] = [
      row({ lrn: student.lrn, firstName: 'Other', gradeLevel: 'Grade 8', section: 'Mabini' }),
    ]
    const result = await applyStudentImport([input], {
      fileName: 'list.csv',
      archiveIds: [],
      actor: STAFF,
    })
    expect(result.updated).toBe(1)
    expect(formatPersonName(db().students[0])).toBe(name)
    expect(db().students[0]).toMatchObject({
      lrn: student.lrn,
      gradeLevel: 'Grade 8',
      section: 'Mabini',
    })
  })

  it('changes nothing on a second import of the same file', async () => {
    await applyStudentImport(sampleRows(), { fileName: 'list.csv', archiveIds: [], actor: STAFF })
    const entries = getRecordedAuditEntries().length
    const result = await applyStudentImport(sampleRows(), {
      fileName: 'list.csv',
      archiveIds: [],
      actor: STAFF,
    })
    expect(result).toEqual({ created: 0, updated: 0, archived: 0, flagged: 0 })
    expect(getRecordedAuditEntries()).toHaveLength(entries)
    expect(db().frontendOnly.studentImportBatches).toHaveLength(1)
  })

  it('refuses the Admin', async () => {
    await expect(previewStudentImport([], ADMIN)).rejects.toThrow('Only the School Clinician')
    await expect(
      applyStudentImport([], { fileName: 'x', archiveIds: [], actor: ADMIN }),
    ).rejects.toThrow('Only the School Clinician')
    render(<StudentImportPage viewer={ADMIN} />)
    expect(screen.getByText('Staff access required.')).toBeInTheDocument()
  })

  it('walks the screen: file, columns, review, then apply', async () => {
    const user = userEvent.setup()
    renderWithRouter(<StudentImportPage viewer={STAFF} />)
    await user.upload(
      screen.getByLabelText('Student list (CSV)'),
      new File([SAMPLE], 'list.csv', { type: 'text/csv' }),
    )
    await user.click(await screen.findByRole('button', { name: 'Preview' }))
    // Plain review (Zean, November 3, 2026: "this part are confusing").
    const added = await screen.findByText('New students')
    expect(added.parentElement).toHaveTextContent('2')
    const missing = screen.getByRole('group', {
      name: /^In the Student List but not in this file \(\d+\)$/,
    })
    await user.click(within(missing).getByRole('button', { name: 'Check all' }))
    expect(within(missing).getByText(/^\d+ of \d+ checked$/)).toBeInTheDocument()
    await user.click(within(missing).getByRole('button', { name: 'Uncheck all' }))
    expect(within(missing).getByText(/^0 of \d+ checked$/)).toBeInTheDocument()
    // Scales to a whole school year's leavers: search narrows the list, and Check all acts on what is shown.
    await user.type(within(missing).getByRole('searchbox', { name: 'Find a student' }), 'Kinder')
    // The list filters a moment after typing stops.
    await waitFor(() => expect(within(missing).getAllByRole('checkbox').length).toBeLessThan(10))
    const shown = within(missing).getAllByRole('checkbox').length
    expect(shown).toBeGreaterThan(0)
    expect(shown).toBeLessThan(10)
    await user.click(within(missing).getByRole('button', { name: 'Check all' }))
    expect(within(missing).getByText(new RegExp(`^${shown} of \\d+ checked$`))).toBeInTheDocument()
    await user.click(within(missing).getByRole('button', { name: 'Uncheck all' }))
    expect(
      (await listStudents({})).some((student) => student.fullName.includes('Ana Reyes Sample')),
    ).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Apply List' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Apply List' }),
    )
    await waitFor(() => expect(screen.getByText(/List applied: 2 added/)).toBeInTheDocument())
  })

  it('takes the CSV dropped on the drop zone, and names the chosen file (Zean, November 3, 2026)', async () => {
    renderWithRouter(<StudentImportPage viewer={STAFF} />)
    const zone = await screen.findByTestId('import-drop-zone')
    expect(within(zone).getByText('Browse files')).toBeInTheDocument()
    expect(screen.getByText('Accepted file type: .csv only')).toBeInTheDocument()
    fireEvent.drop(zone, {
      dataTransfer: { files: [new File([SAMPLE], 'dropped.csv', { type: 'text/csv' })] },
    })
    expect(await screen.findByText(/rows in dropped\.csv/)).toBeInTheDocument()
    expect(within(zone).getByText('dropped.csv')).toBeInTheDocument()
  })

  // S4 (Zean, November 4, 2026; ADR-064): the name is stored as parts.
  it('maps separate First, Last and Middle name columns straight onto the record', async () => {
    await applyStudentImport(sampleRows(), { fileName: 'list.csv', archiveIds: [], actor: STAFF })
    expect(db().students.find((student) => student.lrn === '100000000001')).toMatchObject({
      firstName: 'Ana',
      lastName: 'Sample',
      middleName: 'Reyes',
    })
    expect(db().students.find((student) => student.lrn === '100000000002')).toMatchObject({
      firstName: 'Ben, Jr.',
      lastName: 'Sample',
      middleName: null,
    })
  })

  it('splits a single full-name column by the stated rule, and shows every split in the preview', async () => {
    const csv =
      'LRN,Name,Sex,Grade\n100000000011,"Dela Cruz, Maria Angela Santos",F,Grade 7\n100000000012,Juan  Reyes,M,Grade 7\n'
    const [headers, ...cells] = parseCsv(csv)
    const mapping = guessMapping(headers)
    expect(mapping).toMatchObject({ fullName: 1, firstName: -1, lastName: -1 })
    expect(missingImportFields(mapping)).toEqual([])
    expect(
      mapRows(cells, mapping).map(({ firstName, middleName, lastName }) => [
        firstName,
        middleName,
        lastName,
      ]),
    ).toEqual([
      ['Maria Angela', 'Santos', 'Dela Cruz'],
      ['Juan', '', 'Reyes'],
    ])

    const user = userEvent.setup()
    renderWithRouter(<StudentImportPage viewer={STAFF} />)
    await user.upload(
      screen.getByLabelText('Student list (CSV)'),
      new File([csv], 'one-column.csv', { type: 'text/csv' }),
    )
    expect(await screen.findByLabelText(/^Full name \(one column\)/)).toHaveTextContent('Name')
    await user.click(screen.getByRole('button', { name: 'Preview' }))
    const split = await screen.findByRole('table', { name: 'Names split from one column' })
    const rows = within(split)
      .getAllByRole('row')
      .slice(1)
      .map((tr) =>
        within(tr)
          .getAllByRole('cell')
          .map((td) => td.textContent),
      )
    expect(rows).toEqual([
      ['2', 'Dela Cruz', 'Maria Angela', 'Santos'],
      ['3', 'Reyes', 'Juan', 'None'],
    ])
    expect(
      screen.getByText(
        /The last word is the last name, unless the name is written "Surname, First Middle"/,
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apply List' }))
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Apply List' }),
    )
    await waitFor(() => expect(screen.getByText(/List applied: 2 added/)).toBeInTheDocument())
    expect(db().students.find((student) => student.lrn === '100000000011')).toMatchObject({
      firstName: 'Maria Angela',
      middleName: 'Santos',
      lastName: 'Dela Cruz',
    })
  })

  it('still asks for First and Last name when no full-name column is matched', () => {
    expect(missingImportFields(guessMapping(['LRN', 'Sex', 'Grade']))).toEqual([
      'Last name',
      'First name',
    ])
  })

  it('shows all three steps from the start, the later ones empty until reached (Zean, November 3, 2026)', async () => {
    renderWithRouter(<StudentImportPage viewer={STAFF} />)
    expect(await screen.findByRole('heading', { name: '1. Choose the file' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '2. Match the columns' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '3. Review before applying' })).toBeInTheDocument()
    expect(screen.getByText('Choose a file first.')).toBeInTheDocument()
    expect(screen.getByText('Match the columns and press Preview first.')).toBeInTheDocument()
  })
})
