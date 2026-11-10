import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { Icon, ShortcutHint, type IconName } from '../components'
import { SHORTCUT_KEYS } from '../lib/shortcuts'
import { cn } from '../lib/cn'
import { formatDateTime } from '../lib/dates'
import { ROLE_LABELS, type OwnAccount, type SessionUser } from '../lib/mock-db'
import { UserAvatar } from '../features/user-management/UserAvatar'
import { paths } from '../routes/paths'

type MenuItem = {
  key: string
  label: string
  icon: IconName
  group: number
  shortcut?: string
  danger?: boolean
} & ({ to: string } | { onSelect: () => void })

/** Keyboard help belongs to the desktop workstation, as the header's Shortcuts button did (shown from `md`). */
function isDesktopWidth() {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 768px)').matches
}

/**
 * The account menu (ADR-066; Zean, Thursday, November 5, 2026): the header's avatar, name and role are
 * one button that opens the user's own account actions, including the ones that are easy to forget.
 * The ARIA menu-button pattern: Enter, Space or ArrowDown opens it on the first item, ArrowUp on the
 * last; arrows, Home and End move; a letter jumps; Escape closes and returns focus to the button; Tab,
 * an outside click and any choice close it. The same menu for every role: these are the user's own
 * account actions, never clinical data (ADR-038).
 */
