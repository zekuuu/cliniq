import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { addDays, todayISO } from '../../lib/dates'
import { excusedDays, medicalCertificateWarning, STAY_HOME_LINE } from '../../lib/excuseLetter'
import {
  approveExcuseLetter,
  getExcuseLetterApproval,
  getRecordedAuditEntries,
  getStudent,
  getStudentExcuseLetters,
  getVisit,
  recordVisit,
  resetMockDb,
  saveStudent,
  updateVisit,
} from '../../lib/mock-db'
import { pickStudent } from '../../test/pickStudent'
import { renderWithRouter } from '../../test/renderWithRouter'
import { fetchExcuseLetterContext } from './api/excuseLetterApi'
import { CertificateWarning } from './CertificateWarning'
import { ExcuseLetterPage } from './ExcuseLetterPage'
import { NewVisitEntryPage } from './NewVisitEntryPage'
import { VisitDetailPage } from './VisitDetailPage'

/** Decisions sheet, Part 1: letters and visits (ADR-049). */
describe('Letters and visits (ADR-049)', () => {
  beforeEach(() => resetMockDb())

  async function openForm() {
    const user = userEvent.setup()
    renderWithRouter(<NewVisitEntryPage />)
    await pickStudent(user, '000000260001')
    await screen.findByRole('heading', { name: 'New Visit' })
    return user
  }

  async function chooseComplaint(user: ReturnType<typeof userEvent.setup>, label: string) {
    await user.click(screen.getByRole('button', { name: /complaint/i }))
    const option = screen.queryByRole('option', { name: label })
    if (option) return user.click(option)
    // Not among the top suggestions yet: typed under Other, as the clinician would.
    await user.click(screen.getByRole('option', { name: 'Other (type your own)' }))
    await user.type(screen.getByLabelText(/specify other complaint/i), label)
  }

  it('"Save and approve now" stores the letter in the same save and writes both audit entries', async () => {
    const today = todayISO()
    const { visit } = await recordVisit({
      studentId: 'student-0001',
      complaint: 'Fever',
      treatment: '',
      disposition: 'sent_home',
      followUp: null,
      excuseLetterDraft: { excusedFrom: today, excusedUntil: today, note: null },
      approveExcuseLetterNow: true,
    })
    const approval = await getExcuseLetterApproval(visit.id)
    expect(approval).toMatchObject({ excusedFrom: today, excusedUntil: today, recipient: 'Class Adviser' })
    expect(approval?.body).toMatch(/is excused on/)
    expect((await getVisit(visit.id)).excuseLetterDraft).toBeNull()
    const entries = getRecordedAuditEntries()
    expect(entries.some((e) => e.actionType === 'submit' && e.targetRecord?.id === visit.id)).toBe(true)
    expect(entries.some((e) => e.actionType === 'approve' && e.targetRecord?.type === 'excuse-letter' && e.targetRecord.id === approval?.id)).toBe(true)
  })

  it('offers "Save and approve now" only while a letter is prepared, and a plain Save still leaves an unprintable draft', async () => {
    const user = await openForm()
    await chooseComplaint(user, 'Dizziness')
    expect(screen.queryByRole('button', { name: 'Save and approve now' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Sent home' }))
    await user.click(screen.getByRole('button', { name: 'Today only' }))
    await user.click(screen.getByRole('button', { name: 'Save and approve now' }))
    expect(await screen.findByText(/excuse letter was approved and stored/i)).toBeInTheDocument()
    const approveEntry = getRecordedAuditEntries().findLast((e) => e.actionType === 'approve')
    expect(approveEntry?.targetRecord?.type).toBe('excuse-letter')

    // The two-step path is unchanged: Save keeps a draft, and a draft can't print (ADR-038 item 6).
    const draftVisit = 'visit-0151'
    expect((await getVisit(draftVisit)).excuseLetterDraft).not.toBeNull()
    renderWithRouter(<ExcuseLetterPage visitId={draftVisit} />)
    const print = await screen.findByRole('button', { name: 'Print / Save as PDF' })
    expect(print).toHaveAttribute('aria-disabled', 'true')
  })

  it('warns about a medical certificate past 3 days, counting both dates, and never blocks', () => {
    const three = { excusedFrom: '2026-10-01', excusedUntil: '2026-10-03' }
    const four = { excusedFrom: '2026-10-01', excusedUntil: '2026-10-04' }
    expect(excusedDays(three)).toBe(3)
    expect(medicalCertificateWarning(three, 3)).toBeNull()
    expect(medicalCertificateWarning(four, 3)).toBe('More than 3 days: a medical certificate is usually needed.')
  })

  it('shows the certificate warning beside the excused period at 4 days and not at 3', async () => {
    const { rerender } = render(<CertificateWarning period={{ excusedFrom: '2026-10-01', excusedUntil: '2026-10-04' }} />)
    expect(await screen.findByRole('note')).toHaveTextContent('More than 3 days: a medical certificate is usually needed.')
    rerender(<CertificateWarning period={{ excusedFrom: '2026-10-01', excusedUntil: '2026-10-03' }} />)
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('keeps the approved wording when the template would now read differently', async () => {
    const visitId = 'visit-0151'
    const before = await fetchExcuseLetterContext(visitId)
    await approveExcuseLetter(visitId, { ...before.period, recipient: 'Grade 4 Adviser', body: 'Approved wording, as signed.' })
    // The student's name changes afterwards, which would change the template's first sentence.
    const student = await getStudent(before.student.id)
    await saveStudent({ ...student, fullName: `${student.fullName} Jr.` }, { studentId: student.id, nameCorrectionReason: 'Registrar correction' })
    const after = await fetchExcuseLetterContext(visitId)
    expect(after.body).toBe('Approved wording, as signed.')
    expect(after.recipient).toBe('Grade 4 Adviser')
  })

  it('fills the wording of letters approved before it was stored, once, from the template', async () => {
    const approval = await getExcuseLetterApproval('visit-0139')
    expect(approval?.recipient).toBe('Class Adviser')
    expect(approval?.body).toMatch(/visited the school clinic on/)
  })

  it('flags "Outcome changed since approval" once the visit is edited to Returned to class', async () => {
    const visitId = 'visit-0139'
    const studentId = (await getVisit(visitId)).studentId!
    const changed = async () => (await getStudentExcuseLetters(studentId)).find((l) => l.visitId === visitId)?.outcomeChanged
    expect(await changed()).toBe(false)
    const visit = await getVisit(visitId)
    await updateVisit(visitId, { ...visit, disposition: 'returned_to_class' })
    expect(await changed()).toBe(true)
    renderWithRouter(<VisitDetailPage visitId={visitId} />)
    expect(await screen.findByText('Outcome changed since approval')).toBeInTheDocument()
  })

  it.each(['Fever', 'Headache', 'Chills'])('opens "Show more fields" by itself for %s, and it can be closed', async (complaint) => {
    const user = await openForm()
    expect(screen.queryByLabelText('Body temperature (°C)')).not.toBeVisible()
    await chooseComplaint(user, complaint)
    expect(screen.getByLabelText('Body temperature (°C)')).toBeVisible()
    await user.click(screen.getByRole('button', { name: /show fewer fields/i }))
    expect(screen.queryByLabelText('Body temperature (°C)')).not.toBeVisible()
  })

  it('leaves "Show more fields" closed for other complaints', async () => {
    const user = await openForm()
    await chooseComplaint(user, 'Dizziness')
    expect(screen.queryByLabelText('Body temperature (°C)')).not.toBeVisible()
  })

  it('asks who collected the student only for Sent home and Referred to hospital, and saves it on the visit', async () => {
    const user = await openForm()
    await chooseComplaint(user, 'Dizziness')
    expect(screen.queryByLabelText('Collected by')).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Resting in clinic' }))
    expect(screen.queryByLabelText('Collected by')).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Referred to hospital' }))
    expect(screen.getByLabelText('Collected by')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Sent home' }))
    await user.type(screen.getByLabelText('Collected by'), 'Ferdie Quizon')
    await user.type(screen.getByLabelText('Relationship'), 'Guardian')
    await user.click(screen.getByLabelText(/prepare an excuse letter/i))
    await user.click(screen.getByRole('button', { name: 'Save Visit' }))
    expect(await screen.findByText(/visit saved/i)).toBeInTheDocument()
    const entry = getRecordedAuditEntries().findLast((e) => e.actionType === 'submit' && e.targetRecord?.type === 'visit')
    const saved = await getVisit(entry!.targetRecord!.id)
    expect(saved.collectedBy).toMatchObject({ name: 'Ferdie Quizon', relationship: 'Guardian' })
    expect(saved.collectedBy?.time).toMatch(/^\d{2}:\d{2}$/)
  })

  it('rejects a collection time in the future', async () => {
    const today = todayISO()
    await expect(
      recordVisit({
        studentId: 'student-0001',
        complaint: 'Fever',
        treatment: '',
        disposition: 'sent_home',
        followUp: null,
        collectedBy: { name: 'A parent', relationship: 'Parent', time: '23:59' },
        dateTime: `${addDays(today, -1)}T08:00`,
      }),
    ).resolves.toBeTruthy()
    // On today's visit, a time later than now is refused (23:59 is later than any test run but the last minute).
    if (new Date().getHours() < 23)
      await expect(
        recordVisit({
          studentId: 'student-0001',
          complaint: 'Fever',
          treatment: '',
          disposition: 'sent_home',
          followUp: null,
          collectedBy: { name: 'A parent', relationship: 'Parent', time: '23:59' },
        }),
      ).rejects.toThrow("The collection time can't be in the future.")
  })

  it('keeps "Stay home until cleared" on a follow-up and prints it on the approved letter', async () => {
    const today = todayISO()
    const { visit, followUp } = await recordVisit({
      studentId: 'student-0001',
      complaint: 'Fever',
      treatment: '',
      disposition: 'sent_home',
      followUp: { followUpDate: addDays(today, 1), reason: 'Check temperature', notes: null, stayHomeUntilCleared: true, stayHomeNote: 'Until fever-free 24 hours' },
      excuseLetterDraft: { excusedFrom: today, excusedUntil: today, note: null, stayHomeUntilCleared: true, stayHomeNote: null },
      approveExcuseLetterNow: true,
    })
    expect(followUp).toMatchObject({ stayHomeUntilCleared: true, stayHomeNote: 'Until fever-free 24 hours' })
    expect(await getExcuseLetterApproval(visit.id)).toMatchObject({ stayHomeUntilCleared: true })

    renderWithRouter(<ExcuseLetterPage visitId={visit.id} />)
    await screen.findByRole('heading', { name: 'Excuse Letter' })
    // The A4 document mounts for printing only.
    act(() => {
      window.dispatchEvent(new Event('beforeprint'))
    })
    const printed = document.body.querySelector('[data-print-document]') as HTMLElement
    expect(within(printed).getByText(STAY_HOME_LINE)).toBeInTheDocument()
  })
})
