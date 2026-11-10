import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Button, DONE_MS } from './Button'
import { doneLabel } from './buttonClassName'

describe('Button done state (Zean, November 8, 2026)', () => {
  afterEach(() => vi.useRealTimers())

  it('reads the past form with a check icon for DONE_MS when done turns true, then its label again', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Button icon="checkCircle">Save Changes</Button>)
    rerender(
      <Button icon="checkCircle" done>
        Save Changes
      </Button>,
    )
    expect(screen.getByRole('button')).toHaveTextContent('Saved')
    act(() => vi.advanceTimersByTime(DONE_MS))
    expect(screen.getByRole('button')).toHaveTextContent('Save Changes')
  })

  it('shows again on the next success, and never while loading', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Button>Copy</Button>)
    rerender(<Button done>Copy</Button>)
    act(() => vi.advanceTimersByTime(DONE_MS))
    rerender(<Button>Copy</Button>)
    rerender(<Button done>Copy</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Copied')
    rerender(
      <Button done loading>
        Save
      </Button>,
    )
    expect(screen.getByRole('button')).toHaveTextContent('Saving…')
  })

  it('stays clickable while it reads its done label, so the next one can be added at once', () => {
    vi.useFakeTimers()
    const onClick = vi.fn()
    const { rerender } = render(<Button onClick={onClick}>Add Attempt</Button>)
    rerender(
      <Button onClick={onClick} done>
        Add Attempt
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Added' })
    expect(button).toBeEnabled()
    act(() => button.click())
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('names the past form of known actions only', () => {
    expect(doneLabel('Save Password')).toBe('Saved')
    expect(doneLabel('Back up now')).toBe('Backed up')
    expect(doneLabel('Mark as Verified')).toBe('Marked')
    expect(doneLabel('Continue')).toBeNull()
  })
})
