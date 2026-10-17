import { beforeEach, describe, expect, it } from 'vitest'
import { getRecordedAuditEntries, resetMockDb } from '../../../lib/mock-db'
import { dispenseInventoryItem, fetchInventory } from './inventoryApi'

describe('inventory API', () => {
  beforeEach(() => resetMockDb())

  it('filters the inventory list by search and category', async () => {
    const medicines = await fetchInventory({ search: 'mefenamic', category: 'medicine' })
    expect(medicines.map((item) => item.name)).toEqual(['Mefenamic Acid 250mg'])
    const supplies = await fetchInventory({ search: '', category: 'supply' })
    expect(supplies.length).toBeGreaterThan(0)
    expect(supplies.every((item) => item.category === 'supply')).toBe(true)
  })

  it('filters to items with expired stock without hiding their usable quantity', async () => {
    const expired = await fetchInventory({ search: '', category: '', hasExpiredStock: true })
    expect(expired).not.toHaveLength(0)
    expect(expired.every((item) => item.expiredStock > 0)).toBe(true)
  })

  it('records a dispensation and allows stock to cross below zero with a warning result', async () => {
    const [item] = await fetchInventory({ search: 'Paracetamol', category: '' })
    const result = await dispenseInventoryItem(item.id, item.currentStock + 8, '2026-00001')
    expect(result.remainingStock).toBe(-8)
    expect(result.belowZero).toBe(true)
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toEqual(['submit'])
    // The write is real: the list now shows the new stock and its derived flags.
    const [after] = await fetchInventory({ search: 'Paracetamol', category: '' })
    expect(after.currentStock).toBe(-8)
    expect(after.flags).toContain('low_stock')
  })
})
