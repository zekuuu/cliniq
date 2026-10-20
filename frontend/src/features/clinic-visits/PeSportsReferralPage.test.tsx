import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { getRecordedAuditEntries, getStudent, resetMockDb } from '../../lib/mock-db'
import { db } from '../../lib/mock-db/store'
import { PeSportsReferralPage } from './PeSportsReferralPage'
import { renderWithRouter } from '../../test/renderWithRouter'
import { pickStudent } from '../../test/pickStudent'

describe('PE/Sports Injury Referral', () => {
  beforeEach(() => resetMockDb())

  it('renders a deliberate single-student referral form', async () => {
    const student = await getStudent('2026-00001')
    const user = userEvent.setup()
    renderWithRouter(<PeSportsReferralPage />)
    await pickStudent(user, '2026-00001')

    expect(
      await screen.findByRole('heading', { name: 'PE/Sports Injury Referral' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(new RegExp(student.fullName)).length).toBeGreaterThan(0)
    expect(screen.getByText(/Emergency escalation not selected/)).toBeInTheDocument()
  })

  it('validates required fields inline', async () => {
    const user = userEvent.setup()
    renderWithRouter(<PeSportsReferralPage />)
    await pickStudent(user, '2026-00001')

    await screen.findByRole('heading', { name: 'PE/Sports Injury Referral' })
    await user.click(screen.getByRole('button', { name: 'Save Referral' }))

    expect(screen.getByText('Enter who submitted the referral.')).toBeInTheDocument()
    expect(screen.getByText('Enter the injury summary.')).toBeInTheDocument()
    expect(screen.getByText('Enter the clinical assessment.')).toBeInTheDocument()
  })

  it('loads PE defaults and saves a non-hospital referral audit entry', async () => {
    const user = userEvent.setup()
    renderWithRouter(<PeSportsReferralPage />)
    await pickStudent(user, '2026-00001')

    await screen.findByRole('heading', { name: 'PE/Sports Injury Referral' })
    await user.click(screen.getByRole('button', { name: 'Use PE Defaults' }))
    // Instructors have no account (ADR-029): "Referred by" is never pre-filled, Staff type the name.
    expect(screen.getByLabelText(/referred by/i)).toHaveValue('')
    await user.type(screen.getByLabelText(/referred by/i), 'Coach Reyes')
    // All five fields get starter text, not just the first two.
    for (const label of [/activity or setting/i, /injury summary/i, /clinical assessment/i, /treatment or action taken/i]) {
      expect(screen.getByLabelText(label)).not.toHaveValue('')
    }

    await user.type(screen.getByLabelText(/injury summary/i), 'Ankle twist during drills.')
    await user.type(screen.getByLabelText(/clinical assessment/i), 'Mild swelling, able to stand.')
    await user.type(screen.getByLabelText(/treatment or action taken/i), 'Cold compress and rest.')
    await user.click(screen.getByRole('button', { name: 'Save Referral' }))

    expect(await screen.findByText('PE/Sports referral saved.')).toBeInTheDocument()
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toEqual(['submit'])
    expect(db().frontendOnly.peReferrals.at(-1)).toMatchObject({ referredBy: 'Coach Reyes' })
  })

  it('queues Emergency Response escalation when hospital referral is selected', async () => {
    const user = userEvent.setup()
    renderWithRouter(<PeSportsReferralPage />)
    await pickStudent(user, '2026-00001')

    await screen.findByRole('heading', { name: 'PE/Sports Injury Referral' })
    await user.click(screen.getByRole('button', { name: 'Use PE Defaults' }))
    await user.type(screen.getByLabelText(/referred by/i), 'Coach Reyes')
    await user.type(screen.getByLabelText(/injury summary/i), 'Head impact during basketball.')
    await user.type(screen.getByLabelText(/clinical assessment/i), 'Dizzy and needs referral.')
    await user.type(screen.getByLabelText(/treatment or action taken/i), 'Observed and called guardian.')
    await user.click(screen.getByRole('radio', { name: 'Hospital referral' }))

    expect(screen.getByText(/Continue in Emergency Response/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Referral' }))

    expect(await screen.findByText(/Emergency Response escalation was queued/)).toBeInTheDocument()
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toEqual(['submit', 'create'])
  })

  it('asks for the Student Number instead of using a default student', async () => {
    const user = userEvent.setup()
    renderWithRouter(<PeSportsReferralPage />)

    await screen.findByRole('heading', { name: 'PE/Sports Injury Referral' })
    expect(screen.getByText(/student not identified yet/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Use PE Defaults' }))
    await user.type(screen.getByLabelText(/referred by/i), 'Coach Reyes')
    await user.click(screen.getByRole('button', { name: 'Save Referral' }))
    expect(screen.getByText('Choose the student: type a Student Number or name, then pick from the list.')).toBeInTheDocument()
    expect(getRecordedAuditEntries()).toEqual([])

    await user.type(screen.getByRole('combobox', { name: /student/i }), '202600001')
    await user.click(await screen.findByRole('option', { name: /2026-00001/ }))
    expect(await screen.findByRole('button', { name: /change student/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Referral' }))
    expect(await screen.findByText('PE/Sports referral saved.')).toBeInTheDocument()
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toEqual(['submit'])
  })
})
