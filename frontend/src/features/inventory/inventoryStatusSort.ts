import type { InventoryItemView } from './api/inventoryApi'

/** Staff attention order: critical issues, then expiring stock, low stock, and normal items. */
export function inventoryStatusSortValue(item: InventoryItemView): number {
  if (item.currentStock <= 0 || item.flags.includes('expired')) return 0
  if (item.flags.includes('nearing_expiration')) return 1
  if (item.flags.includes('low_stock')) return 2
  return 3
}
