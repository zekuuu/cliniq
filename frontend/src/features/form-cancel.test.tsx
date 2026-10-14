import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, resetMockDb } from '../lib/mock-db/store'
import { NewVisitEntryPage } from './clinic-visits/NewVisitEntryPage'
import { PeSportsReferralPage } from './clinic-visits/PeSportsReferralPage'
import { VisitDetailPage } from './clinic-visits/VisitDetailPage'
import { IncidentEntryPage } from './emergency-response/IncidentEntryPage'
import { InventoryDispensePage } from './inventory/InventoryDispensePage'
import { InventoryFormPage } from './inventory/InventoryFormPage'
import { StudentFormPage } from './student-records/StudentFormPage'
import { UserFormPage } from './user-management/UserFormPage'

const STUDENT = '2026-00001'

/** Opens the form as the first screen (no history), so Cancel must use its fallback route. */
function renderForm(form: ReactElement, fallback: string, entries = ['/form']) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
        <Route path={fallback} element={<p>Fallback screen</p>} />
        <Route path="/previous" element={<p>Previous screen</p>} />
        <Route path="*" element={form} />
      </Routes>
    </MemoryRouter>,
  )
}

/**
 * Types into the form so it has unsaved input, presses Cancel (confirming the discard when the form
 * asks), and checks nothing was written.
 */
async function cancelWithInput() {
  const user = userEvent.setup()
  const cancel = (await screen.findAllByRole('button', { name: 'Cancel' })).at(-1)!
  const before = JSON.stringify(db())
  const field = screen
    .queryAllByRole('textbox')
    .find((box) => !box.hasAttribute('readonly') && !box.hasAttribute('disabled'))
  if (field) await user.type(field, 'Unsaved')
  await user.click(cancel)
  const dialog = screen.queryByRole('dialog', { name: 'Discard unsaved changes?' })
  if (dialog) await user.click(within(dialog).getByRole('button', { name: 'Discard Changes' }))
  expect(JSON.stringify(db())).toBe(before)
}

describe('Cancel on entry and edit forms', () => {
  beforeEach(() => resetMockDb())

  it('goes back to the previous screen when there is history', async () => {
    renderForm(<NewVisitEntryPage studentNumber={STUDENT} />, '/visits', ['/previous', '/form'])
    await cancelWithInput()
    expect(screen.getByText('Previous screen')).toBeInTheDocument()
  })

  it.each([
    ['New Visit', <NewVisitEntryPage studentNumber={STUDENT} />, '/visits'],
    ['Incident Stage 1', <IncidentEntryPage studentNumber={STUDENT} />, '/incidents'],
    ['Incident Stage 2', <IncidentEntryPage incidentId="incident-0022" />, '/incidents'],
    ['Add Student', <StudentFormPage />, '/students'],
    ['Edit Student', <StudentFormPage studentNumber={STUDENT} />, `/students/${STUDENT}`],
    ['PE/Sports Referral', <PeSportsReferralPage studentNumber={STUDENT} />, '/visits'],
    ['Add Inventory Item', <InventoryFormPage />, '/inventory'],
    ['Dispense', <InventoryDispensePage />, '/inventory'],
    ['User form', <UserFormPage />, '/users'],
  ])(
    '%s: Cancel saves nothing and falls back when opened directly',
    async (_name, form, fallback) => {
      renderForm(form, fallback)
      await cancelWithInput()
      expect(screen.getByText('Fallback screen')).toBeInTheDocument()
    },
  )

  it('Visit Detail: Cancel leaves edit mode without saving', async () => {
    const user = userEvent.setup()
    renderForm(<VisitDetailPage visitId="visit-0157" />, '/visits')
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await cancelWithInput()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })
})

describe('Cancel with unsaved changes asks first', () => {
  beforeEach(() => resetMockDb())

  it.each([
    ['New Visit', <NewVisitEntryPage studentNumber={STUDENT} />, '/visits', /complaint/i],
    [
      'Incident Stage 1',
      <IncidentEntryPage studentNumber={STUDENT} />,
      '/incidents',
      /additional notes/i,
    ],
    ['Add Student', <StudentFormPage />, '/students', /full name/i],
    [
      'Edit Student',
      <StudentFormPage studentNumber={STUDENT} />,
      `/students/${STUDENT}`,
      /full name/i,
    ],
    [
      'PE/Sports Referral',
      <PeSportsReferralPage studentNumber={STUDENT} />,
      '/visits',
      /activity/i,
    ],
    ['Add Inventory Item', <InventoryFormPage />, '/inventory', /item name/i],
    ['User form', <UserFormPage />, '/users', /full name/i],
  ])(
    '%s: Keep Editing stays on the form; Discard Changes leaves',
    async (_name, form, fallback, field) => {
      const user = userEvent.setup()
      renderForm(form, fallback)
      await user.type(await screen.findByLabelText(field), 'Unsaved')
      const cancel = screen.getAllByRole('button', { name: 'Cancel' }).at(-1)!

      await user.click(cancel)
      const dialog = screen.getByRole('dialog', { name: 'Discard unsaved changes?' })
      const keep = within(dialog).getByRole('button', { name: 'Keep Editing' })
      expect(keep).toHaveFocus()
      await user.click(keep)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect((screen.getByLabelText(field) as HTMLInputElement).value).toContain('Unsaved')

      await user.click(cancel)
      await user.click(
        within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard Changes' }),
      )
      expect(screen.getByText('Fallback screen')).toBeInTheDocument()
    },
  )

  it('leaves at once when nothing was entered', async () => {
    const user = userEvent.setup()
    renderForm(<StudentFormPage />, '/students')
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Fallback screen')).toBeInTheDocument()
  })
})
