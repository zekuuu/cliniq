import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { getInventoryItem, listInventory, resetMockDb, saveInventoryItem, StockRuleError } from '../../lib/mock-db'
import { renderWithRouter } from '../../test/renderWithRouter'
import { selectOption } from '../../test/selectOption'
import { findDuplicateItem, unitSuggestions } from './api/inventoryApi'
import { InventoryFormPage } from './InventoryFormPage'
import { InventoryListPage } from './InventoryListPage'

/** Panel review part 5: the Manage menu, expiry on Add Item, the duplicate warning, Add/Remove. */

const NEW_ITEM = { name: 'Saline solution', category: 'supply' as const, currentStock: 10, unit: 'bottles', lowStockThreshold: 2 }

describe('Add Item expiry (IV-2, ADR-035, D10)', () => {
  beforeEach(() => resetMockDb())

  it('needs a date or the explicit no-expiration confirmation, never both, in the data layer', async () => {
    await expect(saveInventoryItem({ ...NEW_ITEM, expirationDate: null })).rejects.toBeInstanceOf(StockRuleError)
    await expect(saveInventoryItem({ ...NEW_ITEM, expirationDate: '2099-01-01', noExpirationConfirmed: true })).rejects.toThrow(/either/)
    const item = await saveInventoryItem({ ...NEW_ITEM, expirationDate: null, noExpirationConfirmed: true })
    expect((await getInventoryItem(item.id)).batches[0].expirationDate).toBeNull()
    // Editing an existing item never touches its expiry, so the rule doesn't apply there.
    await expect(saveInventoryItem({ ...NEW_ITEM, name: 'Saline 0.9%', expirationDate: null }, { itemId: item.id })).resolves.toBeTruthy()
  })

  it('asks on the form before saving a blank expiry', async () => {
    const user = userEvent.setup()
    renderWithRouter(<InventoryFormPage />, { route: '/inventory/new' })
    await screen.findByRole('heading', { name: 'Add Inventory Item' })
    await user.type(screen.getByLabelText(/item name/i), NEW_ITEM.name)
    await user.type(screen.getByLabelText(/current stock/i), '10')
    await user.type(screen.getByRole('combobox', { name: /^unit/i }), 'bottles')
    await user.type(screen.getByLabelText(/low-stock threshold/i), '2')
    await user.click(screen.getByRole('button', { name: 'Add Item' }))
    expect(screen.getByText('Choose an expiration date, or confirm this item has no expiration date.')).toBeInTheDocument()
    await user.click(screen.getByLabelText(/this item has no expiration date/i))
    await user.click(screen.getByRole('button', { name: 'Add Item' }))
    expect(await screen.findByText('Saline solution was added successfully.')).toBeInTheDocument()
  })
})

describe('duplicate warning and unit suggestions (IV-3, D9)', () => {
  beforeEach(() => resetMockDb())

  it('matches name and unit ignoring case, spacing and a trailing "s", and suggests existing units', async () => {
    const items = await listInventory()
    expect(findDuplicateItem(items, 'paracetamol  500MG', 'tablet')?.name).toBe('Paracetamol 500mg')
    expect(findDuplicateItem(items, 'Paracetamol 500mg', 'bottles')).toBeNull()
    expect(findDuplicateItem(items, 'Paracetamol 500mg', 'tablets', 'item-0001')).toBeNull()
    expect(unitSuggestions(items)).toEqual(expect.arrayContaining(['tablets', 'pieces']))
  })

  it('warns on Add Item without blocking, with a link to the existing item', async () => {
    const user = userEvent.setup()
    renderWithRouter(<InventoryFormPage />, { route: '/inventory/new' })
    await screen.findByRole('heading', { name: 'Add Inventory Item' })
    await user.type(screen.getByLabelText(/item name/i), 'paracetamol 500mg')
    await user.type(screen.getByRole('combobox', { name: /^unit/i }), 'tablet')
    expect(screen.getByText(/Paracetamol 500mg \(tablets\) already exists\. Restock it instead\?/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Paracetamol 500mg' })).toHaveAttribute('href', '/inventory?search=Paracetamol%20500mg')
    expect(screen.getByRole('button', { name: 'Add Item' })).toBeEnabled()
  })
})

describe('one main row action and a Manage menu (IV-1), Add or Remove (IV-7)', () => {
  beforeEach(() => resetMockDb())

  it('keeps Restock visible and puts Adjust Stock, Batches and Edit under Manage', async () => {
    const user = userEvent.setup()
    renderWithRouter(<InventoryListPage />)
    expect(await screen.findByRole('button', { name: 'Restock Gauze Pads' })).toBeInTheDocument()
    expect(screen.getByText('Restock when new stock arrives. Adjust Stock to correct a count.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Manage Gauze Pads/ }))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Adjust Stock', 'Batches', 'Edit'])
  })

  it('adds a positive quantity with Add and shows the result before saving', async () => {
    const user = userEvent.setup()
    renderWithRouter(<InventoryListPage />)
    await selectOption(user, await screen.findByRole('button', { name: /^Manage Gauze Pads/ }), 'Adjust Stock')
    const dialog = screen.getByRole('dialog', { name: 'Adjust Stock: Gauze Pads' })
    await user.click(within(dialog).getByRole('radio', { name: 'Add' }))
    await user.type(within(dialog).getByLabelText(/quantity to add/i), '5')
    expect(within(dialog).getByText('This batch after saving: 45 pieces (now 40)')).toBeInTheDocument()
    await selectOption(user, within(dialog).getByLabelText(/^reason/i), 'Miscount correction')
    await user.click(within(dialog).getByRole('button', { name: 'Save Adjustment' }))
    expect((await getInventoryItem('item-0011')).currentStock).toBe(45)
  })

  it('refuses a minus sign or zero: the quantity is always positive', async () => {
    const user = userEvent.setup()
    renderWithRouter(<InventoryListPage />)
    await selectOption(user, await screen.findByRole('button', { name: /^Manage Gauze Pads/ }), 'Adjust Stock')
    const dialog = screen.getByRole('dialog', { name: 'Adjust Stock: Gauze Pads' })
    await user.type(within(dialog).getByLabelText(/quantity to remove/i), '0')
    await selectOption(user, within(dialog).getByLabelText(/^reason/i), 'Miscount correction')
    await user.click(within(dialog).getByRole('button', { name: 'Save Adjustment' }))
    expect(within(dialog).getByText('Enter how many to remove, a whole number of 1 or more.')).toBeInTheDocument()
    expect((await getInventoryItem('item-0011')).currentStock).toBe(40)
  })
})
