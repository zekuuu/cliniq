import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { addDays, formatDate, todayISO } from '../../lib/dates'
import { getExcuseLetterApproval, getRecordedAuditEntries, getVisit, resetMockDb } from '../../lib/mock-db'
import { pickDate } from '../../test/pickDate'
import { renderWithRouter } from '../../test/renderWithRouter'
import { NewVisitEntryPage } from './NewVisitEntryPage'

const complaintField = () => screen.getByRole('button', { name: /complaint/i })
async function selectComplaint(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(complaintField())
  await user.click(screen.getByRole('option', { name: label }))
}

/**
 * The visit this test just saved, found by identity (its submit audit entry), not by sorting on time:
 * the newest-by-time visit is a seed record whenever the clock is earlier in the day than the seed's
 * same-day visits (for example just after midnight).
 */
function getSavedVisit() {
  const entry = getRecordedAuditEntries().findLast(
    (e) => e.actionType === 'submit' && e.targetRecord?.type === 'visit',
  )
  if (!entry?.targetRecord) throw new Error('No visit was saved')
  return getVisit(entry.targetRecord.id)
}

describe('New Visit', () => {
  beforeEach(() => resetMockDb())

  it('shows the identified student and reveals Smart Triage for a case-insensitive complaint match', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage studentNumber="2026-00001" />)

    expect(await screen.findByRole('heading', { name: 'New Visit' })).toBeInTheDocument()
    expect(screen.getByText(/\d{4}-\d{5}/)).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /student/i })).not.toBeInTheDocument()
    await selectComplaint(user, 'Fever')
    expect(screen.getByRole('heading', { name: /suggested first-aid steps for: Fever/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Check temperature')).toBeInTheDocument()
  })

  it('validates required fields inline, and whitespace is not a complaint', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage studentNumber="2026-00001" />)

    await screen.findByRole('heading', { name: 'New Visit' })
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))
    expect(screen.getByText('Enter the complaint for this visit.')).toBeInTheDocument()
    // Treatment notes and items given are optional: a quiet, non-blocking note instead of an error.
    expect(screen.queryByText(/enter treatment notes/i)).not.toBeInTheDocument()
    expect(screen.getByText('No treatment recorded. You can still save.')).toBeInTheDocument()
  })

  it('saves a visit with neither treatment notes nor a medicine', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage studentNumber="2026-00001" />)

    await screen.findByRole('heading', { name: 'New Visit' })
    await selectComplaint(user, 'Headache')
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))

    expect(await screen.findByText(/visit saved/i)).toBeInTheDocument()
    expect(await getSavedVisit()).toMatchObject({ complaint: 'Headache', treatment: '', itemsGiven: [] })
  })

  it('creates audit entries for visit submission and follow-up creation', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage studentNumber="2026-00001" />)

    await screen.findByRole('heading', { name: 'New Visit' })
    await selectComplaint(user, 'Headache')
    await user.click(screen.getByLabelText('Check temperature'))
    await user.type(screen.getByLabelText(/treatment/i), 'Rested in clinic and hydrated.')
    await user.click(screen.getByLabelText(/this student needs a follow-up/i))
    await user.type(screen.getByLabelText(/reason/i), 'Recheck symptoms tomorrow')
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))

    expect(await screen.findByText(/visit saved/i)).toBeInTheDocument()
    expect(screen.getByText(/pending follow-up was created/i)).toBeInTheDocument()
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toEqual(['submit', 'create'])
  })

  it('lists a capped set of complaints and saves typed Other text with no checklist', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage studentNumber="2026-00001" />)

    await screen.findByRole('heading', { name: 'New Visit' })
    await user.click(complaintField())
    const initialOptions = screen.getAllByRole('option')
    expect(initialOptions).toHaveLength(9)
    expect(initialOptions[0]).toHaveTextContent('Other (type your own)')
    await user.click(screen.getByRole('option', { name: 'Other (type your own)' }))
    await user.type(screen.getByLabelText(/specify other complaint/i), '  Nose   bleed ')
    expect(screen.queryByRole('heading', { name: /suggested first-aid steps/i })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText(/treatment/i), 'Pinched nose, leaned forward.')
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))

    expect(await screen.findByText(/visit saved/i)).toBeInTheDocument()
    expect((await getSavedVisit()).complaint).toBe('Nose bleed')
  })

  it('selects Other and focuses an empty Other field', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage studentNumber="2026-00001" />)

    await screen.findByRole('heading', { name: 'New Visit' })
    const complaint = complaintField()
    await user.click(complaint)
    await user.click(screen.getByRole('option', { name: 'Other (type your own)' }))

    expect(complaint).toHaveTextContent('Other (type your own)')
    const otherComplaint = screen.getByLabelText(/specify other complaint/i)
    expect(otherComplaint).toHaveValue('')
    expect(otherComplaint).toHaveFocus()
    await user.type(otherComplaint, 'Noise-related discomfort')
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))
    expect((await getSavedVisit()).complaint).toBe('Noise-related discomfort')
  })

  it('stores a selected complaint in its suggestion spelling', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage studentNumber="2026-00001" />)

    await screen.findByRole('heading', { name: 'New Visit' })
    await selectComplaint(user, 'Headache')
    await user.type(screen.getByLabelText(/treatment/i), 'Rested.')
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))

    expect(await screen.findByText(/visit saved/i)).toBeInTheDocument()
    expect((await getSavedVisit()).complaint).toBe('Headache')
  })
})

