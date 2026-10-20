import { Link, useLocation } from 'react-router'
import { Icon } from '../components'
import { fetchBackupStatus } from '../features/backup/api/backupApi'
import { useAsyncData } from '../hooks/useAsyncData'
import { cn } from '../lib/cn'
import { navGroupsFor, type NavKey } from './navigation'
import type { SessionUser } from '../lib/mock-db'
import { paths } from '../routes/paths'
import { APP_VERSION } from '../config/appVersion'

function navGroupId(label: string): string {
  return `nav-group-${label.toLowerCase().replace(/\s+/g, '-')}`
}

export function BrandLogo({
  compact = false,
  showAttribution = false,
}: {
  compact?: boolean
  showAttribution?: boolean
}) {
  return (
    <span className="flex items-center gap-2.5">
      <img
        src="/Healware_Logo.png"
        alt="Healware logo"
        className="size-9 shrink-0 object-contain"
      />
      <span className={cn('flex flex-col leading-tight', compact && 'max-sm:hidden')}>
        <span className="text-xl font-bold tracking-tight text-brand-green-dark">CLINIQ</span>
        <span className="text-xs leading-tight font-medium tracking-tight whitespace-nowrap text-text-secondary">
          Mendez Christian Academy
        </span>
        {showAttribution && (
          <span className="text-xs text-text-secondary">Powered by HealWare™</span>
        )}
      </span>
    </span>
  )
}

interface SidebarProps {
  active: NavKey | null
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  onReportIssue: () => void
  user: SessionUser
}

