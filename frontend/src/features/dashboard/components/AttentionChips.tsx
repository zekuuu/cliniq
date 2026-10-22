import { Link } from 'react-router'
import { Icon } from '../../../components'
import { paths } from '../../../routes/paths'
import type { DashboardSummary } from '../../../types/dashboard'

function CountChip({ label, count, to, canNavigate }: { label: string; count: number; to: string; canNavigate: boolean }) {
  const content = <><Icon name="alertTriangle" size={16} />{count} {label}</>
  const className = 'inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-semibold text-text-primary'
  return canNavigate ? <Link to={to} className={`${className} cursor-pointer hover:bg-background`}>{content}</Link> : <span className={className}>{content}</span>
}

/** A chip that states its alert in words instead of a count. */
function CountChipText({ text, to, canNavigate }: { text: string; to: string; canNavigate: boolean }) {
  const content = <><Icon name="alertTriangle" size={16} />{text}</>
  const className = 'inline-flex min-h-10 items-center gap-2 rounded-md border border-warning bg-warning/10 px-3 text-sm font-semibold text-text-primary'
  return canNavigate ? <Link to={to} className={`${className} cursor-pointer hover:bg-warning/20`}>{content}</Link> : <span className={className}>{content}</span>
}

/** Compact links keep inventory and incomplete-record work discoverable without crowding the summary. */
export function AttentionChips({ summary, canNavigate }: { summary: DashboardSummary; canNavigate: boolean }) {
  const expiredOrExpiring = summary.inventoryAlerts.filter((row) => row.flags.some((flag) => flag !== 'low_stock')).length
  return (
    <section aria-label="More items needing attention" className="flex flex-wrap gap-2">
      <CountChip label="low stock" count={summary.counts.lowStockItems} to={`${paths.inventory}?attention=low_stock`} canNavigate={canNavigate} />
      <CountChip label="expired or expiring" count={expiredOrExpiring} to={`${paths.inventory}?attention=expiry`} canNavigate={canNavigate} />
      <CountChip label="incomplete records" count={summary.counts.pendingRecords} to={paths.incompleteRecords} canNavigate={canNavigate} />
      {/* Panel review BK-2: both roles. */}
      {summary.backupAlert && (
        <CountChipText
          to={paths.backup}
          canNavigate
          text={
            summary.backupAlert.kind === 'never'
              ? 'No successful backup yet'
              : summary.backupAlert.kind === 'failed'
                ? 'The latest backup failed'
                : `Last backup was more than ${summary.backupAlert.staleAfterHours} hours ago`
          }
        />
      )}
      {/* Panel review VS-1: today's "Resting in clinic" visits with no Time out. The list shows masked LRNs (ADR-004). */}
      {summary.counts.inClinicNow > 0 && (
        <CountChip label="in clinic now" count={summary.counts.inClinicNow} to={`${paths.visits}?inClinic=1`} canNavigate={canNavigate} />
      )}
    </section>
  )
}
