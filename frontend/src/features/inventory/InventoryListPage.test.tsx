import { renderWithRouter } from '../../test/renderWithRouter'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InventoryListPage } from './InventoryListPage'
import { fetchInventory } from './api/inventoryApi'
import { inventoryStatusSortValue } from './inventoryStatusSort'

describe('Inventory List', () => {
  it('defaults to the staff attention order in the Status column', async () => {
    const items = await fetchInventory({ search: '', category: '' })
    const expectedNames = [...items]
      .sort((left, right) => inventoryStatusSortValue(left) - inventoryStatusSortValue(right))
      .map((item) => item.name)

    renderWithRouter(<InventoryListPage />)

    expect(await screen.findByRole('heading', { name: 'Inventory' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
    expect(screen.getAllByRole('rowheader').map((cell) => cell.textContent)).toEqual(expectedNames)
  })
})

describe('Inventory List: expired stock', () => {
  it('marks an expired item’s quantity as expired in the Stock column', async () => {
    const items = await fetchInventory({ search: '', category: '' })
    const expired = items.find((item) => item.flags.includes('expired'))!
    const usable = items.find((item) => !item.flags.includes('expired'))!
    renderWithRouter(<InventoryListPage />)

    expect(
      await screen.findByLabelText(`Expired stock: ${expired.expiredStock} ${expired.unit}`, { exact: false }),
    ).toBeInTheDocument()
    expect(screen.getByText(`${usable.currentStock} ${usable.unit} usable`)).toBeInTheDocument()
  })
})
