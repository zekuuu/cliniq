import { act, screen, within } from '@testing-library/react'
import { recordedWrites } from '../../test/recordedWrites'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addParentNotification, approveIncidentReport, getIncident, getStudent, resetMockDb } from '../../lib/mock-db'
import { db, migratePersistedState } from '../../lib/mock-db/store'
import { pickStudent } from '../../test/pickStudent'
import { renderWithRouter } from '../../test/renderWithRouter'
import { selectOption } from '../../test/selectOption'
import { IncidentEntryPage } from './IncidentEntryPage'
import { IncidentReportPage } from './IncidentReportPage'
import { ParentNotificationPage } from './ParentNotificationPage'

/** Panel review part 1 (IN-1, IN-3, IN-6, body part). */

function printReport(): HTMLElement {
  act(() => {
    window.dispatchEvent(new Event('beforeprint'))
  })
  const doc = document.body.querySelector<HTMLElement>('[data-print-document]')
  if (!doc) throw new Error('No print document mounted')
  return doc
}

afterEach(() => {
  act(() => {
    window.dispatchEvent(new Event('afterprint'))
  })
})

describe('Stage 1 alert card (IN-1)', () => {
  beforeEach(() => resetMockDb())

  it('shows allergies, conditions and contacts read-only, and "None recorded" for an empty list', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage />)
    await pickStudent(user, '000000230006')
    const card = await screen.findByRole('region', { name: 'Check before treating' })
    expect(card).toHaveTextContent('Penicillin')
    expect(card).toHaveTextContent('Asthma')
    // This student has no emergency contact on file.
    expect(within(card).getByText('None recorded')).toBeInTheDocument()
    expect(within(card).queryByRole('textbox')).not.toBeInTheDocument()
    expect(card).not.toHaveTextContent(/no allergies/i)
  })

  it('lists the contacts in saved order with the first marked primary', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage />)
    await pickStudent(user, '000000230012')
    const card = await screen.findByRole('region', { name: 'Check before treating' })
    const rows = within(card).getAllByRole('listitem').filter((row) => row.textContent?.includes('0900-111-'))
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^Arnel Cabrera.*0900-111-2011$/),
      expect.stringMatching(/^Beatriz Cabrera.*0900-111-2111$/),
    ])
    // Empty allergies and conditions read "None recorded", never "No allergies".
    expect(within(card).getAllByText('None recorded')).toHaveLength(2)
  })
})

describe('Stage 2 care is optional (ADR-065, reversing panel review IN-3)', () => {
  beforeEach(() => resetMockDb())

  it('completes an empty Stage 2 with no tick and no reason', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Complete Incident Record' })
    expect(screen.queryByLabelText(/nothing further was needed or done/i)).not.toBeInTheDocument()
    const complete = screen.getByRole('button', { name: 'Complete Incident' })
    expect(complete).toBeEnabled()
    await user.click(complete)
    expect(await screen.findByText(/incident completed/i)).toBeInTheDocument()
    expect((await getIncident('incident-0022')).stage).toBe(2)
  })

  it('lets an empty completed record be approved, with a note to check it first', async () => {
    const record = db().incidents.find((i) => i.id === 'incident-0022')!
    record.stage = 2
    renderWithRouter(<IncidentReportPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Incident summary' })
    expect(screen.getByRole('button', { name: 'Approve Report' })).toBeEnabled()
    expect(screen.getByText(/No treatment recorded\. Check this is correct before approving\./)).toBeInTheDocument()
    await expect(approveIncidentReport('incident-0022')).resolves.toBeUndefined()
  })

  it('still prints the reason an older record was given', async () => {
    const record = db().incidents.find((i) => i.id === 'incident-0022')!
    record.stage = 2
    record.noFurtherActionReason = 'Observed only.'
    renderWithRouter(<IncidentReportPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Incident summary' })
    expect(printReport()).toHaveTextContent('No treatment or notification: Observed only.')
  })
})

describe('Parent notification log (IN-6, D6)', () => {
  beforeEach(() => resetMockDb())

  it('offers the four outcomes and saves who was called, defaulting to the primary contact', async () => {
    const user = userEvent.setup()
    renderWithRouter(<ParentNotificationPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Parent Notification Log' })
    await user.click(screen.getByLabelText('Outcome'))
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Reached',
      'No answer',
      'Left message or voicemail',
      'Wrong number',
    ])
    await user.keyboard('{Escape}')
    await selectOption(user, screen.getByLabelText('Outcome'), 'No answer')
    await user.click(screen.getByRole('button', { name: 'Add Attempt' }))

    const student = await getStudent('student-0004')
    const [primary] = student.emergencyContacts
    const [attempt] = (await getIncident('incident-0022')).parentNotifications
    expect(attempt).toMatchObject({
      outcome: 'no_answer',
      calledContact: { name: primary.name, relationship: primary.relationship, phone: primary.phone, source: 'emergency_contact' },
    })
    expect(await screen.findByText(`Called: ${primary.name} (${primary.relationship}) · ${primary.phone}`)).toBeInTheDocument()
  })

  it('lets Stage 2 add an attempt without a note', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Complete Incident Record' })

    expect(screen.getByLabelText('Attempt note')).not.toBeRequired()
    await user.click(screen.getByRole('button', { name: 'Add Attempt' }))

    expect(screen.queryByText(/add a short note/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Complete Incident' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Complete Incident' }))
    expect(await screen.findByText(/incident completed/i)).toBeInTheDocument()
    expect((await getIncident('incident-0022')).parentNotifications).toHaveLength(1)
  })

  it('needs a name and number for "Other", and prints who was called', async () => {
    const user = userEvent.setup()
    renderWithRouter(<ParentNotificationPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Parent Notification Log' })
    await selectOption(user, screen.getByLabelText('Who was called'), 'Other (type the name and number)')
    await user.click(screen.getByRole('button', { name: 'Add Attempt' }))
    expect(screen.getByText('Enter the name of the person called.')).toBeInTheDocument()
    expect(screen.getByText('Enter the number called.')).toBeInTheDocument()
    expect(recordedWrites()).toEqual([])

    await user.type(screen.getByLabelText(/name of person called/i), 'Lola Remedios')
    await user.type(screen.getByLabelText(/number called/i), '0917-000-1111')
    await user.click(screen.getByRole('button', { name: 'Add Attempt' }))
    expect(await screen.findByText('Called: Lola Remedios · 0917-000-1111')).toBeInTheDocument()

    renderWithRouter(<IncidentReportPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Incident summary' })
    expect(printReport()).toHaveTextContent('Lola Remedios · 0917-000-1111')
  })

  it('migrates saved voicemail, left_message and not_reached outcomes', () => {
    resetMockDb()
    const state = structuredClone(db())
    const old = ['voicemail', 'left_message', 'not_reached', 'reached']
    state.incidents[0].parentNotifications = old.map((outcome) => ({ outcome, timestamp: '2026-10-01T09:00' })) as never
    const migrated = migratePersistedState({ state, seedAuditLength: 0 })
    expect(migrated.state.incidents[0].parentNotifications.map((attempt) => attempt.outcome)).toEqual([
      'left_message_or_voicemail',
      'left_message_or_voicemail',
      'no_answer',
      'reached',
    ])
  })
})

