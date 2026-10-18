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
import type { InventoryCategory, InventoryItem, Student, StudentSearchResult, Visit } from '../../../types/entities'

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
}

export interface InventoryFormContext {
  item: InventoryItemView | null
}

export function fetchInventory(filters: InventoryFilters): Promise<InventoryItemView[]> {
  return listInventory(filters)
}

export function fetchInventoryHistory(itemId: string): Promise<InventoryHistoryRow[]> {
  return listInventoryHistory(itemId)
}

export async function fetchInventoryForm(itemId?: string): Promise<InventoryFormContext> {
  return { item: itemId ? await getInventoryItem(itemId) : null }
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
    },
    options,
  )
}

/** Decrements stock; going below zero warns but never blocks recording care (Module 8). */
export function dispenseInventoryItem(
  itemId: string,
  quantity: number,
  studentNumber?: string,
  actor?: SessionUser,
): Promise<DispenseResult> {
  return dispenseInLayer(itemId, quantity, { studentNumber }, actor)
}

/** Adjust Stock (ADR-018): a signed change or a counted quantity, with a required reason. */
export function adjustStock(itemId: string, input: StockAdjustmentInput, actor?: SessionUser): Promise<InventoryItemView> {
  return adjustInLayer(itemId, input, actor)
}

/** Restock: adds the quantity received and confirms the expiration date (the only way it changes). */
export function restockItem(itemId: string, quantity: number, expirationDate: string, actor?: SessionUser): Promise<InventoryItemView> {
  return restockInLayer(itemId, quantity, expirationDate || null, actor)
}

/** The student a standalone dispense is for, plus any visit they already have today. */
export async function findDispenseStudent(studentNumber: string): Promise<{ student: Student; todaysVisit: Visit | null }> {
  const student = await getStudent(studentNumber)
  const today = getMockToday()
  const visits = await listVisits({ from: today, to: today })
  return { student, todaysVisit: visits.find((visit) => visit.studentId === student.id) ?? null }
}

/** the Dispense student search: Student Number prefix or name, active students, at most 8. */
export function searchDispenseStudents(query: string): Promise<StudentSearchResult[]> {
  return searchStudents(query)
}
