import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Pagination } from './Pagination'

/** A pager over 120 rows, 10 a page (12 pages), that owns its page like a list screen does. */
function Pager({ start = 3, total = 120 }: { start?: number; total?: number }) {
  const [page, setPage] = useState(start)
  const pageCount = Math.max(1, Math.ceil(total / 10))
  return (
    <>
      <Pagination page={page} pageCount={pageCount} total={total} pageSize={10} itemLabel="visits" onPageChange={setPage} />
      <button type="button" onClick={() => setPage(1)}>Reset filter</button>
    </>
  )
}

const field = () => screen.getByRole('textbox', { name: 'Page number' })
const showing = () => screen.getByText(/^Showing/).textContent

describe('Pagination page number field (S1)', () => {
  it('shows the current page in a numeric field, followed by the total', () => {
    render(<Pager />)
    expect(field()).toHaveValue('3')
    expect(field()).toHaveAttribute('inputmode', 'numeric')
    expect(screen.getByText('of 12')).toBeInTheDocument()
  })

  it('jumps to a typed page on Enter and announces it politely', async () => {
    const user = userEvent.setup()
    render(<Pager />)
    await user.clear(field())
    await user.type(field(), '7{Enter}')
    expect(showing()).toBe('Showing 61–70 of 120 visits')
    expect(field()).toHaveValue('7')
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent('Page 7 of 12')
  })

  it('applies the typed page when the field loses focus', async () => {
    const user = userEvent.setup()
    render(<Pager />)
    await user.clear(field())
    await user.type(field(), '5')
    expect(showing()).toBe('Showing 21–30 of 120 visits')
    await user.tab()
    expect(showing()).toBe('Showing 41–50 of 120 visits')
  })

  it('goes to the last page for a number past it, and to page 1 for one below 1', async () => {
    const user = userEvent.setup()
    render(<Pager />)
    await user.clear(field())
    await user.type(field(), '99{Enter}')
    expect(field()).toHaveValue('12')
    expect(showing()).toBe('Showing 111–120 of 120 visits')
    await user.clear(field())
    await user.type(field(), '0{Enter}')
    expect(field()).toHaveValue('1')
    expect(showing()).toBe('Showing 1–10 of 120 visits')
  })

  it('restores the current page for an empty field, a letter, or Escape', async () => {
    const user = userEvent.setup()
    render(<Pager />)
    await user.clear(field())
    await user.type(field(), '{Enter}')
    expect(field()).toHaveValue('3')
    await user.clear(field())
    await user.type(field(), 'b{Enter}')
    expect(field()).toHaveValue('3')
    await user.clear(field())
    await user.type(field(), '9{Escape}')
    expect(field()).toHaveValue('3')
    await user.tab()
    expect(showing()).toBe('Showing 21–30 of 120 visits')
  })

  it('follows Previous, Next and a page change from outside (a filter resetting to page 1)', async () => {
    const user = userEvent.setup()
    render(<Pager />)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(field()).toHaveValue('4')
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(field()).toHaveValue('2')
    await user.click(screen.getByRole('button', { name: 'Reset filter' }))
    expect(field()).toHaveValue('1')
  })

  it('keeps the field one width whatever is typed, sized for the page count, with a phone-sized target', () => {
    render(<Pager />)
    expect(field().style.width).toBe('calc(2ch + 1.5rem)')
    expect(field()).toHaveClass('h-11', 'sm:h-8', 'tabular-nums', 'text-center')
  })

  it('shows the field on a single page too, so every pager looks the same (Zean, November 5, 2026)', () => {
    render(<Pager start={1} total={7} />)
    expect(screen.getByRole('textbox', { name: 'Page number' })).toHaveValue('1')
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
  })

  it('is left out of the printout', () => {
    render(<Pager />)
    expect(screen.getByRole('navigation', { name: 'visits pagination' })).toHaveClass('print:hidden')
  })
})
