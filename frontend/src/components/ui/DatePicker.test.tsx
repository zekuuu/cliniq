import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DatePicker } from './DatePicker'

describe('DatePicker keyboard', () => {
  it('starts on the min date when the value is below min, and arrows move from there', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    // "Excused until" still holds 2026-10-05 after "Excused from" moved to 2026-10-08.
    render(
      <DatePicker label="Excused until" value="2026-10-05" min="2026-10-08" onChange={onChange} />,
    )

    await user.click(screen.getByRole('button', { name: 'Excused until' }))
    expect(screen.getByRole('button', { name: /October 8, 2026/ })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('button', { name: /October 9, 2026/ })).toHaveFocus()

    // Arrows stop at min instead of moving onto a disabled day that can't take focus.
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('button', { name: /October 8, 2026/ })).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith('2026-10-08')
  })

  it('starts on the max date when the value is above max', async () => {
    const user = userEvent.setup()
    render(<DatePicker label="Date" value="2026-12-20" max="2026-12-10" onChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Date' }))
    expect(screen.getByRole('button', { name: /December 10, 2026/ })).toHaveFocus()
  })
})
