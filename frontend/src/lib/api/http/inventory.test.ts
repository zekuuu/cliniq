import { afterEach, describe, expect, it, vi } from 'vitest'
import { StockRuleError } from '../../mock-db'
import * as data from '../../data'
import { ok, stubApi } from './testFetch'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const staff = { id: '1', name: 'Nurse', role: 'staff' as const }
const options = [
  { id: '1', label: 'Headache', triageSteps: [] },
  { id: '3', label: 'Fever', triageSteps: [] },
]

describe('INVENTORY in API mode (S5)', () => {
  it('shows "Commonly used for" as labels though the API stores option ids', async () => {
    stubApi((url) =>
      url === '/api/reference/visit-complaint-types'
        ? ok(options)
        : ok([
            { id: '1', name: 'Paracetamol', usedFor: ['1', '3'] },
            { id: '2', name: 'Gauze', usedFor: [] },
          ]),
    )
    const items = await data.listInventory({ attention: 'low_stock' })
    expect(items.map((i) => i.usedFor)).toEqual([['Headache', 'Fever'], []])
  })

  it('saves labels as option ids, and sends an unknown label for the server to refuse', async () => {
    const calls = stubApi((url, method) => {
      if (url === '/api/reference/visit-complaint-types') return ok(options)
      if (method === 'PUT')
        return {
          status: 422,
          body: { code: 'validation_failed', message: 'Choose a listed symptom.', errors: {} },
        }
      return ok({ id: '9', usedFor: ['3'] })
    })
    const saved = await data.saveInventoryItem({
      name: 'Paracetamol',
      usedFor: ['fever', ''],
      avoidIfAllergicTo: [''],
    } as never)
    expect(calls.find((c) => c.url === '/api/inventory')?.body).toMatchObject({
      usedFor: ['3'],
      avoidIfAllergicTo: [],
    })
    expect(saved.usedFor).toEqual(['Fever'])
    const refused = await data
      .saveInventoryItem({ name: 'X', usedFor: ['Sore eyes'] } as never, { itemId: '9' })
      .catch((e: unknown) => e)
    expect(calls.find((c) => c.method === 'PUT')?.body).toMatchObject({ usedFor: ['Sore eyes'] })
    expect(refused).toBeInstanceOf(StockRuleError)
  })

  it('dispenses, restocks and adjusts on their routes; stock refusals keep the mock error', async () => {
    const calls = stubApi((url) =>
      url.endsWith('/adjust')
        ? {
            status: 409,
            body: { code: 'rule_violated', rule: 'stock_rule', message: 'No usable batch.' },
          }
        : ok({ id: '1', usedFor: [] }),
    )
    await data.dispenseInventoryItem('1', 2, { studentId: '5' }, staff)
    await data.restockInventoryItem('1', 10, null, { noExpirationConfirmed: true, actor: staff })
    await expect(
      data.adjustInventoryStock('1', { reason: 'damaged', quantityChange: -1 } as never, staff),
    ).rejects.toBeInstanceOf(StockRuleError)
    expect(calls.map((c) => [c.url, c.body])).toEqual([
      ['/api/inventory/1/dispense', { quantity: 2, studentId: '5' }],
      [
        '/api/inventory/1/restock',
        { quantity: 10, expirationDate: null, noExpirationConfirmed: true },
      ],
      ['/api/inventory/1/adjust', { reason: 'damaged', quantityChange: -1 }],
    ])
  })
})
