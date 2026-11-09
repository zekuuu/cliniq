import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { useAsyncData } from '../hooks/useAsyncData'
import { useIdleSignOut } from '../hooks/useIdleSignOut'
import { Link } from 'react-router'
import { AppFooter, Icon } from '../components'
import { Button, Modal } from '../components'
import { cn } from '../lib/cn'
import { ADMIN_PRINT_NOTE } from '../components'
import { canPrint } from '../hooks/usePrinting'
import { getIdleSignoutMinutes, getOwnAccount, logoutMockSession, type SessionUser } from '../lib/mock-db'
import { anyFormDirty, IDLE_SETTINGS_CHANGED_EVENT, subscribeDirtyForms } from '../lib/sessionActivity'
import { showKeyboardShortcuts } from '../lib/shortcuts'
import { ACCOUNT_CHANGED_EVENT } from '../lib/accountEvents'
import { BrandLogo, Sidebar } from './Sidebar'
import { navGroupsFor, type NavKey } from './navigation'
import { ReportIssueModal } from '../features/issue-reports/ReportIssueModal'
import { EditProfileDialog } from '../features/account/EditProfileDialog'
import { AuthenticatorDialog } from '../features/account/AuthenticatorDialog'
import { getAuthenticatorStatus } from '../lib/mock-db'
import { AccountMenu } from './AccountMenu'
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
  /** `idleMinutes` is set when the Admin was signed out for inactivity (ADR-048), so Login can say so. */
  onLogout: (idleMinutes?: number) => void
}

/** The workstation's date and time, on its own so only this text re-renders every second. */
function LiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <time
      dateTime={now.toISOString()}
      className="hidden whitespace-nowrap font-mono text-base font-medium tracking-[0.015em] text-text-secondary tabular-nums sm:block lg:text-lg"
    >
      {now.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
      {' | '}
      {now.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
    </time>
  )
}

