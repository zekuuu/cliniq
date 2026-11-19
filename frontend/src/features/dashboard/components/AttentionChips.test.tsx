import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithRouter } from '../../../test/renderWithRouter'
import type { DashboardSummary } from '../../../types/dashboard'
import { AttentionChips } from './AttentionChips'

const summary = (pendingRecords: number, lowStockItems: number) =>
  ({
    counts: { pendingRecords, lowStockItems },
    inventoryAlerts: [],
    backupAlert: null,
  }) as unknown as DashboardSummary

describe('AttentionChips', () => {
  it('hides a chip whose count is 0 (Zean, November 19, 2026)', () => {
    renderWithRouter(
      <>
        <AttentionChips summary={summary(0, 3)} canNavigate group="later" />
        <AttentionChips summary={summary(0, 3)} canNavigate group="now" />
      </>,
    )
    expect(screen.getByRole('link', { name: '3 low stock' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /incomplete student records/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /expired or expiring/ })).toBeNull()
  })
})
