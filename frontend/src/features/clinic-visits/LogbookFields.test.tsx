import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { getRecordedAuditEntries, getVisit, resetMockDb, updateVisit } from '../../lib/mock-db'
import { renderWithRouter } from '../../test/renderWithRouter'
import { pickStudent } from '../../test/pickStudent'
import { NewVisitEntryPage } from './NewVisitEntryPage'
import { VisitDetailPage } from './VisitDetailPage'

/** The visit this test just saved, found by its submit audit entry (see NewVisitEntryPage.test.tsx). */
function getSavedVisit() {
  const entry = getRecordedAuditEntries().findLast((e) => e.actionType === 'submit' && e.targetRecord?.type === 'visit')
  if (!entry?.targetRecord) throw new Error('No visit was saved')
  return getVisit(entry.targetRecord.id)
}

const moreButton = () => screen.getByRole('button', { name: /show (more|fewer) fields/i })

async function pickHeadache(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /complaint/i }))
  await user.click(screen.getByRole('option', { name: 'Headache' }))
}

// jsdom's time input takes a full "HH:MM" value; a change event sets it the way a finished entry does.
const setTimeOut = (value: string) => fireEvent.change(screen.getByLabelText('Time out'), { target: { value } })

describe('Visit logbook fields ("Show more fields")', () => {
  beforeEach(() => resetMockDb())

  it('starts closed on a new visit, with its fields out of the Tab order and the accessibility tree', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage />)
    await pickStudent(user, '000000260001')
    await screen.findByRole('heading', { name: 'New Visit' })

    expect(moreButton()).toHaveAccessibleName('Show more fields')
    expect(moreButton()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('textbox', { name: 'Assisted by' })).not.toBeInTheDocument()
    const remarks = screen.getByLabelText('Remarks', { selector: 'textarea' })
    expect(remarks).not.toBeVisible()
    moreButton().focus()
    await user.tab()
    expect(remarks).not.toHaveFocus()
    expect(screen.getByLabelText('Assisted by')).not.toHaveFocus()
  })

  it('opens with Enter without moving focus, then keeps the values and shows a count when closed again', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage />)
    await pickStudent(user, '000000260001')
    await screen.findByRole('heading', { name: 'New Visit' })

    moreButton().focus()
    await user.keyboard('{Enter}')
    expect(moreButton()).toHaveAttribute('aria-expanded', 'true')
    expect(moreButton()).toHaveFocus()
    const controlled = document.getElementById(moreButton().getAttribute('aria-controls') ?? '')
    expect(controlled).toContainElement(screen.getByLabelText('Remarks'))
    await user.tab()
    expect(screen.getByLabelText('Body temperature (°C)')).toHaveFocus()

    await user.type(screen.getByLabelText('Assisted by'), 'Ms. Reyes')
    await user.type(screen.getByLabelText('Remarks'), 'Rested well')
    await user.click(moreButton())
    expect(moreButton()).toHaveAccessibleName('Show more fields (2 filled)')
    await user.click(moreButton())
    expect(screen.getByLabelText('Assisted by')).toHaveValue('Ms. Reyes')
  })

  it('saves a visit with none of the five', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage />)
    await pickStudent(user, '000000260001')
    await screen.findByRole('heading', { name: 'New Visit' })
    await pickHeadache(user)
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))

    expect(await screen.findByText(/visit saved/i)).toBeInTheDocument()
    expect(await getSavedVisit()).toMatchObject({
      temperatureC: null,
      timeOut: null,
      assistedBy: null,
      parentGuardian: null,
      remarks: null,
    })
  })

  it('saves all five, values kept while the section is closed, and resets for the next visit', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage />)
    await pickStudent(user, '000000260001')
    await screen.findByRole('heading', { name: 'New Visit' })
    await pickHeadache(user)
    await user.click(moreButton())
    await user.type(screen.getByLabelText('Body temperature (°C)'), '37.8')
    setTimeOut('23:59')
    await user.type(screen.getByLabelText('Assisted by'), '  Ms. Reyes ')
    await user.type(screen.getByLabelText('Parent/Guardian'), 'Maria Santos')
    await user.type(screen.getByLabelText('Remarks'), 'Picked up by mother')
    await user.click(moreButton())
    expect(moreButton()).toHaveAccessibleName('Show more fields (5 filled)')
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))

    expect(await screen.findByText(/visit saved/i)).toBeInTheDocument()
    expect(await getSavedVisit()).toMatchObject({
      temperatureC: 37.8,
      timeOut: '23:59',
      assistedBy: 'Ms. Reyes',
      parentGuardian: 'Maria Santos',
      remarks: 'Picked up by mother',
    })
    expect(moreButton()).toHaveAccessibleName('Show more fields')
  })

  it('rejects a time out earlier than the time in, opening the section and focusing the field', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage />)
    await pickStudent(user, '000000260001')
    await screen.findByRole('heading', { name: 'New Visit' })
    await pickHeadache(user)
    await user.click(moreButton())
    setTimeOut('00:00')
    await user.click(moreButton())
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))

    expect(moreButton()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/time out can't be earlier than the time in/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Time out')).toHaveFocus()
    expect(getRecordedAuditEntries()).toHaveLength(0)
  })

  it('flags a body temperature of 37 °C and up as a fever, and still saves', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage />)
    await pickStudent(user, '000000260001')
    await screen.findByRole('heading', { name: 'New Visit' })
    await pickHeadache(user)
    await user.click(moreButton())
    await user.type(screen.getByLabelText('Body temperature (°C)'), '36.9')
    expect(screen.queryByText(/^Fever:/)).not.toBeInTheDocument()
    await user.clear(screen.getByLabelText('Body temperature (°C)'))
    await user.type(screen.getByLabelText('Body temperature (°C)'), '38.1')
    expect(screen.getByText('Fever: 38.1 °C (37 °C and up). You can still save.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))

    expect(await screen.findByText(/visit saved/i)).toBeInTheDocument()
    expect((await getSavedVisit()).temperatureC).toBe(38.1)
  })

  it('counts the five toward the "discard changes?" guard', async () => {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage />)
    await pickStudent(user, '000000260001')
    await screen.findByRole('heading', { name: 'New Visit' })
    await user.click(moreButton())
    await user.type(screen.getByLabelText('Remarks'), 'x')
    await user.click(moreButton())
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('edit: closed when the visit has none, adds a time out later, and the audit names the field', async () => {
    const user = userEvent.setup()
    renderWithRouter(<VisitDetailPage visitId="visit-0158" />)
    await screen.findByRole('heading', { name: 'Visit Details' })
    expect(screen.queryByText('Time out')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(moreButton()).toHaveAttribute('aria-expanded', 'false')
    await user.click(moreButton())
    setTimeOut('23:59')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Visit updated.')).toBeInTheDocument()
    expect((await getVisit('visit-0158')).timeOut).toBe('23:59')
    expect(screen.getByRole('heading', { name: 'Time out' })).toBeInTheDocument()
    expect(screen.getByText('11:59 PM')).toBeInTheDocument()
    // The visit has no other logbook value, so Visit Detail leaves those out.
    expect(screen.queryByRole('heading', { name: 'Remarks' })).not.toBeInTheDocument()
    const [entry] = getRecordedAuditEntries()
    expect(entry).toMatchObject({ actionType: 'update', targetRecord: { type: 'visit', id: 'visit-0158' }, summary: 'Updated time out' })
  })

  it('edit: opens by itself when the visit has a value, and rejects a time out before the time in', async () => {
    const user = userEvent.setup()
    const visit = await getVisit('visit-0158')
    await updateVisit('visit-0158', { ...visit, remarks: 'Came back after lunch' })
    renderWithRouter(<VisitDetailPage visitId="visit-0158" />)
    await screen.findByRole('heading', { name: 'Visit Details' })
    expect(screen.getByText('Came back after lunch')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(moreButton()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Remarks')).toHaveValue('Came back after lunch')
    setTimeOut('00:00')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))
    expect(screen.getByText(/time out can't be earlier than the time in/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Time out')).toHaveFocus()
  })
})
