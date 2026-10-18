import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AppFooter, Icon } from '../components'
import { Modal } from '../components'
import { cn } from '../lib/cn'
import { logoutMockSession, ROLE_LABELS, type SessionUser } from '../lib/mock-db'
import { showKeyboardShortcuts } from '../lib/shortcuts'
import { BrandLogo, Sidebar } from './Sidebar'
import { navGroupsFor, type NavKey } from './navigation'
import { ReportIssueModal } from '../features/issue-reports/ReportIssueModal'
import { paths } from '../routes/paths'

/**
 * App shell: left sidebar (logo + role-aware nav) and a top bar (user chip), following the reference
 * mockup's layout.
 *
 * Placed around each screen by `routes/AppRoutes.tsx`; `active` is the route's nav item (`null` on
 * the not-found page). Nav items for screens that exist link to their routes; the rest are marked
 * "Soon" and aren't clickable. No search box and no notification bell: neither exists as a feature
 * yet, and a dead control would mislead.
 */

export interface AppShellProps {
  user: SessionUser
  active: NavKey | null
  children: ReactNode
  onLogout: () => void
}

export function AppShell({ user, active, children, onLogout }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isReportIssueOpen, setIsReportIssueOpen] = useState(false)
  const [reportIssueNotice, setReportIssueNotice] = useState<string | null>(null)
  const navGroups = navGroupsFor(user.role)

  function openReportIssue() {
    setReportIssueNotice(null)
    setIsReportIssueOpen(true)
  }

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logoutMockSession(user)
      onLogout()
    } catch {
      setIsLoggingOut(false)
    }
  }

  return (
    <div
      className={cn(
        'min-h-screen bg-surface transition-[grid-template-columns] duration-200 motion-reduce:transition-none lg:grid print:block print:bg-background',
        isSidebarCollapsed
          ? 'lg:grid-cols-[4.75rem_minmax(0,1fr)]'
          : 'lg:grid-cols-[17rem_minmax(0,1fr)]',
      )}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:cursor-pointer focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:hover:bg-surface"
      >
        Skip to main content
      </a>

      <Sidebar
        active={active}
        collapsed={isSidebarCollapsed}
        onCollapsedChange={setIsSidebarCollapsed}
        onReportIssue={openReportIssue}
        user={user}
      />

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background px-4 sm:px-8 print:hidden">
          <div className="flex min-w-0 items-center gap-2 lg:hidden">
            {/* A role with no menu entries (the Instructor on the shared privacy page) gets no empty menu. */}
            {navGroups.length > 0 && (
              <button
                type="button"
                aria-label="Open navigation"
                aria-expanded={isMobileNavOpen}
                onClick={() => setIsMobileNavOpen(true)}
                className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark motion-reduce:transition-none"
              >
                <Icon name="menu" size={22} />
              </button>
            )}
            <BrandLogo compact />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
            {/* Keyboard help belongs to the desktop workstation; it has no use on a touch screen. */}
            <button
              type="button"
              aria-label="Show keyboard shortcuts"
              onClick={showKeyboardShortcuts}
              className="mr-1 hidden h-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-semibold text-text-secondary transition-colors hover:bg-surface hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark motion-reduce:transition-none md:inline-flex"
            >
              Shortcuts
            </button>
            <span
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-full bg-brand-green-light text-xs font-bold text-text-primary ring-2 ring-background"
            >
              <Icon name="user" size={20} />
            </span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm font-semibold text-text-primary">{user.name}</span>
              <span className="text-xs text-text-secondary">{ROLE_LABELS[user.role]}</span>
            </span>
            <button
              type="button"
              aria-label={isLoggingOut ? 'Logging out' : 'Log out'}
              title="Log out"
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
              className="inline-flex shrink-0 cursor-pointer rounded-sm text-error transition-[filter] hover:brightness-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 motion-reduce:transition-none"
            >
              <Icon name="logout" />
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          {children}
        </main>
        <AppFooter />
      </div>
      <Modal open={isMobileNavOpen} title="Navigation" onClose={() => setIsMobileNavOpen(false)}>
        <nav aria-label="Mobile navigation" className="flex max-h-[70dvh] flex-col gap-4 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} role="group" aria-label={group.label}>
              <p className="px-1 text-xs font-medium uppercase text-text-secondary">{group.label}</p>
              <ul className="mt-1 flex flex-col gap-1">
                {group.items.map((item) => (
                  <li key={item.key}>
                    {item.available && item.to ? (
                      <Link
                        to={item.to}
                        onClick={() => setIsMobileNavOpen(false)}
                        aria-current={item.key === active ? 'page' : undefined}
                        className={cn(
                          'flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark motion-reduce:transition-none',
                          item.key === active && 'bg-brand-green-dark font-semibold text-white hover:brightness-125',
                        )}
                      >
                        <Icon name={item.icon} />
                        {item.label}
                      </Link>
                    ) : (
                      <span className="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-md px-3 text-sm font-medium text-text-secondary" aria-disabled="true">
                        <Icon name={item.icon} />
                        {item.label} <span className="text-xs">(coming soon)</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {/* The sidebar footer's links, which phones would otherwise never reach. */}
          <div className="flex flex-wrap items-center gap-x-4 border-t border-border pt-2">
            <Link
              to={paths.privacyPolicy}
              onClick={() => setIsMobileNavOpen(false)}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-sm px-1 text-sm text-text-secondary transition-colors hover:text-text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark motion-reduce:transition-none"
            >
              Privacy Policy
            </Link>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => {
                setIsMobileNavOpen(false)
                openReportIssue()
              }}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-sm px-1 text-sm text-text-secondary transition-colors hover:text-text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark motion-reduce:transition-none"
            >
              Report an Issue
            </button>
          </div>
        </nav>
      </Modal>
      <ReportIssueModal
        open={isReportIssueOpen}
        user={user}
        onClose={() => setIsReportIssueOpen(false)}
        onSubmitted={(mailtoOpened) => {
          setReportIssueNotice(
            mailtoOpened
              ? 'Issue submitted. An email draft was opened as a fallback.'
              : 'Issue submitted. The report was saved, but the email draft could not be opened.',
          )
        }}
      />
      {reportIssueNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 bottom-4 z-50 max-w-sm rounded-md border border-success bg-background px-4 py-3 text-sm font-semibold text-text-primary shadow-card"
        >
          {reportIssueNotice}
        </div>
      )}
    </div>
  )
}
