import { renderWithRouter } from '../../test/renderWithRouter'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { StudentListPage } from './StudentListPage'
import { fetchStudentList } from './api/studentListApi'
import { lrnLabel } from '../../lib/lrn'

describe('Student List', () => {
  it('renders the masterlist without inline medical details', async () => {
    renderWithRouter(<StudentListPage />)

    expect(await screen.findByRole('heading', { name: 'Student List' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Full name' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'LRN' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Record status' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'View Profile' }).length).toBeGreaterThan(0)
    const table = screen.getByRole('table', { name: 'Student masterlist' })
    expect(table).toHaveClass('table-fixed')
    expect(table.querySelector('caption')).toHaveClass('sr-only')
    expect(Array.from(table.querySelectorAll('col')).map((column) => column.style.width)).toEqual([
      '27%',
      '20%',
      '15%',
      '23%',
      '15%',
    ])
    expect(screen.queryByRole('columnheader', { name: /allergies/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /medical conditions/i })).not.toBeInTheDocument()
    expect(screen.queryByText('Peanuts')).not.toBeInTheDocument()
    expect(screen.queryByText('Asthma')).not.toBeInTheDocument()
  })

  it('searches by LRN', async () => {
    const user = userEvent.setup()
    const [student] = await fetchStudentList({
      search: '',
      gradeLevel: '',
      includeArchived: false,
    })

    renderWithRouter(<StudentListPage />)
    await screen.findByRole('heading', { name: 'Student List' })
    await user.type(screen.getByLabelText('Search'), student.lrn)

    expect(await screen.findByText('1 result shown')).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: student.fullName })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: lrnLabel(student.lrn) })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View Profile' })).toHaveAttribute(
      'href',
      `/students/${student.id}`,
    )
  })

  it('keeps archived records hidden until requested', async () => {
    const user = userEvent.setup()
    const archivedStudent = (
      await fetchStudentList({ search: '', gradeLevel: '', includeArchived: true })
    ).find((student) => student.archived)

    expect(archivedStudent).toBeDefined()
    renderWithRouter(<StudentListPage />)
    await screen.findByRole('heading', { name: 'Student List' })

    await user.type(screen.getByLabelText('Search'), archivedStudent!.lrn)
    expect(await screen.findByText('No students found')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Include archived'))
    const row = await screen.findByRole('row', { name: new RegExp(lrnLabel(archivedStudent!.lrn)) })
    expect(within(row).getByText('Archived')).toBeInTheDocument()
  })

  it('filters by grade level', async () => {
    const user = userEvent.setup()
    renderWithRouter(<StudentListPage />)

    await screen.findByRole('heading', { name: 'Student List' })
    await user.click(screen.getByLabelText('Grade level'))
    await user.click(await screen.findByRole('option', { name: 'Grade 12' })) // grade options load from the data layer

    await waitFor(() => {
      expect(screen.getByText(/results? shown/)).toBeInTheDocument()
    })
    for (const gradeCell of screen.getAllByRole('cell', { name: 'Grade 12' })) {
      expect(gradeCell).toBeInTheDocument()
    }
  })
})
