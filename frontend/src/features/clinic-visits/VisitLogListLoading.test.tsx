import { renderWithRouter } from '../../test/renderWithRouter'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VisitLogListPage } from './VisitLogListPage'

vi.mock('./api/visitLogApi', () => ({
  defaultVisitLogRange: () => ({ from: '2026-09-01', to: '2026-09-27' }),
  fetchVisitLog: () => new Promise(() => {}),
  // The screen asks for one page at a time (ADR-082).
  fetchVisitLogPage: () => new Promise(() => {}),
  VISIT_LOG_SORT_KEYS: ['dateTime', 'lrn', 'record', 'disposition'],
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
