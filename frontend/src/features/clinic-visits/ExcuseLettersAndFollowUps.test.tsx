import { act, screen, waitFor, within } from '@testing-library/react'
import { Route, Routes, useParams } from 'react-router'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  approveExcuseLetter,
  getExcuseLetterApproval,
  getMockToday,
  getRecordedAuditEntries,
  getStudentExcuseLetters,
  getVisit,
  issueReplacementExcuseLetter,
  listFollowUps,
  markVisitEnteredInError,
  rescheduleFollowUp,
  resetMockDb,
  setFollowUpStatus,
} from '../../lib/mock-db'
import { addDays, formatDate } from '../../lib/dates'
import { renderWithRouter } from '../../test/renderWithRouter'
import { defaultBody } from './api/excuseLetterApi'
import { ExcuseLetterPage } from './ExcuseLetterPage'

/** Panel review part 3: letter wording, presets, replacement letters; reasons on Missed and Cancelled. */

const APPROVED_VISIT = 'visit-0141'

describe('excuse letter wording (EX-4)', () => {
  it('names the excused dates and stays non-diagnostic', async () => {
    resetMockDb()
    const visit = await getVisit(APPROVED_VISIT)
    const student = { fullName: 'Test Student' } as never
    const one = defaultBody(student, visit, { excusedFrom: '2026-10-20', excusedUntil: '2026-10-20' })
    const two = defaultBody(student, visit, { excusedFrom: '2026-10-20', excusedUntil: '2026-10-22' })
    expect(one).toContain(`is excused on ${formatDate('2026-10-20')}.`)
    expect(two).toContain(`is excused from ${formatDate('2026-10-20')} to ${formatDate('2026-10-22')}.`)
    expect(two).toContain('for school attendance documentation only')
    expect(two).not.toMatch(/may be excused|as recorded in CLINIQ/)
  })
})

describe('excused-period presets (EX-1)', () => {
  beforeEach(() => resetMockDb())

  it('sets "Excused until" from "Excused from" and the wording follows', async () => {
    const user = userEvent.setup()
    renderWithRouter(<ExcuseLetterPage visitId="visit-0151" />)
    await screen.findByRole('heading', { name: 'Excuse Letter' })
    const from = (await getVisit('visit-0151')).excuseLetterDraft!.excusedFrom
    await user.click(screen.getByRole('button', { name: '+2 days' }))
    const body = () => (screen.getByRole('textbox', { name: 'Letter body' }) as HTMLTextAreaElement).value
    expect(body()).toContain(`is excused from ${formatDate(from)} to ${formatDate(addDays(from, 2))}.`)
    await user.click(screen.getByRole('button', { name: 'Today only' }))
    expect(body()).toContain(`is excused on ${formatDate(from)}.`)
  })
})

