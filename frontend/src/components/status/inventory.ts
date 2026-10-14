import type { StatusMap } from '../ui/StatusBadge'

/**
 * Inventory alert flags (Module 8). Low stock and nearing expiration are independent and can both
 * be active on one item. They're always shown as separate badges, never merged into one generic
 * "attention" badge.
 */
export type InventoryFlag = 'low_stock' | 'nearing_expiration' | 'expired'

export const inventoryFlagMap: StatusMap<InventoryFlag> = {
  low_stock: { label: 'Low stock', tone: 'warning', icon: 'package', variant: 'soft' },
  nearing_expiration: {
    label: 'Nearing expiration',
    tone: 'warning',
    icon: 'clock',
    variant: 'soft',
  },
  expired: { label: 'Expired', tone: 'error', icon: 'alertOctagon', variant: 'soft' },
}

/**
 * An item's quantity as text. An expired item's stock is still on the shelf until someone disposes of
 * it through Adjust Stock, but it can't be given out (ADR-018), so it never reads as available stock.
 * The stored count is unchanged.
 */
export function stockQuantityText(
  quantity: number,
  unit: string,
  flags: ReadonlyArray<InventoryFlag>,
): string {
  return flags.includes('expired') ? `${quantity} ${unit} (expired)` : `${quantity} ${unit}`
}
