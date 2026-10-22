import { renderWithRouter } from '../../test/renderWithRouter'
import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, useParams } from 'react-router'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { getMockSessionUser, getRecordedAuditEntries, resetMockDb } from '../../lib/mock-db'
import { IncompleteRecordsQueuePage } from './IncompleteRecordsQueuePage'
import { StudentFormPage } from './StudentFormPage'
import { fetchIncompleteRecords } from './api/incompleteRecordsApi'
import { lrnLabel, maskLrn } from '../../lib/lrn'

function EditRoute() {
  return <StudentFormPage studentId={useParams().studentId} />
}

describe('Incomplete Records', () => {
  beforeEach(() => resetMockDb())

  it('renders incomplete student records without inline medical values', async () => {
    renderWithRouter(<IncompleteRecordsQueuePage />)

    expect(
      await screen.findByRole('heading', { name: 'Incomplete Records' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Student' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Missing fields' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getAllByText(/Emergency contact|Allergies confirmation|Medical conditions confirmation/).length).toBeGreaterThan(0)
    expect(screen.queryByText('Peanuts')).not.toBeInTheDocument()
    expect(screen.queryByText('Asthma')).not.toBeInTheDocument()
  })

  it('searches by LRN', async () => {
    const user = userEvent.setup()
    const [record] = await fetchIncompleteRecords()
    renderWithRouter(<IncompleteRecordsQueuePage />)

    await screen.findByRole('heading', { name: 'Incomplete Records' })
    await user.type(screen.getByLabelText('Search'), record.lrn)

    expect(await screen.findByText('1 record shown')).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: new RegExp(record.fullName) })).toBeInTheDocument()
    expect(screen.getByText(maskLrn(record.lrn))).toBeInTheDocument()
  })

  it('offers Edit Record on every row instead of a Mark Reviewed shortcut', async () => {
    renderWithRouter(<IncompleteRecordsQueuePage />)

    await screen.findByRole('heading', { name: 'Incomplete Records' })
    expect(screen.queryByRole('button', { name: /Mark Reviewed/ })).not.toBeInTheDocument()
    const [record] = await fetchIncompleteRecords()
    expect(screen.getByRole('link', { name: `Edit Record for ${record.fullName}` })).toHaveAttribute(
      'href',
      `/students/${record.studentId}/edit`,
    )
  })

  it('edits a record from the queue, returns to it, and credits who resolved it', async () => {
    const user = userEvent.setup()
    const fillable = ['Student contact information', 'Emergency contact', 'Emergency contact name', 'Emergency contact phone']
    const record = (await fetchIncompleteRecords()).find(
      (row) => !row.resolvedAt && row.missingFields.every((field) => fillable.includes(field)),
    )!
    const router = createMemoryRouter(
      [
        { path: '/students/incomplete', element: <IncompleteRecordsQueuePage /> },
        { path: '/students/:studentId/edit', element: <EditRoute /> },
      ],
      { initialEntries: ['/students/incomplete'] },
    )
    render(<RouterProvider router={router} />)

    await user.click(await screen.findByRole('link', { name: `Edit Record for ${record.fullName}` }))
    await screen.findByRole('heading', { name: 'Edit Student' })
    for (const [label, value] of [
      ['Student contact information', '09171234567'],
      ['Contact name', 'Maria Santos'],
      ['Relationship', 'Mother'],
      ['Contact phone', '09171234568'],
    ]) {
      const field = screen.getByLabelText(new RegExp(`^${label}`))
      if (!(field as HTMLInputElement).value) await user.type(field, value)
    }
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await screen.findByRole('heading', { name: 'Incomplete Records' })
    expect(router.state.location.pathname).toBe('/students/incomplete')
    expect(router.state.historyAction).toBe('POP')
    await user.click(screen.getByRole('radio', { name: 'Resolved' }))
    const row = await screen.findByRole('row', { name: new RegExp(lrnLabel(record.lrn)) })
    expect(within(row).getByText('Resolved')).toBeInTheDocument()
    expect(within(row).getByText(new RegExp(getMockSessionUser().name))).toBeInTheDocument()
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toEqual(['update'])
  })
})
