import { formatDate, formatShortDate } from '../../../lib/dates'
import type { DueFollowUpRow, InventoryAlertRow } from '../../../types/dashboard'

/** Alert-row wording shared by the Overview lists and the Dashboard printout. */

export function dueText(row: DueFollowUpRow): string {
  const date = formatDate(row.followUp.followUpDate)
  if (row.daysFromToday < 0) {
    const n = -row.daysFromToday
    return `${date} (${n} ${n === 1 ? 'day' : 'days'} ago)`
  }
  if (row.daysFromToday === 0) return `${date} (today)`
  return `${date} (in ${row.daysFromToday} ${row.daysFromToday === 1 ? 'day' : 'days'})`
}

export function expiryLabel(row: InventoryAlertRow): string | undefined {
  if (row.daysUntilExpiry === null) return undefined
  const n = Math.abs(row.daysUntilExpiry)
  const days = `${n} ${n === 1 ? 'day' : 'days'}`
  if (row.daysUntilExpiry < 0) return `Expired ${days} ago`
  if (row.daysUntilExpiry === 0) return 'Expires today'
  return `Expires in ${days}`
}

/** "Oct 28 · 4 days ago", "Today", "Nov 3 · in 2 days", for the printout's grouped follow-ups. */
export function followUpWhen(row: DueFollowUpRow): string {
  const n = Math.abs(row.daysFromToday)
  if (n === 0) return 'Today'
  const days = `${n} ${n === 1 ? 'day' : 'days'}`
  return `${formatShortDate(row.followUp.followUpDate)} · ${row.daysFromToday < 0 ? `${days} ago` : `in ${days}`}`
}

/** "Expired 4 days ago", "Low · expires in 11 days", "Expires in 18 days", "Low". */
export function stockStatus(row: InventoryAlertRow): string {
  const expiry = expiryLabel(row)
  if (row.flags.includes('expired')) return expiry ?? 'Expired'
  if (!row.flags.includes('low_stock')) return expiry ?? ''
  return expiry ? `Low · ${expiry.toLowerCase()}` : 'Low'
}