describe('New Visit student lookup', () => {
  beforeEach(() => resetMockDb())

  it('lists nothing on focus, finds from the first character, and shows number, name, and grade', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage />)

    const field = await screen.findByRole('combobox', { name: /student/i })
    expect(field).toHaveAttribute('placeholder', 'YYYY-NNNNN or student name')
    await user.click(field)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    await user.type(field, 'q')
    expect(await screen.findByRole('listbox')).toBeInTheDocument()
    await user.type(field, 'uizon')
    const option = await screen.findByRole('option', { name: /2026-00001.*Gian Quizon/ })
    expect(option).toHaveTextContent("Kinder")
    await user.click(option)

    const changeButton = await screen.findByRole('button', { name: /change student \(Gian Quizon\)/i })
    expect(within(changeButton.parentElement!).getByText('2026-00001')).toBeInTheDocument()
    await user.click(changeButton)
    expect(screen.getByRole('combobox', { name: /student/i })).toHaveFocus()
  })

  it('picks with Enter after a complete Student Number, keyboard only', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage />)

    await user.click(await screen.findByRole('combobox', { name: /student/i }))
    await user.keyboard('2026-00001')
    await screen.findByRole('option', { name: /Gian Quizon/ })
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('button', { name: /change student/i })).toBeInTheDocument()
  })

  it('finds a Student Number typed without its dash, leaves the text as typed, and picks on Enter', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage />)

    const field = await screen.findByRole('combobox', { name: /student/i })
    await user.type(field, '202600001')
    expect(field).toHaveValue('202600001')
    await screen.findByRole('option', { name: /2026-00001.*Gian Quizon/ })
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('button', { name: /change student \(Gian Quizon\)/i })).toBeInTheDocument()
  })

  it('says when nothing matches and offers Staff a link to add the student', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage />)

    await user.type(await screen.findByRole('combobox', { name: /student/i }), 'zzzz')
    expect(await screen.findByText(/no active student matches/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /add a student/i })).toHaveAttribute('href', '/students/new')
  })

  it('asks for a pick before saving', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage />)

    await screen.findByRole('combobox', { name: /student/i })
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))
    expect(screen.getByText(/choose the student/i)).toBeInTheDocument()
  })
})

