import type { DashboardSummary } from '../../../types/dashboard'

/**
 * The Overview tab's number: urgent items only (panel review DB-4): expired stock, overdue follow-ups
 * and incidents still awaiting Stage 2, plus a backup that needs attention. Low stock, expiring soon, incomplete records and frequent
 * visitors stay in their own chips and lists; adding unlike things gave a meaningless sum.
 */
export function urgentCount(summary: Pick<DashboardSummary, 'inventoryAlerts' | 'dueFollowUps' | 'counts' | 'backupAlert'>): number {
  return (
    summary.inventoryAlerts.filter((row) => row.flags.includes('expired')).length +
    summary.dueFollowUps.filter((row) => row.daysFromToday < 0).length +
    summary.counts.incidentsAwaitingStage2 +
    // A stale, failed or missing backup (panel review part 6).
    (summary.backupAlert ? 1 : 0)
  )
}
