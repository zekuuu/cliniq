import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DataTable } from './DataTable'

describe('DataTable sortable headers', () => {
  it('uses the shared accessible sort-control treatment', () => {
    render(
      <DataTable
        caption="Sortable records"
        fixedLayout
        columns={[
          {
            key: 'name',
            header: 'Name',
            rowHeader: true,
            cell: (row: { name: string }) => row.name,
            sort: { label: 'Name', direction: 'ascending', onSort: vi.fn() },
          },
        ]}
        rows={[{ name: 'Amina' }]}
        rowKey={(row) => row.name}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Sort by Name, currently ascending' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
    expect(screen.getByRole('table', { name: 'Sortable records' })).toHaveClass('table-fixed')
    expect(screen.getByRole('table').querySelector('caption')).toHaveClass('sr-only')
  })

  it('gives a fixed-layout table an explicit minimum width when asked', () => {
    render(
      <DataTable
        caption="Wide fixed records"
        fixedLayout
        minTableWidth="calc(20ch + 3 * 8rem)"
        columns={[{ key: 'name', header: 'Name', width: '20ch', cell: (row: { name: string }) => row.name }]}
        rows={[{ name: 'Amina' }]}
        rowKey={(row) => row.name}
      />,
    )
    const table = screen.getByRole('table', { name: 'Wide fixed records' })
    expect(table).toHaveClass('table-fixed')
    expect(table.style.minWidth).toBe('calc(20ch + 24rem)')
  })

  it('keeps the first column sticky when horizontal scrolling is enabled', () => {
    render(
      <DataTable
        caption="Wide records"
        columns={[
          {
            key: 'name',
            header: 'Name',
            rowHeader: true,
            cell: (row: { name: string; period: number }) => row.name,
          },
          {
            key: 'period',
            header: 'Period',
            cell: (row: { name: string; period: number }) => row.period,
          },
        ]}
        rows={[{ name: 'Amina', period: 1 }]}
        rowKey={(row) => row.name}
        stickyFirstColumn
        stickyLastColumn
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveClass('sticky', 'left-0')
    expect(screen.getByRole('row', { name: 'Amina 1' }).querySelector('th')).toHaveClass(
      'sticky',
      'left-0',
      'bg-background',
    )
    expect(screen.getByRole('columnheader', { name: 'Period' })).toHaveClass('sticky', 'right-0')
    expect(screen.getByRole('row', { name: 'Amina 1' }).querySelector('td')).toHaveClass(
      'sticky',
      'right-0',
      'bg-background',
    )
  })

  it('keeps room inside its horizontal scroller for the focus ring of an edge cell', () => {
    render(
      <DataTable
        caption="Records"
        columns={[{ key: 'action', header: 'Actions', cell: () => <a href="/x">View</a> }]}
        rows={[{ id: 'row-1' }]}
        rowKey={(row) => row.id}
      />,
    )

    // 4px padding cancelled by a -4px margin (layout unchanged), and scroll-padding so focus
    // scrolling stops 6px short of the edge: the 2px ring with its 2px offset fits, with slack.
    expect(screen.getByRole('link', { name: 'View' }).closest('.overflow-x-auto')).toHaveClass('-mx-1', 'px-1', 'scroll-px-1.5')
  })
})
