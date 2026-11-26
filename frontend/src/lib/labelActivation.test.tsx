import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'

function Fields() {
  const [checked, setChecked] = useState(false)
  const [choice, setChoice] = useState('')
  return (
    <>
      <Input label="Name" value="" onChange={() => {}} />
      <Select
        label="Choice"
        value={choice}
        options={[{ value: 'one', label: 'One' }]}
        onChange={setChoice}
      />
      <label>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
        />
        Remember this
      </label>
    </>
  )
}

describe('field labels', () => {
  it('keeps accessible names while only direct control clicks focus or change them', async () => {
    const user = userEvent.setup()
    render(<Fields />)

    const name = screen.getByRole('textbox', { name: 'Name' })
    await user.click(screen.getByText('Name'))
    expect(name).not.toHaveFocus()
    await user.click(name)
    expect(name).toHaveFocus()

    const select = screen.getByRole('button', { name: 'Choice' })
    await user.click(screen.getByText('Choice'))
    expect(select).toHaveAttribute('aria-expanded', 'false')
    await user.click(select)
    expect(select).toHaveAttribute('aria-expanded', 'true')

    const checkbox = screen.getByRole('checkbox', { name: 'Remember this' })
    await user.click(screen.getByText('Remember this'))
    expect(checkbox).not.toBeChecked()
    await user.click(checkbox)
    expect(checkbox).toBeChecked()
  })
})
