import { useState } from 'react'
import { useAsyncData } from '../../hooks/useAsyncData'
import { STUDENT_SEARCH_MIN_LENGTH } from '../../lib/studentNumber'
import type { StudentSearchResult } from '../../types/entities'
import { Button } from '../ui/Button'
import { Combobox } from '../ui/Combobox'
import { ListItemLink } from '../ui/ListItemLink'

/**
 * Student lookup for an entry form that opened without an identified student
 * (cliniq-combobox-patterns): type a Student Number or a name, then pick. A Combobox without free
 * text. Results appear from the first character typed, and the search returns at most 8 active
 * students, so it never reads as a roster. Each result shows the Student Number, full name, and grade: a
 * deliberate single lookup, where the full name is correct (cliniq-display-privacy).
 *
 * The query is left as typed. A Student Number matches with or without its dash ("202600001"
 * finds 2026-00001), and a complete one highlights its match, so typing it and pressing Enter works.
 * `search` is the feature's own `api/` function (ADR-013), so the backend can replace it.
 *
 * Pass `selected` and `onClear` to show the picked student in place of the field, with a Change action
 * that brings the search back (focused).
 */
export function StudentPicker({
  search,
  onSelect,
  label = 'Student',
  hint = 'Type a Student Number or the student name, then pick the student.',
  required = true,
  error,
  addStudentHref,
  autoFocus,
  selected,
  onClear,
}: {
  search: (query: string) => Promise<StudentSearchResult[]>
  onSelect: (student: StudentSearchResult) => void
  label?: string
  hint?: string
  required?: boolean
  error?: string
  /** Shown with "no match" when given; pass it only to roles that can add a student (Staff). */
  addStudentHref?: string
  autoFocus?: boolean
  /** The picked student; shown in place of the field when `onClear` is given too. */
  selected?: StudentSearchResult | null
  onClear?: () => void
}) {
  const [query, setQuery] = useState('')
  const [focusSearch, setFocusSearch] = useState(false)
  const trimmed = query.trim()
  const ready = trimmed.length >= STUDENT_SEARCH_MIN_LENGTH
  const { data, status, isRefetching } = useAsyncData(`student-search|${ready ? trimmed.toLowerCase() : ''}`, () =>
    ready ? search(trimmed) : Promise.resolve([]),
  )
  const loading = ready && (status === 'loading' || isRefetching)
  const failed = ready && status === 'error'
  // While a new search runs, list nothing: Enter must never pick a stale result.
  const results = ready && !loading && !failed ? (data ?? []) : []
  const noMatch = ready && !loading && !failed && results.length === 0

  if (selected && onClear) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold text-text-primary">{label}</p>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
          <p className="text-sm text-text-primary">
            <span className="font-semibold">{selected.fullName}</span>
            <span className="text-text-secondary">
              {' · '}
              <span className="tabular-nums">{selected.studentNumber}</span>
              {' · '}
              {selected.gradeLevel}
            </span>
          </p>
          <Button
            type="button"
            size="sm"
            aria-label={`Change student (${selected.fullName})`}
            onClick={() => {
              setQuery('')
              setFocusSearch(true)
              onClear()
            }}
          >
            Change
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <Combobox
        label={label}
        required={required}
        value={query}
        onValueChange={setQuery}
        options={results}
        optionKey={(student) => student.id}
        optionLabel={(student) => `${student.studentNumber} ${student.fullName}`}
        renderOption={(student) => (
          <span className="flex w-full items-baseline gap-3">
            <span className="tabular-nums text-text-secondary">{student.studentNumber}</span>
            <span className="font-semibold">{student.fullName}</span>
            <span className="ml-auto pl-3 text-xs text-text-secondary">{student.gradeLevel}</span>
          </span>
        )}
        onPick={(student) => {
          setQuery('')
          onSelect(student)
        }}
        allowFreeText={false}
        // A full 9-digit Student Number, dash or not: Enter picks its match.
        autoHighlight={/^\d{4}-?\d{5}$/.test(trimmed)}
        openOnFocus={false}
        loading={loading}
        loadError={failed ? "Couldn't search students. Keep typing to try again." : undefined}
        // "No match" is said below the field instead, where the Add-student link can be reached.
        noMatchesText={null}
        placeholder="YYYY-NNNNN or student name"
        hint={hint}
        error={error}
        autoFocus={autoFocus || focusSearch}
      />
      {noMatch && (
        <p role="status" className="text-xs text-text-secondary">
          No active student matches “{trimmed}”.{' '}
          {addStudentHref && <ListItemLink to={addStudentHref}>Add a student</ListItemLink>}
        </p>
      )}
    </div>
  )
}