describe('replacement letters (EX-3)', () => {
  beforeEach(() => resetMockDb())

  it('keeps the old letter as Superseded, opens a new draft, and approves the replacement under its own id', async () => {
    const old = (await getExcuseLetterApproval(APPROVED_VISIT))!
    await expect(issueReplacementExcuseLetter(APPROVED_VISIT, ' ')).rejects.toThrow(/reason/)
    await issueReplacementExcuseLetter(APPROVED_VISIT, 'Fever lasted a day longer')
    expect(await getExcuseLetterApproval(APPROVED_VISIT)).toBeNull()
    expect((await getVisit(APPROVED_VISIT)).excuseLetterDraft).toMatchObject({ excusedFrom: old.excusedFrom, excusedUntil: old.excusedUntil })
    const replacement = await approveExcuseLetter(APPROVED_VISIT, { excusedFrom: old.excusedFrom, excusedUntil: addDays(old.excusedUntil, 1) })
    expect(replacement.id).not.toBe(old.id)
    const visit = await getVisit(APPROVED_VISIT)
    const statuses = (await getStudentExcuseLetters(visit.studentId)).filter((l) => l.visitId === APPROVED_VISIT).map((l) => l.status).sort()
    expect(statuses).toEqual(['approved', 'superseded'])
    expect(getRecordedAuditEntries().map((e) => e.summary)).toContain('Superseded; replacement draft opened')
  })

  it('never replaces a voided letter', async () => {
    await markVisitEnteredInError(APPROVED_VISIT, 'Wrong student')
    await expect(issueReplacementExcuseLetter(APPROVED_VISIT, 'Correct the date')).rejects.toThrow(/voided/)
  })

  it('offers "Issue a replacement" on an approved letter and asks for a reason', async () => {
    const user = userEvent.setup()
    renderWithRouter(<ExcuseLetterPage visitId={APPROVED_VISIT} />)
    await user.click(await screen.findByRole('button', { name: 'Issue a replacement' }))
    const dialog = screen.getByRole('dialog', { name: 'Issue a replacement letter?' })
    await user.click(within(dialog).getByRole('button', { name: 'Issue a replacement' }))
    expect(within(dialog).getByText('Give the reason for the replacement.')).toBeInTheDocument()
    await user.type(within(dialog).getByRole('textbox', { name: /reason/i }), 'Wrong date')
    await user.click(within(dialog).getByRole('button', { name: 'Issue a replacement' }))
    // The write and the page's reload both go through the mock latency; the editor then remounts on the new draft.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Issue a replacement' })).not.toBeInTheDocument(), { timeout: 3000 })
    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve and Store' })).toBeInTheDocument()
  })
})

describe('Missed and Cancelled need a reason (FU-4)', () => {
  beforeEach(() => resetMockDb())

  it('refuses a missing reason, keeps it on the follow-up, and "Set a new date" creates a pending copy', async () => {
    const [pending] = await listFollowUps({ status: 'pending' })
    await expect(setFollowUpStatus(pending.id, 'missed')).rejects.toThrow(/reason/)
    await setFollowUpStatus(pending.id, 'cancelled', undefined, 'Student transferred section')
    expect((await listFollowUps({ status: 'cancelled' })).find((f) => f.id === pending.id)?.statusReason).toBe('Student transferred section')
    await expect(rescheduleFollowUp(pending.id, addDays(getMockToday(), -1))).rejects.toThrow(/past/)
    const next = await rescheduleFollowUp(pending.id, addDays(getMockToday(), 3))
    expect(next).toMatchObject({ status: 'pending', studentId: pending.studentId, reason: pending.reason, relatedRecord: pending.relatedRecord })
    expect(getRecordedAuditEntries().map((e) => e.actionType)).toEqual(['update', 'create'])
  })
})

describe('a superseded letter opens on its own (decided Friday, October 23, 2026)', () => {
  beforeEach(() => resetMockDb())

  it('opens read-only, marked Superseded, prints SUPERSEDED, and links to the current letter', async () => {
    const old = (await getExcuseLetterApproval(APPROVED_VISIT))!
    await issueReplacementExcuseLetter(APPROVED_VISIT, 'Fever lasted a day longer')
    renderWithRouter(<Routes><Route path="/visits/:visitId/excuse-letter" element={<RoutedLetter />} /></Routes>, { route: `/visits/${APPROVED_VISIT}/excuse-letter?letter=${old.id}` })
    expect(await screen.findByText(/A later letter replaced this one/)).toBeInTheDocument()
    expect(screen.getByText('Superseded', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve and Store' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Issue a replacement' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the current letter' })).toHaveAttribute('href', `/visits/${APPROVED_VISIT}/excuse-letter`)
    act(() => {
      window.dispatchEvent(new Event('beforeprint'))
    })
    expect(document.body.querySelector('[data-print-document]')).toHaveTextContent('SUPERSEDED. A later letter replaced this one')
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
  })
})

function RoutedLetter() {
  const { visitId } = useParams()
  return <ExcuseLetterPage visitId={visitId} />
}
