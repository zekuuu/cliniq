import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockDb, setMockToday } from '../../../lib/mock-db'
import { renderWithRouter } from '../../../test/renderWithRouter'
import { holidayName, isNoClassHoliday, noClassDayClass } from '../lib/calendar'
import { VisitCalendar } from './VisitCalendar'

function renderCalendar({
  today = '2026-12-10',
  anchor = today,
  canNavigate = true,
}: { today?: string; anchor?: string; canNavigate?: boolean } = {}) {
  setMockToday(today)
  resetMockDb()
  renderWithRouter(<VisitCalendar today={today} initialAnchor={anchor} canNavigate={canNavigate} showVisitsLink />)
  return userEvent.setup()
}

describe('Dashboard calendar holiday layer (ADR-020)', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'))

  it('labels unconfirmed dates as estimates and treats only special working days as school days', () => {
    const base = { date: '2027-03-10', name: "Eid'l Fitr", kind: 'islamic' as const }
    expect(holidayName({ ...base, confirmed: false })).toBe("Eid'l Fitr (estimated)")
    expect(holidayName({ ...base, confirmed: true })).toBe("Eid'l Fitr")
    expect(isNoClassHoliday({ ...base, confirmed: true })).toBe(true)
    expect(isNoClassHoliday({ ...base, kind: 'special-working', confirmed: true })).toBe(false)
  })

  it('shows gray Holiday chips on future days, stripes empty no-class days, and the source line', async () => {
    renderCalendar()
    const chip = await screen.findByText('Holiday: Christmas Day')
    expect(chip).toHaveClass('bg-border', 'truncate')
    expect(chip).toHaveAttribute('title', 'Holiday: Christmas Day')
    const day = screen.getByRole('button', { name: /December 25: holiday: Christmas Day \(Regular holiday\)/ })
    expect(day.closest('td')).toHaveClass(noClassDayClass)
    expect(screen.getByText(/Holidays updated Oct 7, 2026/)).toHaveTextContent(
      'Source Official Gazette (bundled list)',
    )
    expect(screen.queryByText(/No holidays loaded/)).not.toBeInTheDocument()
  })

  it('shows a special working day without the no-class styling', async () => {
    renderCalendar({ anchor: '2026-02-10' })
    await screen.findByText('Holiday: EDSA People Power Revolution Anniversary')
    const day = screen.getByRole('button', { name: /February 25: .*Special working day/ })
    expect(day.closest('td')).not.toHaveClass(noClassDayClass)
  })

  it('lists the day’s holidays in the day panel with no edit or delete controls', async () => {
    const user = renderCalendar()
    await user.click(await screen.findByRole('button', { name: /December 25: holiday: Christmas Day/ }))
    const dialog = await screen.findByRole('dialog')
    const section = within(dialog).getByRole('region', { name: 'Holidays' })
    expect(within(section).getByText('Holiday: Christmas Day')).toBeInTheDocument()
    expect(within(section).getByText('Regular holiday')).toBeInTheDocument()
    expect(within(section).queryAllByRole('button')).toHaveLength(0)
  })

  it('includes holidays in the Week, Year, and Table views', async () => {
    const user = renderCalendar({ anchor: '2026-12-24' })
    await user.click(screen.getByRole('radio', { name: 'Weekly' }))
    expect(await screen.findByText('Holiday: Christmas Eve')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Yearly' }))
    expect(await screen.findByTitle(/holiday: Araw ng Kagitingan/i)).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Table' }))
    const table = await screen.findByRole('table')
    expect(within(table).getByRole('columnheader', { name: /Holidays/ })).toBeInTheDocument()
    expect(within(table).getByText(/Christmas Eve, Christmas Day, Rizal Day, Last Day of the Year/)).toBeInTheDocument()
  })

  it('shows Admin the same chips and source line, read-only', async () => {
    renderCalendar({ canNavigate: false })
    expect(await screen.findByText('Holiday: Christmas Day')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /open day/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Holidays updated/)).toBeInTheDocument()
  })

  it('warns when no holidays are loaded for the current year', async () => {
    renderCalendar({ today: '2027-01-15' })
    expect(await screen.findByText('No holidays loaded for 2027.')).toBeInTheDocument()
    expect(screen.getByText(/Holidays updated/)).toBeInTheDocument()
  })
})
