import { screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { getInventoryItem, getStudent, resetMockDb } from '../../lib/mock-db'
import { renderWithRouter } from '../../test/renderWithRouter'
import { selectOption } from '../../test/selectOption'
import { StudentProfilePage } from '../student-records/StudentProfilePage'
import { NewVisitEntryPage } from './NewVisitEntryPage'
import { VisitDetailPage } from './VisitDetailPage'
import { IncidentEntryPage } from '../emergency-response/IncidentEntryPage'

/** Medicines & supplies given on the visit forms (ADR-018). */

const stock = async (id: string) => (await getInventoryItem(id)).currentStock

async function pick(user: UserEvent, search: string, name: RegExp) {
  const picker = screen.getByRole('combobox', { name: 'Add medicine or supply' })
  await user.clear(picker)
  await user.type(picker, search)
  await user.click(screen.getByRole('option', { name }))
}

async function openNewVisit(user: UserEvent) {
  renderWithRouter(<NewVisitEntryPage studentNumber="2026-00001" />)
  await screen.findByRole('heading', { name: 'New Visit' })
  await selectOption(user, screen.getByLabelText(/complaint/i), 'Headache')
}

describe('New Visit: medicines and supplies given', () => {
  beforeEach(() => resetMockDb())

  it('records two items with only lines (no notes) and takes them from stock', async () => {
    const user = userEvent.setup()
    await openNewVisit(user)
    await pick(user, 'para', /Paracetamol 500mg/)
    await user.click(screen.getByRole('button', { name: 'Increase Paracetamol 500mg' }))
    await user.type(screen.getAllByLabelText('Instructions (optional)')[0], '1 tablet every 6 hours')
    await pick(user, 'gauze', /Gauze Pads/)
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))

    expect(await screen.findByText(/2 items were taken from inventory/)).toBeInTheDocument()
    expect(await stock('item-0001')).toBe(10)
    expect(await stock('item-0011')).toBe(39)
  })

  it('shows expired items disabled with an Expired badge, and never adds them by click or keyboard', async () => {
    const user = userEvent.setup()
    await openNewVisit(user)
    const picker = screen.getByRole('combobox', { name: 'Add medicine or supply' })
    await user.type(picker, 'oral')
    const expired = screen.getByRole('option', { name: /Oral Rehydration Salts/ })
    expect(expired).toHaveAttribute('aria-disabled', 'true')
    expect(within(expired).getByText('Expired')).toBeInTheDocument()
    await user.click(expired)
    await user.keyboard('{ArrowDown}{Enter}')
    expect(screen.queryByRole('list', { name: 'Medicines and supplies given' })).not.toBeInTheDocument()
  })

  it('adds to the existing line when the same item is picked again, and works by keyboard', async () => {
    const user = userEvent.setup()
    await openNewVisit(user)
    const picker = screen.getByRole('combobox', { name: 'Add medicine or supply' })
    for (let i = 0; i < 2; i++) {
      await user.type(picker, 'adhesive')
      await user.keyboard('{ArrowDown}{Enter}')
    }
    expect(within(screen.getByRole('list', { name: 'Medicines and supplies given' })).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByLabelText('Quantity of Adhesive Bandages')).toHaveValue('2')
  })

  it('warns, without blocking, when the quantity is above current stock', async () => {
    const user = userEvent.setup()
    await openNewVisit(user)
    await pick(user, 'para', /Paracetamol 500mg/)
    const quantity = screen.getByLabelText('Quantity of Paracetamol 500mg')
    await user.clear(quantity)
    await user.type(quantity, '15')
    expect(screen.getByText(/Only 12 tablets in stock/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))
    expect(await screen.findByText(/Now below zero: Paracetamol 500mg/)).toBeInTheDocument()
    expect(await stock('item-0001')).toBe(-3)
  })

  it("shows the student's recorded allergies beside the picker", async () => {
    const student = await getStudent('2020-00001')
    renderWithRouter(<NewVisitEntryPage studentNumber={student.studentNumber} />)
    await screen.findByRole('heading', { name: 'New Visit' })
    expect(screen.getByRole('note', { name: 'Recorded allergies' })).toHaveTextContent('Allergies: Peanuts')
  })
})

describe('Visit Detail: medicines and supplies given', () => {
  beforeEach(() => resetMockDb())

  it('shows the lines, and lowering a quantity returns stock', async () => {
    const user = userEvent.setup()
    renderWithRouter(<VisitDetailPage visitId="visit-0159" />)
    expect(await screen.findByText('Adhesive Bandages × 1 pieces (Change the bandage tomorrow)')).toBeInTheDocument()
    expect(screen.getByText('Gauze Pads × 2 pieces')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Decrease Gauze Pads' }))
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Visit updated.')).toBeInTheDocument()
    expect(screen.getByText('Gauze Pads × 1 pieces')).toBeInTheDocument()
    expect(await stock('item-0011')).toBe(41)
  })
})

describe('Student Profile visit history', () => {
  beforeEach(() => resetMockDb())

  it('shows medicines given on each visit', async () => {
    renderWithRouter(<StudentProfilePage studentNumber="2026-00006" />)
    expect(await screen.findByText(/Given: Paracetamol 500mg × 2 tablets \(1 tablet every 6 hours\)/)).toBeInTheDocument()
  })
})

describe('Incident: medicines and supplies given', () => {
  beforeEach(() => resetMockDb())

  it('keeps Stage 1 fast with no medicine entry', async () => {
    renderWithRouter(<IncidentEntryPage studentNumber="2026-00001" />)
    await screen.findByRole('heading', { name: 'Report Incident' })
    expect(screen.queryByRole('combobox', { name: 'Add medicine or supply' })).not.toBeInTheDocument()
  })

  it('records lines at Stage 2 and takes them from stock', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Complete Incident Record' })
    await user.type(screen.getByLabelText(/blood pressure/i), '110/70')
    await user.type(screen.getByLabelText(/oxygen saturation/i), '98')
    await user.type(screen.getByLabelText(/treatment notes/i), 'Observed lying down.')
    await pick(user, 'cold', /Instant Cold Packs/)
    await user.click(screen.getByRole('button', { name: 'Complete Incident' }))
    expect(await screen.findByText('Instant Cold Packs × 1 packs')).toBeInTheDocument()
    expect(await stock('item-0013')).toBe(17)
  })
})
