import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Combobox, type ComboboxProps } from './Combobox'

const FRUITS = ['Apple', 'Apricot', 'Banana']

function Harness(props: Partial<ComboboxProps<string>> & { onSubmit?: () => void }) {
  const [value, setValue] = useState('')
  const options = FRUITS.filter((fruit) => fruit.toLowerCase().includes(value.toLowerCase()))
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        props.onSubmit?.()
      }}
    >
      <Combobox
        label="Fruit"
        value={value}
        onValueChange={setValue}
        options={options}
        optionKey={(o) => o}
        optionLabel={(o) => o}
        allowFreeText
        {...props}
      />
    </form>
  )
}

describe('Combobox', () => {
  it('uses the ARIA combobox pattern and opens its suggestions on focus', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const field = screen.getByRole('combobox', { name: 'Fruit' })
    expect(field).toHaveAttribute('aria-expanded', 'false')
    await user.click(field)
    expect(field).toHaveAttribute('aria-expanded', 'true')
    expect(field).toHaveAttribute('aria-controls', screen.getByRole('listbox').id)
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('moves with the arrow keys, picks with Enter without submitting, and closes with Escape', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onPick = vi.fn()
    render(<Harness onSubmit={onSubmit} onPick={onPick} />)
    const field = screen.getByRole('combobox')
    await user.type(field, 'ap')
    await user.keyboard('{ArrowDown}{ArrowDown}')
    const active = screen.getByRole('option', { name: 'Apricot' })
    expect(field).toHaveAttribute('aria-activedescendant', active.id)
    expect(active).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Enter}')
    expect(field).toHaveValue('Apricot')
    expect(onPick).toHaveBeenCalledWith('Apricot')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(field).toHaveValue('Apricot')
  })

  it('keeps free text and says when nothing matches', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(screen.getByRole('combobox'), 'Mango{Enter}')
    expect(screen.getByRole('combobox')).toHaveValue('Mango')
    await user.click(screen.getByRole('combobox'))
    expect(screen.getByRole('status')).toHaveTextContent('No matches')
  })

  it('shows loading and error states, and auto-highlights for Enter when asked', async () => {
    const user = userEvent.setup()
    const onPick = vi.fn()
    const { rerender } = render(<Harness loading />)
    await user.click(screen.getByRole('combobox'))
    expect(screen.getByRole('status')).toHaveTextContent('Searching…')
    rerender(<Harness loadError="Couldn't load." />)
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load.")
    rerender(<Harness allowFreeText={false} autoHighlight onPick={onPick} />)
    await user.keyboard('{Enter}')
    expect(onPick).toHaveBeenCalledWith('Apple')
  })
})
