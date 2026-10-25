import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { listInventory, resetMockDb } from '../lib/mock-db'
import { NewVisitEntryPage } from './clinic-visits/NewVisitEntryPage'
import { PeSportsReferralPage } from './clinic-visits/PeSportsReferralPage'
import { VisitDetailPage } from './clinic-visits/VisitDetailPage'
import { IncidentEntryPage } from './emergency-response/IncidentEntryPage'
import { InventoryDispensePage } from './inventory/InventoryDispensePage'
import { InventoryFormPage } from './inventory/InventoryFormPage'
import { AdjustStockModal, RestockModal } from './inventory/StockModals'
import { StudentFormPage } from './student-records/StudentFormPage'
import { UserFormPage } from './user-management/UserFormPage'

const STUDENT = 'student-0001'

/** The element a failed submit must focus: the first invalid field, or the form's one message. */
function firstInvalid(): Element | null {
  return document.querySelector('[aria-invalid="true"]') ?? document.querySelector('[role="alert"]')
}

async function submitEmpty(
  form: ReactElement,
  before?: (user: ReturnType<typeof userEvent.setup>) => Promise<void>,
) {
  const user = userEvent.setup()
  render(<MemoryRouter>{form}</MemoryRouter>)
  // Every form has a button once it has loaded; the loading skeleton has none.
  await screen.findAllByRole('button')
  if (before) await before(user)
  const submit = [...document.querySelectorAll<HTMLButtonElement>('button[type="submit"]')].at(-1)!
  await user.click(submit)
  await waitFor(() => expect(firstInvalid()).not.toBeNull())
  expect(document.activeElement).toBe(firstInvalid())
  expect(screen.getByText(/fields? needs? attention\.$/)).toBeInTheDocument()
}

describe('A failed submit focuses the first invalid field', () => {
  beforeEach(() => resetMockDb())

  it.each([
    ['New Visit', <NewVisitEntryPage />],
    ['Incident Stage 1', <IncidentEntryPage />],
    ['Add Student', <StudentFormPage />],
    ['PE/Sports Referral', <PeSportsReferralPage />],
    ['Add Inventory Item', <InventoryFormPage />],
    ['Dispense', <InventoryDispensePage />],
    ['User form', <UserFormPage />],
  ])('%s', async (_name, form) => {
    await submitEmpty(form)
  })

  it('Visit Details edit', async () => {
    await submitEmpty(<VisitDetailPage visitId="visit-0157" />, async (user) => {
      await user.click(await screen.findByRole('button', { name: 'Edit' }))
      // The complaint is a dropdown now: "Other (type your own)" leaves an empty required field.
      await user.click(screen.getByRole('button', { name: /complaint/i }))
      await user.click(screen.getByRole('option', { name: 'Other (type your own)' }))
    })
  })

  it.each([
    ['Adjust Stock', AdjustStockModal],
    ['Restock', RestockModal],
  ])('%s dialog', async (_name, Dialog) => {
    const [item] = await listInventory()
    await submitEmpty(<Dialog item={item} onClose={() => {}} onSaved={() => {}} />)
  })

  it('Edit Student: a cleared required field takes focus', async () => {
    await submitEmpty(<StudentFormPage studentId={STUDENT} />, async (user) => {
      await user.clear(screen.getByLabelText(/full name/i))
    })
    expect(screen.getByLabelText(/full name/i)).toHaveFocus()
  })
})
