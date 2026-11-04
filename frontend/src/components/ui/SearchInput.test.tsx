import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Input } from './Input'

/* Every search field: the value reaches the page 250ms after typing stops, and a clear (X) button shows
   whenever there is text (Zean, November 4, 2026). */

function Harness({ onSearch }: { onSearch: (value: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <Input
      label="Search"
      type="search"
      value={value}
      onChange={(event) => {
        setValue(event.target.value)
        onSearch(event.target.value)
      }}
    />
  )
}

describe('search fields', () => {
  it('waits for typing to stop before searching, and clears at once with the X', async () => {
    const onSearch = vi.fn()
    const user = userEvent.setup({ delay: null })
    render(<Harness onSearch={onSearch} />)
    const field = screen.getByRole('searchbox', { name: 'Search' })
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()
    await user.type(field, 'ana')
    expect(field).toHaveValue('ana')
    expect(onSearch).not.toHaveBeenCalled()
    await waitFor(() => expect(onSearch).toHaveBeenCalledTimes(1))
    expect(onSearch).toHaveBeenLastCalledWith('ana')
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(onSearch).toHaveBeenLastCalledWith('')
    expect(field).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()
  })
})
