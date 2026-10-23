import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addParentNotification, approveIncidentReport, getIncident, getRecordedAuditEntries, getStudent, resetMockDb } from '../../lib/mock-db'
import { db, migratePersistedState } from '../../lib/mock-db/store'
import { incidentCompletionBlocker } from '../../lib/itemsGiven'
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

describe('No empty completion or approval (IN-3)', () => {
  beforeEach(() => resetMockDb())

  it('keeps Complete Incident disabled on an empty record until the tick and a reason are given', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Complete Incident Record' })

    const complete = screen.getByRole('button', { name: 'Complete Incident' })
    expect(complete).toBeDisabled()
    expect(complete).toHaveAccessibleDescription(/tick "Nothing further was needed or done"/)

    await user.click(screen.getByLabelText(/nothing further was needed or done/i))
    expect(complete).toBeEnabled()
    await user.click(complete)
    expect(screen.getByText('Write one line on why nothing further was needed.')).toBeInTheDocument()
    expect(getRecordedAuditEntries()).toEqual([])

    await user.type(screen.getByRole('textbox', { name: /^reason/i }), 'Rested ten minutes; no complaint after.')
    await user.click(complete)
    expect(await screen.findByText(/incident completed/i)).toBeInTheDocument()
    expect((await getIncident('incident-0022')).noFurtherActionReason).toBe('Rested ten minutes; no complaint after.')
    // The audit names the field, never the reason text (ADR-017).
    const [entry] = getRecordedAuditEntries()
    expect(entry.summary).toMatch(/nothing further was needed or done/)
    expect(JSON.stringify(getRecordedAuditEntries())).not.toContain('Rested')
  })

  it('hides the tick once any care is recorded', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Complete Incident Record' })
    await user.type(screen.getByLabelText(/treatment notes/i), 'Cold compress.')
    expect(screen.queryByLabelText(/nothing further was needed or done/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Complete Incident' })).toBeEnabled()
  })

  it('disables Approve Report on an empty record and the data layer refuses it too', async () => {
    // A completed record with nothing on it (older data): Stage 2 itself now refuses to save one.
    const record = db().incidents.find((i) => i.id === 'incident-0022')!
    record.stage = 2
    renderWithRouter(<IncidentReportPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Incident summary' })
    const approve = screen.getByRole('button', { name: 'Approve Report' })
    expect(approve).toBeDisabled()
    expect(screen.getByText(/can't be approved yet/i)).toBeInTheDocument()
    await expect(approveIncidentReport('incident-0022')).rejects.toThrow(/nothing further was needed or done/i)
    expect(getRecordedAuditEntries()).toEqual([])
  })

  it('prints the reason when nothing further was needed', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Complete Incident Record' })
    await user.click(screen.getByLabelText(/nothing further was needed or done/i))
    await user.type(screen.getByRole('textbox', { name: /^reason/i }), 'Observed only.')
    await user.click(screen.getByRole('button', { name: 'Complete Incident' }))
    await screen.findByText(/incident completed/i)

    renderWithRouter(<IncidentReportPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Incident summary' })
    expect(screen.getAllByRole('button', { name: 'Approve Report' }).at(-1)).toBeEnabled()
    expect(printReport()).toHaveTextContent('No treatment or notification: Observed only.')
  })

  it('treats any one of notes, a medicine, a notification or a referral as enough', () => {
    const empty = { vitals: {}, itemsGiven: [], parentNotifications: [], hospitalReferral: null }
    expect(incidentCompletionBlocker(empty)).not.toBeNull()
    expect(incidentCompletionBlocker({ ...empty, vitals: { treatmentNotes: '  ' } })).not.toBeNull()
    expect(incidentCompletionBlocker({ ...empty, vitals: { temperatureC: 37 } })).not.toBeNull()
    expect(incidentCompletionBlocker({ ...empty, vitals: { treatmentNotes: 'Ice pack' } })).toBeNull()
    expect(incidentCompletionBlocker({ ...empty, itemsGiven: [{}] })).toBeNull()
    expect(incidentCompletionBlocker({ ...empty, parentNotifications: [{}] })).toBeNull()
    expect(incidentCompletionBlocker({ ...empty, hospitalReferral: { destination: 'X' } })).toBeNull()
    expect(incidentCompletionBlocker({ ...empty, noFurtherActionReason: 'Observed only' })).toBeNull()
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
    expect(getRecordedAuditEntries()).toEqual([])

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
    renderWithRouter(<IncidentEntryPage />)
    await pickStudent(user, '000000260001')
    await selectOption(user, screen.getByLabelText(/complaint/i), 'Fainting')
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    await screen.findByRole('heading', { name: 'Stage 2 completion' })
    expect(screen.getByRole('combobox', { name: /body part affected/i })).not.toBeRequired()
    const id = getRecordedAuditEntries()[0].targetRecord!.id

    renderWithRouter(<IncidentReportPage incidentId={id} />)
    await screen.findAllByRole('heading', { name: 'Incident summary' })
    expect(screen.queryByText('Body part affected')).not.toBeInTheDocument()
  })

  it('saves typed text and prints "Body part affected"', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Complete Incident Record' })
    await user.type(screen.getByRole('combobox', { name: /body part affected/i }), 'Left knee')
    await user.type(screen.getByLabelText(/treatment notes/i), 'Cleaned and dressed.')
    await user.click(screen.getByRole('button', { name: 'Complete Incident' }))
    await screen.findByText(/incident completed/i)
    expect((await getIncident('incident-0022')).bodyPart).toBe('Left knee')

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
