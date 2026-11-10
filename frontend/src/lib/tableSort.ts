import type { DataTableSortDirection } from '../components'

export interface TableSortState<Key extends string> {
  key: Key
  direction: DataTableSortDirection
}

export function toggleTableSort<Key extends string>(
  current: TableSortState<Key>,
  key: Key,
): TableSortState<Key> {
  return current.key === key
    ? {
        key,
        direction: current.direction === 'ascending' ? 'descending' : 'ascending',
      }
    : { key, direction: 'ascending' }
}

export function compareTableValues(
  left: string | number | null | undefined,
  right: string | number | null | undefined,
): number {
  if (left === right) return 0
  if (left == null) return 1
  if (right == null) return -1
  if (typeof left === 'number' && typeof right === 'number') return left - right
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

export function sortTableRows<Row, Key extends string>(
  rows: readonly Row[],
  sort: TableSortState<Key>,
  valueFor: (row: Row, key: Key) => string | number | null | undefined,
): Row[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const left = valueFor(a.row, sort.key)
      const right = valueFor(b.row, sort.key)
      // Missing dates/values stay at the bottom in either direction; descending should not make
      // records such as "Never" or "No expiration" appear before real dates.
      if (left == null || right == null) {
        if (left == null && right == null) return a.index - b.index
        return left == null ? 1 : -1
      }
      const comparison = compareTableValues(left, right)
      if (comparison !== 0) return sort.direction === 'ascending' ? comparison : -comparison
      return a.index - b.index
    })
    .map(({ row }) => row)
}
