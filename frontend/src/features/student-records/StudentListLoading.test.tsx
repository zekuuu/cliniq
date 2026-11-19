import { renderWithRouter } from '../../test/renderWithRouter'
import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StudentListPage } from './StudentListPage'

vi.mock('./api/studentListApi', () => ({
  fetchStudentList: () => new Promise(() => {}),
  fetchGradeLevels: () => Promise.resolve(['Grade 1']),
  fetchIncompleteCount: () => new Promise(() => {}),
  // The screen asks for one page at a time (ADR-082).
  fetchStudentPage: () => new Promise(() => {}),
  STUDENT_SORT_KEYS: ['name', 'number', 'grade', 'status'],
}))

describe('Student List: first-load skeleton', () => {
  it('announces loading and shows shaped placeholders', () => {
    const { container } = renderWithRouter(<StudentListPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading student list...')
    expect(
      container.querySelectorAll('[aria-hidden="true"] .animate-pulse').length,
    ).toBeGreaterThan(8)
    expect(container.querySelector('.animate-spin')).toBeNull()
  })
})