/** "1:30" from 90 seconds. */
function countdown(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** The last announcement point reached: each half minute, then each of the last 10 seconds. */
function announced(seconds: number): number {
  return seconds <= 10 ? seconds : Math.ceil(seconds / 30) * 30
}

export function AppShell({ user, active, children, onLogout }: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isConfirmingSignOut, setIsConfirmingSignOut] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isReportIssueOpen, setIsReportIssueOpen] = useState(false)
  const [reportIssueNotice, setReportIssueNotice] = useState<string | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isAuthenticatorOpen, setIsAuthenticatorOpen] = useState(false)
  const [authenticatorVersion, setAuthenticatorVersion] = useState(0)
  const authenticator = useAsyncData(`authenticator-status|${user.id}|${authenticatorVersion}`, getAuthenticatorStatus)
  // Bumped after Edit profile saves, so the menu reads the account again (ADR-066).
  const [accountVersion, setAccountVersion] = useState(0)
  const { data: account } = useAsyncData(`own-account|${user.id}|${accountVersion}`, () => getOwnAccount())
  const navGroups = navGroupsFor(user.role)
  const printBlocked = !canPrint(user)
  // ADR-078: each role is signed out after its own idle setting (Staff 60, Admin 30 by default).
  // Saving the settings bumps the version, so the next countdown uses the new value.
  const [idleVersion, setIdleVersion] = useState(0)
  useEffect(() => {
    const changed = () => setIdleVersion((version) => version + 1)
    window.addEventListener(IDLE_SETTINGS_CHANGED_EVENT, changed)
    return () => window.removeEventListener(IDLE_SETTINGS_CHANGED_EVENT, changed)
  }, [])
  const { data: idleMinutes } = useAsyncData(`idle-minutes|${user.role}|${idleVersion}`, () => getIdleSignoutMinutes(user.role))
  const idle = useIdleSignOut(idleMinutes ?? null, () => {
    // User and action only; Login says how many minutes (ADR-078).
    void logoutMockSession(user, 'Signed out (idle)').then(() => onLogout(idleMinutes ?? undefined))
  })
  const formDirty = useSyncExternalStore(subscribeDirtyForms, anyFormDirty)

  // ADR-038 item 3: Ctrl+P / Cmd+P does nothing for the Admin. The browser's own menu can't be
  // blocked; then the page prints only the note below instead of the screen (index.css).
  useEffect(() => {
    if (!printBlocked) return
    const block = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') event.preventDefault()
    }
    window.addEventListener('keydown', block)
    return () => window.removeEventListener('keydown', block)
  }, [printBlocked])

  function openReportIssue() {
    setReportIssueNotice(null)
    setIsReportIssueOpen(true)
  }

  async function handleLogout() {
    setIsConfirmingSignOut(false)
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
      data-print-blocked={printBlocked || undefined}
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
      {printBlocked && <p data-print-note className="hidden p-8 text-base text-text-primary print:block">{ADMIN_PRINT_NOTE}</p>}

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
          <LiveClock />
          {/* The avatar, name and role are one button that opens the account menu (ADR-066): Edit profile,
              Change password, Keyboard shortcuts, Report an issue, Privacy Policy and Sign out. */}
          <div className="ml-auto flex shrink-0 items-center">
            <AccountMenu
              user={user}
              account={account ?? null}
              signingOut={isLoggingOut}
              onEditProfile={() => setIsEditingProfile(true)}
              onAuthenticator={() => setIsAuthenticatorOpen(true)}
              authenticatorEnabled={authenticator.data?.enabled ?? false}
              onShortcuts={showKeyboardShortcuts}
              onReportIssue={openReportIssue}
              onSignOut={() => setIsConfirmingSignOut(true)}
            />
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          {children}
        </main>
        <AppFooter />
      </div>
      <ScrollToTopButton />
      <Modal open={isMobileNavOpen} title="Navigation" onClose={() => setIsMobileNavOpen(false)}>
        <nav aria-label="Mobile navigation" className="-m-1 flex max-h-[70dvh] scroll-py-1 flex-col gap-4 overflow-y-auto p-1">
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
      <Modal open={isConfirmingSignOut} title="Sign out of CLINIQ?" onClose={() => setIsConfirmingSignOut(false)}>
        <p className="text-sm text-text-secondary">Anything not yet saved on this screen will be lost.</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="neutral" data-autofocus onClick={() => setIsConfirmingSignOut(false)}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => void handleLogout()}>
            Sign Out
          </Button>
        </div>
      </Modal>
      {/* ADR-078: Escape, the backdrop and the X all mean Stay signed in. */}
      <Modal open={idle.secondsLeft !== null} title="Still there?" onClose={idle.stay}>
        <p className="text-sm text-text-primary">
          You will be signed out in <span className="font-semibold tabular-nums">{countdown(idle.secondsLeft ?? 0)}</span> because of inactivity.
          {formDirty && <span className="font-semibold"> Unsaved changes will be lost.</span>}
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          For privacy on a shared computer, CLINIQ signs out after {idleMinutes} minutes without activity.
        </p>
        {/* Announced politely, every 30 seconds and in the last 10, not every second. */}
        <p role="status" className="sr-only">
          {idle.secondsLeft !== null ? `You will be signed out in ${countdown(announced(idle.secondsLeft))} because of inactivity.` : null}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="neutral" onClick={() => void handleLogout()}>
            Sign out now
          </Button>
          <Button variant="primary" data-autofocus onClick={idle.stay}>
            Stay signed in
          </Button>
        </div>
      </Modal>
      <AuthenticatorDialog
        open={isAuthenticatorOpen}
        viewer={user}
        onClose={() => setIsAuthenticatorOpen(false)}
        onChanged={() => setAuthenticatorVersion((version) => version + 1)}
      />
      <EditProfileDialog
        open={isEditingProfile}
        account={account ?? null}
        onClose={() => setIsEditingProfile(false)}
        onSaved={() => {
          setIsEditingProfile(false)
          setAccountVersion((version) => version + 1)
          setReportIssueNotice('Profile updated.')
          // App reads the signed-in user again, so every place that shows the name updates at once.
          window.dispatchEvent(new CustomEvent(ACCOUNT_CHANGED_EVENT))
        }}
      />
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

/**
 * "Scroll to top" (Zean, November 8, 2026): a small round arrow fixed bottom-right, mostly inside the
 * page's side gutter so it covers almost nothing. It appears only once the page has scrolled more than
 * one screen, when getting back up is real work, and is hidden (and out of the Tab order) otherwise.
 * It scrolls to the top and moves focus to the main content, so keyboard users land there too.
 */
function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const update = () => setVisible(window.scrollY > window.innerHeight)
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  function toTop() {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    document.getElementById('main-content')?.focus({ preventScroll: true })
  }
  return (
    <button
      type="button"
      aria-label="Scroll to top"
      title="Scroll to top"
      onClick={toTop}
      className={cn(
        'fixed right-4 bottom-4 z-20 inline-flex size-10 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-text-secondary shadow-raised transition-[opacity,translate,color,background-color] duration-200 hover:bg-surface hover:text-brand-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark motion-reduce:transition-none print:hidden',
        visible ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-2 opacity-0',
      )}
    >
      <Icon name="arrowUp" size={18} />
    </button>
  )
}