export function AccountMenu({
  user,
  account,
  signingOut,
  onEditProfile,
  onAuthenticator,
  authenticatorEnabled = false,
  onShortcuts,
  onReportIssue,
  onSignOut,
}: {
  user: SessionUser
  account: OwnAccount | null
  signingOut: boolean
  onEditProfile: () => void
  /** Password recovery with an authenticator app (ADR-072). */
  onAuthenticator: () => void
  authenticatorEnabled?: boolean
  onShortcuts: () => void
  onReportIssue: () => void
  onSignOut: () => void
}) {
  const [open, setOpen] = useState(false)
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const [desktop, setDesktop] = useState(isDesktopWidth)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLElement | null>>([])
  const menuId = useId()
  const name = account?.name ?? user.name

  const items: MenuItem[] = [
    // Grouped by purpose, a divider between groups: the account, help, then Sign out.
    { key: 'edit', label: 'Edit profile', icon: 'userCog', group: 0, onSelect: onEditProfile },
    { key: 'password', label: 'Change password', icon: 'lock', group: 0, to: paths.changePassword },
    {
      key: 'authenticator',
      label: authenticatorEnabled ? 'Authenticator app: Enabled' : 'Set up authenticator app',
      icon: 'shieldPlus',
      group: 0,
      onSelect: onAuthenticator,
    },
    ...(desktop
      ? [
          {
            key: 'shortcuts',
            label: 'Keyboard shortcuts',
            icon: 'keyboard' as const,
            group: 1,
            shortcut: SHORTCUT_KEYS.shortcutsList,
            onSelect: onShortcuts,
          },
        ]
      : []),
    { key: 'issue', label: 'Report an issue', icon: 'flag', group: 1, onSelect: onReportIssue },
    {
      key: 'privacy',
      label: 'Privacy Policy',
      icon: 'fileText',
      group: 1,
      to: paths.privacyPolicy,
    },
    {
      key: 'signout',
      label: signingOut ? 'Signing out' : 'Sign out',
      icon: 'logout',
      group: 2,
      danger: true,
      onSelect: onSignOut,
    },
  ]

  function openMenu(first: 'first' | 'last') {
    setDesktop(isDesktopWidth())
    setOpen(true)
    setFocusIndex(first === 'first' ? 0 : -1)
  }

  function close(returnFocus: boolean) {
    setOpen(false)
    setFocusIndex(null)
    if (returnFocus) buttonRef.current?.focus()
  }

  // Focus the requested item once the menu is drawn (-1 is the last one).
  useEffect(() => {
    if (!open || focusIndex === null) return
    const index = focusIndex < 0 ? itemRefs.current.length - 1 : focusIndex
    itemRefs.current[index]?.focus()
  }, [open, focusIndex])

  // A click or tap outside closes it, without moving focus.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent | MouseEvent) => {
      const target = event.target as Node
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) close(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openMenu('first')
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      openMenu('last')
    }
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const nodes = itemRefs.current.filter((node): node is HTMLElement => node !== null)
    const current = nodes.indexOf(document.activeElement as HTMLElement)
    const move = (index: number) => {
      event.preventDefault()
      nodes[(index + nodes.length) % nodes.length]?.focus()
    }
    if (event.key === 'ArrowDown') move(current + 1)
    else if (event.key === 'ArrowUp') move(current - 1)
    else if (event.key === 'Home') move(0)
    else if (event.key === 'End') move(nodes.length - 1)
    else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close(true)
    } else if (event.key === 'Tab') close(false)
    else if (event.key.length === 1 && /\S/.test(event.key)) {
      // A letter jumps to the next item that starts with it.
      const letter = event.key.toLowerCase()
      const order = items.map((_, i) => (current + 1 + i) % items.length)
      const match = order.find((i) => items[i].label.toLowerCase().startsWith(letter))
      if (match !== undefined) move(match)
    }
  }

  function choose(item: MenuItem) {
    // Close first and put focus on the button, so a dialog the item opens returns focus there.
    close(true)
    if ('onSelect' in item) item.onSelect()
  }

  const itemClass = (danger?: boolean) =>
    cn(
      'flex min-h-9 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-left text-sm font-medium whitespace-nowrap transition-colors duration-150 hover:bg-surface focus-visible:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none',
      danger ? 'text-error' : 'text-text-primary',
    )

  return (
    // From `md` the button and the menu share one width, so the menu reads as the button unfolding (Zean, November 5, 2026):
    // 240px (the menu's rows fit on one line), growing with a long name up to 288px, so the chevron stays near the name.
    <div className="relative md:w-max md:min-w-60 md:max-w-72">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Account menu, ${name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : openMenu('first'))}
        onKeyDown={onButtonKeyDown}
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md pr-3 pl-1.5 transition-colors md:w-full hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark motion-reduce:transition-none"
      >
        <UserAvatar name={name} picture={account?.profilePicture} />
        <span className="hidden min-w-0 flex-col text-left leading-tight sm:flex">
          <span className="truncate text-sm font-semibold text-text-primary">{name}</span>
          <span className="text-xs text-text-secondary">{ROLE_LABELS[user.role]}</span>
        </span>
        <Icon
          name="chevronDown"
          size={16}
          className={cn(
            'ml-auto shrink-0 text-text-secondary transition-transform motion-reduce:transition-none',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div
          ref={panelRef}
          // Below the header on a phone (a full-width sheet), under the button and right-aligned from `sm`.
          className={cn(
            'border border-border bg-background shadow-raised',
            'fixed inset-x-0 top-16 z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto rounded-none p-1.5 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-1 sm:w-60 sm:rounded-md md:left-0 md:w-auto',
            'animate-expand-down motion-reduce:animate-none',
          )}
        >
          {/* No second avatar: the button right above already shows it. */}
          <div className="min-w-0 border-b border-border px-2.5 pt-1 pb-2 text-xs leading-5 text-text-secondary">
            <p className="break-words text-sm font-semibold text-text-primary">{name}</p>
            {/* Each detail on its own line and wrapped, never cut off with an ellipsis. */}
            <p>{ROLE_LABELS[user.role]}</p>
            {account && <p className="break-words">Username: {account.username}</p>}
            {account && (
              <p className="whitespace-nowrap">
                {account.lastLogin
                  ? `Signed in ${formatDateTime(account.lastLogin)}`
                  : 'Sign-in not recorded'}
              </p>
            )}
          </div>
          <div
            id={menuId}
            role="menu"
            aria-label="Account"
            onKeyDown={onMenuKeyDown}
            className="flex flex-col pt-1"
          >
            {items.map((item, index) => {
              const content = (
                <>
                  <Icon name={item.icon} size={16} className="shrink-0" />
                  {item.label}
                  {item.shortcut && <ShortcutHint keys={item.shortcut} />}
                </>
              )
              const ref = (node: HTMLElement | null) => {
                itemRefs.current[index] = node
              }
              return (
                <div key={item.key} className="contents">
                  {index > 0 && item.group !== items[index - 1].group && (
                    <div role="separator" className="my-1 border-t border-border" />
                  )}
                  {'to' in item ? (
                    <Link
                      ref={ref}
                      role="menuitem"
                      tabIndex={-1}
                      to={item.to}
                      onClick={() => close(false)}
                      className={itemClass(item.danger)}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      ref={ref}
                      type="button"
                      role="menuitem"
                      tabIndex={-1}
                      aria-keyshortcuts={item.shortcut}
                      disabled={item.key === 'signout' && signingOut}
                      onClick={() => choose(item)}
                      className={cn(
                        itemClass(item.danger),
                        'disabled:cursor-not-allowed disabled:opacity-50',
                      )}
                    >
                      {content}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
