import { formatDate } from '../../../lib/dates'
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
