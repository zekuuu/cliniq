import { beforeEach, describe, expect, it } from 'vitest'
import {
  adjustInventoryStock,
  completeIncidentStageTwo,
  getIncident,
  saveIncidentStageOne,
  getInventoryItem,
  getMonthlyReport,
  getRecordedAuditEntries,
  getStudent,
  getVisit,
  listVisits,
  recordVisit,
  resetMockDb,
  restockInventoryItem,
  saveInventoryItem,
  dispenseInventoryItem,
  StockRuleError,
  updateVisit,
} from './index'
import { db } from './store'

/** Stock integrity rules for medicines and supplies given (ADR-018). */

const PARACETAMOL = 'item-0001' // 12 tablets, not expired
const CETIRIZINE = 'item-0003' // 9 tablets, nearing expiry
const ORS = 'item-0004' // expired
const GAUZE = 'item-0011' // no expiry date

const stock = async (id: string) => (await getInventoryItem(id)).currentStock
const transactions = () => db().frontendOnly.inventoryTransactions

async function newVisit(itemsGiven: Array<{ itemId: string; quantity: number; instructions?: string }>, treatment = '') {
  const student = await getStudent('student-0001')
  return recordVisit({ studentId: student.id, complaint: 'Headache', treatment, disposition: 'returned_to_class', followUp: null, itemsGiven })
}

describe('recording a visit with medicines and supplies', () => {
  beforeEach(() => resetMockDb())

  it('saves the visit, one dispense per line, the decrements, and the audit entries together', async () => {
    const txnsBefore = transactions().length
    const { visit } = await newVisit([
      { itemId: PARACETAMOL, quantity: 2, instructions: '1 tablet every 6 hours' },
      { itemId: GAUZE, quantity: 3 },
    ])
    expect(await stock(PARACETAMOL)).toBe(10)
    expect(await stock(GAUZE)).toBe(37)
    const added = transactions().slice(txnsBefore)
    expect(added.map((t) => [t.type, t.itemId, t.quantity, t.studentId, t.visitId])).toEqual([
      ['dispense', PARACETAMOL, 2, 'student-0001', visit.id],
      ['dispense', GAUZE, 3, 'student-0001', visit.id],
    ])
    expect(getRecordedAuditEntries().map((e) => e.targetRecord?.type)).toEqual([
      'visit',
      'inventory-dispensation',
      'inventory-dispensation',
    ])
    expect((await getVisit(visit.id)).itemsGiven).toMatchObject([
      { itemId: PARACETAMOL, itemName: 'Paracetamol 500mg', unit: 'tablets', quantity: 2, instructions: '1 tablet every 6 hours', batchAllocations: [{ quantity: 2 }] },
      { itemId: GAUZE, itemName: 'Gauze Pads', unit: 'pieces', quantity: 3, instructions: null, batchAllocations: [{ quantity: 3 }] },
    ])
  })

  it('saves nothing at all when any line is invalid', async () => {
    const visitsBefore = (await listVisits()).length
    const txnsBefore = transactions().length
    const invalid = [
      [{ itemId: PARACETAMOL, quantity: 1 }, { itemId: ORS, quantity: 1 }], // expired
      [{ itemId: PARACETAMOL, quantity: 1 }, { itemId: 'item-9999', quantity: 1 }], // unknown
      [{ itemId: PARACETAMOL, quantity: 1 }, { itemId: GAUZE, quantity: 0 }], // under 1
      [{ itemId: PARACETAMOL, quantity: 1.5 }], // not whole
      [{ itemId: PARACETAMOL, quantity: 1 }, { itemId: PARACETAMOL, quantity: 1 }], // duplicate line
      [{ itemId: PARACETAMOL, quantity: 1, instructions: 'x'.repeat(121) }], // instructions too long
    ]
    for (const lines of invalid) await expect(newVisit(lines, 'Rested')).rejects.toBeInstanceOf(StockRuleError)
    expect((await listVisits()).length).toBe(visitsBefore)
    expect(transactions().length).toBe(txnsBefore)
    expect(await stock(PARACETAMOL)).toBe(12)
    expect(await stock(GAUZE)).toBe(40)
    expect(getRecordedAuditEntries()).toEqual([])
  })

  it('saves a visit with neither treatment notes nor a line (both optional)', async () => {
    const { visit } = await newVisit([], '')
    expect(visit).toMatchObject({ treatment: '', itemsGiven: [] })
    const { visit: edited } = await updateVisit(visit.id, { complaint: 'Headache', treatment: '', disposition: 'returned_to_class', eventTag: null, itemsGiven: [] })
    expect(edited.treatment).toBe('')
    await expect(newVisit([], 'Rested')).resolves.toBeTruthy()
    await expect(newVisit([{ itemId: GAUZE, quantity: 1 }])).resolves.toBeTruthy()
  })

  it('allows nearing-expiry items, and quantity over stock with a below-zero warning', async () => {
    const { belowZero } = await newVisit([{ itemId: CETIRIZINE, quantity: 1 }, { itemId: PARACETAMOL, quantity: 15 }])
    expect(await stock(CETIRIZINE)).toBe(8)
    expect(await stock(PARACETAMOL)).toBe(-3)
    expect(belowZero).toEqual(['Paracetamol 500mg'])
  })

  it('rejects an expired item on the standalone dispense too', async () => {
    await expect(dispenseInventoryItem(ORS, 1)).rejects.toThrow(/expired/)
    expect((await getInventoryItem(ORS)).expiredStock).toBe(25)
  })

  it('keeps expired stock visible after restock and takes from the new usable batch only', async () => {
    const before = await getInventoryItem(ORS)
    const restocked = await restockInventoryItem(ORS, 10, '2099-12-31')
    expect(restocked.batches).toHaveLength(before.batches.length + 1)
    expect(restocked).toMatchObject({ currentStock: 10, expiredStock: 25, totalOnHand: 35 })

    await dispenseInventoryItem(ORS, 4)
    const after = await getInventoryItem(ORS)
    expect(after).toMatchObject({ currentStock: 6, expiredStock: 25, totalOnHand: 31 })
    expect(after.batches.find((batch) => batch.expirationDate === '2099-12-31')?.quantity).toBe(6)
    expect(after.batches.find((batch) => batch.expirationDate !== null && batch.expirationDate < '2026-10-17')?.quantity).toBe(25)
  })

  it('requires explicit confirmation before adding a batch with no expiration date', async () => {
    await expect(restockInventoryItem(GAUZE, 10, null)).rejects.toThrow(
      'Choose an expiration date, or confirm this batch has no expiration date.',
    )
    expect(await stock(GAUZE)).toBe(40)

    await expect(restockInventoryItem(GAUZE, 10, null, { noExpirationConfirmed: true })).resolves.toMatchObject({
      currentStock: 50,
    })
  })

  it('keeps the name and unit snapshot after the item is renamed', async () => {
    const { visit } = await newVisit([{ itemId: PARACETAMOL, quantity: 1 }])
    const item = await getInventoryItem(PARACETAMOL)
    await saveInventoryItem({ ...item, name: 'Paracetamol 500 mg (Biogesic)', unit: 'tabs' }, { itemId: PARACETAMOL })
    expect((await getVisit(visit.id)).itemsGiven[0]).toMatchObject({ itemName: 'Paracetamol 500mg', unit: 'tablets' })
  })
})

