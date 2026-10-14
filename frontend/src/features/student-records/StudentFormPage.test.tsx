import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { getRecordedAuditEntries, resetMockDb } from '../../lib/mock-db'
import { selectOption } from '../../test/selectOption'
import { paths } from '../../routes/paths'
import { StudentFormPage } from './StudentFormPage'
import { StudentProfilePage } from './StudentProfilePage'
import { fetchStudentList } from './api/studentListApi'
import { renderWithRouter } from '../../test/renderWithRouter'

async function fillRequiredStudentFields() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/full name/i), 'Lara Santos')
  await selectOption(user, screen.getByLabelText(/grade level/i), 'Grade 6')
  await user.type(screen.getByLabelText(/student contact information/i), '09XX-111-2222')
  await user.type(screen.getByLabelText(/contact name/i), 'Marisol Santos')
  await user.type(screen.getByLabelText(/relationship/i), 'Mother')
  await user.type(screen.getByLabelText(/contact phone/i), '0917-333-4444')
  await user.type(screen.getByLabelText(/allergies/i), 'None')
  await user.type(screen.getByLabelText(/medical conditions/i), 'None')
  return user
}

describe('Student Form', () => {
  beforeEach(() => {
    resetMockDb()
  })

  it('renders add mode with a system-assigned Student Number preview', async () => {
    renderWithRouter(<StudentFormPage />)

    expect(await screen.findByRole('heading', { name: 'Add Student' })).toBeInTheDocument()
    expect(screen.getByText(/\d{4}-\d{5}/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/student number/i)).not.toBeInTheDocument()
  })

  it('validates required fields inline', async () => {
    const user = userEvent.setup()
    renderWithRouter(<StudentFormPage />)

    await screen.findByRole('heading', { name: 'Add Student' })
    await user.click(screen.getByRole('button', { name: 'Save Student' }))

    expect(screen.getByText('Enter the student full name.')).toBeInTheDocument()
    expect(screen.getByText('Select the grade level.')).toBeInTheDocument()
    expect(screen.getByText('Enter allergies, or write None.')).toBeInTheDocument()
    expect(screen.getByText('Enter medical conditions, or write None.')).toBeInTheDocument()
  })

  it('warns before creating a possible duplicate and records the confirmed create', async () => {
    const user = userEvent.setup()
    const [existing] = await fetchStudentList({
      search: '',
      gradeLevel: '',
      includeArchived: false,
    })
    renderWithRouter(<StudentFormPage />)

    await screen.findByRole('heading', { name: 'Add Student' })
    await user.type(screen.getByLabelText(/full name/i), existing.fullName)
    await selectOption(user, screen.getByLabelText(/grade level/i), existing.gradeLevel)
    await user.type(screen.getByLabelText(/student contact information/i), '09XX-111-2222')
    await user.type(screen.getByLabelText(/contact name/i), 'Parent Guardian')
    await user.type(screen.getByLabelText(/relationship/i), 'Parent')
    await user.type(screen.getByLabelText(/contact phone/i), '0917-333-4444')
    await user.type(screen.getByLabelText(/allergies/i), 'None')
    await user.type(screen.getByLabelText(/medical conditions/i), 'None')
    await user.click(screen.getByRole('button', { name: 'Save Student' }))

    const dialog = await screen.findByRole('dialog', { name: 'Possible duplicate record' })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getAllByText(existing.fullName).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Confirm Create' }))
    expect(await screen.findByText(/student record created/i)).toBeInTheDocument()
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toEqual(['create'])
  })

  it('saves a non-duplicate new student', async () => {
    renderWithRouter(<StudentFormPage />)
    await screen.findByRole('heading', { name: 'Add Student' })
    const user = await fillRequiredStudentFields()

    await user.click(screen.getByRole('button', { name: 'Save Student' }))

    expect(await screen.findByText('Student record created for Lara Santos.')).toBeInTheDocument()
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toEqual(['create'])
  })

  it('supports edit mode, records an update audit entry, and returns to the profile', async () => {
    const user = userEvent.setup()
    const [existing] = await fetchStudentList({ search: '', gradeLevel: '', includeArchived: false })
    render(
      <MemoryRouter initialEntries={[paths.studentEdit(existing.studentNumber)]}>
        <Routes>
          <Route
            path="/students/:studentNumber/edit"
            element={<StudentFormPage studentNumber={existing.studentNumber} />}
          />
          <Route
            path="/students/:studentNumber"
            element={<StudentProfilePage studentNumber={existing.studentNumber} />}
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Edit Student' })).toBeInTheDocument()
    await user.clear(screen.getByLabelText(/student contact information/i))
    await user.type(screen.getByLabelText(/student contact information/i), '09XX-999-0000')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText(`Student record updated for ${existing.fullName}.`)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Edit Student' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: existing.fullName })).toBeInTheDocument()
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toContain('update')
  })

  it('rejects an emergency contact phone with letters, in plain words', async () => {
    const user = userEvent.setup()
    const [existing] = await fetchStudentList({ search: '', gradeLevel: '', includeArchived: false })
    renderWithRouter(<StudentFormPage studentNumber={existing.studentNumber} />)

    await screen.findByRole('heading', { name: 'Edit Student' })
    await user.clear(screen.getByLabelText(/contact phone/i))
    await user.type(screen.getByLabelText(/contact phone/i), '89r91r91r')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(screen.getByText(/Enter a Philippine mobile number/)).toBeInTheDocument()
    expect(screen.getByLabelText(/contact phone/i)).toHaveFocus()
    expect(getRecordedAuditEntries()).toEqual([])
  })

  it('moves focus to the first invalid field and announces the count after a failed save', async () => {
    const user = userEvent.setup()
    renderWithRouter(<StudentFormPage />)

    await screen.findByRole('heading', { name: 'Add Student' })
    await user.type(screen.getByLabelText(/full name/i), 'Lara Santos')
    await user.click(screen.getByRole('button', { name: 'Save Student' }))

    expect(screen.getByLabelText(/grade level/i)).toHaveFocus()
    expect(screen.getByText('7 fields need attention.')).toBeInTheDocument()
  })
})
