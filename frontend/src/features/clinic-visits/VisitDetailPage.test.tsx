import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { formatDateRange } from '../../lib/dates'
import { getExcuseLetterApproval, getRecordedAuditEntries, getVisit, resetMockDb } from '../../lib/mock-db'
import { renderWithRouter } from '../../test/renderWithRouter'
import { VisitDetailPage } from './VisitDetailPage'
import { fetchVisitDetail } from './api/visitDetailApi'
import { maskLrn } from '../../lib/lrn'

const letterCard = () => screen.getByRole('region', { name: 'Excuse letter' })

describe('Visit Details', () => {
  beforeEach(() => resetMockDb())

  it('shows full student and clinical details for a deliberately opened visit', async () => {
    const detail = await fetchVisitDetail('visit-0157')
    renderWithRouter(<VisitDetailPage visitId="visit-0157" />)

    expect(await screen.findByRole('heading', { name: 'Visit Details' })).toBeInTheDocument()
    expect(screen.getByText(detail.student.fullName)).toBeInTheDocument()
    expect(screen.getAllByText(maskLrn(detail.student.lrn)).length).toBeGreaterThan(0)
    expect(screen.getByText(detail.complaint)).toBeInTheDocument()
    expect(screen.getByText(detail.treatment)).toBeInTheDocument()
  })

  it('shows "No treatment recorded" for a visit with no notes and nothing given', async () => {
    renderWithRouter(<VisitDetailPage visitId="visit-0158" />)
    expect(await screen.findByText('No treatment recorded.')).toBeInTheDocument()
  })

  it('requires the complaint only: notes stay optional, with a quiet note near Save', async () => {
    const user = userEvent.setup()
    renderWithRouter(<VisitDetailPage visitId="visit-0157" />)

    await screen.findByRole('heading', { name: 'Visit Details' })
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: /complaint/i }))
    await user.click(screen.getByRole('option', { name: 'Other (type your own)' }))
    await user.click(screen.getByRole('button', { name: 'Remove Paracetamol 500mg' }))
    await user.clear(screen.getByLabelText(/treatment/i))
    expect(screen.getByText('No treatment recorded. You can still save.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(screen.getByText('Enter the visit complaint.')).toBeInTheDocument()
    expect(screen.queryByText(/enter treatment notes/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /complaint/i }))
    await user.click(screen.getByRole('option', { name: 'Headache' }))
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByText('Visit updated.')).toBeInTheDocument()
    expect(screen.getByText('No treatment recorded.')).toBeInTheDocument()
    expect((await getVisit('visit-0157')).treatment).toBe('')
  })

  it('edits the complaint with the shared dropdown and stores the suggestion spelling', async () => {
    const user = userEvent.setup()
    renderWithRouter(<VisitDetailPage visitId="visit-0158" />)

    await screen.findByRole('heading', { name: 'Visit Details' })
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: /complaint/i }))
    await user.click(screen.getByRole('option', { name: 'Headache' }))
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Visit updated.')).toBeInTheDocument()
    expect((await getVisit('visit-0158')).complaint).toBe('Headache')
  })

  it('uses Other to reveal a focused field holding the existing complaint text', async () => {
    const user = userEvent.setup()
    renderWithRouter(<VisitDetailPage visitId="visit-0158" />)

    await screen.findByRole('heading', { name: 'Visit Details' })
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const complaint = screen.getByRole('button', { name: /complaint/i })
    await user.click(complaint)
    await user.click(screen.getByRole('option', { name: 'Other (type your own)' }))
    expect(complaint).toHaveTextContent('Other (type your own)')
    const otherComplaint = screen.getByLabelText(/specify other complaint/i)
    expect(otherComplaint).toHaveValue('')
    expect(otherComplaint).toHaveFocus()
    await user.type(otherComplaint, 'Noise-related discomfort')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Visit updated.')).toBeInTheDocument()
    expect((await getVisit('visit-0158')).complaint).toBe('Noise-related discomfort')
  })

  it('updates the visit and writes an audit entry', async () => {
    const user = userEvent.setup()
    renderWithRouter(<VisitDetailPage visitId="visit-0157" />)

    await screen.findByRole('heading', { name: 'Visit Details' })
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText(/treatment/i))
    await user.type(screen.getByLabelText(/treatment/i), 'Observed in clinic and released.')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Visit updated.')).toBeInTheDocument()
    expect(screen.getByText('Observed in clinic and released.')).toBeInTheDocument()
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toEqual(['update'])
  })
})

