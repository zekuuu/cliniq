import { pickDate } from '../../test/pickDate'
import { renderWithRouter } from '../../test/renderWithRouter'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { VisitLogListPage } from './VisitLogListPage'
import { defaultVisitLogRange, fetchVisitLog } from './api/visitLogApi'

describe('Visit Log', () => {
  it('links to New Visit from the page header', async () => {
    renderWithRouter(<VisitLogListPage />)
    expect(await screen.findByRole('link', { name: 'New Visit' })).toHaveAttribute('href', '/visits/new')
  })

  it('keeps the all-visits scope in the filter instead of repeating it in the page header', async () => {
    renderWithRouter(<VisitLogListPage />)

    await screen.findByRole('heading', { name: 'Visit Log' })
    expect(screen.getByRole('button', { name: /Excuse letter/ })).toHaveTextContent('All visits')
    expect(
      screen.queryAllByText('All visits').filter((element) => !element.classList.contains('invisible')),
    ).toHaveLength(1)
  })

  it('opens on the day given by ?from=&to= (the Dashboard calendar\'s View visits)', async () => {
    const range = defaultVisitLogRange()
    const [visit] = await fetchVisitLog({ ...range, search: '', disposition: 'all' })
    const day = visit.dateTime.slice(0, 10)
    renderWithRouter(<VisitLogListPage />, { route: `/visits?from=${day}&to=${day}` })
    expect(await screen.findByRole('button', { name: 'Date range' })).toHaveTextContent('Custom range')
    const onDay = await fetchVisitLog({ from: day, to: day, search: '', disposition: 'all' })
    // Only that day's visits are listed (one header row plus up to a page of rows).
    await waitFor(() =>
      expect(screen.getAllByRole('row')).toHaveLength(Math.min(onDay.length, 10) + 1),
    )
  })

  it('opens with ?letter=pending showing only visits whose letter awaits approval, each with Review Letter', async () => {
    const user = userEvent.setup()
    const range = defaultVisitLogRange()
    const pending = await fetchVisitLog({ ...range, search: '', disposition: 'all', letter: 'pending' })
    expect(pending.length).toBeGreaterThan(0)
    renderWithRouter(<VisitLogListPage />, { route: '/visits?letter=pending' })

    expect(await screen.findByRole('button', { name: /Excuse letter/ })).toHaveTextContent('Pending approval')
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(Math.min(pending.length, 10) + 1))
    for (const row of pending.slice(0, 10)) {
      expect(screen.getByRole('link', { name: `Review Letter for ${row.studentNumber}` })).toHaveAttribute('href', `/visits/${row.id}/excuse-letter`)
    }

    await user.click(screen.getByRole('button', { name: /Excuse letter/ }))
    await user.click(screen.getByRole('option', { name: 'All visits' }))
    const all = await fetchVisitLog({ ...range, search: '', disposition: 'all' })
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(Math.min(all.length, 10) + 1))
  })

  it.each([
    ['/visits?from=2026-02-30&to=2026-03-01', 'an invalid date'],
    ['/visits?from=2026-03-01', 'a partial range'],
  ])('falls back to All for %s (%s)', async (route) => {
    renderWithRouter(<VisitLogListPage />, { route })

    expect(await screen.findByRole('button', { name: 'Date range' })).toHaveTextContent('All')
  })

  it('clears entry date params with replace navigation while preserving other parameters', async () => {
    const user = userEvent.setup()
    const router = createMemoryRouter(
      [{ path: '*', element: <VisitLogListPage /> }],
      {
        initialEntries: ['/dashboard', '/visits?from=2026-03-01&to=2026-03-02&mock=slow&source=calendar'],
        initialIndex: 1,
      },
    )
    render(<RouterProvider router={router} />)

    await screen.findByRole('heading', { name: 'Visit Log' })
    await user.click(screen.getByRole('button', { name: 'Date range' }))
    await user.click(screen.getByRole('option', { name: 'Today' }))

    await waitFor(() => {
      const params = new URLSearchParams(router.state.location.search)
      expect(params.has('from')).toBe(false)
      expect(params.has('to')).toBe(false)
      expect(params.get('mock')).toBe('slow')
      expect(params.get('source')).toBe('calendar')
    })

    // If changing the range had pushed a new history entry, Back would reopen the stale deep link.
    await router.navigate(-1)
    expect(router.state.location.pathname).toBe('/dashboard')
  })

  it('uses the default range when remounted at the cleared URL', async () => {
    const user = userEvent.setup()
    const router = createMemoryRouter(
      [{ path: '*', element: <VisitLogListPage /> }],
      { initialEntries: ['/visits?from=2026-03-01&to=2026-03-02'] },
    )
    const view = render(<RouterProvider router={router} />)

    await screen.findByRole('heading', { name: 'Visit Log' })
    await user.click(screen.getByRole('button', { name: 'Date range' }))
    await user.click(screen.getByRole('option', { name: 'All' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))

    view.unmount()
    renderWithRouter(<VisitLogListPage />, { route: router.state.location.pathname })
    expect(await screen.findByRole('button', { name: 'Date range' })).toHaveTextContent('All')
  })

  it('renders a privacy-safe multi-student visit list with the complaint visible (ADR-010)', async () => {
    renderWithRouter(<VisitLogListPage />)

    expect(await screen.findByRole('heading', { name: 'Visit Log' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Student Number' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Disposition' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /full name/i })).not.toBeInTheDocument()
    // ADR-010 (Option A): the complaint stays visible beside the Student Number; names never do.
    expect(screen.getByRole('columnheader', { name: /complaint/i })).toBeInTheDocument()
    const [newest] = await fetchVisitLog({ ...defaultVisitLogRange(), search: '', disposition: 'all' })
    expect(screen.getAllByText(newest.complaint).length).toBeGreaterThan(0)
    expect(screen.queryByText('Visit recorded')).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /treatment/i })).not.toBeInTheDocument()
    expect(screen.queryByText('Paracetamol given')).not.toBeInTheDocument()
  })

  it('searches visits by Student Number', async () => {
    const user = userEvent.setup()
    const range = defaultVisitLogRange()
    const [visit] = await fetchVisitLog({
      ...range,
      search: '',
      disposition: 'all',
    })

    renderWithRouter(<VisitLogListPage />)
    await screen.findByRole('heading', { name: 'Visit Log' })
    await user.type(screen.getByLabelText('Search'), visit.studentNumber)

    expect(await screen.findByText(/records? shown/)).toBeInTheDocument()
    expect(screen.getAllByText(visit.studentNumber).length).toBeGreaterThan(0)
  })

  it('filters by disposition', async () => {
    const user = userEvent.setup()
    renderWithRouter(<VisitLogListPage />)

    await screen.findByRole('heading', { name: 'Visit Log' })
    await user.click(screen.getByRole('radio', { name: 'Sent home' }))

    await waitFor(() => {
      expect(screen.getByText(/records? shown/)).toBeInTheDocument()
    })
    for (const badge of screen.getAllByText('Sent home')) {
      expect(badge).toBeInTheDocument()
    }
  })

  it('shows an empty state for a date range with no visits', async () => {
    const user = userEvent.setup()
    renderWithRouter(<VisitLogListPage />)

    await screen.findByRole('heading', { name: 'Visit Log' })
    await user.click(screen.getByRole('button', { name: 'Date range' }))
    await user.click(screen.getByRole('option', { name: 'Custom range' }))
    await pickDate(user, screen.getByLabelText('From'), '2000-01-01')
    await pickDate(user, screen.getByLabelText('To'), '2000-01-02')
    await user.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByText('No visits found')).toBeInTheDocument()
  })

  it('offers the requested date-range presets and defaults to newest date and time first', async () => {
    const user = userEvent.setup()
    renderWithRouter(<VisitLogListPage />)

    await screen.findByRole('heading', { name: 'Visit Log' })
    expect(
      screen.getByRole('button', { name: /Sort by Date and time, currently descending/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Date range' })).toHaveTextContent('All')

    await user.click(screen.getByRole('button', { name: 'Date range' }))
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveTextContent('All')
    expect(options.map((option) => option.textContent)).toEqual([
      'All',
      'Today',
      'This week',
      'This month',
      'Custom range',
    ])
    await user.click(screen.getByRole('option', { name: 'Custom range' }))
    expect(screen.getByRole('form', { name: 'Custom date range' })).toHaveClass('absolute')
  })

  it('keeps the custom-range popover dismissable without applying a draft range', async () => {
    const user = userEvent.setup()
    renderWithRouter(<VisitLogListPage />)

    await screen.findByRole('heading', { name: 'Visit Log' })
    await user.click(screen.getByRole('button', { name: 'Date range' }))
    await user.click(screen.getByRole('option', { name: 'Custom range' }))
    expect(screen.getByRole('button', { name: 'Date range' })).toHaveTextContent('All')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('form', { name: 'Custom date range' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Date range' })).toHaveTextContent('All')

    await user.click(screen.getByRole('button', { name: 'Date range' }))
    await user.click(screen.getByRole('option', { name: 'Custom range' }))
    await pickDate(user, screen.getByLabelText('From'), '2000-01-01')
    await pickDate(user, screen.getByLabelText('To'), '2000-01-02')
    await user.click(screen.getByRole('button', { name: 'Apply' }))
    expect(screen.queryByRole('form', { name: 'Custom date range' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Date range' })).toHaveTextContent('Custom range')
  })

  it('toggles a sortable column between ascending and descending', async () => {
    const user = userEvent.setup()
    renderWithRouter(<VisitLogListPage />)

    await screen.findByRole('heading', { name: 'Visit Log' })
    await user.click(screen.getByRole('button', { name: 'Sort by Student Number' }))
    expect(
      screen.getByRole('button', { name: /Sort by Student Number, currently ascending/i }),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: /Sort by Student Number, currently ascending/i }),
    )
    expect(
      screen.getByRole('button', { name: /Sort by Student Number, currently descending/i }),
    ).toBeInTheDocument()
  })
})
