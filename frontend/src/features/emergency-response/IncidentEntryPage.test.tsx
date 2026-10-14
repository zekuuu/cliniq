import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { getIncident, getRecordedAuditEntries, getStudent, listIncidents, resetMockDb } from '../../lib/mock-db'
import { selectOption } from '../../test/selectOption'
import { IncidentEntryPage } from './IncidentEntryPage'
import { IncidentReportPage } from './IncidentReportPage'
import { renderWithRouter } from '../../test/renderWithRouter'

const STUDENT = '2026-00001'

describe('Report Incident', () => {
  beforeEach(() => resetMockDb())

  it('starts as Stage 1 fast capture with visible status', async () => {
    renderWithRouter(<IncidentEntryPage studentNumber={STUDENT} />)

    expect(await screen.findByRole('heading', { name: 'Report Incident' })).toBeInTheDocument()
    expect(screen.getByText('Needs completion')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Stage 1 fast capture' })).toBeInTheDocument()
    expect(screen.getByText(/\d{4}-\d{5}/)).toBeInTheDocument()
  })

  it('validates Stage 1 essentials inline', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage />)

    await screen.findByRole('heading', { name: 'Report Incident' })
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    expect(screen.getByText('Select the emergency complaint.')).toBeInTheDocument()
    expect(screen.getByText('Enter the temperature.')).toBeInTheDocument()
    expect(screen.getByText('Enter the pulse.')).toBeInTheDocument()
  })

  it('saves Stage 1, then completes Stage 2 with audit entries', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage studentNumber={STUDENT} />)

    await screen.findByRole('heading', { name: 'Report Incident' })
    await selectOption(user, screen.getByLabelText(/complaint/i), 'Fainting')
    await user.type(screen.getByLabelText(/temperature/i), '37.2')
    await user.type(screen.getByLabelText(/pulse/i), '92')
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))

    expect(await screen.findByText(/stage 1 saved/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Stage 2 completion' })).toBeInTheDocument()
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toEqual(['submit'])

    await user.type(screen.getByLabelText(/blood pressure/i), '120/80')
    await user.type(screen.getByLabelText(/oxygen saturation/i), '98%')
    await user.type(screen.getByLabelText(/treatment notes/i), 'Student observed and stabilized.')
    await user.type(screen.getByLabelText(/attempt note/i), 'Guardian answered and will arrive.')
    await user.click(screen.getByRole('button', { name: 'Add Attempt' }))
    await user.click(screen.getByLabelText(/this incident needs a follow-up/i))
    await user.type(screen.getByLabelText(/reason/i), 'Check after rest period')
    await user.click(screen.getByRole('button', { name: 'Complete Incident' }))

    expect(await screen.findByText(/incident completed/i)).toBeInTheDocument()
    expect(screen.getByText('Complete')).toBeInTheDocument()
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toEqual([
      'submit',
      'update',
      'create',
      'create',
    ])
    // Types a full Stage 2 form (~2.5 s alone); the default 5 s can be exceeded under full-suite load.
  }, 15_000)

  it('uses the themed complaint dropdown instead of a native select', async () => {
    renderWithRouter(<IncidentEntryPage />)

    await screen.findByRole('heading', { name: 'Report Incident' })
    const field = screen.getByLabelText(/complaint/i)
    expect(field).toHaveAttribute('aria-haspopup', 'listbox')
    expect(field).toHaveClass('cursor-pointer')
    expect(field.parentElement?.querySelector('svg')).toBeTruthy()
  })

  it('asks for the Student Number when the Emergency button opened it without a student', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage />)

    await screen.findByRole('heading', { name: 'Report Incident' })
    expect(screen.getByText(/student not identified yet/i)).toBeInTheDocument()
    await selectOption(user, screen.getByLabelText(/complaint/i), 'Fainting')
    await user.type(screen.getByLabelText(/temperature/i), '37.2')
    await user.type(screen.getByLabelText(/pulse/i), '92')
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    expect(screen.getByText('Choose the student: type a Student Number or name, then pick from the list.')).toBeInTheDocument()
    expect(getRecordedAuditEntries()).toEqual([])

    const field = screen.getByRole('combobox', { name: /student/i })
    await user.type(field, '209999999')
    expect(await screen.findByText(/no active student matches/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    expect(screen.getByText('Choose the student: type a Student Number or name, then pick from the list.')).toBeInTheDocument()
    expect(getRecordedAuditEntries()).toEqual([])

    await user.clear(field)
    await user.type(field, STUDENT.replace('-', ''))
    await screen.findByRole('option', { name: new RegExp(STUDENT) })
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('button', { name: /change student/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    expect(await screen.findByText(/stage 1 saved/i)).toBeInTheDocument()
    const student = await getStudent(STUDENT)
    expect(screen.getByText(new RegExp(student.fullName))).toBeInTheDocument()
    const saved = (await listIncidents()).find((incident) => incident.studentId === student.id && incident.complaint === 'Fainting' && incident.stage === 1)
    expect(saved).toBeTruthy()
  })

  it('reopens a saved Stage 1 incident directly at Stage 2', async () => {
    const stageOne = (await listIncidents()).find((incident) => incident.stage === 1)
    expect(stageOne).toBeTruthy()
    renderWithRouter(<IncidentEntryPage incidentId={stageOne!.id} />)

    expect(await screen.findByRole('heading', { name: 'Stage 2 completion' })).toBeInTheDocument()
    expect(screen.getAllByText(stageOne!.complaint).length).toBeGreaterThan(0)
    expect(screen.queryByLabelText(/student number/i)).not.toBeInTheDocument()
  })

  it('completes Stage 2 without treatment notes or medicines', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage incidentId="incident-0022" />)

    await screen.findByRole('heading', { name: 'Complete Incident Record' })
    await user.type(screen.getByLabelText(/blood pressure/i), '110/70')
    await user.type(screen.getByLabelText(/oxygen saturation/i), '98%')
    await user.click(screen.getByRole('button', { name: 'Complete Incident' }))

    expect(await screen.findByText(/incident completed/i)).toBeInTheDocument()
    expect(screen.getByText('No treatment recorded')).toBeInTheDocument()
  })
})

