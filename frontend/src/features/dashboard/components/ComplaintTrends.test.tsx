import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ComplaintTrends, ComplaintTrendsSkeleton, TrendTable } from './ComplaintTrends'
import { colorToken } from '../../../lib/tokens'
import type { ComplaintTrends as ComplaintTrendsData, TrendBucket } from '../../../types/dashboard'

interface LineProps {
  'aria-label'?: string
  data?: { datasets?: Array<{ pointHoverRadius?: number | number[]; backgroundColor?: string | string[] }> }
  options?: {
    animation?: false | { duration?: number; easing?: string }
    animations?: false | { radius?: { duration?: number; easing?: string } }
    transitions?: { active?: { animation?: { duration?: number; easing?: string } } }
    interaction?: { mode?: string; axis?: string; intersect?: boolean }
    scales?: { x?: { grid?: { drawTicks?: boolean } }; y?: { ticks?: { stepSize?: number; maxTicksLimit?: number } }; yRight?: { display?: boolean; position?: string; grid?: { drawOnChartArea?: boolean; drawTicks?: boolean }; border?: { display?: boolean; color?: string }; ticks?: { display?: boolean } } }
    plugins?: {
      tooltip?: {
        enabled?: boolean
        external?: (context: {
          chart: { canvas: HTMLCanvasElement }
          tooltip: {
            caretX: number
            caretY: number
            opacity: number
            title: string[]
            beforeBody: string[]
            body: Array<{ before: string[]; lines: string[]; after: string[] }>
            afterBody: string[]
            footer: string[]
          }
        }) => void
      }
    }
  }
}

const lineMock = vi.hoisted(() => ({ props: undefined as unknown }))
const barMock = vi.hoisted(() => ({ props: undefined as unknown }))
const doughnutMock = vi.hoisted(() => ({ props: undefined as unknown }))

vi.mock('react-chartjs-2', () => ({
  Line: (props: LineProps) => {
    lineMock.props = props
    return <div role="img" aria-label={props['aria-label']} />
  },
  Bar: (props: LineProps) => {
    barMock.props = props
    return <div role="img" aria-label={props['aria-label']} />
  },
  Doughnut: (props: LineProps) => {
    doughnutMock.props = props
    return <div role="img" aria-label={props['aria-label']} />
  },
}))

const buckets: TrendBucket[] = Array.from({ length: 14 }, (_, index) => {
  const day = String(index + 1).padStart(2, '0')
  const date = `2026-09-${day}`
  return { key: date, label: `P${index + 1}`, from: date, to: date }
})

