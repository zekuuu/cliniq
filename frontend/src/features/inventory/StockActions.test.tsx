import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { getInventoryItem, getStudent, resetMockDb } from '../../lib/mock-db'
import { renderWithRouter } from '../../test/renderWithRouter'
import { pickDate } from '../../test/pickDate'
import { selectOption } from '../../test/selectOption'
import { pickStudent } from '../../test/pickStudent'
import { InventoryDispensePage } from './InventoryDispensePage'
import { InventoryFormPage } from './InventoryFormPage'
import { InventoryListPage } from './InventoryListPage'

/** Adjust Stock, Restock, the locked Edit Item fields, and the standalone Dispense rules (ADR-018). */

const stock = async (id: string) => (await getInventoryItem(id)).currentStock

describe('Adjust Stock', () => {
  beforeEach(() => resetMockDb())

  async function openAdjust(itemName: string) {
    const user = userEvent.setup()
    renderWithRouter(<InventoryListPage />)
    // Panel review IV-1: Adjust Stock sits under the row's Manage menu.
    await selectOption(user, await screen.findByRole('button', { name: new RegExp(`^Manage ${itemName}`) }), 'Adjust Stock')
    return { user, dialog: screen.getByRole('dialog', { name: `Adjust Stock: ${itemName}` }) }
  }

  it('requires a reason, and a note when the reason is Other', async () => {
    const { user, dialog } = await openAdjust('Gauze Pads')
    await user.type(within(dialog).getByLabelText(/quantity to remove/i), '2')
    await user.click(within(dialog).getByRole('button', { name: 'Save Adjustment' }))
    expect(within(dialog).getByText('Choose a reason.')).toBeInTheDocument()
    await selectOption(user, within(dialog).getByLabelText(/^reason/i), 'Other')
    await user.click(within(dialog).getByRole('button', { name: 'Save Adjustment' }))
    expect(within(dialog).getByText('Add a note explaining the adjustment.')).toBeInTheDocument()
    expect(await stock('item-0011')).toBe(40)
  })

  it("can't take stock below 0", async () => {
    const { user, dialog } = await openAdjust('Gauze Pads')
    await user.type(within(dialog).getByLabelText(/quantity to remove/i), '41')
    await selectOption(user, within(dialog).getByLabelText(/^reason/i), 'Damaged or spilled')
    await user.click(within(dialog).getByRole('button', { name: 'Save Adjustment' }))
    expect(within(dialog).getByText(/Stock can't go below 0/)).toBeInTheDocument()
    expect(await stock('item-0011')).toBe(40)
  })

  it('disposes of an expired batch by setting the counted quantity', async () => {
    const { user, dialog } = await openAdjust('Oral Rehydration Salts')
    expect(within(dialog).getByText(/The expiration date changes only through Restock/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('radio', { name: 'Set to counted quantity' }))
    await user.type(within(dialog).getByLabelText(/counted quantity/i), '0')
    await selectOption(user, within(dialog).getByLabelText(/^reason/i), 'Expired - disposed')
    await user.click(within(dialog).getByRole('button', { name: 'Save Adjustment' }))
    expect(await screen.findByText(/Oral Rehydration Salts adjusted \(Expired - disposed\)\. Usable stock is now 0 sachets/)).toBeInTheDocument()
    expect(await stock('item-0004')).toBe(0)
  })
})

describe('Inventory page headings', () => {
  beforeEach(() => resetMockDb())

  it('omits passive mode and stock-action badges', async () => {
    renderWithRouter(<InventoryFormPage />, { route: '/inventory/new' })
    await screen.findByRole('heading', { name: 'Add Inventory Item' })
    expect(screen.queryByText('New item')).not.toBeInTheDocument()
    expect(screen.queryByText('Editing')).not.toBeInTheDocument()

    renderWithRouter(<InventoryDispensePage />, { route: '/inventory/dispense' })
    await screen.findByRole('heading', { name: 'Dispense Medicine or Supply' })
    expect(screen.queryByText('Stock action')).not.toBeInTheDocument()
  })
})

describe('Restock and Edit Item', () => {
  beforeEach(() => resetMockDb())

  it('restocks from the list', async () => {
    const user = userEvent.setup()
    renderWithRouter(<InventoryListPage />)
    await user.click(await screen.findByRole('button', { name: 'Restock Gauze Pads' }))
    const dialog = screen.getByRole('dialog', { name: 'Restock: Gauze Pads' })
    await user.type(within(dialog).getByLabelText(/quantity received/i), '10')
    await pickDate(user, within(dialog).getByRole('button', { name: /expiration date/i }), '2027-10-22')
    await user.click(within(dialog).getByRole('button', { name: 'Save Restock' }))
    expect(await screen.findByText(/Gauze Pads restocked with 10 pieces/)).toBeInTheDocument()
    expect(await stock('item-0011')).toBe(50)
  })

  it('requires an expiry date unless the clinician explicitly confirms that the batch has none', async () => {
    const user = userEvent.setup()
    renderWithRouter(<InventoryListPage />)
    await user.click(await screen.findByRole('button', { name: 'Restock Gauze Pads' }))
    const dialog = screen.getByRole('dialog', { name: 'Restock: Gauze Pads' })
    await user.type(within(dialog).getByLabelText(/quantity received/i), '10')
    await user.click(within(dialog).getByRole('button', { name: 'Save Restock' }))

    expect(within(dialog).getByText('Choose an expiration date, or confirm this batch has no expiration date.')).toBeInTheDocument()
    expect(await stock('item-0011')).toBe(40)

    await user.click(within(dialog).getByRole('checkbox', { name: /this batch has no expiration date/i }))
    expect(within(dialog).getByRole('button', { name: /expiration date/i })).toBeDisabled()
    await user.click(within(dialog).getByRole('button', { name: 'Save Restock' }))

    expect(await screen.findByText(/Gauze Pads restocked with 10 pieces/)).toBeInTheDocument()
    expect((await getInventoryItem('item-0011')).batches.at(-1)?.expirationDate).toBeNull()
  })

  it('shows stock and expiry as read-only when editing an existing item', async () => {
    renderWithRouter(<InventoryFormPage />, { route: '/inventory/new?item=item-0001' })
    expect(await screen.findByText('Changes only through Restock on the Inventory list.')).toBeInTheDocument()
    expect(screen.queryByLabelText(/current stock/i)).not.toBeInTheDocument()
  })
})

describe('Standalone Dispense', () => {
  beforeEach(() => resetMockDb())

  it('requires choosing a student or general use', async () => {
    const user = userEvent.setup()
    renderWithRouter(<InventoryDispensePage />, { route: '/inventory/dispense' })
    await user.click(await screen.findByRole('button', { name: 'Record Dispensation' }))
    expect(screen.getByText('Choose who this is for.')).toBeInTheDocument()
  })

  it('records general use with no student', async () => {
    const user = userEvent.setup()
    renderWithRouter(<InventoryDispensePage />, { route: '/inventory/dispense' })
    await selectOption(user, await screen.findByLabelText(/^for/i), 'Not for a person (general use)')
    await user.type(screen.getByRole('combobox', { name: 'Item' }), 'gloves')
    await user.click(screen.getByRole('option', { name: /Disposable Gloves/ }))
    await user.click(screen.getByRole('button', { name: 'Record Dispensation' }))
    expect(await screen.findByText(/1 pairs of Disposable Gloves recorded for general use/)).toBeInTheDocument()
    expect(await stock('item-0014')).toBe(89)
  })

  it("links to the student's visit today instead of recording twice; the notice names no student", async () => {
    const student = await getStudent('student-0015')
    const user = userEvent.setup()
    renderWithRouter(<InventoryDispensePage />, { route: '/inventory/dispense' })
    await selectOption(user, await screen.findByLabelText(/^For/), 'A student or staff member')
    await pickStudent(user, student.lrn)
    const notice = (await screen.findByText(/This student already has a visit today/)).closest('[role="status"]') as HTMLElement
    expect(within(notice).getByRole('link', { name: /Open today’s visit/ })).toHaveAttribute('href', '/visits/visit-0159')
    expect(within(notice).queryByText(new RegExp(student.fullName))).not.toBeInTheDocument()
    // The picked student shows like New Visit's: a deliberate single lookup (cliniq-display-privacy).
    expect(screen.getByRole('button', { name: `Change student or staff member (${student.fullName})` })).toBeInTheDocument()
  })

  it('finds the student by name from the first letters and picks from the list', async () => {
    const user = userEvent.setup()
    renderWithRouter(<InventoryDispensePage />, { route: '/inventory/dispense' })
    await selectOption(user, await screen.findByLabelText(/^For/), 'A student or staff member')
    await user.type(screen.getByRole('combobox', { name: /student/i }), 'Gian')
    await user.click(await screen.findByRole('option', { name: /LRN ending in 0001 Gian Quizon Kinder/ }))
    expect(screen.getByRole('button', { name: 'Change student or staff member (Gian Quizon)' })).toBeInTheDocument()
  })

  it('shows expired items as unavailable', async () => {
    const user = userEvent.setup()
    renderWithRouter(<InventoryDispensePage />, { route: '/inventory/dispense' })
    await user.type(await screen.findByRole('combobox', { name: 'Item' }), 'oral')
    await user.click(screen.getByRole('option', { name: /Oral Rehydration Salts/ }))
    expect(screen.getByRole('combobox', { name: 'Item' })).toBeInTheDocument()
  })
})
