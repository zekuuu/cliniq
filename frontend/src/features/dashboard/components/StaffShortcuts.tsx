import { Link } from 'react-router'
import { Badge, buttonClassName, Icon, Skeleton, type BadgeTone } from '../../../components'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { cn } from '../../../lib/cn'
import { formatDateTime } from '../../../lib/dates'
import { paths } from '../../../routes/paths'
import { fetchBackupIndicator, type BackupIndicator } from '../api/dashboardApi'

function backupState(backup: BackupIndicator): { tone: BadgeTone; label: string } {
  if (!backup.latest) return { tone: 'warning', label: 'No backup yet' }
  if (backup.latest.status === 'failed') return { tone: 'error', label: 'Backup failed' }
  return backup.needsVerification
    ? { tone: 'warning', label: 'Needs verification' }
    : { tone: 'success', label: 'Verified' }
}

/*
 * Staff-only Dashboard shortcuts (Screen Inventory #4, Reference 1): a minimal backup-status
 * indicator linking to the full Backup screen, and the quick "New Visit" action. Both are
 * navigation, not mutations, so the Dashboard stays view-only (ADR-011). Admin/Principal can open
 * neither destination, so neither is rendered for that role. The indicator sits in the header's
 * action group, above Print; New Visit sits on the view-tab row.
 */

/**
 * Outlined, button-shaped link: status badge plus the last backup's short date (the full date and
 * time are in its name) and a chevron, so it reads as clickable.
 */
export function BackupStatusLink() {
  const { data: backup, status } = useAsyncData('dashboard-backup', fetchBackupIndicator)
  const state = backup ? backupState(backup) : null
  const lastRun = backup?.latest ? formatDateTime(backup.latest.lastRun) : null

  return (
    <Link
      to={paths.backup}
      aria-label={
        state
          ? `Backup status: ${state.label}. ${lastRun ? `Last backup ${lastRun}` : 'No backup has run yet'}. Open Backup.`
          : 'Backup status. Open Backup.'
      }
      className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm shadow-card transition-colors hover:bg-surface motion-reduce:transition-none print:hidden"
    >
      {/* Wraps only between whole parts on narrow screens, so "Oct 14" never splits. */}
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="flex items-center gap-1.5 font-semibold text-text-primary">
          <Icon name="shieldPlus" className="text-brand-green-dark" />
          Backup
        </span>
        {status === 'error' ? (
          <span className="text-text-secondary">Status unavailable</span>
        ) : !state ? (
          <Skeleton className="h-5 w-40" />
        ) : (
          <>
            <Badge tone={state.tone} variant="soft">
              {state.label}
            </Badge>
            {/* "Oct 14": the date part of the display format, in Philippine time. */}
            {lastRun && (
              <span className="whitespace-nowrap text-text-secondary">{lastRun.split(',')[0]}</span>
            )}
          </>
        )}
      </span>
      {/* Marks it as a link to the Backup screen, not a status label. */}
      <Icon name="chevronRight" size={16} className="ml-auto shrink-0 text-text-secondary" />
    </Link>
  )
}

export function NewVisitLink({ className }: { className?: string }) {
  return (
    <Link to={paths.visitNew()} className={cn(buttonClassName({ variant: 'primary' }), className)}>
      <Icon name="stethoscope" />
      New Visit
    </Link>
  )
}
