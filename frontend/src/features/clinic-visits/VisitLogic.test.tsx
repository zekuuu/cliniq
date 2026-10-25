import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  approveExcuseLetter,
  getDashboardSummary,
  getInventoryItem,
  getMockToday,
  getMonthlyReport,
  getRecordedAuditEntries,
  getVisit,
  listFollowUps,
  listIncidents,
  listVisits,
  markVisitEnteredInError,
  recordVisit,
  resetMockDb,
  saveIncidentStageOne,
  updateVisit,
} from '../../lib/mock-db'
import { itemsNamedInNotes } from '../../lib/itemsGiven'
import { renderWithRouter } from '../../test/renderWithRouter'
import { selectOption } from '../../test/selectOption'
import { pickStudent } from '../../test/pickStudent'
import { hasExcuseLetter } from './dispositionValues'
import { NewVisitEntryPage } from './NewVisitEntryPage'
import { VisitDetailPage } from './VisitDetailPage'
import { IncidentEntryPage } from '../emergency-response/IncidentEntryPage'

/** Panel review part 2: late entry, entered in error, resting in clinic, the notes hint, escalation. */

const PARACETAMOL = 'item-0001'
const pad = (n: number) => String(n).padStart(2, '0')
/** "YYYY-MM-DDTHH:MM", local time, `minutes` ago. */
function minutesAgo(minutes: number) {
  const d = new Date(Date.now() - minutes * 60_000)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const base = { studentId: 'student-0001', complaint: 'Headache', treatment: '', followUp: null } as const

describe('late entry (VS-8, D1)', () => {
  beforeEach(() => resetMockDb())

  it('flags a visit dated more than 30 minutes before saving, keeps the optional reason, and audits "Late entry"', async () => {
    const { visit } = await recordVisit({ ...base, disposition: 'returned_to_class', dateTime: minutesAgo(120), lateEntryReason: 'System was down' })
    expect(visit).toMatchObject({ lateEntry: true, lateEntryReason: 'System was down' })
    expect(visit.dateTime.slice(0, 16)).toBe(minutesAgo(120))
    expect(getRecordedAuditEntries()[0].summary).toBe('Late entry')
    expect(JSON.stringify(getRecordedAuditEntries())).not.toContain('System was down')
  })

  it('is not late within 30 minutes, and never accepts a future time', async () => {
    const { visit } = await recordVisit({ ...base, disposition: 'returned_to_class', dateTime: minutesAgo(10), lateEntryReason: 'ignored' })
    expect(visit.lateEntry).toBeUndefined()
    await expect(recordVisit({ ...base, disposition: 'returned_to_class', dateTime: minutesAgo(-90) })).rejects.toThrow(/future/)
  })
})

describe('entered in error (VS-9, EX-3, D2)', () => {
  beforeEach(() => resetMockDb())

  it('needs a reason, keeps the record, returns stock, hides it from lists and counts, and blocks edits and approval', async () => {
    const before = (await getInventoryItem(PARACETAMOL)).currentStock
    const month = getMockToday().slice(0, 7)
    const { visit } = await recordVisit({
      ...base,
      disposition: 'sent_home',
      itemsGiven: [{ itemId: PARACETAMOL, quantity: 2 }],
      excuseLetterDraft: { excusedFrom: getMockToday(), excusedUntil: getMockToday(), note: null },
    })
    const countBefore = (await getMonthlyReport(month)).counts.visits
    await expect(markVisitEnteredInError(visit.id, '  ')).rejects.toThrow(/reason/)

    await markVisitEnteredInError(visit.id, 'Wrong student picked')
    expect((await getInventoryItem(PARACETAMOL)).currentStock).toBe(before)
    expect((await getVisit(visit.id)).enteredInError).toMatchObject({ reason: 'Wrong student picked' })
    expect((await listVisits()).some((v) => v.id === visit.id)).toBe(false)
    expect((await listVisits(undefined, { includeEnteredInError: true })).some((v) => v.id === visit.id)).toBe(true)
    expect((await getMonthlyReport(month)).counts.visits).toBe(countBefore - 1)
    await expect(updateVisit(visit.id, { complaint: 'Fever', treatment: '', disposition: 'sent_home', eventTag: null })).rejects.toThrow(/can no longer be edited/)
    await expect(approveExcuseLetter(visit.id, { excusedFrom: getMockToday(), excusedUntil: getMockToday() })).rejects.toThrow(/void/)
    expect(getRecordedAuditEntries().map((e) => e.summary).filter(Boolean)).toEqual(
      expect.arrayContaining(['Marked entered in error', 'Voided: visit entered in error']),
    )
  })

  it('asks for a reason on Visit Details and then locks the record', async () => {
    const user = userEvent.setup()
    const { visit } = await recordVisit({ ...base, disposition: 'returned_to_class' })
    renderWithRouter(<VisitDetailPage visitId={visit.id} />)
    await user.click(await screen.findByRole('button', { name: 'Entered in error' }))
    const dialog = screen.getByRole('dialog', { name: 'Mark this visit as entered in error?' })
    await user.click(within(dialog).getByRole('button', { name: 'Mark entered in error' }))
    expect(within(dialog).getByText('Give the reason this visit was entered in error.')).toBeInTheDocument()
    await user.type(within(dialog).getByRole('textbox', { name: /reason/i }), 'Duplicate of an earlier visit')
    await user.click(within(dialog).getByRole('button', { name: 'Mark entered in error' }))
    expect(await screen.findByText(/Entered in error\. This visit is kept/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })
})

describe('resting in clinic (VS-1)', () => {
  beforeEach(() => resetMockDb())

  it('counts today\'s resting visit with no Time out as "in the clinic now" and has no excuse letter', async () => {
    const today = getMockToday()
    const query = { range: { preset: 'today' as const, from: today, to: today } }
    const before = (await getDashboardSummary(query)).counts.inClinicNow
    const { visit } = await recordVisit({ ...base, disposition: 'resting_in_clinic' })
    expect((await getDashboardSummary(query)).counts.inClinicNow).toBe(before + 1)
    await updateVisit(visit.id, { complaint: 'Headache', treatment: '', disposition: 'resting_in_clinic', eventTag: null, timeOut: '23:59' })
    expect((await getDashboardSummary(query)).counts.inClinicNow).toBe(before)
    expect(hasExcuseLetter('resting_in_clinic')).toBe(false)
  })
})

describe('medicine named in the treatment notes (VS-4)', () => {
  const items = [
    { id: 'a', name: 'Paracetamol 500mg', currentStock: 5, flags: [] },
    { id: 'b', name: 'Oral Rehydration Salts', currentStock: 5, flags: ['expired'] },
    { id: 'c', name: 'Ice', currentStock: 5, flags: [] },
    { id: 'd', name: 'Cetirizine 10mg', currentStock: 0, flags: [] },
  ]

  it('matches whole words without the strength, and skips short, expired, out-of-stock or already-added items', () => {
    expect(itemsNamedInNotes('Gave PARACETAMOL, then rest', items, []).map((i) => i.id)).toEqual(['a'])
    expect(itemsNamedInNotes('paracetamolx', items, [])).toEqual([])
    expect(itemsNamedInNotes('oral rehydration salts and ice and cetirizine', items, [])).toEqual([])
    expect(itemsNamedInNotes('paracetamol', items, [{ itemId: 'a' }])).toEqual([])
  })
})

describe('escalate to incident (VS-7, ADR-036, D3)', () => {
  beforeEach(() => resetMockDb())

  it('links the saved visit and the incident both ways, keeps the visit time, and counts the event once', async () => {
    const month = getMockToday().slice(0, 7)
    const { visit } = await recordVisit({ ...base, disposition: 'returned_to_class', itemsGiven: [{ itemId: PARACETAMOL, quantity: 1 }] })
    const before = await getMonthlyReport(month)
    const incident = await saveIncidentStageOne({ studentId: base.studentId, complaint: 'Fainting', vitals: {}, time: visit.dateTime, sourceVisitId: visit.id })
    expect(incident).toMatchObject({ sourceVisitId: visit.id, time: visit.dateTime, itemsGiven: [] })
    expect((await getVisit(visit.id)).escalatedIncidentId).toBe(incident.id)
    const after = await getMonthlyReport(month)
    expect(after.counts.visits).toBe(before.counts.visits - 1)
    expect(after.counts.incidents).toBe(before.counts.incidents + 1)
    // The visit stays listed (with its chip); it is never deleted.
    expect((await listVisits()).some((v) => v.id === visit.id)).toBe(true)
    await expect(saveIncidentStageOne({ studentId: base.studentId, complaint: 'Fainting', vitals: {}, sourceVisitId: visit.id })).rejects.toThrow(/already escalated/)
  })

  it('from Visit Details opens Stage 1 with the student, complaint and temperature, and saving links them', async () => {
    const user = userEvent.setup()
    const { visit } = await recordVisit({ ...base, complaint: 'Fainting', disposition: 'returned_to_class', temperatureC: 37.8 })
    render(
      <MemoryRouter initialEntries={[`/incidents/new?fromVisit=${visit.id}`]}>
        <Routes>
          <Route path="/incidents/new" element={<IncidentEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText(/Escalated from a saved visit/)).toBeInTheDocument()
    expect(screen.getByLabelText(/temperature/i)).toHaveValue(37.8)
    expect(screen.getByLabelText(/complaint/i)).toHaveTextContent('Fainting')
    await user.click(screen.getByRole('button', { name: 'Save Stage 1' }))
    await screen.findByRole('heading', { name: 'Stage 2 completion' })
    const [incident] = (await listIncidents()).filter((i) => i.sourceVisitId === visit.id)
    expect(incident.time).toBe(visit.dateTime)
    expect(screen.getByRole('heading', { name: 'From visit' })).toBeInTheDocument()
  })

  it('from New Visit carries what was typed without saving a visit, and hints on an emergency complaint', async () => {
    const user = userEvent.setup()
    const visitsBefore = (await listVisits()).length
    render(
      <MemoryRouter initialEntries={['/visits/new']}>
        <Routes>
          <Route path="/visits/new" element={<NewVisitEntryPage />} />
          <Route path="/incidents/new" element={<IncidentEntryPage />} />
        </Routes>
      </MemoryRouter>,
    )
    await pickStudent(user, '000000260001')
    await selectOption(user, screen.getByLabelText(/^complaint/i), 'Other (type your own)')
    await user.type(screen.getByLabelText(/specify other complaint/i), 'fainting')
    expect(screen.getByText('This looks like an emergency. Escalate to an incident?')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Escalate to incident' })[0])
    expect(await screen.findByText(/Escalated from the New Visit form/)).toBeInTheDocument()
    expect(screen.getByLabelText(/complaint/i)).toHaveTextContent('Fainting')
    expect((await listVisits()).length).toBe(visitsBefore)
  })
})

describe('first-aid checklist wording (VS-6) and one search instruction (VS-12)', () => {
  beforeEach(() => resetMockDb())

  it('calls it the first-aid checklist and says the search instruction once', async () => {
    renderWithRouter(<NewVisitEntryPage />)
    expect(await screen.findByText('Enter a complaint to show the first-aid checklist')).toBeInTheDocument()
    expect(screen.getAllByText(/LRN, a Staff No\. or a name/i)).toHaveLength(1)
  })
})

describe('decided Thursday, October 22, 2026 (Zean)', () => {
  beforeEach(() => resetMockDb())

  it('cancels the pending follow-ups of a visit entered in error, with the reason', async () => {
    const today = getMockToday()
    const { visit, followUp } = await recordVisit({
      ...base,
      disposition: 'returned_to_class',
      followUp: { followUpDate: today, reason: 'Recheck', notes: null },
    })
    await markVisitEnteredInError(visit.id, 'Wrong student')
    const after = (await listFollowUps()).find((item) => item.id === followUp!.id)!
    expect(after).toMatchObject({ status: 'cancelled', statusReason: 'Visit entered in error: Wrong student' })
    expect(getRecordedAuditEntries().map((e) => e.summary)).toContain('Marked cancelled: visit entered in error')
  })

  it("corrects a saved visit's date and time, never into the future, and audits the field", async () => {
    const { visit } = await recordVisit({ ...base, disposition: 'returned_to_class' })
    const patch = { complaint: 'Headache', treatment: '', disposition: 'returned_to_class' as const, eventTag: null }
    await updateVisit(visit.id, { ...patch, dateTime: minutesAgo(180) })
    expect((await getVisit(visit.id)).dateTime.slice(0, 16)).toBe(minutesAgo(180))
    expect(getRecordedAuditEntries().at(-1)?.summary).toBe('Updated date and time')
    await expect(updateVisit(visit.id, { ...patch, dateTime: minutesAgo(-120) })).rejects.toThrow(/future/)
  })
})
