import { renderWithRouter } from '../../test/renderWithRouter'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InventoryListPage } from './InventoryListPage'
import { fetchInventory } from './api/inventoryApi'
import { inventoryStatusSortValue } from './inventoryStatusSort'

// The whole list on one page: these tests reach every item (Inventory is paged since review round 2, R26).
vi.mock('../../hooks/usePageSize', async (importOriginal) => {
  const { useState } = await import('react')
  return { ...(await importOriginal<object>()), usePageSize: () => useState(50) }
})

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

  it('keeps stock details grouped and the menu at the right end of a compact Actions column', async () => {
    renderWithRouter(<InventoryListPage />)
    const table = await screen.findByRole('table', { name: 'Inventory items' })
    expect(
      [...table.querySelectorAll('thead th')].map((cell) => cell.textContent?.trim()),
    ).toEqual(['Item', 'Category', 'Stock', 'Next usable expiry', 'Status', 'Actions'])
    expect((table.querySelectorAll('col')[5] as HTMLTableColElement).style.width).toBe('9rem')
    expect(table.querySelectorAll('thead th')[5]).toHaveClass('text-left')
    const actions = table.querySelector('tbody tr td:last-child div')
    expect(actions).toHaveClass('justify-start')
    expect(actions?.lastElementChild).toHaveAttribute('aria-haspopup', 'menu')
  })
})

describe('Inventory List: expired stock', () => {
  it('marks an expired item’s quantity as expired in the Stock column', async () => {
    const items = await fetchInventory({ search: '', category: '' })
    const expired = items.find((item) => item.flags.includes('expired'))!
    const usable = items.find((item) => !item.flags.includes('expired'))!
    renderWithRouter(<InventoryListPage />)

    expect(
      await screen.findByLabelText(`Expired stock: ${expired.expiredStock} ${expired.unit}`, {
        exact: false,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(`${usable.currentStock} ${usable.unit} usable`)).toBeInTheDocument()
  })
})
