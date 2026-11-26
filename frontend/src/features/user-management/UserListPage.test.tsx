import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithRouter } from '../../test/renderWithRouter'
import { UserListPage } from './UserListPage'

describe('UserListPage table layout', () => {
  it('sizes columns by content and keeps the Actions controls at the right edge', async () => {
    renderWithRouter(<UserListPage />)
    const table = await screen.findByRole('table', { name: 'User accounts' })
    expect(table).toHaveClass('table-fixed')
    expect(table.style.minWidth).toBe('64rem')
    expect([...table.querySelectorAll('col')].map((col) => col.style.width)).toEqual([
      '',
      '12rem',
      '9rem',
      '7rem',
      '13.5rem',
      '7.5rem',
    ])
    expect(table.querySelectorAll('thead th')[5]).toHaveClass('text-left')
    expect(table.querySelector('tbody tr td:last-child > span')).toHaveClass('justify-start')
  })
})
