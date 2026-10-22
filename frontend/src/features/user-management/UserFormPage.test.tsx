import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithRouter } from '../../test/renderWithRouter'
import { UserFormPage } from './UserFormPage'

describe('UserFormPage profile picture chooser', () => {
  it('uses a preview and explicit Choose picture action while retaining file validation', async () => {
    renderWithRouter(<UserFormPage />)

    expect(await screen.findByRole('heading', { name: 'Profile picture' })).toBeInTheDocument()
    expect(screen.getByText('No picture selected.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose picture' })).toBeInTheDocument()

    expect(screen.getByLabelText('Choose profile picture')).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
  })
})
