import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ActionMenu, type ActionMenuItem } from './ActionMenu'
import { Modal } from './Modal'

function draw(items: ActionMenuItem[], busy = false) {
  return render(
    <MemoryRouter>
      <button type="button">Before</button>
      <ActionMenu label="More actions for Test record" items={items} busy={busy} />
      <button type="button">After</button>
    </MemoryRouter>,
  )
}

describe('ActionMenu', () => {
  it('opens by mouse and keyboard, navigates with arrows, Home and End, and returns focus on Escape', async () => {
    const user = userEvent.setup()
    draw([
      { key: 'edit', label: 'Edit', icon: 'pencil', href: '/edit' },
      { key: 'copy', label: 'Duplicate', icon: 'repeat', onSelect: vi.fn() },
      {
        key: 'archive',
        label: 'Archive',
        icon: 'archive',
        variant: 'destructive',
        onSelect: vi.fn(),
      },
    ])
    const trigger = screen.getByRole('button', { name: 'More actions for Test record' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('title', 'More actions for Test record')
    await user.click(trigger)
    const menu = screen.getByRole('menu', { name: 'More actions for Test record' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(within(menu).getByRole('menuitem', { name: 'Edit' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(within(menu).getByRole('menuitem', { name: 'Archive' })).toHaveFocus()
    await user.keyboard('{Home}{ArrowDown}')
    expect(within(menu).getByRole('menuitem', { name: 'Duplicate' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: 'Archive' })).toHaveFocus()
  })

  it('closes on outside click, Tab, and selection; disabled items explain why', async () => {
    const user = userEvent.setup()
    const save = vi.fn()
    draw([
      { key: 'edit', label: 'Edit', icon: 'pencil', onSelect: save },
      {
        key: 'archive',
        label: 'Archive',
        icon: 'archive',
        disabled: true,
        disabledReason: 'Already approved',
        onSelect: vi.fn(),
      },
    ])
    const trigger = screen.getByRole('button', { name: 'More actions for Test record' })
    await user.click(trigger)
    expect(screen.getByRole('menuitem', { name: /Archive/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByText('Already approved')).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: /Archive/ }))
    expect(save).not.toHaveBeenCalled()
    await user.keyboard('{Tab}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'After' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await user.click(trigger)
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    expect(save).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('uses a real link and keeps the trigger busy while an async action runs', async () => {
    const user = userEvent.setup()
    let complete!: () => void
    const action = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve
        }),
    )
    draw([
      { key: 'open', label: 'Open report', icon: 'fileText', href: '/reports/123' },
      { key: 'copy', label: 'Duplicate', icon: 'repeat', onSelect: action },
    ])
    const trigger = screen.getByRole('button', { name: 'More actions for Test record' })
    await user.click(trigger)
    expect(screen.getByRole('menuitem', { name: 'Open report' })).toHaveAttribute(
      'href',
      '/reports/123',
    )
    await user.click(screen.getByRole('menuitem', { name: 'Duplicate' }))
    expect(action).toHaveBeenCalledOnce()
    expect(trigger).toBeDisabled()
    expect(trigger).toHaveAttribute('aria-busy', 'true')
    await act(async () => complete())
    expect(trigger).not.toBeDisabled()
  })

  it('opens the existing confirmation dialog from a destructive item', async () => {
    const user = userEvent.setup()
    function Example() {
      const [confirming, setConfirming] = useState(false)
      return (
        <>
          <ActionMenu
            label="More actions for Event"
            items={[
              {
                key: 'delete',
                label: 'Delete',
                icon: 'trash',
                variant: 'destructive',
                onSelect: () => setConfirming(true),
              },
            ]}
          />
          <Modal open={confirming} title="Delete event?" onClose={() => setConfirming(false)}>
            <button type="button" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </Modal>
        </>
      )
    }
    render(
      <MemoryRouter>
        <Example />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'More actions for Event' }))
    const deleteItem = screen.getByRole('menuitem', { name: 'Delete' })
    expect(deleteItem).toHaveClass('text-error')
    await user.click(deleteItem)
    expect(screen.getByRole('dialog', { name: 'Delete event?' })).toBeInTheDocument()
  })

  it('renders no trigger when every item is unavailable', () => {
    draw([{ key: 'archive', label: 'Archive', icon: 'archive', disabled: true, onSelect: vi.fn() }])
    expect(
      screen.queryByRole('button', { name: 'More actions for Test record' }),
    ).not.toBeInTheDocument()
  })
})
