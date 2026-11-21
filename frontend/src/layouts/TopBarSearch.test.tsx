import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useParams } from 'react-router'
import { describe, expect, it } from 'vitest'
import { AppShell } from './AppShell'

function Profile({ kind }: { kind: string }) {
  return <p>{`${kind} profile ${useParams().id}`}</p>
}

function renderShell(role: 'staff' | 'admin') {
  const shell = (
    <AppShell
      user={{ id: `user-${role}-01`, name: 'Demo', role }}
      active="dashboard"
      onLogout={() => {}}
    >
      <Routes>
        <Route path="/" element={<p>Home</p>} />
        <Route path="/students/:id" element={<Profile kind="Student" />} />
        <Route path="/staff/:id" element={<Profile kind="Staff" />} />
      </Routes>
    </AppShell>
  )
  return render(<MemoryRouter>{shell}</MemoryRouter>)
}

describe('top bar search', () => {
  it('finds a staff member by Staff No. and opens the profile', async () => {
    const user = userEvent.setup()
    renderShell('staff')
    const box = screen.getByRole('combobox', { name: 'Search students and staff' })
    await user.type(box, 'STF-0002')
    await user.click(await screen.findByRole('option', { name: /STF-0002 Dindo Arcega/ }))
    expect(await screen.findByText(/^Staff profile /)).toBeInTheDocument()
    expect(box).toHaveValue('')
  })

  it('opens a student profile from a name match', async () => {
    const user = userEvent.setup()
    renderShell('staff')
    await user.type(screen.getByRole('combobox', { name: 'Search students and staff' }), 'an')
    const student = (await screen.findAllByRole('option', { name: /LRN ending in/ }))[0]
    await user.click(student)
    expect(await screen.findByText(/^Student profile /)).toBeInTheDocument()
  })

  it('"/" jumps to the box, but types normally inside the box', async () => {
    const user = userEvent.setup()
    renderShell('staff')
    const box = screen.getByRole('combobox', { name: 'Search students and staff' })
    expect(box).not.toHaveFocus()
    expect(box).toHaveAttribute('aria-keyshortcuts', '/')
    // The tip shows in the empty box; hidden from screen readers, which read aria-keyshortcuts.
    expect(box.parentElement?.querySelector('kbd')).toHaveTextContent('/')
    await user.keyboard('/')
    expect(box).toHaveFocus()
    expect(box).toHaveValue('')
    await user.keyboard('a/b')
    expect(box).toHaveValue('a/b')
    expect(box.parentElement?.querySelector('kbd')).toBeNull()
  })

  it('is not shown to the Admin, who has no patient search', () => {
    renderShell('admin')
    expect(
      screen.queryByRole('combobox', { name: 'Search students and staff' }),
    ).not.toBeInTheDocument()
  })
})
