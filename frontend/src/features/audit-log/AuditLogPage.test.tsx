import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { getRecordedAuditEntries, listStudents, recordPrint } from '../../lib/mock-db'
import { selectOption } from '../../test/selectOption'
import { AuditLogPage } from './AuditLogPage'

const STAFF = { id: 'user-staff-01', name: 'Jennesse Baas', role: 'staff' } as const

function renderPage() {
  return render(<MemoryRouter><AuditLogPage viewer={STAFF} /></MemoryRouter>)
}

describe('Audit Log', () => {
  it('shows a paginated, newest-first privacy-safe audit list', async () => {
    renderPage()
    const table = await screen.findByRole('table', { name: 'Filtered audit log' })
    const student = (await listStudents({ includeArchived: true })).find((item) => item.id === 'student-0006')!

    expect(within(table).getAllByRole('row')[1]).toHaveTextContent(student.studentNumber)
    expect(within(table).getAllByRole('row')[1]).not.toHaveTextContent(student.fullName)
    expect(within(table).queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument()
    expect(screen.getByText(/Showing 1–10 of/)).toBeInTheDocument()
  })

  it('filters entries by the resolved account name', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('table', { name: 'Filtered audit log' })

    await selectOption(user, screen.getByLabelText('User'), 'user-admin-01')

    await screen.findByText(/7 entries shown/)
    const [table] = screen.getAllByRole('table', { name: 'Filtered audit log' })
    expect(within(table).getAllByText('Gilan Avelida')).toHaveLength(7)
  })

  it('searches the visible user, action, and target text and clears with the other filters', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('table', { name: 'Filtered audit log' })

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'gilan')
    await screen.findByText(/7 entries shown/)

    await user.clear(screen.getByRole('searchbox', { name: 'Search' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'no such entry')
    expect(await screen.findByText('No audit entries found')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear Filters' }))
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('')
    expect(await screen.findByRole('table', { name: 'Filtered audit log' })).toBeInTheDocument()
  })

  it('shows each actor role, the record kind beside its identifier, and what changed', async () => {
    renderPage()
    const table = await screen.findByRole('table', { name: 'Filtered audit log' })

    expect(within(table).getAllByText('School Clinician').length).toBeGreaterThan(0)
    expect(within(table).getAllByText('Student').length).toBeGreaterThan(0)
    expect(within(table).getAllByRole('link', { name: /^\d{4}-\d{5}$/ }).length).toBeGreaterThan(0)

    await userEvent.setup().type(screen.getByRole('searchbox', { name: 'Search' }), 'updated allergies')
    await screen.findByText(/1 entry shown/)
    expect(screen.getAllByText('Updated allergies').length).toBeGreaterThan(0)
  })

  it('filters action types through the multi-select control', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('table', { name: 'Filtered audit log' })

    await user.click(screen.getByRole('button', { name: /action type all actions/i }))
    await user.click(screen.getByRole('checkbox', { name: 'Archive' }))
    await user.click(screen.getByRole('button', { name: /action type 1 selected/i }))

    await screen.findByText(/2 entries shown/)
    const [table] = screen.getAllByRole('table', { name: 'Filtered audit log' })
    expect(within(table).getAllByText('Archive')).toHaveLength(2)
    expect(within(table).queryByText('Login')).not.toBeInTheDocument()
  })

  it('shows and filters print entries by document title', async () => {
    await recordPrint('Student profile', STAFF)
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('table', { name: 'Filtered audit log' })

    await user.click(screen.getByRole('button', { name: /action type all actions/i }))
    await user.click(screen.getByRole('checkbox', { name: 'Print / Save as PDF' }))
    await user.click(screen.getByRole('button', { name: /action type 1 selected/i }))

    expect(await screen.findByText('Student profile')).toBeInTheDocument()
    expect(screen.getAllByText('Print / Save as PDF').length).toBeGreaterThan(0)
  })

  it('moves through audit pages without rendering the full list at once', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('table', { name: 'Filtered audit log' })

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByText('Page 2 of 4')).toBeInTheDocument()
    expect(screen.getByText(/Showing 11–20 of/)).toBeInTheDocument()
  })

  it('returns to the first page when a filter changes', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('table', { name: 'Filtered audit log' })

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Page 2 of 4')).toBeInTheDocument()

    await selectOption(user, screen.getByLabelText('User'), 'user-admin-01')
    await screen.findByText(/7 entries shown/)

    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
    expect(screen.getByText('Showing 1\u20137 of 7 entries')).toBeInTheDocument()
  })

  it('audits printing the current filtered view once', async () => {
    const user = userEvent.setup()
    const print = vi.spyOn(window, 'print').mockImplementation(() => window.dispatchEvent(new Event('beforeprint')))
    renderPage()
    await screen.findByRole('table', { name: 'Filtered audit log' })

    await user.click(screen.getByRole('button', { name: 'Print / Save as PDF' }))

    expect(print).toHaveBeenCalledOnce()
    await waitFor(() => expect(getRecordedAuditEntries()).toEqual([
      expect.objectContaining({ actionType: 'print', userId: STAFF.id, targetRecord: { type: 'print-document', id: 'Audit Log' } }),
    ]))
    window.dispatchEvent(new Event('afterprint'))
  })
})