describe('Visit Details: excuse letter and disposition fields', () => {
  beforeEach(() => resetMockDb())

  it('shows an approved letter with the same period the profile lists', async () => {
    const approval = (await getExcuseLetterApproval('visit-0139'))!
    renderWithRouter(<VisitDetailPage visitId="visit-0139" />)

    await screen.findByRole('heading', { name: 'Visit Details' })
    expect(within(letterCard()).getByText('Approved')).toBeInTheDocument()
    expect(within(letterCard()).getByText(formatDateRange(approval.excusedFrom, approval.excusedUntil))).toBeInTheDocument()
    expect(within(letterCard()).getByText('Please allow the student to submit missed work.')).toBeInTheDocument()
    expect(within(letterCard()).getByRole('link', { name: 'View excuse letter' })).toHaveAttribute(
      'href',
      '/visits/visit-0139/excuse-letter',
    )
  })

  it('shows a draft as Pending approval, and "Not prepared" when there is none', async () => {
    const draft = (await getVisit('visit-0151')).excuseLetterDraft!
    const { unmount } = renderWithRouter(<VisitDetailPage visitId="visit-0151" />)
    await screen.findByRole('heading', { name: 'Visit Details' })
    expect(within(letterCard()).getByText('Pending approval')).toBeInTheDocument()
    expect(within(letterCard()).getByText(formatDateRange(draft.excusedFrom, draft.excusedUntil))).toBeInTheDocument()
    expect(within(letterCard()).getByRole('link', { name: 'Review excuse letter' })).toBeInTheDocument()
    unmount()

    renderWithRouter(<VisitDetailPage visitId="visit-0142" />)
    await screen.findByRole('heading', { name: 'Visit Details' })
    expect(within(letterCard()).getByText('Not prepared')).toBeInTheDocument()
    expect(screen.getByText('Provincial Hospital emergency room')).toBeInTheDocument()
  })

  it('is Staff only: other roles see neither the visit nor its letter', async () => {
    renderWithRouter(<VisitDetailPage visitId="visit-0139" viewer={{ id: 'user-admin-01', name: 'Gilan Avelida', role: 'admin' }} />)
    expect(screen.getByText('Staff access required.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Excuse letter' })).not.toBeInTheDocument()
  })

  it('shows the letter fields only for Sent home or Referred, and clears them on a change', async () => {
    const user = userEvent.setup()
    renderWithRouter(<VisitDetailPage visitId="visit-0151" />)

    await screen.findByRole('heading', { name: 'Visit Details' })
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    // The saved draft loads into the form.
    expect(screen.getByLabelText('Note for the teacher')).toHaveValue('Please allow the student to take the missed quiz.')
    expect(screen.queryByLabelText(/referred to/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Returned to class' }))
    expect(screen.queryByLabelText(/prepare an excuse letter/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Referred to hospital' }))
    expect(screen.getByLabelText(/referred to/i)).toHaveValue('')
    expect(screen.getByLabelText(/prepare an excuse letter/i)).toBeChecked()
    expect(screen.getByLabelText('Note for the teacher')).toHaveValue('')

    // "Excused until" was cleared, so it's required again.
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(screen.getByText('Excused from and Excused until are both required.')).toBeInTheDocument()

    await user.click(screen.getByLabelText(/prepare an excuse letter/i))
    await user.type(screen.getByLabelText(/referred to/i), 'Rural Health Unit')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(await screen.findByText('Visit updated.')).toBeInTheDocument()
    expect(await getVisit('visit-0151')).toMatchObject({
      disposition: 'referred_to_hospital',
      referredTo: 'Rural Health Unit',
      excuseLetterDraft: null,
    })
    expect(within(letterCard()).getByText('Not prepared')).toBeInTheDocument()
  })

  it('keeps an approved letter when the visit changes disposition, and says so', async () => {
    const user = userEvent.setup()
    const before = await getExcuseLetterApproval('visit-0141')
    renderWithRouter(<VisitDetailPage visitId="visit-0141" />)

    await screen.findByRole('heading', { name: 'Visit Details' })
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByText(/approved excuse letter exists/i)).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Sent home' }))
    expect(screen.queryByLabelText(/prepare an excuse letter/i)).not.toBeInTheDocument()
    expect(screen.getByText(/doesn't change or remove it/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Visit updated.')).toBeInTheDocument()
    expect(await getExcuseLetterApproval('visit-0141')).toEqual(before)
    expect((await getVisit('visit-0141')).excuseLetterDraft).toBeNull()
    expect(within(letterCard()).getByText('Approved')).toBeInTheDocument()
  })
})
