import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { InventoryItemPicker } from '../../components'
import { getInventoryItem, getRecordedAuditEntries, listInventory } from '../../lib/mock-db'
import { db, migratePersistedState } from '../../lib/mock-db/store'
import { renderWithRouter } from '../../test/renderWithRouter'
import { selectOption } from '../../test/selectOption'
import { VisitLogListPage } from '../clinic-visits/VisitLogListPage'
import { InventoryFormPage } from './InventoryFormPage'
import { BatchDetailsModal } from './StockModals'

/** Sir Rey (October 25, 2026): an optional generic/branded tag, and 10 or 20 rows per page. */
describe('Generic or branded (optional)', () => {
  it('saves from Edit Item, shows on the item details and in the Dispense picker', async () => {
    const [item] = await listInventory()
    const user = userEvent.setup()
    renderWithRouter(<InventoryFormPage />, { route: `/inventory/new?item=${item.id}` })
    const field = await screen.findByLabelText('Generic or branded')
    expect(field).toHaveTextContent('Not specified')
    await selectOption(user, field, 'branded')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    await waitFor(async () => expect((await getInventoryItem(item.id)).brand).toBe('branded'))
    expect(getRecordedAuditEntries().at(-1)).toMatchObject({ actionType: 'update', summary: 'Updated generic or branded' })

    const saved = await getInventoryItem(item.id)
    const details = render(<BatchDetailsModal item={saved} onClose={() => {}} />)
    expect(within(screen.getByRole('dialog')).getByText('Branded')).toBeInTheDocument()
    details.unmount()

    render(<InventoryItemPicker items={[saved]} onPick={() => {}} />)
    await user.click(screen.getByRole('combobox', { name: 'Add medicine or supply' }))
    expect(within(screen.getByRole('listbox')).getByText('Branded')).toBeInTheDocument()
  })

  it('reads "Not specified" for items saved before the tag existed', () => {
    const saved = { state: structuredClone(db()), seedAuditLength: 0 }
    for (const item of saved.state.inventoryItems) delete (item as { brand?: unknown }).brand
    const migrated = migratePersistedState(saved)
    expect(migrated.state.inventoryItems.every((item) => item.brand === null)).toBe(true)
  })
})

describe('Rows per page', () => {
  it('offers 10, 20, 50 or 100 rows, returns to page 1 on a change, and keeps the choice for the session', async () => {
    const user = userEvent.setup()
    const view = renderWithRouter(<VisitLogListPage />, { route: '/visits?from=2000-01-01&to=2100-12-31' })
    const table = await screen.findByRole('table')
    const rows = () => within(table).getAllByRole('row').length - 1
    expect(rows()).toBe(10)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText(/^Page 2 of/)).toBeInTheDocument()

    const size = screen.getByLabelText('Rows per page')
    await selectOption(user, size, '20')
    expect(rows()).toBe(20)
    expect(screen.getByText(/^Page 1 of/)).toBeInTheDocument()
    expect(screen.getByText(/^Showing 1–20 of/)).toBeInTheDocument()

    await user.click(size)
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['10', '20', '50', '100'])
    await user.keyboard('{Escape}')

    view.unmount()
    renderWithRouter(<VisitLogListPage />, { route: '/visits?from=2000-01-01&to=2100-12-31' })
    expect(await screen.findByLabelText('Rows per page')).toHaveTextContent('20')
  })
})