describe('Report Incident: optional additional notes', () => {
  beforeEach(() => resetMockDb())

  async function saveStageOne(notes?: string) {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage studentNumber={STUDENT} />)
    await screen.findByRole('heading', { name: 'Report Incident' })
    await selectOption(user, screen.getByLabelText(/complaint/i), 'Fainting')
    await user.type(screen.getByLabelText(/temperature/i), '37.2')
    await user.type(screen.getByLabelText(/pulse/i), '92')
    expect(screen.getByLabelText('Additional notes (optional)')).not.toBeRequired()
    if (notes) await user.type(screen.getByLabelText('Additional notes (optional)'), notes)
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    await screen.findByRole('heading', { name: 'Stage 2 completion' })
    const [entry] = getRecordedAuditEntries()
    return { entry, incident: await getIncident(entry.targetRecord!.id) }
  }

  it('saves Stage 1 without notes', async () => {
    const { entry, incident } = await saveStageOne()
    expect(incident.generalNotes).toBeNull()
    expect(entry.summary).toBeUndefined()
    expect(screen.queryByText(/additional notes:/i)).not.toBeInTheDocument()
  })

  it('saves Stage 1 with notes, shows them at Stage 2 and on the report, and audits the field name only', async () => {
    const { entry, incident } = await saveStageOne('Fell during recess; conscious.')
    expect(incident.generalNotes).toBe('Fell during recess; conscious.')
    expect(entry.summary).toBe('Included additional notes')
    expect(JSON.stringify(getRecordedAuditEntries())).not.toContain('recess')
    expect(screen.getByText('Fell during recess; conscious.')).toBeInTheDocument()

    renderWithRouter(<IncidentReportPage incidentId={incident.id} />)
    expect(await screen.findByText('Additional notes')).toBeInTheDocument()
    expect(screen.getAllByText('Fell during recess; conscious.')).toHaveLength(2)
  })
})

describe('Report Incident: failed submit and unusual vitals', () => {
  beforeEach(() => resetMockDb())

  it('moves focus to the first invalid field when Stage 1 is incomplete', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage studentNumber={STUDENT} />)

    await screen.findByRole('heading', { name: 'Report Incident' })
    await selectOption(user, screen.getByLabelText(/complaint/i), 'Fainting')
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))

    expect(screen.getByLabelText(/temperature/i)).toHaveFocus()
    expect(screen.getByText('2 fields need attention.')).toBeInTheDocument()
  })

  it('moves focus to the first invalid Stage 2 field', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage studentNumber={STUDENT} />)

    await screen.findByRole('heading', { name: 'Report Incident' })
    await selectOption(user, screen.getByLabelText(/complaint/i), 'Fainting')
    await user.type(screen.getByLabelText(/temperature/i), '37.2')
    await user.type(screen.getByLabelText(/pulse/i), '92')
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    await screen.findByRole('heading', { name: 'Stage 2 completion' })
    await user.type(screen.getByLabelText(/blood pressure/i), '120/80')
    await user.click(screen.getByRole('button', { name: 'Complete Incident' }))

    expect(screen.getByLabelText(/oxygen saturation/i)).toHaveFocus()
  })

  it('warns about an implausible reading but still saves Stage 1', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage studentNumber={STUDENT} />)

    await screen.findByRole('heading', { name: 'Report Incident' })
    await selectOption(user, screen.getByLabelText(/complaint/i), 'Fainting')
    await user.type(screen.getByLabelText(/temperature/i), '370')
    await user.type(screen.getByLabelText(/pulse/i), '92')

    expect(screen.getByText(/Temperature 370 °C looks unusual\. Please check the reading\. You can still save\./)).toBeInTheDocument()
    expect(screen.queryByText(/Pulse .* looks unusual/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    expect(await screen.findByText(/stage 1 saved/i)).toBeInTheDocument()
  })

  it('shows no warning for an ordinary reading', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage studentNumber={STUDENT} />)

    await screen.findByRole('heading', { name: 'Report Incident' })
    await user.type(screen.getByLabelText(/temperature/i), '37.2')
    await user.type(screen.getByLabelText(/pulse/i), '92')
    expect(screen.queryByText(/looks unusual/)).not.toBeInTheDocument()
  })
})
