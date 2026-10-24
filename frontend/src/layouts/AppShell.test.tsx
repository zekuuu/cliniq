import { renderWithRouter } from '../test/renderWithRouter'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { getRecordedAuditEntries } from '../lib/mock-db'
import { verifyBackup } from '../features/backup/api/backupApi'
import { AppShell } from './AppShell'
import { navGroupsFor } from './navigation'

/**
 * The global focus ring is a 2px outline 2px outside the element, so an `overflow` container cuts it
 * off unless it keeps 4px of room inside its edge (padding) and scrolls focus clear of that edge
 * (scroll-padding). jsdom has no layout, so this checks the classes that give the room; the
 * Playwright focus audit measures the real pixels.
 */
function clippingAncestorsWithoutRingRoom(element: Element): string[] {
  // The nearest scroller is the one an edge item touches; outer ones are a padded dialog or page.
  const scroller = element.parentElement?.closest('.overflow-y-auto, .overflow-x-auto')
  if (!scroller) return []
  const classes = scroller.classList
  const room = classes.contains('overflow-y-auto')
    ? classes.contains('p-1') && classes.contains('scroll-py-1')
    : classes.contains('px-1') && classes.contains('scroll-px-1.5')
  return room ? [] : [`${scroller.tagName} ${scroller.className}`]
}

describe('App Shell / Navigation', () => {
  it('shows Staff navigation groups across modules', () => {
    renderWithRouter(
      <AppShell
        user={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }}
        active="dashboard"
        onLogout={() => {}}
      >
        <div>Screen</div>
      </AppShell>,
    )

    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('banner')).toHaveClass('sticky', 'top-0', 'z-30')
    expect(screen.getByText('Student Care')).toBeInTheDocument()
    expect(screen.getByText('Operations')).toBeInTheDocument()
    expect(screen.getByText('Administration')).toBeInTheDocument()
    expect(screen.getByText('Students')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inventory' })).toHaveAttribute('href', '/inventory')
    expect(screen.getByText('Backup')).toBeInTheDocument()
    const privacyPolicyLink = screen.getByRole('link', { name: 'Privacy Policy' })
    expect(privacyPolicyLink).toHaveAttribute('href', '/privacy-policy')
    expect(privacyPolicyLink).toHaveClass('text-[11px]', 'text-text-secondary')
    expect(privacyPolicyLink).not.toHaveClass('bg-brand-green-dark')
    expect(privacyPolicyLink).toHaveClass('inline')
    expect(privacyPolicyLink).not.toHaveClass('min-h-10')
    expect(privacyPolicyLink).not.toHaveClass('hover:text-text-primary', 'hover:underline')
    expect(screen.getByText('Privacy Policy')).toHaveClass('hover:text-text-primary', 'hover:underline')
    expect(screen.getByRole('button', { name: 'Report an Issue' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Report an Issue' })).not.toHaveClass(
      'hover:text-text-primary',
      'hover:underline',
    )
    expect(screen.getByRole('button', { name: 'Report an Issue' })).toHaveClass('inline')
    expect(screen.getByRole('button', { name: 'Report an Issue' })).not.toHaveClass('min-h-10')
    expect(screen.getByText('Report an Issue')).toHaveClass('hover:text-text-primary', 'hover:underline')
    expect(screen.getAllByText('·')).toHaveLength(2)
    expect(screen.getByText('v0.1.0')).toBeInTheDocument()
    expect(screen.getByText('Powered by HealWare™')).toBeInTheDocument()
    expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument()
    expect(screen.getByAltText('Mendez Christian Academy logo')).toHaveAttribute('src', '/MCA_Logo.png')
    expect(screen.getAllByAltText('Healware logo')).toHaveLength(2)
    screen
      .getAllByAltText('Healware logo')
      .forEach((logo) => expect(logo).toHaveAttribute('src', '/Healware_Logo.png'))
  })

  it('puts an icon-only red logout action beside the signed-in user', () => {
    renderWithRouter(
      <AppShell
        user={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }}
        active="dashboard"
        onLogout={() => {}}
      >
        <div>Screen</div>
      </AppShell>,
    )

    expect(screen.getByRole('button', { name: 'Log out' })).toHaveClass('text-error')
  })

  it('marks the Backup navigation item when it needs attention', async () => {
    renderWithRouter(
      <AppShell
        user={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }}
        active="dashboard"
        onLogout={() => {}}
      >
        <div>Screen</div>
      </AppShell>,
    )

    expect(await screen.findByRole('img', { name: 'Backup needs attention' })).toHaveClass(
      'rounded-md',
      'bg-warning',
      'text-white',
    )
    expect(screen.getByRole('link', { name: /backup.*needs attention/i })).toHaveAttribute(
      'href',
      '/backup',
    )
  })

  it('clears the Backup warning once the latest backup is verified', async () => {
    renderWithRouter(
      <AppShell
        user={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }}
        active="backup"
        onLogout={() => {}}
      >
        <div>Screen</div>
      </AppShell>,
    )

    await screen.findByRole('img', { name: 'Backup needs attention' })
    await verifyBackup({ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' })
    await waitFor(() =>
      expect(screen.queryByRole('img', { name: 'Backup needs attention' })).not.toBeInTheDocument(),
    )
  })

  it('keeps the Backup warning distinct while Backup is selected', async () => {
    renderWithRouter(
      <AppShell
        user={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }}
        active="backup"
        onLogout={() => {}}
      >
        <div>Screen</div>
      </AppShell>,
    )

    expect(await screen.findByRole('img', { name: 'Backup needs attention' })).toHaveClass(
      'bg-[#c69214]',
      'text-brand-green-dark',
    )
  })

  it('shows a plain Shortcuts label while keeping its accessible purpose', () => {
    renderWithRouter(
      <AppShell
        user={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }}
        active="dashboard"
        onLogout={() => {}}
      >
        <div>Screen</div>
      </AppShell>,
    )

    expect(screen.getByRole('button', { name: 'Show keyboard shortcuts' })).toHaveTextContent('Shortcuts')
    expect(screen.getByRole('button', { name: 'Show keyboard shortcuts' })).not.toHaveTextContent('?')
  })

  it('opens the Report an Issue modal from the footer', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <AppShell
        user={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }}
        active="dashboard"
        onLogout={() => {}}
      >
        <div>Screen</div>
      </AppShell>,
    )

    await user.click(screen.getByRole('button', { name: 'Report an Issue' }))

    expect(screen.getByRole('dialog', { name: 'Report an Issue' })).toBeInTheDocument()
  })

  it('keeps footer actions labeled when the sidebar is collapsed', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <AppShell
        user={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }}
        active="dashboard"
        onLogout={() => {}}
      >
        <div>Screen</div>
      </AppShell>,
    )

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))

    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'title',
      'Privacy Policy',
    )
    expect(screen.getByRole('button', { name: 'Report an Issue' })).toHaveAttribute(
      'title',
      'Report an Issue',
    )
  })

  it('offers the role-aware navigation from the mobile header', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <AppShell
        user={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }}
        active="dashboard"
        onLogout={() => {}}
      >
        <div>Screen</div>
      </AppShell>,
    )

    const opener = screen.getByRole('button', { name: 'Open navigation' })
    await user.click(opener)
    const menu = screen.getByRole('navigation', { name: 'Mobile navigation' })
    expect(within(menu).getByRole('link', { name: 'Inventory' })).toHaveAttribute(
      'href',
      '/inventory',
    )

    await user.click(within(menu).getByRole('link', { name: 'Students' }))
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('audits logout before ending the current session', async () => {
    const onLogout = vi.fn()
    const user = userEvent.setup()
    renderWithRouter(
      <AppShell
        user={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }}
        active="dashboard"
        onLogout={onLogout}
      >
        <div>Screen</div>
      </AppShell>,
    )

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    await waitFor(() => expect(onLogout).toHaveBeenCalledOnce())
    expect(getRecordedAuditEntries()).toEqual([
      expect.objectContaining({
        actionType: 'logout',
        userId: 'user-staff-01',
        targetRecord: null,
      }),
    ])
  })

  it('does not spin the logout icon while ending the session', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <AppShell
        user={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }}
        active="dashboard"
        onLogout={() => {}}
      >
        <div>Screen</div>
      </AppShell>,
    )

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(screen.getByRole('button', { name: 'Logging out' }).querySelector('svg')).not.toHaveClass(
      'animate-spin',
    )
  })

  it('limits Admin/Principal navigation to Dashboard, Calendar, Reports, Audit Log, Accounts and Backup (ADR-033, ADR-037)', () => {
    const groups = navGroupsFor('admin')
    expect(groups.flatMap((group) => group.items.map((item) => item.key))).toEqual([
      'dashboard',
      'calendar',
      'reports',
      'auditLog',
      'accounts',
      'backup',
    ])
  })

  it('gives Staff the full navigation, with no QR entry (ADR-027) and no Accounts (ADR-033)', () => {
    const groups = navGroupsFor('staff')
    expect(groups.flatMap((group) => group.items.map((item) => item.key))).toEqual([
      'dashboard',
      'calendar',
      'students',
      'visits',
      'incidents',
      'followUps',
      'inventory',
      'reports',
      'backup',
      'auditLog',
    ])
  })

})

