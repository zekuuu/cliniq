import { renderWithRouter } from '../test/renderWithRouter'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { getRecordedAuditEntries } from '../lib/mock-db'
import { AppShell } from './AppShell'
import { navGroupsFor } from './navigation'

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

  it('limits Admin/Principal navigation to Dashboard, Calendar, Reports, and Audit Log', () => {
    const groups = navGroupsFor('admin')
    expect(groups.flatMap((group) => group.items.map((item) => item.key))).toEqual([
      'dashboard',
      'calendar',
      'reports',
      'auditLog',
    ])
  })

  it('gives PE/Sports Instructor no shell navigation groups', () => {
    expect(navGroupsFor('instructor')).toEqual([])
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

  it('shows no menu button to a role with no menu entries', () => {
    renderWithRouter(
      <AppShell user={{ id: 'user-instructor-01', name: 'PE Instructor', role: 'instructor' }} active={null} onLogout={() => {}}>
        <div>Screen</div>
      </AppShell>,
    )
    expect(navGroupsFor('instructor')).toEqual([])
    expect(screen.queryByRole('button', { name: 'Open navigation' })).not.toBeInTheDocument()
  })
})
