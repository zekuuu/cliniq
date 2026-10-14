import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NewVisitEntryPage } from './NewVisitEntryPage'
import { renderWithRouter } from '../../test/renderWithRouter'

vi.mock('./api/newVisitApi', () => ({
  fetchNewVisitContext: () => new Promise(() => {}),
  findVisitStudent: vi.fn(),
  submitNewVisit: vi.fn(),
}))

describe('New Visit Entry: first-load skeleton', () => {
  it('announces loading and shows shaped placeholders', () => {
    const { container } = renderWithRouter(<NewVisitEntryPage studentNumber="2026-00001" />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading visit form…')

    // Back is there while loading, so a slow screen can be left and nothing jumps when it loads.

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(container.querySelectorAll('[aria-hidden="true"] .animate-pulse').length).toBeGreaterThan(5)
    expect(container.querySelector('.animate-spin')).toBeNull()
  })
})
