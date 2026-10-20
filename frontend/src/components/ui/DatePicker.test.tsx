import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DatePicker } from './DatePicker'
import { DateRangePicker } from './DateRangePicker'
import { MultiSelect } from './MultiSelect'

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

// An open popover left behind by Tab covers the control that just took focus (and its ring).
describe('Popovers close when keyboard focus leaves them', () => {
  it('closes the DatePicker calendar', async () => {
    const user = userEvent.setup()
    render(<><DatePicker label="Date" value="2026-10-08" onChange={vi.fn()} /><button type="button">Next field</button></>)
    await user.click(screen.getByRole('button', { name: 'Date' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => screen.getByRole('button', { name: 'Next field' }).focus())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes the DateRangePicker preset list', async () => {
    const user = userEvent.setup()
    render(
      <>
        <DateRangePicker value={{ preset: 'all', from: '1900-01-01', to: '2026-10-20' }} onChange={vi.fn()} today="2026-10-20" />
        <button type="button">Next field</button>
      </>,
    )
    await user.click(screen.getByRole('button', { name: 'Date range' }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    act(() => screen.getByRole('button', { name: 'Next field' }).focus())
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes the MultiSelect panel', async () => {
    const user = userEvent.setup()
    render(
      <>
        <MultiSelect label="Action type" values={[]} options={[{ value: 'archive', label: 'Archive' }]} allLabel="All actions" onChange={vi.fn()} />
        <button type="button">Next field</button>
      </>,
    )
    await user.click(screen.getByRole('button', { name: /action type all actions/i }))
    expect(screen.getByRole('checkbox', { name: 'Archive' })).toBeInTheDocument()
    act(() => screen.getByRole('button', { name: 'Next field' }).focus())
    expect(screen.queryByRole('checkbox', { name: 'Archive' })).not.toBeInTheDocument()
  })
})
