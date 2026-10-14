import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Select } from './Select'

const grades = ['Kinder', 'Grade 1', 'Grade 2', 'Grade 10'].map((grade) => ({ value: grade, label: grade }))

function GradeFilter({ onChange = () => {} }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <Select
      label="Grade level"
      value={value}
      placeholder="All grade levels"
      clearable
      options={grades}
      onChange={(next) => {
        setValue(next)
        onChange(next)
      }}
    />
  )
}

describe('Select', () => {
  it('keeps a prompt placeholder on the trigger only, out of the option list', async () => {
    const user = userEvent.setup()
    render(<Select label="Complaint" value="" placeholder="Select complaint" options={grades} onChange={() => {}} />)
    const trigger = screen.getByRole('button', { name: 'Complaint Select complaint' })

    await user.click(trigger)
    expect(screen.queryByRole('option', { name: 'Select complaint' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(grades.map((g) => g.label))
    expect(screen.getByRole('option', { name: 'Kinder' })).toHaveFocus()
  })

  it('shows the current choice on a themed trigger and keeps the options closed until asked', () => {
    render(<GradeFilter />)
    const trigger = screen.getByRole('button', { name: 'Grade level All grade levels' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveClass('cursor-pointer', 'font-semibold', 'hover:bg-surface')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('marks the selected option by weight and tint, never by an icon', async () => {
    const user = userEvent.setup()
    render(<GradeFilter />)
    await user.click(screen.getByLabelText('Grade level'))

    const listbox = screen.getByRole('listbox', { name: 'Grade level' })
    expect(listbox.querySelector('svg')).not.toBeInTheDocument()
    const selected = screen.getByRole('option', { name: 'All grade levels' })
    expect(selected).toHaveAttribute('aria-selected', 'true')
    expect(selected).toHaveClass('bg-surface', 'font-semibold', 'text-brand-green-dark')
    expect(selected).toHaveFocus()
    expect(screen.getByRole('option', { name: 'Grade 1' })).toHaveClass('hover:bg-surface')
  })

  it('reports a clicked option, closes, and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<GradeFilter onChange={onChange} />)
    const trigger = screen.getByLabelText('Grade level')

    await user.click(trigger)
    await user.click(screen.getByRole('option', { name: 'Grade 2' }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith('Grade 2')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Grade level Grade 2' })).toHaveFocus()
  })

  it('works from the keyboard: arrows, Home/End, typing to jump, Enter, and Escape', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<GradeFilter onChange={onChange} />)
    const trigger = screen.getByLabelText('Grade level')

    trigger.focus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('option', { name: 'All grade levels' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('option', { name: 'Kinder' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('option', { name: 'Grade 10' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('option', { name: 'All grade levels' })).toHaveFocus()

    // A typed space belongs to the label being typed; it doesn't pick the focused option.
    await user.keyboard('grade 2')
    expect(screen.getByRole('option', { name: 'Grade 2' })).toHaveFocus()
    expect(onChange).not.toHaveBeenCalled()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(onChange).not.toHaveBeenCalled()

    await user.keyboard('{Enter}{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenCalledExactlyOnceWith('Kinder')
    expect(trigger).toHaveFocus()
  })

  it('closes when a click lands outside it, and stays shut while disabled', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <>
        <Select label="Category" value="medicine" options={[{ value: 'medicine', label: 'Medicine' }]} onChange={() => {}} />
        <p>Elsewhere</p>
      </>,
    )
    await user.click(screen.getByLabelText('Category'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.click(screen.getByText('Elsewhere'))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    rerender(<Select label="Category" value="medicine" disabled options={[{ value: 'medicine', label: 'Medicine' }]} onChange={() => {}} />)
    await user.click(screen.getByLabelText('Category'))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('names a required field and ties its error to the trigger', () => {
    render(<Select label="Complaint" required value="" placeholder="Select complaint" options={[]} error="Select the complaint for this visit." onChange={() => {}} />)
    const trigger = screen.getByLabelText(/complaint/i)
    expect(trigger).toHaveAccessibleName(/^Complaint\s*\(required\) Select complaint$/)
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
    expect(trigger).toHaveAccessibleDescription('Select the complaint for this visit.')
    expect(trigger).toHaveClass('border-error')
  })
})
