import { renderWithRouter } from '../../test/renderWithRouter'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addDays, formatDate, formatDateRange } from '../../lib/dates'
import { getExcuseLetterApproval, getRecordedAuditEntries, markVisitEnteredInError, resetMockDb } from '../../lib/mock-db'
import { pickDate } from '../../test/pickDate'
import { ExcuseLetterPage } from './ExcuseLetterPage'
import { fetchExcuseLetterContext } from './api/excuseLetterApi'

describe('Excuse Letter', () => {
  beforeEach(() => {
    resetMockDb()
    vi.restoreAllMocks()
  })

  it('renders a clinic excuse letter, not a medical certificate workflow', async () => {
    const context = await fetchExcuseLetterContext()
    renderWithRouter(<ExcuseLetterPage />)

    expect(
      await screen.findByRole('heading', { name: 'Excuse Letter' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(new RegExp(context.student.fullName)).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Clinic Excuse Letter' })).toBeInTheDocument()
    expect(screen.getAllByText(/not a medical certificate/i).length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { name: /medical certificate/i })).not.toBeInTheDocument()
  })

  it('keeps a draft on screen with Print disabled, and prints once it is approved (ADR-038 item 6)', async () => {
    const user = userEvent.setup()
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    renderWithRouter(<ExcuseLetterPage />)

    await screen.findByRole('heading', { name: 'Excuse Letter' })
    const button = screen.getByRole('button', { name: 'Print / Save as PDF' })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toHaveAccessibleDescription('Approve the letter to print it.')
    act(() => {
      window.dispatchEvent(new Event('beforeprint'))
    })
    expect(document.body.querySelector('[data-print-document]')).toBeNull()
    expect(getRecordedAuditEntries().some((entry) => entry.actionType === 'print')).toBe(false)
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })

    await user.click(screen.getByLabelText(/I checked the letter and approve storing it in the student's record/i))
    await user.click(screen.getByRole('button', { name: 'Approve and Store' }))
    await screen.findByText('Excuse letter approved and stored in the student record.')
    await user.click(screen.getByRole('button', { name: 'Print / Save as PDF' }))
    expect(print).toHaveBeenCalledOnce()
  })

  it('still prints a void letter, stamped VOID', async () => {
    await markVisitEnteredInError('visit-0151', 'Wrong student picked')
    renderWithRouter(<ExcuseLetterPage visitId="visit-0151" />)
    await screen.findByRole('heading', { name: 'Excuse Letter' })
    expect(screen.getByRole('button', { name: 'Print / Save as PDF' })).not.toHaveAttribute('aria-disabled')
    // The print listener is attached in an effect, so retry until the printout mounts.
    await waitFor(() => {
      act(() => {
        window.dispatchEvent(new Event('beforeprint'))
      })
      expect(document.body.querySelector('[data-print-document]')).toHaveTextContent('VOID. The clinic visit was entered in error')
    })
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
  })

  it('requires nurse check before approval and writes an audit entry', async () => {
    const user = userEvent.setup()
    renderWithRouter(<ExcuseLetterPage />)

    await screen.findByRole('heading', { name: 'Excuse Letter' })
    expect(screen.getByRole('button', { name: 'Approve and Store' })).toBeDisabled()

    await user.click(
      screen.getByLabelText(/I checked the letter and approve storing it in the student's record/i),
    )
    await user.click(screen.getByRole('button', { name: 'Approve and Store' }))

    expect(
      await screen.findByText('Excuse letter approved and stored in the student record.'),
    ).toBeInTheDocument()
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toEqual(['approve'])
  })

  it('defaults the excused period to the visit date and shows it on the letter', async () => {
    const context = await fetchExcuseLetterContext('visit-0001')
    const visitDate = context.visit.dateTime.slice(0, 10)
    renderWithRouter(<ExcuseLetterPage visitId="visit-0001" />)

    await screen.findByRole('heading', { name: 'Excuse Letter' })
    expect(screen.getByRole('button', { name: /^Excused from/ })).toHaveTextContent(formatDate(visitDate))
    expect(screen.getByRole('button', { name: /^Excused until/ })).toHaveTextContent(formatDate(visitDate))
    expect(screen.getByText(`Excused period: ${formatDate(visitDate)}`)).toBeInTheDocument()
  })

  it('blocks approval while "until" is before "from", then stores the chosen period', async () => {
    const user = userEvent.setup()
    const context = await fetchExcuseLetterContext('visit-0001')
    const from = context.visit.dateTime.slice(0, 10)
    renderWithRouter(<ExcuseLetterPage visitId="visit-0001" />)

    await screen.findByRole('heading', { name: 'Excuse Letter' })
    await user.click(screen.getByLabelText(/I checked the letter/i))
    await pickDate(user, screen.getByRole('button', { name: /^Excused from/ }), addDays(from, 1))
    expect(screen.getByText("Excused until can't be before Excused from.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve and Store' })).toBeDisabled()

    await pickDate(user, screen.getByRole('button', { name: /^Excused until/ }), addDays(from, 2))
    expect(screen.getByText(`Excused period: ${formatDateRange(addDays(from, 1), addDays(from, 2))}`)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Approve and Store' }))

    await screen.findByText('Excuse letter approved and stored in the student record.')
    expect(await getExcuseLetterApproval('visit-0001')).toMatchObject({
      excusedFrom: addDays(from, 1),
      excusedUntil: addDays(from, 2),
    })
    expect(screen.getByRole('button', { name: /^Excused from/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^Excused until/ })).toBeDisabled()
  })

  it('prefills the period and teacher note from the visit draft, and snapshots both on approval', async () => {
    const user = userEvent.setup()
    const context = await fetchExcuseLetterContext('visit-0151')
    renderWithRouter(<ExcuseLetterPage visitId="visit-0151" />)

    await screen.findByRole('heading', { name: 'Excuse Letter' })
    const range = formatDateRange(context.period.excusedFrom, context.period.excusedUntil)
    expect(screen.getByText(`Excused period: ${range}`)).toBeInTheDocument()
    expect(screen.getByLabelText('Note for the teacher')).toHaveValue('Please allow the student to take the missed quiz.')
    expect(screen.getByText('Note for the teacher: Please allow the student to take the missed quiz.')).toBeInTheDocument()

    await user.click(screen.getByLabelText(/I checked the letter/i))
    await user.click(screen.getByRole('button', { name: 'Approve and Store' }))
    await screen.findByText('Excuse letter approved and stored in the student record.')
    expect(await getExcuseLetterApproval('visit-0151')).toMatchObject({
      ...context.period,
      note: 'Please allow the student to take the missed quiz.',
    })
    expect(screen.getByLabelText('Note for the teacher')).toBeDisabled()
  })
})

