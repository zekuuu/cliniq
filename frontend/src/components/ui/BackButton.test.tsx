import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes, type InitialEntry } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { DRILL_THROUGH_STATE } from '../../hooks/useGoBack'
import { BackButton } from './BackButton'

function renderAt(control: ReactElement, entries: InitialEntry[] = ['/here']) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={entries.length - 1}>
      <Routes>
        <Route path="/previous" element={<p>Previous screen</p>} />
        <Route path="/fallback" element={<p>Fallback screen</p>} />
        <Route path="/fixed" element={<p>Fixed screen</p>} />
        <Route path="*" element={control} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BackButton', () => {
  it('goes back in history when the user arrived from another screen in the app', async () => {
    const user = userEvent.setup()
    renderAt(<BackButton fallback="/fallback" />, ['/previous', '/here'])
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('Previous screen')).toBeInTheDocument()
  })

  it('uses the fallback when the screen was the first one opened, so Back never leaves the app', async () => {
    const user = userEvent.setup()
    renderAt(<BackButton fallback="/fallback" />)
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('Fallback screen')).toBeInTheDocument()
  })

  it('reads plain "Back" for a history target and names a fixed target in its text and accessible name', () => {
    renderAt(
      <>
        <BackButton fallback="/fallback" />
        <BackButton to="/fixed" label="Back to Sign In" />
      </>,
    )
    // The visible text is the whole accessible name ("label in name"); no aria-label overrides it.
    const history = screen.getByRole('button', { name: 'Back' })
    expect(history).toHaveTextContent(/^Back$/)
    expect(history).not.toHaveAttribute('aria-label')
    const fixed = screen.getByRole('link', { name: 'Back to Sign In' })
    expect(fixed).toHaveAttribute('href', '/fixed')
    expect(fixed).not.toHaveAttribute('aria-label')
  })

  it('goes to its fixed screen even when there is history', async () => {
    const user = userEvent.setup()
    renderAt(<BackButton to="/fixed" label="Back to Sign In" />, ['/previous', '/here'])
    await user.click(screen.getByRole('link', { name: 'Back to Sign In' }))
    expect(screen.getByText('Fixed screen')).toBeInTheDocument()
  })

  it('runs the form cancel instead of navigating when given onBack', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    renderAt(<BackButton onBack={onBack} />, ['/previous', '/here'])
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalledOnce()
    expect(screen.queryByText('Previous screen')).not.toBeInTheDocument()
  })

  it('is hidden in print in both styles', () => {
    renderAt(
      <>
        <BackButton fallback="/fallback" />
        <BackButton to="/fixed" label="Back to Sign In" variant="prominent" />
      </>,
    )
    expect(screen.getByRole('button', { name: 'Back' })).toHaveClass('print:hidden')
    expect(screen.getByRole('link', { name: 'Back to Sign In' })).toHaveClass('print:hidden')
  })

  it('is reachable with Tab and operable with Enter', async () => {
    const user = userEvent.setup()
    renderAt(<BackButton fallback="/fallback" />, ['/previous', '/here'])
    await user.tab()
    expect(screen.getByRole('button', { name: 'Back' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('Previous screen')).toBeInTheDocument()
  })

  it('shows on a top-level list only when a drill-through link opened it', () => {
    const { unmount } = renderAt(<BackButton fallback="/fallback" drillThroughOnly />)
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    unmount()
    renderAt(<BackButton fallback="/fallback" drillThroughOnly />, [
      '/previous',
      { pathname: '/here', state: DRILL_THROUGH_STATE },
    ])
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  })
})
