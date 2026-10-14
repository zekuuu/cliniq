import { renderWithRouter } from '../../test/renderWithRouter'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { getMockSessionUser, getRecordedAuditEntries, resetMockDb } from '../../lib/mock-db'
import { IncompleteRecordsQueuePage } from './IncompleteRecordsQueuePage'
import { fetchIncompleteRecords } from './api/incompleteRecordsApi'

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

  it('searches by Student Number', async () => {
    const user = userEvent.setup()
    const [record] = await fetchIncompleteRecords()
    renderWithRouter(<IncompleteRecordsQueuePage />)

    await screen.findByRole('heading', { name: 'Incomplete Records' })
    await user.type(screen.getByLabelText('Search'), record.studentNumber)

    expect(await screen.findByText('1 record shown')).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: new RegExp(record.fullName) })).toBeInTheDocument()
    expect(screen.getByText(record.studentNumber)).toBeInTheDocument()
  })

  it('marks a record reviewed and tracks who resolved it', async () => {
    const user = userEvent.setup()
    const [record] = await fetchIncompleteRecords()
    renderWithRouter(<IncompleteRecordsQueuePage />)

    await screen.findByRole('heading', { name: 'Incomplete Records' })
    await user.type(screen.getByLabelText('Search'), record.studentNumber)
    const row = await screen.findByRole('row', { name: new RegExp(record.studentNumber) })
    await user.click(within(row).getByRole('button', { name: 'Mark Reviewed' }))

    await user.click(screen.getByRole('radio', { name: 'Resolved' }))
    const resolvedRow = await screen.findByRole('row', { name: new RegExp(record.studentNumber) })
    expect(within(resolvedRow).getByText('Resolved')).toBeInTheDocument()
    expect(within(resolvedRow).getByText(new RegExp(getMockSessionUser().name))).toBeInTheDocument()
    expect(getRecordedAuditEntries().map((entry) => entry.actionType)).toEqual(['approve'])
  })

  it('can show the resolved queue view', async () => {
    const user = userEvent.setup()
    const [record] = await fetchIncompleteRecords()
    renderWithRouter(<IncompleteRecordsQueuePage />)

    await screen.findByRole('heading', { name: 'Incomplete Records' })
    await user.type(screen.getByLabelText('Search'), record.studentNumber)
    await user.click(screen.getByRole('button', { name: 'Mark Reviewed' }))

    await user.click(screen.getByRole('radio', { name: 'Resolved' }))
    expect(await screen.findByText('1 record shown')).toBeInTheDocument()
    expect(screen.getByText(record.studentNumber)).toBeInTheDocument()
  })
})
