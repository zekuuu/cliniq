import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from './api/client'
import { toMockError } from './api/errors'
import { StockRuleError } from './mock-db'
import { errorMessage, notify } from './notify'
import { scrollToTop } from './scrollToTop'

const api = (status: number, body: Record<string, unknown> = {}) => new ApiError(status, body)

describe('errorMessage (ADR-083)', () => {
  it.each([
    [0, 'Cannot reach the server. Check the connection and try again.'],
    [401, 'Your session ended. Please sign in again.'],
    [429, 'Too many requests. Please wait a moment and try again.'],
    [500, 'Something went wrong on our side. Please try again.'],
    [503, 'Something went wrong on our side. Please try again.'],
  ])('gives status %i a fixed sentence, whatever the server said', (status, text) => {
    expect(errorMessage(api(status, { message: 'SQLSTATE[42S02] at /var/www/app.php' }), 'x')).toBe(
      text,
    )
  })

  it('uses the server message for 403, 404 and 409, which is written for people', () => {
    expect(errorMessage(api(403, { message: "You don't have access to this." }), 'x')).toBe(
      "You don't have access to this.",
    )
    expect(errorMessage(api(404, { message: "That record doesn't exist." }), 'x')).toBe(
      "That record doesn't exist.",
    )
    const rule = toMockError(api(409, { rule: 'stock_rule', message: 'Not enough stock.' }))
    expect(errorMessage(rule, 'x')).toBe('Not enough stock.')
  })

  it('says "Some fields need attention" for a 422 with field errors', () => {
    expect(
      errorMessage(
        api(422, { message: 'The name field is required.', errors: { name: ['x'] } }),
        'x',
      ),
    ).toBe('Some fields need attention.')
  })

  it('uses the mock layer’s own messages, and hides developer errors', () => {
    expect(errorMessage(new StockRuleError('That batch expired.'), 'x')).toBe('That batch expired.')
    expect(errorMessage(new Error('Enter your full name.'), 'x')).toBe('Enter your full name.')
    expect(
      errorMessage(
        new TypeError("Cannot read properties of undefined (reading 'id')"),
        'Fallback.',
      ),
    ).toBe('Fallback.')
    expect(errorMessage(new TypeError('Failed to fetch'), 'x')).toBe(
      'Cannot reach the server. Check the connection and try again.',
    )
    expect(errorMessage('weird', 'Fallback.')).toBe('Fallback.')
  })
})

describe('notify', () => {
  it('stacks one toast per action, even with the same text or id (ADR-084)', async () => {
    notify.success('Visit recorded', { id: 'visit-create' })
    notify.success('Visit recorded', { id: 'visit-create' })
    notify.success('Visit recorded')
    await waitFor(() => expect(screen.getAllByText('Visit recorded')).toHaveLength(3))
  })

  it('closes each toast on its own after its time on screen', async () => {
    notify.success('Item restocked', { duration: 300 })
    expect(await screen.findByText('Item restocked')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Item restocked')).not.toBeInTheDocument(), {
      timeout: 2000,
    })
  })

  it('turns the loading toast into the result, by the same id', async () => {
    await notify.promise(Promise.resolve(3), {
      id: 'backup',
      loading: 'Backing up…',
      success: (n) => `Backup recorded to ${n} locations`,
      error: 'The backup did not run.',
    })
    expect(await screen.findByText('Backup recorded to 3 locations')).toBeInTheDocument()
    expect(screen.queryByText('Backing up…')).not.toBeInTheDocument()
  })

  it('sets the shrinking line to the toast’s own time on screen', async () => {
    notify.error('Not saved.')
    const toast = (await screen.findByText('Not saved.')).closest<HTMLElement>(
      '[data-sonner-toast]',
    )
    expect(toast?.style.getPropertyValue('--toast-ms')).toBe('6000ms')
    expect(toast).toHaveAttribute('data-type', 'error')
  })

  it('offers Undo for 8 s; Undo runs the reverse, then reports and reloads (ADR-085)', async () => {
    const undo = vi.fn().mockResolvedValue(undefined)
    const onUndone = vi.fn()
    notify.undoable('Location disabled', undo, {
      undone: 'Undone: location enabled again',
      onUndone,
    })
    const toast = (await screen.findByText('Location disabled')).closest<HTMLElement>(
      '[data-sonner-toast]',
    )
    expect(toast?.style.getPropertyValue('--toast-ms')).toBe('8000ms')
    screen.getByRole('button', { name: 'Undo' }).click()
    expect(await screen.findByText('Undone: location enabled again')).toBeInTheDocument()
    expect(undo).toHaveBeenCalledOnce()
    expect(onUndone).toHaveBeenCalledOnce()
  })

  it('says why an Undo failed', async () => {
    notify.undoable('Account disabled', () => Promise.reject(new Error('The last Admin stays.')), {
      undone: 'Undone',
    })
    ;(await screen.findByRole('button', { name: 'Undo' })).click()
    expect(await screen.findByText('The last Admin stays.')).toBeInTheDocument()
  })

  it('refuses stale Undo without sending a reverse request', async () => {
    const undo = vi.fn().mockResolvedValue(undefined)
    const checkCurrent = vi.fn().mockResolvedValue(false)
    notify.undoable('Settings saved', undo, { undone: 'Undone', checkCurrent })
    ;(await screen.findByRole('button', { name: 'Undo' })).click()
    expect(
      await screen.findByText('Someone else changed this record. Reload and try again.'),
    ).toBeInTheDocument()
    expect(checkCurrent).toHaveBeenCalledOnce()
    expect(undo).not.toHaveBeenCalled()
  })
})

describe('scrollToTop', () => {
  it('scrolls the window and moves focus to the main content', () => {
    const scroll = vi.spyOn(window, 'scrollTo')
    render(<main id="main-content" tabIndex={-1} />)
    scrollToTop()
    expect(scroll).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(document.getElementById('main-content')).toHaveFocus()
    scroll.mockRestore()
  })

  it('scrolls a dialog’s own overlay when called from inside it', () => {
    const scroll = vi.spyOn(window, 'scrollTo')
    render(
      <div data-modal-overlay>
        <button>Inside</button>
      </div>,
    )
    const overlay = document.querySelector<HTMLElement>('[data-modal-overlay]')!
    overlay.scrollTo = vi.fn()
    scrollToTop(screen.getByRole('button', { name: 'Inside' }))
    expect(overlay.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(scroll).not.toHaveBeenCalled()
    scroll.mockRestore()
  })

  it('jumps instead of gliding under reduced motion', () => {
    const scroll = vi.spyOn(window, 'scrollTo')
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
    })) as typeof window.matchMedia
    scrollToTop()
    expect(scroll).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
    window.matchMedia = original
    scroll.mockRestore()
  })
})
