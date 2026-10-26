import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getStudent, resetMockDb } from '../../lib/mock-db'
import { missingRequiredFields } from '../../lib/mock-db/selectors'
import { renderWithRouter } from '../../test/renderWithRouter'
import { StudentProfilePage } from './StudentProfilePage'

/** The student's own phone is optional for every grade; the profile banner (ST-9). */

const base = {
  id: 'student-x',
  lrn: '000000260999',
  fullName: 'Test Pupil',
  sex: 'female' as const,
  contactInfo: '',
  allergies: [],
  medicalConditions: [],
  emergencyContacts: [{ name: 'Maria Pupil', relationship: 'Mother', phone: '0917-000-0000', verified: true }],
  archived: false,
}

describe('student contact information', () => {
  it('is optional for every grade', () => {
    expect(missingRequiredFields({ ...base, gradeLevel: 'Kinder' })).toEqual([])
    expect(missingRequiredFields({ ...base, gradeLevel: 'Grade 1' })).toEqual([])
  })

  it('keeps the emergency contacts required', () => {
    expect(missingRequiredFields({ ...base, gradeLevel: 'Kinder', emergencyContacts: [] })).toEqual(['Emergency contact'])
  })
})

describe('allergy and condition banner (ST-9)', () => {
  beforeEach(() => resetMockDb())

  it('shows recorded allergies and conditions at the top of the profile', async () => {
    renderWithRouter(<StudentProfilePage studentId="student-0002" />)
    const banner = await screen.findByRole('region', { name: 'Allergies and medical conditions' })
    expect(banner).toHaveTextContent('Allergies: Peanuts')
    expect(banner).toHaveTextContent('Medical conditions: Allergic rhinitis')
  })

  it('shows nothing extra when none are recorded', async () => {
    expect((await getStudent('student-0001')).allergies).toEqual([])
    renderWithRouter(<StudentProfilePage studentId="student-0001" />)
    await screen.findByRole('heading', { name: 'Medical History' })
    expect(screen.queryByRole('region', { name: 'Allergies and medical conditions' })).not.toBeInTheDocument()
  })
})
