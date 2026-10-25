import {
  adjustInventoryStock as adjustInLayer,
  dispenseInventoryItem as dispenseInLayer,
  getInventoryItem,
  listInventoryHistory,
  getMockToday,
  getStudent,
  listInventory,
  listVisits,
  restockInventoryItem as restockInLayer,
  saveInventoryItem as saveInLayer,
  searchStudents,
  type DispenseResult,
  type InventoryItemView,
  type InventoryHistoryRow,
  type SessionUser,
  type StockAdjustmentInput,
} from '../../../lib/mock-db'
import type { InventoryCategory, InventoryItem, ItemBrand, Student, StudentSearchResult, Visit } from '../../../types/entities'

/**
 * Inventory (#28–#30). Low-stock, nearing-expiration, expired, and below-zero states are computed
 * by the data layer on every read (`InventoryItemView`), never stored and never recomputed here, so
 * the list, the dispense form, and the Dashboard's alerts always agree.
 */
export type { InventoryItemView, InventoryHistoryRow, StockAdjustmentInput }

export interface InventoryFilters {
  search: string
  category: '' | InventoryCategory
  hasExpiredStock?: boolean
  attention?: '' | 'low_stock' | 'expiry'
}

export interface InventoryFormValues {
  name: string
  category: InventoryCategory
  currentStock: string
  unit: string
  expirationDate: string
  lowStockThreshold: string
  /** Add Item only (ADR-035): an explicit confirmation; an empty date alone is never this choice. */
  noExpirationConfirmed: boolean
  /** '' is "Not specified" (Sir Rey, October 25, 2026). */
  brand: '' | ItemBrand
}

export interface InventoryFormContext {
  item: InventoryItemView | null
  /** Every item, for the duplicate-name warning and the unit suggestions (panel review IV-3). */
  items: InventoryItemView[]
}

/** "Paracetamol 500mg Tablets " and "paracetamol 500 mg tablet" compare equal: case, spacing and a trailing "s" are ignored. */
function sameText(a: string, b: string) {
  const norm = (value: string) => value.toLowerCase().replace(/\s+/g, '').replace(/s$/, '')
  return norm(a) === norm(b)
}

/** An existing item with the same name and unit, if any (never the item being edited). A warning only. */
export function findDuplicateItem(items: InventoryItemView[], name: string, unit: string, exceptId?: string): InventoryItemView | null {
  if (!name.trim() || !unit.trim()) return null
  return items.find((item) => item.id !== exceptId && sameText(item.name, name) && sameText(item.unit, unit)) ?? null
}

/** The units already in use, for the free-text unit field's suggestions (D9). */
export function unitSuggestions(items: InventoryItemView[]): string[] {
  return [...new Set(items.map((item) => item.unit.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export interface RestockValues {
  expirationDate: string
  /** A clinician's explicit confirmation; an empty date alone is never treated as this choice. */
  noExpirationConfirmed: boolean
}

export function fetchInventory(filters: InventoryFilters): Promise<InventoryItemView[]> {
  return listInventory(filters)
}

export function fetchInventoryHistory(itemId: string): Promise<InventoryHistoryRow[]> {
  return listInventoryHistory(itemId)
}

export async function fetchInventoryForm(itemId?: string): Promise<InventoryFormContext> {
  const [item, items] = await Promise.all([itemId ? getInventoryItem(itemId) : null, listInventory()])
  return { item, items }
}

export function saveInventoryItem(
  values: InventoryFormValues,
  options: { itemId?: string; actor?: SessionUser },
): Promise<InventoryItem> {
  return saveInLayer(
    {
      name: values.name.trim(),
      category: values.category,
      currentStock: Number(values.currentStock),
      unit: values.unit.trim(),
      expirationDate: values.expirationDate || null,
      lowStockThreshold: Number(values.lowStockThreshold),
      noExpirationConfirmed: values.noExpirationConfirmed,
      brand: values.brand || null,
    },
    options,
  )
}

/** Decrements stock; going below zero warns but never blocks recording care (Module 8). */
export function dispenseInventoryItem(
  itemId: string,
  quantity: number,
  studentId?: string,
  actor?: SessionUser,
): Promise<DispenseResult> {
  return dispenseInLayer(itemId, quantity, { studentId }, actor)
}

/** Adjust Stock (ADR-018): a signed change or a counted quantity, with a required reason. */
export function adjustStock(itemId: string, input: StockAdjustmentInput, actor?: SessionUser): Promise<InventoryItemView> {
  return adjustInLayer(itemId, input, actor)
}

/** Restock: adds the quantity received and requires either its expiry date or an explicit no-expiry confirmation. */
export function restockItem(itemId: string, quantity: number, values: RestockValues, actor?: SessionUser): Promise<InventoryItemView> {
  return restockInLayer(itemId, quantity, values.expirationDate || null, {
    noExpirationConfirmed: values.noExpirationConfirmed,
    actor,
  })
}

/** The student a standalone dispense is for, plus any visit they already have today. */
export async function findDispenseStudent(studentId: string): Promise<{ student: Student; todaysVisit: Visit | null }> {
  const student = await getStudent(studentId)
  const today = getMockToday()
  const visits = await listVisits({ from: today, to: today })
  return { student, todaysVisit: visits.find((visit) => visit.studentId === student.id) ?? null }
}

/** the Dispense student search: LRN prefix or name, active students, at most 8. */
export function searchDispenseStudents(query: string): Promise<StudentSearchResult[]> {
  return searchStudents(query)
}
