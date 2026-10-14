import { renderWithRouter } from '../../test/renderWithRouter'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StudentProfilePage } from './StudentProfilePage'

vi.mock('./api/studentProfileApi', () => ({
  fetchStudentProfile: () => new Promise(() => {}),
}))

describe('Student Profile: first-load skeleton', () => {
  it('announces loading and shows shaped placeholders', () => {
    const { container } = renderWithRouter(<StudentProfilePage />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading student profile…')

    // Back is there while loading, so a slow screen can be left and nothing jumps when it loads.

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(container.querySelectorAll('[aria-hidden="true"] .animate-pulse').length).toBeGreaterThan(8)
    expect(container.querySelector('.animate-spin')).toBeNull()
  })
})
