import { renderWithRouter } from '../../test/renderWithRouter'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PrivacyPolicyPage } from './PrivacyPolicyPage'

describe('PrivacyPolicyPage', () => {
  it('renders the complete static draft, including the role table and unresolved contact placeholder', () => {
    renderWithRouter(<PrivacyPolicyPage />)

    expect(
      screen.getByRole('heading', { name: 'CLINIQ Privacy Policy — Draft', level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '1. Who this applies to', level: 2 }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: '11. Changes to this policy', level: 2 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /PE\/Sports Instructor.*No account and no access/ })).toBeInTheDocument()
    expect(
      screen.getByText(
        '[TBD — Mendez Christian Academy has not yet designated a contact for privacy inquiries or complaints. Do not publish this policy with this section unresolved.]',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByTestId('privacy-policy-skeleton')).not.toBeInTheDocument()
    expect(screen.queryByText('Gian Quizon')).not.toBeInTheDocument()
  })
})
