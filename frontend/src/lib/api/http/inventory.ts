import {
  StockRuleError,
  type DispenseResult,
  type InventoryHistoryRow,
  type InventoryInput,
  type InventoryItemView,
  type InventoryMovementRow,
  type InventoryTransaction,
  type StockAdjustmentInput,
} from '../../mock-db'
import type { InventoryCategory, InventoryItem, ISODate } from '../../../types/entities'
import { http } from '../client'
import { mapped, type ErrorMap } from '../errors'

/**
 * INVENTORY in API mode (S5; API-Contract.md "Inventory"). The server owns the batches, oldest
 * first, and decides stock; a dispense below zero warns and is not blocked (ADR-018). Every refusal
 * reaches the screens as the mock's `StockRuleError`, which they show in place.
 *
 * "Commonly used for" (ADR-071): the screens keep the symptom labels; the API stores complaint-type
 * ids (backend B8 decision (a)). The adapter maps labels to ids on a save and ids to labels on a read.
 */

const STOCK_ERRORS: ErrorMap = { validation: (message) => new StockRuleError(message) }

interface ComplaintOption {
  id: string
  label: string
}

/** The visit symptom options, read once per call (a short list). */
function complaintOptions(): Promise<ComplaintOption[]> {
  return http.get('/reference/visit-complaint-types')
}

async function withLabels<T extends { usedFor?: string[] }>(items: T[]): Promise<T[]> {
  if (!items.some((item) => item.usedFor?.length)) return items
  const labels = new Map((await complaintOptions()).map((o) => [o.id, o.label]))
  return items.map((item) =>
    item.usedFor ? { ...item, usedFor: item.usedFor.map((id) => labels.get(id) ?? id) } : item,
  )
}

async function withLabel<T extends { usedFor?: string[] }>(item: T): Promise<T> {
  return (await withLabels([item]))[0]
}

/** Labels to ids; a label with no option is sent as typed, and the server refuses it with its message. */
async function usedForIds(usedFor: string[] | undefined): Promise<string[] | undefined> {
  if (usedFor === undefined) return undefined
  const ids = new Map((await complaintOptions()).map((o) => [o.label.toLowerCase(), o.id]))
  // The form sends the empty "Other" box as ""; the mock drops blanks, and so does this.
  return blanksOut(usedFor).map((label) => ids.get(label.toLowerCase()) ?? label)
}

function blanksOut(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean)
}

export async function listInventory(
  query: {
    search?: string
    category?: InventoryCategory | ''
    hasExpiredStock?: boolean
    attention?: '' | 'low_stock' | 'expiry'
  } = {},
): Promise<InventoryItemView[]> {
  const items = await http.get<InventoryItemView[]>('/inventory', {
    query: {
      search: query.search,
      category: query.category,
      hasExpiredStock: query.hasExpiredStock ? 1 : undefined,
      attention: query.attention,
    },
  })
  return withLabels(items)
}

export async function getInventoryItem(id: string): Promise<InventoryItemView> {
  return withLabel(await http.get<InventoryItemView>(`/inventory/${encodeURIComponent(id)}`))
}

export async function saveInventoryItem(
  input: InventoryInput,
  options: { itemId?: string } = {},
): Promise<InventoryItem> {
  const body = {
    ...input,
    avoidIfAllergicTo: input.avoidIfAllergicTo && blanksOut(input.avoidIfAllergicTo),
    usedFor: await usedForIds(input.usedFor),
  }
  const save = options.itemId
    ? http.put<InventoryItem>(`/inventory/${encodeURIComponent(options.itemId)}`, body)
    : http.post<InventoryItem>('/inventory', body)
  return withLabel(await mapped(save, STOCK_ERRORS))
}

export function listInventoryHistory(itemId: string): Promise<InventoryHistoryRow[]> {
  return http.get(`/inventory/${encodeURIComponent(itemId)}/history`)
}

export function listInventoryMovements(
  query: {
    from?: ISODate
    to?: ISODate
    itemId?: string
    type?: InventoryTransaction['type'] | ''
  } = {},
): Promise<InventoryMovementRow[]> {
  return http.get('/inventory/movements', {
    query: { from: query.from, to: query.to, itemId: query.itemId, type: query.type },
  })
}

export function dispenseInventoryItem(
  itemId: string,
  quantity: number,
  link: { studentId?: string; personnelId?: string; visitId?: string } = {},
): Promise<DispenseResult> {
  return mapped(
    http.post(`/inventory/${encodeURIComponent(itemId)}/dispense`, { quantity, ...link }),
    STOCK_ERRORS,
  )
}

export async function restockInventoryItem(
  itemId: string,
  quantity: number,
  expirationDate: ISODate | null,
  options: { noExpirationConfirmed?: boolean } = {},
): Promise<InventoryItemView> {
  const item = await mapped(
    http.post<InventoryItemView>(`/inventory/${encodeURIComponent(itemId)}/restock`, {
      quantity,
      expirationDate,
      noExpirationConfirmed: Boolean(options.noExpirationConfirmed),
    }),
    STOCK_ERRORS,
  )
  return withLabel(item)
}

export async function adjustInventoryStock(
  itemId: string,
  input: StockAdjustmentInput,
): Promise<InventoryItemView> {
  const item = await mapped(
    http.post<InventoryItemView>(`/inventory/${encodeURIComponent(itemId)}/adjust`, input),
    STOCK_ERRORS,
  )
  return withLabel(item)
}