describe('editing a saved visit', () => {
  beforeEach(() => resetMockDb())

  async function savedVisit() {
    const { visit } = await newVisit([{ itemId: PARACETAMOL, quantity: 4 }, { itemId: GAUZE, quantity: 2 }], 'Rested')
    const txnsAfterSave = transactions().length
    return { visit, txnsAfterSave, original: transactions().slice(0, txnsAfterSave).map((t) => ({ ...t })) }
  }
  const patchOf = (visit: Awaited<ReturnType<typeof newVisit>>['visit']) => ({
    complaint: visit.complaint,
    treatment: visit.treatment,
    disposition: visit.disposition,
    eventTag: visit.eventTag,
  })

  it('returns stock for a lowered or removed line and takes more for a raised or added one', async () => {
    const { visit, txnsAfterSave, original } = await savedVisit()
    expect([await stock(PARACETAMOL), await stock(GAUZE)]).toEqual([8, 38])
    await updateVisit(visit.id, {
      ...patchOf(visit),
      itemsGiven: [{ itemId: PARACETAMOL, quantity: 1 }, { itemId: CETIRIZINE, quantity: 2 }],
    })
    expect([await stock(PARACETAMOL), await stock(GAUZE), await stock(CETIRIZINE)]).toEqual([11, 40, 7])
    const added = transactions().slice(txnsAfterSave)
    expect(added.map((t) => [t.type, t.itemId, t.quantity, t.reason, t.visitId, t.studentId])).toEqual([
      ['adjustment', PARACETAMOL, 3, 'visit_edited', visit.id, 'student-0001'],
      ['adjustment', GAUZE, 2, 'visit_edited', visit.id, 'student-0001'],
      ['adjustment', CETIRIZINE, -2, 'visit_edited', visit.id, 'student-0001'],
    ])
    // Past transactions are never rewritten.
    expect(transactions().slice(0, txnsAfterSave)).toEqual(original)
    const audits = getRecordedAuditEntries().slice(-4)
    expect(audits.map((e) => [e.targetRecord?.type, e.summary])).toEqual([
      ['inventory-adjustment', 'Visit edited'],
      ['inventory-adjustment', 'Visit edited'],
      ['inventory-adjustment', 'Visit edited'],
      ['visit', 'Updated medicines and supplies'],
    ])
  })

  it('returns edited visit stock to the batches it was originally taken from', async () => {
    await restockInventoryItem(PARACETAMOL, 8, '2099-12-31')
    const { visit } = await newVisit([{ itemId: PARACETAMOL, quantity: 14 }])
    const saved = (await getVisit(visit.id)).itemsGiven[0]
    expect(saved.batchAllocations).toMatchObject([{ quantity: 12 }, { quantity: 2 }])

    await updateVisit(visit.id, { ...patchOf(visit), itemsGiven: [{ itemId: PARACETAMOL, quantity: 12 }] })
    const item = await getInventoryItem(PARACETAMOL)
    expect(item.batches.find((batch) => batch.expirationDate === '2099-12-31')?.quantity).toBe(8)
  })

  it('applies the expired rule only to added or increased quantity', async () => {
    const { visit } = await savedVisit()
    // Make an item on the visit expire after it was given.
    db().inventoryItems.find((i) => i.id === GAUZE)!.batches[0].expirationDate = '2000-01-01'
    const lines = (gauze: number) => ({ ...patchOf(visit), itemsGiven: [{ itemId: PARACETAMOL, quantity: 4 }, { itemId: GAUZE, quantity: gauze }] })
    await expect(updateVisit(visit.id, lines(3))).rejects.toThrow(/expired/)
    expect((await getInventoryItem(GAUZE)).expiredStock).toBe(38)
    await expect(updateVisit(visit.id, lines(2))).resolves.toBeTruthy()
    await expect(updateVisit(visit.id, lines(1))).resolves.toBeTruthy()
    expect((await getInventoryItem(GAUZE)).expiredStock).toBe(39)
  })

  it('leaves stock alone when only instructions change', async () => {
    const { visit, txnsAfterSave } = await savedVisit()
    await updateVisit(visit.id, {
      ...patchOf(visit),
      itemsGiven: [{ itemId: PARACETAMOL, quantity: 4, instructions: 'After meals' }, { itemId: GAUZE, quantity: 2 }],
    })
    expect(transactions().length).toBe(txnsAfterSave)
    expect((await getVisit(visit.id)).itemsGiven[0].instructions).toBe('After meals')
  })
})

