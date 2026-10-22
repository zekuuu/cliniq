import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PeSportsReferralPage } from './PeSportsReferralPage'
import { renderWithRouter } from '../../test/renderWithRouter'

vi.mock('./api/peReferralApi', () => ({
  fetchPeReferralContext: () => new Promise(() => {}),
  findReferralStudent: vi.fn(),
  submitPeReferral: vi.fn(),
}))

describe('PE/Sports Injury Referral Form: first-load skeleton', () => {
  it('announces loading and shows shaped placeholders', () => {
    const { container } = renderWithRouter(<PeSportsReferralPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading PE/Sports referral...')

    // Back is there while loading, so a slow screen can be left and nothing jumps when it loads.

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(container.querySelectorAll('[aria-hidden="true"] .animate-pulse').length).toBeGreaterThan(6)
    expect(container.querySelector('.animate-spin')).toBeNull()
  })
})
