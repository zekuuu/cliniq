import { renderWithRouter } from '../../test/renderWithRouter'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { getRecordedAuditEntries, listFollowUps, resetMockDb } from '../../lib/mock-db'
import { selectOption } from '../../test/selectOption'
import { FollowUpListPage } from './FollowUpListPage'

const followUpUpdate = expect.objectContaining({
  actionType: 'update',
  targetRecord: expect.objectContaining({ type: 'follow-up' }),
})

describe('FollowUpListPage', () => {
  beforeEach(() => resetMockDb())

  async function renderList() {
    const user = userEvent.setup()
    renderWithRouter(<FollowUpListPage />)
    const [firstFollowUp] = await listFollowUps()
    expect((await screen.findAllByText(firstFollowUp.studentNumber)).length).toBeGreaterThan(0)
    return user
  }

  it('uses the linked Student Number and records completion as an audited update, with no extra step', async () => {
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
    await user.click(within(screen.getByRole('dialog', { name: title })).getByRole('button', { name: confirmLabel }))
    expect(getRecordedAuditEntries()).toEqual([followUpUpdate])
    expect(await listFollowUps({ status: status as 'missed' | 'cancelled' })).toEqual(
      expect.arrayContaining([expect.objectContaining({ status })]),
    )
    expect(await listFollowUps({ status: 'pending' })).toHaveLength(pendingBefore - 1)
  })
})