describe('App Shell / Mobile navigation', () => {
  it('reaches Privacy Policy and Report an Issue from the mobile menu', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <AppShell user={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }} active="dashboard" onLogout={() => {}}>
        <div>Screen</div>
      </AppShell>,
    )

    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    const menu = screen.getByRole('navigation', { name: 'Mobile navigation' })
    expect(within(menu).getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy-policy')
    await user.click(within(menu).getByRole('button', { name: 'Report an Issue' }))
    expect(screen.queryByRole('navigation', { name: 'Mobile navigation' })).not.toBeInTheDocument()
    expect(await screen.findByRole('dialog', { name: /report an issue/i })).toBeInTheDocument()
  })

  it('leaves room for the focus ring inside the scrolling sidebar and phone navigation', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <AppShell user={{ id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' }} active="auditLog" onLogout={() => {}}>
        <div>Screen</div>
      </AppShell>,
    )

    const sidebarLinks = within(screen.getByRole('navigation', { name: 'Main' })).getAllByRole('link')
    expect(sidebarLinks.length).toBeGreaterThan(5)
    sidebarLinks[0].focus()
    for (const link of sidebarLinks) {
      expect(link).toHaveFocus()
      expect(clippingAncestorsWithoutRingRoom(link)).toEqual([])
      await user.tab()
    }

    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    const phoneLinks = within(await screen.findByRole('navigation', { name: 'Mobile navigation' })).getAllByRole('link')
    for (const link of phoneLinks) expect(clippingAncestorsWithoutRingRoom(link)).toEqual([])
  })
})
