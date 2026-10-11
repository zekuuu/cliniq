import { render, screen } from '@testing-library/react'
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

/** Types into the form so it has unsaved input, presses Cancel, and checks nothing was written. */
async function cancelWithInput() {
  const user = userEvent.setup()
  const cancel = (await screen.findAllByRole('button', { name: 'Cancel' })).at(-1)!
  const before = JSON.stringify(db())
  const field = screen
    .queryAllByRole('textbox')
    .find((box) => !box.hasAttribute('readonly') && !box.hasAttribute('disabled'))
  if (field) await user.type(field, 'Unsaved')
  await user.click(cancel)
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
