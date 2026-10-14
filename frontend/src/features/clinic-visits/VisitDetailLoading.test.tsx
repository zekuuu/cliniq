import { renderWithRouter } from '../../test/renderWithRouter'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VisitDetailPage } from './VisitDetailPage'

vi.mock('./api/visitDetailApi', () => ({
  fetchVisitDetail: () => new Promise(() => {}),
  updateVisitDetail: vi.fn(),
  valuesFromVisit: vi.fn(),
}))

describe('Visit Detail/Edit: first-load skeleton', () => {
  it('announces loading and shows shaped placeholders', () => {
    const { container } = renderWithRouter(<VisitDetailPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading visit detail...')

    // Back is there while loading, so a slow screen can be left and nothing jumps when it loads.

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(container.querySelectorAll('[aria-hidden="true"] .animate-pulse').length).toBeGreaterThan(8)
    expect(container.querySelector('.animate-spin')).toBeNull()
  })
})
