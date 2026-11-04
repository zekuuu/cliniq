import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { listInventoryMovements, resetMockDb } from '../../lib/mock-db'
import { db } from '../../lib/mock-db/store'
import { renderWithRouter } from '../../test/renderWithRouter'
import { selectOption } from '../../test/selectOption'
import { InventoryHistoryPage } from './InventoryHistoryPage'

const ADMIN = { id: 'user-admin-01', name: 'Principal', role: 'admin' } as const

describe('Inventory Usage History (Module 8)', () => {
  beforeEach(() => resetMockDb())

  it('filters by item and type, and shows a dispense as a removal with a masked patient', async () => {
    const all = await listInventoryMovements()
    expect(all.length).toBeGreaterThan(0)
    const dispense = all.find((row) => row.type === 'dispense' && row.patientNumber?.includes('•'))!
    expect(dispense.change).toBeLessThan(0)
    expect(dispense.patientNumber).toContain('•')
    expect((await listInventoryMovements({ itemId: dispense.itemId })).every((row) => row.itemId === dispense.itemId)).toBe(true)
    expect((await listInventoryMovements({ type: 'restock' })).every((row) => row.type === 'restock')).toBe(true)
    expect(await listInventoryMovements({ from: '2099-01-01' })).toEqual([])
  })

  it('never carries a patient name', async () => {
    const names = db().students.map((student) => student.fullName)
    const text = JSON.stringify(await listInventoryMovements())
    expect(names.some((name) => text.includes(name))).toBe(false)
  })

  it('opens on one item from ?item= and refuses the Admin', async () => {
    const [first] = await listInventoryMovements()
    renderWithRouter(<InventoryHistoryPage />, { route: `/inventory/history?item=${first.itemId}` })
    const table = await screen.findByRole('table', { name: 'Stock movements' })
    expect(within(table).getAllByRole('rowheader').every((cell) => cell.textContent === first.itemName)).toBe(true)
    await selectOption(userEvent.setup(), screen.getByLabelText('Movement'), 'Restocked')
    await expect(listInventoryMovements({}, ADMIN)).rejects.toThrow('Only the School Clinician')
  })
})
