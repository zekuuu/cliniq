import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { addDays, todayISO } from '../lib/dates'
import { db, resetMockDb } from '../lib/mock-db/store'
import { pickDate } from '../test/pickDate'
import { selectOption } from '../test/selectOption'
import { pickStudent } from '../test/pickStudent'
import { ExcuseLetterPage } from './clinic-visits/ExcuseLetterPage'
import { NewVisitEntryPage } from './clinic-visits/NewVisitEntryPage'
import { IncidentEntryPage } from './emergency-response/IncidentEntryPage'
import { InventoryFormPage } from './inventory/InventoryFormPage'
import { StudentFormPage } from './student-records/StudentFormPage'
import { StudentProfilePage } from './student-records/StudentProfilePage'
import { UserFormPage } from './user-management/UserFormPage'

const STUDENT = 'student-0001'
/** The same student's synthetic LRN, typed into the student search. */
const STUDENT_LRN = '000000260001'

function LetterRoute() {
  return <ExcuseLetterPage visitId={useParams().visitId} />
}

function ProfileRoute() {
  return <StudentProfilePage studentId={useParams().studentId} />
}

/** Opens `screen` after "/previous", so Back has in-app history to return through. */
function renderAfterPrevious(path: string, page: ReactElement) {
  return render(
    <MemoryRouter initialEntries={['/previous', path]} initialIndex={1}>
      <Routes>
        <Route path="/previous" element={<p>Previous screen</p>} />
        <Route path="/fallback" element={<p>Fallback screen</p>} />
        <Route path="/visits/:visitId/excuse-letter" element={<LetterRoute />} />
        <Route path="/students/:studentId" element={<ProfileRoute />} />
        <Route path="*" element={page} />
      </Routes>
    </MemoryRouter>,
  )
}

const back = () => screen.getByRole('button', { name: 'Back' })