describe('Body part affected (D11)', () => {
  beforeEach(() => resetMockDb())

  it('is optional on Stage 2, saved, and shown on the report and printout only when filled', async () => {
    const user = userEvent.setup()
    const form = renderWithRouter(<IncidentEntryPage />)
    await pickStudent(user, '000000260001')
    await selectOption(user, screen.getByLabelText(/emergency symptom/i), 'Fainting')
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    await screen.findByRole('heading', { name: 'Stage 2 completion' })
    expect(screen.getByRole('combobox', { name: /body part affected/i })).not.toBeRequired()
    const id = recordedWrites()[0].targetRecord!.id
    // The form's field label reads "Body part affected" too, so only the report is left on screen.
    form.unmount()

    renderWithRouter(<IncidentReportPage incidentId={id} />)
    await screen.findAllByRole('heading', { name: 'Incident summary' })
    expect(screen.queryByText('Body part affected')).not.toBeInTheDocument()
  })

  it('saves typed text and prints "Body part affected"', async () => {
    const user = userEvent.setup()
    const form = renderWithRouter(<IncidentEntryPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Complete Incident Record' })
    await user.type(screen.getByRole('combobox', { name: /body part affected/i }), 'Left knee')
    await user.type(screen.getByLabelText(/treatment notes/i), 'Cleaned and dressed.')
    await user.click(screen.getByRole('button', { name: 'Complete Incident' }))
    await screen.findByText(/incident completed/i)
    expect((await getIncident('incident-0022')).bodyPart).toBe('Left knee')
    form.unmount()

    renderWithRouter(<IncidentReportPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Incident summary' })
    expect(screen.getByText('Body part affected')).toBeInTheDocument()
    expect(printReport()).toHaveTextContent('Body part affectedLeft knee')
  })
})

describe('a Stage 1 incident cannot be approved (Zean, Thursday, October 22, 2026)', () => {
  beforeEach(() => resetMockDb())

  it('refuses approval until Stage 2 is complete, even with a parent call logged', async () => {
    await addParentNotification('incident-0022', 'reached')
    await expect(approveIncidentReport('incident-0022')).rejects.toThrow('Complete Stage 2 before approving this report.')
    renderWithRouter(<IncidentReportPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Incident summary' })
    expect(screen.getByRole('button', { name: 'Approve Report' })).toBeDisabled()
    expect(screen.getByText(/Complete Stage 2 before approving this report/)).toBeInTheDocument()
  })
})
