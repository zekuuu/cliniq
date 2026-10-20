import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getIncident, getRecordedAuditEntries, getStudent, listIncidents, resetMockDb } from '../../lib/mock-db'
import { selectOption } from '../../test/selectOption'
import { lrnLabel, maskLrn } from '../../lib/lrn'
import { pickStudent } from '../../test/pickStudent'
import { IncidentEntryPage } from './IncidentEntryPage'
import { IncidentReportPage } from './IncidentReportPage'
import { renderWithRouter } from '../../test/renderWithRouter'

/** Gian Quizon's synthetic LRN in the seed. */
const STUDENT = '000000260001'
const STUDENT_ID = 'student-0001'

describe('Report Incident', () => {
  beforeEach(() => resetMockDb())

  it('starts as Stage 1 fast capture with visible status', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage />)
    await pickStudent(user, STUDENT)

    expect(await screen.findByRole('heading', { name: 'Report Incident' })).toBeInTheDocument()
    expect(screen.getByText('Needs completion')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Stage 1 fast capture' })).toBeInTheDocument()
    expect(screen.getAllByText(maskLrn(STUDENT)).length).toBeGreaterThan(0)
  })

  it('validates Stage 1 essentials inline: the complaint only, no reading is required', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage />)

    await screen.findByRole('heading', { name: 'Report Incident' })
    for (const label of [/temperature/i, /pulse/i, /blood pressure/i, /oxygen saturation/i])
      expect(screen.getByLabelText(label)).not.toBeRequired()
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    expect(screen.getByText('Select the emergency complaint.')).toBeInTheDocument()
    expect(screen.queryByText(/enter the (temperature|pulse|blood pressure)/i)).not.toBeInTheDocument()
  })

  it('saves Stage 1, then completes Stage 2 with audit entries', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage />)
    await pickStudent(user, STUDENT)

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

  it('asks for the LRN when the Emergency button opened it without a student', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage />)

    await screen.findByRole('heading', { name: 'Report Incident' })
    expect(screen.getByText(/student not identified yet/i)).toBeInTheDocument()
    await selectOption(user, screen.getByLabelText(/complaint/i), 'Fainting')
    await user.type(screen.getByLabelText(/temperature/i), '37.2')
    await user.type(screen.getByLabelText(/pulse/i), '92')
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    expect(screen.getByText('Choose the student: type the LRN or name, then pick from the list.')).toBeInTheDocument()
    expect(getRecordedAuditEntries()).toEqual([])

    const field = screen.getByRole('combobox', { name: /student/i })
    await user.type(field, '209999999')
    expect(await screen.findByText(/no active student matches/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    expect(screen.getByText('Choose the student: type the LRN or name, then pick from the list.')).toBeInTheDocument()
    expect(getRecordedAuditEntries()).toEqual([])

    await user.clear(field)
    await user.type(field, STUDENT)
    await screen.findByRole('option', { name: new RegExp(lrnLabel(STUDENT)) })
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('button', { name: /change student/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    expect(await screen.findByText(/stage 1 saved/i)).toBeInTheDocument()
    const student = await getStudent(STUDENT_ID)
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
    renderWithRouter(<IncidentEntryPage />)
    await pickStudent(user, STUDENT)
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
    renderWithRouter(<IncidentEntryPage />)
    await pickStudent(user, STUDENT)

    await screen.findByRole('heading', { name: 'Report Incident' })
    await selectOption(user, screen.getByLabelText(/complaint/i), 'Fainting')
    await user.type(screen.getByLabelText(/oxygen saturation/i), '150')
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))

    expect(screen.getByText('Enter the oxygen saturation as a whole percent from 0 to 100.')).toBeInTheDocument()
    expect(screen.getByLabelText(/oxygen saturation/i)).toHaveFocus()
    expect(screen.getByText('1 field needs attention.')).toBeInTheDocument()
    expect(getRecordedAuditEntries()).toEqual([])
  })

  it('moves focus to the first invalid Stage 2 field', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage />)
    await pickStudent(user, STUDENT)

    await screen.findByRole('heading', { name: 'Report Incident' })
    await selectOption(user, screen.getByLabelText(/complaint/i), 'Fainting')
    await user.type(screen.getByLabelText(/temperature/i), '37.2')
    await user.type(screen.getByLabelText(/pulse/i), '92')
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    await screen.findByRole('heading', { name: 'Stage 2 completion' })
    await user.type(screen.getByLabelText(/oxygen saturation/i), '97.5')
    await user.click(screen.getByRole('button', { name: 'Complete Incident' }))

    expect(screen.getByLabelText(/oxygen saturation/i)).toHaveFocus()
    expect(screen.queryByText(/incident completed/i)).not.toBeInTheDocument()
  })

  it('blocks completion when the departure time is only partly typed', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage />)
    await pickStudent(user, STUDENT)

    await screen.findByRole('heading', { name: 'Report Incident' })
    await selectOption(user, screen.getByLabelText(/complaint/i), 'Fainting')
    await user.type(screen.getByLabelText(/temperature/i), '37.2')
    await user.type(screen.getByLabelText(/pulse/i), '92')
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    await screen.findByRole('heading', { name: 'Stage 2 completion' })
    await user.type(screen.getByLabelText(/blood pressure/i), '120/80')
    await user.type(screen.getByLabelText(/oxygen saturation/i), '98%')
    await user.click(screen.getByLabelText(/referred to hospital/i))
    await user.type(screen.getByLabelText(/destination/i), 'City Hospital')
    // Browsers keep the value empty for "02:30 --" and flag it only through validity.
    const departure = screen.getByLabelText(/departure time/i)
    Object.defineProperty(departure, 'validity', { value: { badInput: true } })
    await user.click(screen.getByRole('button', { name: 'Complete Incident' }))

    expect(screen.getByText('Enter the full departure time, including AM or PM.')).toBeInTheDocument()
    expect(departure).toHaveFocus()
    expect(screen.queryByText(/incident completed/i)).not.toBeInTheDocument()
  }, 15_000)

  it('warns about an implausible reading but still saves Stage 1', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage />)
    await pickStudent(user, STUDENT)

    await screen.findByRole('heading', { name: 'Report Incident' })
    await selectOption(user, screen.getByLabelText(/complaint/i), 'Fainting')
    await user.type(screen.getByLabelText(/temperature/i), '370')
    await user.type(screen.getByLabelText(/pulse/i), '92')

    // A typing slip gets the "check the reading" note, not the fever flag.
    expect(screen.getByText(/^Temperature 370 °C looks unusual\. Please check the reading\. You can still save\./)).toBeInTheDocument()
    expect(screen.queryByText(/fever/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Pulse .* looks unusual/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    expect(await screen.findByText(/stage 1 saved/i)).toBeInTheDocument()
  })

  it('warns about an implausible pulse, and never about the oximeter (no range from the clinician yet)', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage />)
    await pickStudent(user, STUDENT)

    await screen.findByRole('heading', { name: 'Report Incident' })
    await user.type(screen.getByLabelText(/pulse/i), '920')
    expect(screen.getByText(/Pulse 920 bpm looks unusual\./)).toBeInTheDocument()
    await user.clear(screen.getByLabelText(/pulse/i))
    await user.type(screen.getByLabelText(/oxygen saturation/i), '5')
    expect(screen.queryByText(/looks unusual/)).not.toBeInTheDocument()
  })

  it('flags a fever from 37 °C up, without blocking the save', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage />)
    await pickStudent(user, STUDENT)

    await screen.findByRole('heading', { name: 'Report Incident' })
    await selectOption(user, screen.getByLabelText(/complaint/i), 'Fainting')
    await user.type(screen.getByLabelText(/temperature/i), '36.9')
    expect(screen.queryByText(/fever/i)).not.toBeInTheDocument()
    await user.clear(screen.getByLabelText(/temperature/i))
    await user.type(screen.getByLabelText(/temperature/i), '37')
    expect(screen.getByText('Fever: 37 °C (37 °C and up). You can still save.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    expect(await screen.findByText(/stage 1 saved/i)).toBeInTheDocument()
  })

  it('shows no warning for an ordinary reading', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage />)
    await pickStudent(user, STUDENT)

    await screen.findByRole('heading', { name: 'Report Incident' })
    await user.type(screen.getByLabelText(/temperature/i), '36.8')
    await user.type(screen.getByLabelText(/pulse/i), '92')
    expect(screen.queryByText(/looks unusual/)).not.toBeInTheDocument()
  })
})

