import { act, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithRouter } from '../../test/renderWithRouter'
import { VisitsBySexPrint } from '../reports/components/MonthlyTables'
import type { StudentListRow } from '../../types/entities'
import { StudentFormPage } from './StudentFormPage'
import { StudentProfilePage } from './StudentProfilePage'
import { fetchStudentList } from './api/studentListApi'

// The API returns `sex: null` for a sex the school never recorded (contract G4); the mock always has one.
// Every student read through the data layer comes back without a sex here.
vi.mock('../../lib/data', async (importOriginal) => {
  const data = await importOriginal<typeof import('../../lib/data')>()
  return {
    ...data,
    getStudent: async (id: string) => ({ ...(await data.getStudent(id)), sex: null }),
  }
})

describe('A student with no recorded sex (API mode)', () => {
  it('shows "Not recorded" on the profile and on its printout, never Female or Male', async () => {
    renderWithRouter(<StudentProfilePage studentId="student-0012" />)

    const overview = (await screen.findByText('Sex')).parentElement!
    expect(within(overview).getByText('Not recorded')).toBeInTheDocument()
    expect(screen.queryByText(/^(Female|Male)$/)).not.toBeInTheDocument()

    // The Student Health Record printout mounts on beforeprint (Print or Ctrl+P).
    act(() => {
      window.dispatchEvent(new Event('beforeprint'))
    })
    const doc = document.body.querySelector<HTMLElement>('[data-print-document]')!
    expect(doc).toHaveTextContent('SexNot recorded')
    expect(doc).not.toHaveTextContent(/Sex(Female|Male)/)
  })

  it('leaves both Sex choices empty on the edit form instead of picking one', async () => {
    renderWithRouter(<StudentFormPage studentId="student-0012" />)

    const female = await screen.findByRole('radio', { name: 'Female' })
    expect(female).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Male' })).not.toBeChecked()
  })

  it('keeps the list rows free of the field, so the list needs no fallback', async () => {
    const rows: StudentListRow[] = await fetchStudentList({
      search: '',
      gradeLevel: '',
      includeArchived: false,
    })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => !('sex' in row))).toBe(true)
  })

  it('counts no-sex visits as students on the Monthly report when the API says so', () => {
    const bySex = {
      female: { students: 2, staff: 1 },
      male: { students: 1, staff: 0 },
      noSexRecorded: 3,
    }
    const { container, rerender } = renderWithRouter(
      <VisitsBySexPrint bySex={{ ...bySex, noSexRecordedParts: { students: 3, staff: 0 } }} />,
    )
    const row = () =>
      [...container.querySelectorAll('tr')].find((tr) =>
        tr.textContent?.startsWith('No sex recorded'),
      )!
    expect([...row().querySelectorAll('td')].map((td) => td.textContent)).toEqual([
      'No sex recorded',
      '3',
      '0',
      '3',
    ])
    // The mock sends only the total; only staff lack a sex there.
    rerender(<VisitsBySexPrint bySex={bySex} />)
    expect([...row().querySelectorAll('td')].map((td) => td.textContent)).toEqual([
      'No sex recorded',
      '0',
      '3',
      '3',
    ])
  })
})