describe('Back after a save never returns to the submitted form', () => {
  beforeEach(() => resetMockDb())

  it('New Visit: Save, Review excuse letter, Back skips the submitted form', async () => {
    const user = userEvent.setup()
    renderAfterPrevious('/visits/new', <NewVisitEntryPage />)
    await pickStudent(user, STUDENT_LRN)
    await screen.findByRole('heading', { name: 'New Visit' })
    await user.type(screen.getByRole('combobox', { name: /complaint/i }), 'Fever')
    await user.click(screen.getByRole('radio', { name: 'Sent home' }))
    await pickDate(
      user,
      screen.getByRole('button', { name: /^Excused until/ }),
      addDays(todayISO(), 1),
    )
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))
    await user.click(await screen.findByRole('link', { name: 'Review excuse letter' }))
    await screen.findByRole('heading', { name: 'Excuse Letter' })

    await user.click(back())
    expect(screen.getByText('Previous screen')).toBeInTheDocument()
  })

  it('Edit Student: Save Changes, then Back from the profile skips the edit form', async () => {
    const user = userEvent.setup()
    renderAfterPrevious(`/students/${STUDENT}/edit`, <StudentFormPage studentId={STUDENT} />)
    await screen.findByRole('heading', { name: 'Edit Student' })
    await user.type(screen.getByLabelText(/student's mobile number/i), '0')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await screen.findByText(/^Student record updated for/)

    await user.click(back())
    expect(screen.getByText('Previous screen')).toBeInTheDocument()
  })

  it('Add Student: after Save Student, Back leaves without asking', async () => {
    const user = userEvent.setup()
    renderAfterPrevious('/add-student', <StudentFormPage />)
    await screen.findByRole('heading', { name: 'Add Student' })
    await user.type(screen.getByLabelText(/^LRN/), '123456789012')
    await user.type(screen.getByLabelText(/full name/i), 'Lara Santos')
    await selectOption(user, screen.getByLabelText(/grade level/i), 'Grade 6')
    await selectOption(user, screen.getByLabelText(/^sex/i), 'Female')
    await user.type(screen.getByLabelText(/student's mobile number/i), '09XX-111-2222')
    await user.type(screen.getByLabelText(/contact name/i), 'Marisol Santos')
    await user.type(screen.getByLabelText(/relationship/i), 'Mother')
    await user.type(screen.getByLabelText(/contact phone/i), '0917-333-4444')
    await user.type(screen.getByLabelText(/allergies/i), 'None')
    await user.type(screen.getByLabelText(/medical conditions/i), 'None')
    await user.click(screen.getByRole('button', { name: 'Save Student' }))
    await screen.findByText('Student record created for Lara Santos.')

    await user.click(back())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Previous screen')).toBeInTheDocument()
  })

  it('Add Inventory Item: after Add Item, Back leaves without asking', async () => {
    const user = userEvent.setup()
    renderAfterPrevious('/inventory/new', <InventoryFormPage />)
    await screen.findByRole('heading', { name: 'Add Inventory Item' })
    await user.type(screen.getByLabelText(/item name/i), 'Saline solution')
    await selectOption(user, screen.getByLabelText(/category/i), 'Supply')
    await user.type(screen.getByLabelText(/current stock/i), '10')
    await user.type(screen.getByLabelText(/^unit/i), 'bottles')
    await user.type(screen.getByLabelText(/low-stock threshold/i), '2')
    // ADR-035 on Add Item: a date, or the explicit no-expiration tick.
    await user.click(screen.getByLabelText(/this item has no expiration date/i))
    await user.click(screen.getByRole('button', { name: 'Add Item' }))
    await screen.findByText('Saline solution was added successfully.')

    await user.click(back())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Previous screen')).toBeInTheDocument()
  })

  it('Incident: Save Stage 1 opens Stage 2 in place, and Back leaves to the previous screen', async () => {
    const user = userEvent.setup()
    renderAfterPrevious('/incidents/new', <IncidentEntryPage />)
    await pickStudent(user, STUDENT_LRN)
    await screen.findByRole('heading', { name: 'Report Incident' })
    await selectOption(user, screen.getByLabelText(/complaint/i), 'Fainting')
    await user.type(screen.getByLabelText(/temperature/i), '37.2')
    await user.type(screen.getByLabelText(/pulse/i), '92')
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    await screen.findByRole('heading', { name: 'Stage 2 completion' })

    await user.click(back())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Previous screen')).toBeInTheDocument()
  })

  it('Excuse Letter: after Approve and Store, Back leaves to the previous screen', async () => {
    const user = userEvent.setup()
    renderAfterPrevious('/letter', <ExcuseLetterPage />)
    await screen.findByRole('heading', { name: 'Excuse Letter' })
    await user.click(screen.getByLabelText(/I checked the letter/i))
    await user.click(screen.getByRole('button', { name: 'Approve and Store' }))
    await screen.findByText('Excuse letter approved and stored in the student record.')

    await user.click(back())
    expect(screen.getByText('Previous screen')).toBeInTheDocument()
  })
})

describe('Back and Cancel behave identically on forms', () => {
  beforeEach(() => resetMockDb())

  it.each([
    ['New Visit', <NewVisitEntryPage />, /complaint/i],
    ['Add Student', <StudentFormPage />, /full name/i],
    ['Add Inventory Item', <InventoryFormPage />, /item name/i],
    ['User form', <UserFormPage />, /full name/i],
  ])(
    '%s: both ask before discarding, save nothing, and leave the same way',
    async (_name, form, field) => {
      const user = userEvent.setup()
      for (const control of ['Back', 'Cancel'] as const) {
        const { unmount } = renderAfterPrevious('/form', form)
        await user.type(await screen.findByLabelText(field), 'Unsaved')
        const before = JSON.stringify(db())

        await user.click(screen.getAllByRole('button', { name: control }).at(-1)!)
        const dialog = screen.getByRole('dialog', { name: 'Discard unsaved changes?' })
        await user.click(within(dialog).getByRole('button', { name: 'Discard Changes' }))

        expect(JSON.stringify(db())).toBe(before)
        expect(screen.getByText('Previous screen')).toBeInTheDocument()
        unmount()
      }
    },
  )
})