describe('Adjust Stock', () => {
  beforeEach(() => resetMockDb())

  it('requires a reason, and a note for "Other"', async () => {
    await expect(adjustInventoryStock(GAUZE, { change: -1, reason: '' as never })).rejects.toThrow(/reason/)
    await expect(adjustInventoryStock(GAUZE, { change: -1, reason: 'visit_edited' as never })).rejects.toThrow(/reason/)
    await expect(adjustInventoryStock(GAUZE, { change: -1, reason: 'other', note: ' ' })).rejects.toThrow(/note/)
    await expect(adjustInventoryStock(GAUZE, { change: -1, reason: 'other', note: 'Used for demo' })).resolves.toBeTruthy()
  })

  it('never goes below 0', async () => {
    await expect(adjustInventoryStock(GAUZE, { change: -41, reason: 'damaged_spilled' })).rejects.toThrow(/below 0/)
    await expect(adjustInventoryStock(GAUZE, { countedQuantity: -1, reason: 'miscount_correction' })).rejects.toThrow()
    expect(await stock(GAUZE)).toBe(40)
    expect(getRecordedAuditEntries()).toEqual([])
  })

  it('disposes of an expired batch and records the adjustment, leaving the expiry date for Restock', async () => {
    const before = await getInventoryItem(ORS)
    const after = await adjustInventoryStock(ORS, { countedQuantity: 0, reason: 'expired_disposed' })
    expect(after.currentStock).toBe(0)
    expect(after.expirationDate).toBe(before.expirationDate)
    expect(after.flags).toContain('low_stock')
    expect(transactions().at(-1)).toMatchObject({ type: 'adjustment', itemId: ORS, quantity: -25, reason: 'expired_disposed', studentId: null, visitId: null })
    expect(getRecordedAuditEntries().at(-1)).toMatchObject({ actionType: 'submit', targetRecord: { type: 'inventory-adjustment' }, summary: 'Expired - disposed' })
    const restocked = await restockInventoryItem(ORS, 30, '2099-12-31')
    expect(restocked.flags).not.toContain('expired')
  })
})

describe('Edit Item', () => {
  beforeEach(() => resetMockDb())

  it("can't change stock or the expiration date", async () => {
    const item = await getInventoryItem(GAUZE)
    await saveInventoryItem({ ...item, currentStock: 999, expirationDate: '2099-01-01', lowStockThreshold: 10 }, { itemId: GAUZE })
    expect(await getInventoryItem(GAUZE)).toMatchObject({ currentStock: 40, expirationDate: null, lowStockThreshold: 10 })
  })
})

