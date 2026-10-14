import { renderWithRouter } from '../../test/renderWithRouter'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ExcuseLetterPage } from './ExcuseLetterPage'

vi.mock('./api/excuseLetterApi', () => ({
  fetchExcuseLetterContext: () => new Promise(() => {}),
  approveExcuseLetter: vi.fn(),
}))

describe('Excuse Letter Generator: first-load skeleton', () => {
  it('announces loading and shows shaped placeholders', () => {
    const { container } = renderWithRouter(<ExcuseLetterPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading excuse letter...')

    // Back is there while loading, so a slow screen can be left and nothing jumps when it loads.

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(container.querySelectorAll('[aria-hidden="true"] .animate-pulse').length).toBeGreaterThan(6)
    expect(container.querySelector('.animate-spin')).toBeNull()
  })
})
