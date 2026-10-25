import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { beginPasswordChange } from '../../lib/mock-db'
import { renderWithRouter } from '../../test/renderWithRouter'
import { ForcePasswordChangePage } from './ForcePasswordChangePage'

describe('Force Password Change', () => {
  it('shares the Login backdrop and brand header, so the first sign-in reads as one flow', async () => {
    beginPasswordChange('user-staff-02')
    renderWithRouter(<ForcePasswordChangePage onComplete={() => {}} />, {
      route: '/force-password-change',
    })

    expect(await screen.findByRole('heading', { name: 'Change Your Password' })).toBeInTheDocument()
    expect(screen.getByTestId('login-backdrop')).toBeInTheDocument()
    expect(screen.getByAltText('Mendez Christian Academy logo')).toBeInTheDocument()
    expect(screen.getByText('CLINIQ')).toBeInTheDocument()
  })
})
