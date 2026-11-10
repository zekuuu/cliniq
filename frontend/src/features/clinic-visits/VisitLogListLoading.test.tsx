import { renderWithRouter } from '../../test/renderWithRouter'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VisitLogListPage } from './VisitLogListPage'

vi.mock('./api/visitLogApi', () => ({
  defaultVisitLogRange: () => ({ from: '2026-09-01', to: '2026-09-27' }),
  fetchVisitLog: () => new Promise(() => {}),
}))

describe('Visit Log List: first-load skeleton', () => {
  it('announces loading and shows shaped placeholders', () => {
    const { container } = renderWithRouter(<VisitLogListPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading visit log...')
    expect(
      container.querySelectorAll('[aria-hidden="true"] .animate-pulse').length,
    ).toBeGreaterThan(8)
    expect(container.querySelector('.animate-spin')).toBeNull()
  })
})
