import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithRouter } from '../../test/renderWithRouter'
import { InventoryHistoryPage } from './InventoryHistoryPage'

// The API writes an `opening` ledger row for a new item's starting count (ERD; defect D1, November 16,
// 2026). The mock has none, so the movements list here comes back with one added.
vi.mock('../../lib/data', async (importOriginal) => {
  const data = await importOriginal<typeof import('../../lib/data')>()
  return {
    ...data,
    listInventoryMovements: async (...args: Parameters<typeof data.listInventoryMovements>) => {
      const rows = await data.listInventoryMovements(...args)
      const first = rows[0]
      return [
        {
          ...first,
          id: 'opening-1',
          type: 'opening' as never,
          reason: null,
          change: 40,
          patientNumber: null,
        },
        ...rows,
      ]
    },
  }
})

describe('Inventory Usage History, API mode', () => {
  it('names an opening row "Opening stock", not "Adjusted"', async () => {
    renderWithRouter(<InventoryHistoryPage />)
    expect(await screen.findByText('Opening stock')).toBeInTheDocument()
  })
})