export function Sidebar({
  active,
  collapsed,
  onCollapsedChange,
  onReportIssue,
  user,
}: SidebarProps) {
  const { data: backup } = useAsyncData('sidebar-backup-status', () =>
    user.role === 'staff' ? fetchBackupStatus() : Promise.resolve(null),
  )
  const backupNeedsAttention = Boolean(
    backup && (!backup.latest || backup.latest.status === 'failed' || backup.needsVerification),
  )
  // The workstation has no QR scanner, so camera-only items stay in the phone menu.
  const groups = navGroupsFor(user.role)
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.mobileOnly) }))
    .filter((group) => group.items.length > 0)
  const labelVisibility = collapsed ? 'sr-only' : ''
  const location = useLocation()
  const privacyPolicyActive = location.pathname === paths.privacyPolicy

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen w-full flex-col border-r border-border bg-background pt-5 pb-2 lg:flex print:hidden',
        collapsed ? 'items-center gap-5 px-3' : 'gap-6 px-4',
      )}
    >
      <div
        className={cn(
          'flex w-full items-center',
          collapsed ? 'justify-center' : 'justify-between pl-2 pr-0',
        )}
      >
        {collapsed ? (
          <button
            type="button"
            aria-label="Expand sidebar"
            aria-expanded="false"
            onClick={() => onCollapsedChange(false)}
            className="group relative flex size-10 cursor-pointer items-center justify-center rounded-md text-brand-green-dark transition-colors duration-150 hover:text-text-primary focus-visible:outline-brand-green-dark motion-reduce:transition-none"
          >
            {/* Logo and hamburger are stacked and crossfaded, so hover never snaps between them. */}
            <span
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-200 ease-out group-hover:scale-75 group-hover:opacity-0 group-focus-visible:scale-75 group-focus-visible:opacity-0 motion-reduce:transition-none"
            >
              <img src="/Healware_Logo.png" alt="" className="size-9 object-contain" />
            </span>
            <span
              aria-hidden="true"
              className="absolute inset-0 flex scale-75 items-center justify-center opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
            >
              <Icon name="menu" size={20} />
            </span>
          </button>
        ) : (
          <>
            <BrandLogo showAttribution />
            <button
              type="button"
              aria-label="Collapse sidebar"
              aria-expanded="true"
              onClick={() => onCollapsedChange(true)}
              className="-mr-2 flex size-9 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors duration-150 hover:text-text-primary motion-reduce:transition-none"
            >
              <Icon name="sidebarCollapse" size={22} />
            </button>
          </>
        )}
      </div>

      <nav
        aria-label="Main"
        className={cn(
          'flex min-h-0 flex-1 w-full flex-col overflow-y-auto',
          collapsed ? 'items-center gap-2 pr-0' : 'gap-4 pr-1',
        )}
      >
        {groups.map((group) => {
          const groupId = navGroupId(group.label)
          return (
            // A named group, not a <section>: a labelled section becomes a landmark region, and
            // "Overview" then collided with page regions of the same name (axe landmark-unique).
            <div
              key={group.label}
              role="group"
              aria-labelledby={groupId}
              className={cn('w-full', collapsed ? 'flex justify-center' : '')}
            >
              <h2
                id={groupId}
                className={cn(
                  'px-1.5 pb-1 text-left text-xs font-medium uppercase text-text-secondary',
                  labelVisibility,
                )}
              >
                {group.label}
              </h2>
              <ul className={cn('flex flex-col', collapsed ? 'items-center gap-1' : 'gap-1.5')}>
                {group.items.map((item) => {
                  const isActive = item.key === active
                  const hasBackupWarning = item.key === 'backup' && backupNeedsAttention
                  const itemLabel = hasBackupWarning ? `${item.label}, needs attention` : item.label
                  if (item.available && item.to) {
                    return (
                      <li key={item.key}>
                        <Link
                          to={item.to}
                          aria-label={collapsed ? itemLabel : undefined}
                          aria-current={isActive ? 'page' : undefined}
                          title={collapsed ? itemLabel : undefined}
                          className={cn(
                            'flex h-10 cursor-pointer items-center rounded-md text-sm transition-colors duration-150 motion-reduce:transition-none',
                            collapsed ? 'relative w-10 justify-center' : 'gap-3 px-3.5',
                            isActive
                              ? 'bg-brand-green-dark font-semibold text-white shadow-raised hover:brightness-90'
                              : 'font-medium text-text-primary hover:bg-surface',
                          )}
                        >
                          <Icon name={item.icon} />
                          <span className={labelVisibility}>{item.label}</span>
                          {hasBackupWarning && (
                            <span
                              role="img"
                              aria-label="Backup needs attention"
                              title="Backup needs attention"
                              className={cn(
                                'flex size-5 shrink-0 items-center justify-center rounded-md',
                                isActive ? 'bg-[#c69214] text-brand-green-dark' : 'bg-warning text-white',
                                collapsed ? 'absolute -top-1 -right-1' : 'ml-auto',
                              )}
                            >
                              <Icon name="alertTriangle" size={12} />
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  }
                  return (
                    <li key={item.key}>
                      <span
                        aria-disabled="true"
                        title={collapsed ? `${item.label} - coming soon` : 'Coming soon'}
                        className={cn(
                          'flex h-10 cursor-not-allowed items-center rounded-md text-sm font-medium text-text-secondary',
                          collapsed ? 'w-10 justify-center' : 'gap-3 px-3.5',
                        )}
                      >
                        <Icon name={item.icon} />
                        <span className={labelVisibility}>{item.label}</span>
                        <span className="sr-only"> (not available yet)</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className={cn('mt-auto w-full pt-3', collapsed ? 'flex flex-col items-center' : '')}>
        <div
          className={cn(
            'flex items-center',
            collapsed ? 'flex-col gap-1 items-center' : 'flex-nowrap gap-x-1 px-1',
          )}
        >
          <Link
            to={paths.privacyPolicy}
            aria-label={collapsed ? 'Privacy Policy' : undefined}
            aria-current={privacyPolicyActive ? 'page' : undefined}
            title={collapsed ? 'Privacy Policy' : undefined}
            className={cn(
              'cursor-pointer rounded-sm text-[11px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark motion-reduce:transition-none',
              collapsed ? 'flex size-10 items-center justify-center' : 'inline',
              collapsed && !privacyPolicyActive && 'hover:text-text-primary',
              privacyPolicyActive
                ? 'font-medium text-text-primary underline decoration-brand-green-dark underline-offset-4'
                : 'text-text-secondary',
            )}
          >
            {collapsed && <Icon name="fileText" />}
            <span
              className={cn(
                labelVisibility,
                !privacyPolicyActive && 'hover:text-text-primary hover:underline',
              )}
            >
              Privacy Policy
            </span>
          </Link>
          {!collapsed && <span aria-hidden="true" className="text-[10px] text-text-muted">·</span>}
          <button
            type="button"
            aria-label={collapsed ? 'Report an Issue' : undefined}
            aria-haspopup="dialog"
            title={collapsed ? 'Report an Issue' : undefined}
            onClick={onReportIssue}
            className={cn(
              'cursor-pointer rounded-sm text-[11px] text-text-secondary transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark motion-reduce:transition-none',
              collapsed ? 'flex size-10 items-center justify-center' : 'inline',
              collapsed && 'hover:text-text-primary',
            )}
          >
            {collapsed && <Icon name="info" />}
            <span className={cn(labelVisibility, 'hover:text-text-primary hover:underline')}>
              Report an Issue
            </span>
          </button>
          {!collapsed && <span aria-hidden="true" className="text-[10px] text-text-muted">·</span>}
          <span className="whitespace-nowrap text-[10px] leading-4 text-text-secondary">
            v{APP_VERSION}
          </span>
        </div>
      </div>
    </aside>
  )
}
