import { renderWithRouter } from '../../test/renderWithRouter'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { getRecordedAuditEntries, listFollowUps, resetMockDb } from '../../lib/mock-db'
import { selectOption } from '../../test/selectOption'
import { FollowUpListPage } from './FollowUpListPage'
import { maskLrn } from '../../lib/lrn'

const followUpUpdate = expect.objectContaining({
  actionType: 'update',
  targetRecord: expect.objectContaining({ type: 'follow-up' }),
})

describe('FollowUpListPage', () => {
  beforeEach(() => resetMockDb())

  async function renderList() {
    const user = userEvent.setup()
    renderWithRouter(<FollowUpListPage />)
    const firstFollowUp = (await listFollowUps()).find((f) => f.patient.kind === 'student')!
    expect((await screen.findAllByText(maskLrn(firstFollowUp.patient.number))).length).toBeGreaterThan(0)
    return user
  }

  it('sorts follow-ups by status descending by default', async () => {
    await renderList()

    expect(screen.getByRole('button', { name: 'Sort by Status, currently descending' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toHaveAttribute('aria-sort', 'descending')

    const statuses = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[2].textContent)
    expect(statuses).toEqual([...statuses].sort().reverse())
  })

  it('uses the linked LRN and records completion as an audited update, with no extra step', async () => {
    const user = await renderList()
    const pendingBefore = screen.getAllByRole('button', { name: /update status for/i }).length

    await selectOption(user, screen.getAllByRole('button', { name: /update status for/i })[0], 'Completed')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /update status for/i })).toHaveLength(pendingBefore - 1)
    expect(getRecordedAuditEntries()).toEqual([followUpUpdate])
  })

  it.each([
    ['Missed', 'Mark this follow-up as Missed?', 'Mark as Missed', 'missed'],
    ['Cancelled', 'Cancel this follow-up?', 'Cancel Follow-Up', 'cancelled'],
  ])('asks before marking a follow-up %s', async (option, title, confirmLabel, status) => {
    const user = await renderList()
    const select = screen.getAllByRole('button', { name: /update status for/i })[0]
    const pendingBefore = (await listFollowUps({ status: 'pending' })).length

    await selectOption(user, select, option)
    const dialog = screen.getByRole('dialog', { name: title })
    expect(getRecordedAuditEntries()).toEqual([])

    await user.click(within(dialog).getByRole('button', { name: 'Keep Pending' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(getRecordedAuditEntries()).toEqual([])
    expect(await listFollowUps({ status: 'pending' })).toHaveLength(pendingBefore)

    await selectOption(user, screen.getAllByRole('button', { name: /update status for/i })[0], option)
    const confirm = screen.getByRole('dialog', { name: title })
    // Panel review FU-4: a reason is required.
    await user.click(within(confirm).getByRole('button', { name: confirmLabel }))
    expect(within(confirm).getByText('Give the reason.')).toBeInTheDocument()
    expect(getRecordedAuditEntries()).toEqual([])
    await user.type(within(confirm).getByRole('textbox', { name: /reason/i }), 'Parent asked to reschedule')
    await user.click(within(confirm).getByRole('button', { name: confirmLabel }))
    // Then "Set a new date" is offered; declining it creates nothing.
    await user.click(within(await screen.findByRole('dialog', { name: 'Set a new date?' })).getByRole('button', { name: 'Not now' }))
    expect(getRecordedAuditEntries()).toEqual([followUpUpdate])
    expect(await listFollowUps({ status: status as 'missed' | 'cancelled' })).toEqual(
      expect.arrayContaining([expect.objectContaining({ status, statusReason: 'Parent asked to reschedule' })]),
    )
    expect(await listFollowUps({ status: 'pending' })).toHaveLength(pendingBefore - 1)
  })
})
