import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('scrolls inside the overlay so a tall dialog keeps its title and close button reachable', () => {
    render(
      <Modal open title="Tall dialog" onClose={vi.fn()}>
        <p>Body</p>
      </Modal>,
    )
    const overlay = screen.getByRole('dialog').closest('[role="presentation"]')
    expect(overlay).toHaveClass('overflow-y-auto')
    // Centring happens on a wrapper that is at least viewport-tall, not on the scrolling overlay itself.
    expect(overlay).not.toHaveClass('items-center')
    expect(screen.getByRole('dialog').parentElement).toHaveClass('min-h-full', 'items-center')
  })

  it('closes on a backdrop press but not on a press inside the dialog', () => {
    const onClose = vi.fn()
    render(
      <Modal open title="Dialog" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    )
    fireEvent.mouseDown(screen.getByText('Body'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
