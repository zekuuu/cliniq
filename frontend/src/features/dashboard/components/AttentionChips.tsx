import { Link } from 'react-router'
import { Icon } from '../../../components'
import { paths } from '../../../routes/paths'
import type { DashboardSummary } from '../../../types/dashboard'

type ChipTone = 'neutral' | 'warning' | 'error'
// The same fills as the StatCard, so the same data keeps its colour (ADR-062).
const chipTone: Record<ChipTone, string> = { neutral: 'bg-background', warning: 'bg-warning-fill', error: 'bg-error-fill' }

function CountChip({ label, count, tone, to, canNavigate }: { label: string; count: number; tone: ChipTone; to: string; canNavigate: boolean }) {
  const content = <><Icon name="alertTriangle" size={16} />{count} {label}</>
  const className = `inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-text-primary ${chipTone[tone]}`
  return canNavigate ? <Link to={to} className={`${className} cursor-pointer shadow-clickable transition-shadow hover:shadow-overlay motion-reduce:transition-none`}>{content}</Link> : <span className={className}>{content}</span>
}

/** A chip that states its alert in words instead of a count. */
function CountChipText({ text, to, canNavigate }: { text: string; to: string; canNavigate: boolean }) {
  const content = <><Icon name="alertTriangle" size={16} />{text}</>
  const className = 'inline-flex min-h-10 items-center gap-2 rounded-md border border-warning bg-warning-fill px-3 text-sm font-semibold text-text-primary'
  return canNavigate ? <Link to={to} className={`${className} cursor-pointer shadow-clickable transition-shadow hover:shadow-overlay motion-reduce:transition-none`}>{content}</Link> : <span className={className}>{content}</span>
}

/** Compact links keep inventory and incomplete-record work discoverable without crowding the summary. */
export function AttentionChips({ summary, canNavigate }: { summary: DashboardSummary; canNavigate: boolean }) {
  const expiredOrExpiring = summary.inventoryAlerts.filter((row) => row.flags.some((flag) => flag !== 'low_stock')).length
  return (
    <section aria-label="More items needing attention" className="flex flex-wrap gap-2">
      <CountChip label="incomplete student records" count={summary.counts.pendingRecords} tone="neutral" to={paths.incompleteRecords} canNavigate={canNavigate} />
      <CountChip label="low stock" count={summary.counts.lowStockItems} tone="warning" to={`${paths.inventory}?attention=low_stock`} canNavigate={canNavigate} />
      <CountChip label="expired or expiring" count={expiredOrExpiring} tone="error" to={`${paths.inventory}?attention=expiry`} canNavigate={canNavigate} />
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
    </section>
  )
}
