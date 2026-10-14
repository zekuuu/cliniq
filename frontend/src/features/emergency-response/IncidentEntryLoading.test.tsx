import { renderWithRouter } from '../../test/renderWithRouter'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IncidentEntryPage } from './IncidentEntryPage'

vi.mock('./api/incidentEntryApi', () => ({
  fetchIncidentEntryContext: () => new Promise(() => {}),
}))

describe('Incident Entry: first-load skeleton', () => {
  it('announces loading and shows shaped placeholders', () => {
    const { container } = renderWithRouter(<IncidentEntryPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading incident form…')

    // Back is there while loading, so a slow screen can be left and nothing jumps when it loads.

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(container.querySelectorAll('[aria-hidden="true"] .animate-pulse').length).toBeGreaterThanOrEqual(5)
    expect(container.querySelector('.animate-spin')).toBeNull()
  })
})