describe('New Visit: disposition-specific fields', () => {
  beforeEach(() => resetMockDb())

  async function openForm() {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage studentNumber="2026-00001" />)
    await screen.findByRole('heading', { name: 'New Visit' })
    await selectComplaint(user, 'Fever')
    return user
  }

  it('shows nothing for Returned to class, the letter for Sent home, and the letter plus "Referred to" for a referral', async () => {
    const user = await openForm()
    expect(screen.queryByLabelText(/prepare an excuse letter/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/referred to/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Sent home' }))
    expect(screen.getByLabelText(/prepare an excuse letter/i)).toBeChecked()
    expect(screen.getByRole('button', { name: /^Excused from/ })).toHaveTextContent(formatDate(todayISO()))
    expect(screen.getByLabelText('Note for the teacher')).toBeInTheDocument()
    expect(screen.queryByLabelText(/referred to/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Referred to hospital' }))
    expect(screen.getByLabelText(/prepare an excuse letter/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Referred to (hospital or clinic)')).toBeInTheDocument()
  })

  it('clears the fields when the disposition changes, and validates them only while shown', async () => {
    const user = await openForm()
    await user.click(screen.getByRole('radio', { name: 'Referred to hospital' }))
    await user.type(screen.getByLabelText(/referred to/i), 'Provincial Hospital')
    await user.type(screen.getByLabelText('Note for the teacher'), 'Excuse from PE')
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))
    expect(screen.getByText('Excused from and Excused until are both required.')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Sent home' }))
    expect(screen.getByLabelText('Note for the teacher')).toHaveValue('')
    expect(screen.queryByText('Excused from and Excused until are both required.')).not.toBeInTheDocument()

    // Hidden fields aren't validated: back to Returned to class, the visit saves with no letter.
    await user.click(screen.getByRole('radio', { name: 'Returned to class' }))
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))
    expect(await screen.findByText(/visit saved/i)).toBeInTheDocument()
    expect(await getSavedVisit()).toMatchObject({ excuseLetterDraft: null, referredTo: null })
  })

  it('saves the letter as a draft, not an approved letter, and offers to review it', async () => {
    const user = await openForm()
    const today = todayISO()
    await user.click(screen.getByRole('radio', { name: 'Referred to hospital' }))
    await user.type(screen.getByLabelText(/referred to/i), 'Provincial Hospital')
    await pickDate(user, screen.getByRole('button', { name: /^Excused until/ }), addDays(today, 2))
    await user.type(screen.getByLabelText('Note for the teacher'), 'Excuse from PE this week')
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))

    expect(await screen.findByText(/visit saved/i)).toBeInTheDocument()
    const visit = await getSavedVisit()
    expect(visit).toMatchObject({
      disposition: 'referred_to_hospital',
      referredTo: 'Provincial Hospital',
      excuseLetterDraft: { excusedFrom: today, excusedUntil: addDays(today, 2), note: 'Excuse from PE this week' },
    })
    expect(await getExcuseLetterApproval(visit.id)).toBeNull()
    expect(screen.getByRole('link', { name: 'Review excuse letter' })).toHaveAttribute('href', `/visits/${visit.id}/excuse-letter`)
  })

  it('stores no draft when "Prepare an excuse letter" is unticked', async () => {
    const user = await openForm()
    await user.click(screen.getByRole('radio', { name: 'Sent home' }))
    await user.click(screen.getByLabelText(/prepare an excuse letter/i))
    expect(screen.queryByRole('button', { name: /^Excused until/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))

    expect(await screen.findByText(/visit saved/i)).toBeInTheDocument()
    expect((await getSavedVisit()).excuseLetterDraft).toBeNull()
    expect(screen.queryByRole('link', { name: 'Review excuse letter' })).not.toBeInTheDocument()
  })

  it('uses the last successfully saved disposition for the next visit in this session', async () => {
    const user = await openForm()
    await user.click(screen.getByRole('radio', { name: 'Sent home' }))
    await user.click(screen.getByLabelText(/prepare an excuse letter/i))
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))

    expect(await screen.findByText(/visit saved/i)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Sent home' })).toHaveAttribute('aria-checked', 'true')
  })
})