describe('Report Incident: optional readings, never all four forced', () => {
  beforeEach(() => resetMockDb())

  /** Fires beforeprint, as Print or Ctrl+P does, and returns the mounted printout. */
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

  type ReadingLabel = 'temperature' | 'pulse' | 'blood pressure' | 'oxygen saturation'

  async function saveStageOne(readings: Partial<Record<ReadingLabel, string>>) {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage />)
    await pickStudent(user, STUDENT)
    await screen.findByRole('heading', { name: 'Report Incident' })
    await selectOption(user, screen.getByLabelText(/complaint/i), 'Fainting')
    for (const [label, value] of Object.entries(readings)) await user.type(screen.getByLabelText(new RegExp(label, 'i')), value)
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    await screen.findByRole('heading', { name: 'Stage 2 completion' })
    const [entry] = getRecordedAuditEntries()
    return { user, incident: await getIncident(entry.targetRecord!.id) }
  }

  it('saves Stage 1 with no readings, and says so at Stage 2 and on the report', async () => {
    const { incident } = await saveStageOne({})
    expect(incident.vitals).toEqual({})
    expect(screen.getByText('No readings taken')).toBeInTheDocument()

    renderWithRouter(<IncidentReportPage incidentId={incident.id} />)
    await screen.findByRole('heading', { name: 'Incident Report' })
    // Stage 2's summary and the report screen.
    expect(screen.getAllByText('No readings taken')).toHaveLength(2)
    expect(printReport()).toHaveTextContent('No readings taken.')
  })

  it('saves Stage 1 with only the oximeter, and the report shows only that reading', async () => {
    const { incident } = await saveStageOne({ 'oxygen saturation': '97' })
    expect(incident.vitals).toEqual({ oxygenSaturationPct: 97 })

    renderWithRouter(<IncidentReportPage incidentId={incident.id} />)
    await screen.findByRole('heading', { name: 'Incident Report' })
    // Stage 2's summary and the report screen; neither lists a reading that wasn't taken.
    expect(screen.getAllByText('97%')).toHaveLength(2)
    expect(screen.queryByText(/^(Temperature|Pulse|Blood pressure)$/)).not.toBeInTheDocument()
    const doc = printReport()
    expect(doc).toHaveTextContent('Oxygen saturation97%')
    expect(doc).not.toHaveTextContent(/Temperature|Pulse|Blood pressure/)
  })

  it('saves Stage 1 with all four, then completes Stage 2 without blood pressure', async () => {
    const { incident, user } = await saveStageOne({ temperature: '37.2', pulse: '92', 'blood pressure': '110/70', 'oxygen saturation': '98' })
    expect(incident.vitals).toEqual({ temperatureC: 37.2, pulseBpm: 92, bloodPressure: '110/70', oxygenSaturationPct: 98 })
    expect(screen.getByText('37.2 °C · 92 bpm · 110/70 mmHg · 98%')).toBeInTheDocument()

    // Stage 2 shows the same four, prefilled; clearing blood pressure doesn't block completion.
    await user.clear(screen.getByLabelText(/blood pressure/i))
    await user.click(screen.getByRole('button', { name: 'Complete Incident' }))
    expect(await screen.findByText(/incident completed/i)).toBeInTheDocument()
    expect((await getIncident(incident.id)).vitals).toEqual({ temperatureC: 37.2, pulseBpm: 92, oxygenSaturationPct: 98, treatmentNotes: '' })
  }, 15_000)

  it('completes a saved Stage 1 incident with no readings at all', async () => {
    const user = userEvent.setup()
    renderWithRouter(<IncidentEntryPage incidentId="incident-0022" />)
    await screen.findByRole('heading', { name: 'Complete Incident Record' })
    for (const label of [/temperature/i, /pulse/i, /blood pressure/i, /oxygen saturation/i]) await user.clear(screen.getByLabelText(label))
    await user.click(screen.getByRole('button', { name: 'Complete Incident' }))

    expect(await screen.findByText(/incident completed/i)).toBeInTheDocument()
    expect((await getIncident('incident-0022')).vitals).toEqual({ treatmentNotes: '' })
  })
})