const trends: ComplaintTrendsData = {
  granularity: 'week',
  buckets,
  series: [
    {
      complaint: 'Headache',
      counts: [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      total: 3,
      clusterBuckets: [],
    },
    {
      complaint: 'No activity',
      counts: Array(14).fill(0),
      total: 0,
      clusterBuckets: [],
    },
  ],
  otherComplaints: [
    {
      complaint: 'Earlier only',
      counts: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      total: 2,
      clusterBuckets: [],
    },
  ],
}

describe('TrendTable', () => {
  it('uses grouped weekday bars with an accessible, keyboard-focusable table for a month comparison', async () => {
    const user = userEvent.setup()
    render(
      <ComplaintTrends
        trends={{
          ...trends,
          weekdayComparison: {
            currentLabel: 'October 2026',
            previousLabel: 'September 2026',
            rows: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((label, index) => ({
              label,
              current: index + 1,
              previous: index,
              currentPeak: index === 4 ? { date: '2026-10-30', count: 5, annotations: ['Foundation Day'] } : null,
              previousPeak: null,
            })),
          },
        }}
      />,
    )

    expect(screen.getByRole('img', { name: /by weekday.*October 2026 compared with September 2026/i })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Table' }))
    const table = screen.getByRole('table', { name: /weekday comparison/i })
    expect(within(table).getByRole('row', { name: /Friday.*Foundation Day/i })).toHaveAttribute('tabindex', '0')
    expect(table).toHaveClass('table-fixed')
    expect(within(table).getByRole('columnheader', { name: 'October 2026' })).toBeInTheDocument()
    expect(within(table).getAllByRole('columnheader', { name: 'Busiest date & context' })).toHaveLength(2)
    expect(within(table).getByText(/Oct 30.*5 cases/i)).toBeInTheDocument()
  })

  it('keeps the weekday tooltip to the two counts and one busiest-day line', () => {
    render(
      <ComplaintTrends
        trends={{
          ...trends,
          weekdayComparison: {
            currentLabel: 'October 2026',
            previousLabel: 'September 2026',
            rows: [{ label: 'Saturday', current: 11, previous: 1, currentPeak: { date: '2026-10-17', count: 6, annotations: ['Intramurals'] }, previousPeak: { date: '2026-09-05', count: 1, annotations: [] } }],
          },
        }}
      />,
    )
    const callbacks = (barMock.props as { options: { plugins: { tooltip: { callbacks: { afterBody: (items: Array<{ dataIndex: number }>) => string[] } } } } }).options.plugins.tooltip.callbacks
    expect(callbacks.afterBody([{ dataIndex: 0 }])).toEqual(['Busiest day: Oct 17 (6 cases) · Intramurals'])
  })

  it('keeps the cluster note and every complaint type reachable on a month comparison', async () => {
    const user = userEvent.setup()
    const clustered = {
      ...trends,
      series: trends.series.map((s, i) => (i === 0 ? { ...s, clusterBuckets: [2] } : s)),
      weekdayComparison: {
        currentLabel: 'October 2026',
        previousLabel: 'September 2026',
        rows: [{ label: 'Monday', current: 1, previous: 0, currentPeak: null, previousPeak: null }],
      },
    }
    render(<ComplaintTrends trends={clustered} />)
    expect(screen.getByRole('note')).toHaveTextContent(/Possible symptom cluster: Headache, 1 cases/)
    await user.click(screen.getByRole('radio', { name: 'Table' }))
    expect(screen.getByRole('table', { name: /weekday comparison/i })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /Complaint counts per period/i })).toBeInTheDocument()
    expect(screen.getByText(/1 other complaint types, 2 cases \(see the/)).toBeInTheDocument()
  })

  it('marks the selected demographic filter visibly, not by aria-pressed alone', () => {
    render(
      <ComplaintTrends
        trends={trends}
        demographics={{ sex: [{ key: 'female', label: 'Female', count: 2, visits: 2, incidents: 0, share: 0.5 }, { key: 'male', label: 'Male', count: 2, visits: 2, incidents: 0, share: 0.5 }], gradeLevel: [] }}
        filters={{ sex: 'female', gradeLevel: null }}
        onFiltersChange={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /^Female/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^Female/ }).className).toContain('aria-pressed:ring-brand-green')
    expect(screen.getByRole('img', { name: /by Sex: Female 2 \(50%\); Male 2 \(50%\)/ })).toBeInTheDocument()
    expect((doughnutMock.props as LineProps).data?.datasets?.[0]?.backgroundColor).toEqual([
      colorToken('chart-female'),
      colorToken('chart-male'),
    ])
  })

  it('lays out grade filters in a compact four-column desktop grid', async () => {
    const user = userEvent.setup()
    render(
      <ComplaintTrends
        trends={trends}
        demographics={{
          sex: [],
          gradeLevel: [
            { key: 'Grade 1', label: 'Grade 1', count: 1, visits: 1, incidents: 0, share: 0.25 },
            { key: 'Grade 2', label: 'Grade 2', count: 1, visits: 1, incidents: 0, share: 0.25 },
            { key: 'Grade 3', label: 'Grade 3', count: 1, visits: 1, incidents: 0, share: 0.25 },
            { key: 'Grade 4', label: 'Grade 4', count: 1, visits: 1, incidents: 0, share: 0.25 },
          ],
        }}
        filters={{ sex: null, gradeLevel: null }}
        onFiltersChange={() => {}}
      />,
    )

    await user.click(screen.getByRole('radio', { name: 'Grade level' }))
    // Name on top, count below, like the Female / Male buttons; the count says "case".
    const firstGrade = screen.getByRole('button', { name: 'Grade 1 1 case · 25%' })
    expect(firstGrade.firstElementChild).toHaveClass('block')
    expect(firstGrade.parentElement).toHaveClass('grid', 'lg:grid-cols-4')
  })

  it('shapes the loading skeleton like the demographic cards above the trend row', () => {
    const { container } = render(<ComplaintTrendsSkeleton />)
    const demographics = container.querySelector('[data-skeleton="demographics"]')
    // One card with a Sex / Grade level switch (Sir Rey, October 25, 2026); it opens on Sex.
    expect(demographics?.textContent).toContain('Visits and incidents by sex')
    expect(demographics?.textContent).not.toContain('Visits and incidents by grade level')
    expect(demographics?.compareDocumentPosition(container.querySelector('[data-skeleton="complaint-trends"]')!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('keeps a genuinely empty multi-bucket range as a zero chart', () => {
    render(
      <ComplaintTrends
        trends={{
          granularity: 'day',
          buckets: buckets.slice(0, 3),
          series: [],
          otherComplaints: [],
        }}
      />,
    )

    expect(screen.getByRole('img', { name: /visits and incidents by day/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Visits trend · 2026' })).toBeInTheDocument()
    expect(screen.queryByText('No visits or incidents in this date range')).not.toBeInTheDocument()
  })

  it('has no granularity toggle; the bucket size follows the date range', () => {
    render(<ComplaintTrends trends={trends} />)

    expect(screen.queryByRole('radiogroup', { name: 'Group trend by' })).not.toBeInTheDocument()
    for (const name of ['Daily', 'Weekly', 'Monthly', 'Yearly']) {
      expect(screen.queryByRole('radio', { name })).not.toBeInTheDocument()
    }
    expect(screen.getByRole('radiogroup', { name: 'Show trend as' })).toBeInTheDocument()
  })

  it('offers aggregate Sex and grade-level filters without rendering student identities', async () => {
    const user = userEvent.setup()
    const onFiltersChange = vi.fn()
    render(
      <ComplaintTrends
        trends={trends}
        demographics={{
          sex: [
            { key: 'female', label: 'Female', count: 3, visits: 3, incidents: 0, share: 0.75 },
            { key: 'male', label: 'Male', count: 1, visits: 0, incidents: 1, share: 0.25 },
          ],
          gradeLevel: [{ key: 'Grade 5', label: 'Grade 5', count: 4, visits: 3, incidents: 1, share: 1 }],
        }}
        filters={{ sex: null, gradeLevel: null }}
        onFiltersChange={onFiltersChange}
      />,
    )

    // One card, Sex first; the switch shows the grade chart in the same card.
    expect(screen.getByRole('heading', { name: 'Visits and incidents by sex' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Sex' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radiogroup', { name: 'Filter by' })).toBeInTheDocument()
    expect(screen.getByText('Filter by')).toBeVisible()
    expect(screen.getByRole('img', { name: /by Sex/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Female 3 cases · 75%' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Male.*1.*25%/i }))
    expect(onFiltersChange).toHaveBeenCalledWith({ sex: 'male', gradeLevel: null })

    await user.click(screen.getByRole('radio', { name: 'Grade level' }))
    expect(screen.getByRole('heading', { name: 'Visits and incidents by grade level' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /by Sex/i })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: /by grade level: Grade 5 3 visits, 1 incident\./i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Grade 5.*4.*100%/i })).toBeInTheDocument()
    expect(document.querySelector('[data-chart-right-boundary]')).not.toBeInTheDocument()
    expect((barMock.props as LineProps).options?.scales?.x?.grid?.drawTicks).toBe(false)
  })

  it('draws a right plot boundary without ticks extending beyond the baseline', async () => {
    const user = userEvent.setup()
    render(
      <ComplaintTrends
        trends={trends}
        demographics={{ sex: [], gradeLevel: [] }}
        filters={{ sex: null, gradeLevel: null }}
        onFiltersChange={() => {}}
      />,
    )

    await user.click(screen.getByRole('radio', { name: 'Grade level' }))
    expect((barMock.props as LineProps).options?.scales?.yRight).toMatchObject({
      display: true,
      position: 'right',
      grid: { drawOnChartArea: false, drawTicks: false },
      border: { display: true, color: colorToken('border') },
      ticks: { display: false },
    })
  })

  it('uses smooth chart transitions and a slower, eased hover glide', () => {
    render(<ComplaintTrends trends={trends} />)

    const lineProps = lineMock.props as LineProps
    expect(lineProps.options?.animation).toMatchObject({ duration: 280, easing: 'easeOutCubic' })
    expect(lineProps.options?.animations).toMatchObject({
      radius: { duration: 320, easing: 'easeInOutCubic' },
    })
    expect(lineProps.options?.transitions?.active?.animation).toMatchObject({
      duration: 320,
      easing: 'easeInOutCubic',
    })
    expect(lineProps.options?.plugins?.tooltip).toMatchObject({ enabled: false })
    expect(lineProps.options?.plugins?.tooltip?.external).toEqual(expect.any(Function))
    expect(lineProps.options?.interaction).toMatchObject({ mode: 'index', axis: 'x', intersect: false })
    expect(lineProps.options?.scales?.y?.ticks).toMatchObject({ stepSize: 1, maxTicksLimit: 13 })
    expect(lineProps.data?.datasets?.[0].pointHoverRadius).toEqual(
      trends.buckets.map(() => 7),
    )
  })

  it('refreshes an existing tooltip to the white panel surface', () => {
    render(<ComplaintTrends trends={trends} />)

    const parent = document.createElement('div')
    const canvas = document.createElement('canvas')
    const staleTooltip = document.createElement('div')
    staleTooltip.dataset.chartTooltip = 'true'
    staleTooltip.className = 'bg-brand-green-dark text-white'
    parent.append(canvas, staleTooltip)
    const externalTooltip = (lineMock.props as LineProps).options?.plugins?.tooltip?.external

    externalTooltip?.({
      chart: { canvas },
      tooltip: {
        caretX: 12,
        caretY: 24,
        opacity: 1,
        title: ['Oct 6, 2026'],
        beforeBody: [],
        body: [{ before: [], lines: ['6 visits and incidents'], after: [] }],
        afterBody: [],
        footer: [],
      },
    })

    expect(staleTooltip).toHaveClass('bg-background', 'text-text-primary')
    expect(staleTooltip).not.toHaveClass('bg-brand-green-dark', 'text-white')
    expect(staleTooltip.style.transitionDuration).toBe('320ms')
  })

  it('does not keep the Visits trend header sticky while the page scrolls', () => {
    render(<ComplaintTrends trends={trends} />)

    const heading = screen.getByRole('heading', { name: 'Visits trend · 2026' })
    expect(heading.parentElement?.parentElement).not.toHaveClass('sticky')
  })

  it('keeps Chart selectable when a range has one period', async () => {
    const user = userEvent.setup()
    const singlePeriod: ComplaintTrendsData = {
      ...trends,
      buckets: [buckets[0]],
      series: trends.series.map((row) => ({ ...row, counts: [row.counts[0]] })),
      otherComplaints: trends.otherComplaints.map((row) => ({ ...row, counts: [row.counts[0]] })),
    }
    render(<ComplaintTrends trends={singlePeriod} />)

    expect(screen.getByRole('radio', { name: 'Chart' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Table' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('img', { name: /visits and incidents by week/i })).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: /complaint counts per period/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Table' }))
    expect(screen.getByRole('columnheader', { name: /Sep 1, 2026/i })).toBeInTheDocument()
  })

  it('shows period headers without the year and puts the year in the card title', async () => {
    const user = userEvent.setup()
    render(<ComplaintTrends trends={trends} />)
    expect(screen.getByRole('heading', { name: 'Visits trend · 2026' })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Table' }))
    const table = screen.getByRole('table')
    // The year is screen-reader-only: visible header text is compact, accessible names are full.
    expect(screen.getByRole('columnheader', { name: /Sep 14, 2026/ })).toBeInTheDocument()
    expect(within(table).getByText('Sep 14')).toBeInTheDocument()
    // Only Complaint and Total sort; period columns have no sort button.
    expect(within(table).queryByRole('button', { name: /Sort by Sep/ })).not.toBeInTheDocument()
    expect(within(table).getByRole('button', { name: /^Sort by Complaint/ })).toBeInTheDocument()
    const visibleHeaderText = [...table.querySelectorAll('thead th')]
      .map((th) => {
        const copy = th.cloneNode(true) as HTMLElement
        copy.querySelectorAll('.sr-only').forEach((el) => el.remove())
        return copy.textContent
      })
      .join(' ')
    expect(visibleHeaderText).not.toContain('2026')
  })

  it('switches back to Chart after viewing the table', async () => {
    const user = userEvent.setup()
    render(<ComplaintTrends trends={trends} />)

    await user.click(screen.getByRole('radio', { name: 'Table' }))
    expect(screen.getByRole('table', { name: /complaint counts per period/i })).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Chart' }))
    expect(screen.getByRole('img', { name: /visits and incidents by week/i })).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: /complaint counts per period/i })).not.toBeInTheDocument()
  })

  it("leaves the chart's full bucket range uncapped", () => {
    render(<ComplaintTrends trends={trends} />)

    const chartLabel = screen.getByRole('img').getAttribute('aria-label') ?? ''
    expect(chartLabel.split('; ')).toHaveLength(14)
  })

  it('caps period columns, keeps Total descending by default, and notes hidden periods', () => {
    render(<TrendTable trends={trends} />)

    const table = screen.getByRole('table', { name: /complaint counts per period/i })
    expect(table.querySelectorAll('thead th')).toHaveLength(14)
    expect(screen.getByText(/\+ 2 earlier periods — narrow the date range/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Sort by Total, currently descending' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('All visits & incidents')
    expect(screen.getByRole('columnheader', { name: 'Complaint' })).toHaveClass('sticky', 'left-0')
    expect(table.querySelector('col')).toHaveAttribute('style', 'width: calc(100% - 65rem);')
    expect(screen.getByRole('columnheader', { name: 'Total' })).toHaveClass('sticky', 'right-0')
    expect(table.querySelector('thead')).not.toHaveTextContent('Week of')
  })

  it('hides zero-activity rows in the visible window and reveals them with the toggle', async () => {
    const user = userEvent.setup()
    render(<TrendTable trends={trends} />)

    expect(screen.queryByRole('row', { name: /No activity/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Earlier only/ })).not.toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: 'Show all complaint types' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await user.click(toggle)

    expect(screen.getByRole('row', { name: /No activity/ })).toBeInTheDocument()
    const earlierOnlyRow = screen.getByRole('row', { name: /Earlier only/ })
    expect(earlierOnlyRow).toBeInTheDocument()
    expect(within(earlierOnlyRow).getAllByRole('cell').at(-1)).toHaveTextContent('0')
    expect(
      screen.getByRole('button', { name: 'Hide zero-activity complaint types' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps the Common complaints totals unchanged when table rows are revealed', async () => {
    const user = userEvent.setup()
    render(<ComplaintTrends trends={trends} />)

    await user.click(screen.getByRole('radio', { name: 'Table' }))
    const commonTotal = screen.getByText(/other complaint types, 2 cases/i)
    const before = commonTotal.textContent
    await user.click(screen.getByRole('button', { name: 'Show all complaint types' }))

    expect(commonTotal).toHaveTextContent(before ?? '')
  })
})