describe('incident Stage 2', () => {
  beforeEach(() => resetMockDb())

  it('refuses an empty Stage 2: no notes, medicine, notification, referral or reason (panel review IN-3)', async () => {
    const student = await getStudent('student-0001')
    const stageOne = await saveIncidentStageOne({ studentId: student.id, complaint: 'Fall injury', vitals: { temperatureC: 36.8 } })
    await expect(
      completeIncidentStageTwo({
        incidentId: stageOne.id,
        complaint: 'Fall injury',
        vitals: { temperatureC: 36.8, treatmentNotes: '' },
        hospitalReferral: null,
        newParentNotifications: [],
        followUp: null,
        itemsGiven: [],
      }),
    ).rejects.toThrow(/nothing further was needed or done/i)
    expect((await getIncident(stageOne.id)).stage).toBe(1)
  })

  it('accepts no treatment notes and no medicine lines when nothing further was needed', async () => {
    const student = await getStudent('student-0001')
    const stageOne = await saveIncidentStageOne({ studentId: student.id, complaint: 'Fall injury', vitals: { temperatureC: 36.8 } })

    const { incident } = await completeIncidentStageTwo({
      incidentId: stageOne.id,
      complaint: 'Fall injury',
      vitals: { temperatureC: 36.8, bloodPressure: '110/70', oxygenSaturation: '98%', treatmentNotes: '' },
      hospitalReferral: null,
      newParentNotifications: [],
      followUp: null,
      itemsGiven: [],
      noFurtherActionReason: 'Observed only',
    })

    expect(incident).toMatchObject({ stage: 2, itemsGiven: [], vitals: { treatmentNotes: '' }, noFurtherActionReason: 'Observed only' })
  })

  it('dispenses its lines with transactions that reference the incident, and fixes them once complete', async () => {
    const student = await getStudent('student-0001')
    const stageOne = await saveIncidentStageOne({ studentId: student.id, complaint: 'Fall injury', vitals: { temperatureC: 36.8 } })
    expect(stageOne.itemsGiven).toEqual([])
    const input = {
      incidentId: stageOne.id,
      complaint: 'Fall injury',
      vitals: { temperatureC: 36.8 },
      hospitalReferral: null,
      newParentNotifications: [],
      followUp: null,
      itemsGiven: [{ itemId: GAUZE, quantity: 2 }],
    }
    const { incident } = await completeIncidentStageTwo(input)
    expect(incident.itemsGiven).toMatchObject([{ itemId: GAUZE, itemName: 'Gauze Pads', quantity: 2 }])
    expect(transactions().at(-1)).toMatchObject({ type: 'dispense', itemId: GAUZE, quantity: 2, studentId: 'student-0001', visitId: null, incidentId: stageOne.id })
    expect(await stock(GAUZE)).toBe(38)
    await expect(completeIncidentStageTwo({ ...input, itemsGiven: [{ itemId: GAUZE, quantity: 3 }] })).rejects.toThrow(/completed incident/)
    await expect(completeIncidentStageTwo(input)).resolves.toBeTruthy()
    expect(await stock(GAUZE)).toBe(38)
  })

  it('rejects an expired item at Stage 2 and saves nothing', async () => {
    const student = await getStudent('student-0001')
    const stageOne = await saveIncidentStageOne({ studentId: student.id, complaint: 'Fall injury', vitals: {} })
    await expect(
      completeIncidentStageTwo({ incidentId: stageOne.id, complaint: 'Fall injury', vitals: {}, hospitalReferral: null, newParentNotifications: [], followUp: null, itemsGiven: [{ itemId: ORS, quantity: 1 }] }),
    ).rejects.toThrow(/expired/)
    expect(db().incidents.find((i) => i.id === stageOne.id)?.stage).toBe(1)
  })
})

describe('the monthly report’s medicines and supplies given', () => {
  beforeEach(() => resetMockDb())

  it('totals each item’s dispenses minus what visit edits returned, from the stock movements', async () => {
    const month = new Date().toISOString().slice(0, 7)
    const given = async () =>
      (await getMonthlyReport(month)).itemsGiven.find((row) => row.itemName === 'Gauze Pads')?.quantity ?? 0
    const before = await given()
    const { visit } = await newVisit([{ itemId: GAUZE, quantity: 5 }])
    expect(await given()).toBe(before + 5)
    await updateVisit(visit.id, { complaint: 'Headache', treatment: '', disposition: 'returned_to_class', eventTag: null, itemsGiven: [{ itemId: GAUZE, quantity: 2, instructions: '' }] })
    expect(await given()).toBe(before + 2)
  })
})
