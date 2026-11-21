import { useState } from 'react'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { isLrn, normalizeLrn, STUDENT_SEARCH_MIN_LENGTH } from '../../lib/lrn'
import { type Patient, type PatientNumber as PatientNumberValue } from '../../lib/patients'
import type { PatientSearchResult } from '../../types/entities'
import { PatientKindBadge } from '../ui/PatientNumber'
import { Button } from '../ui/Button'
import { Combobox } from '../ui/Combobox'
import { ListItemLink } from '../ui/ListItemLink'
import { PatientNumber } from '../ui/PatientNumber'

const numberOf = (result: PatientSearchResult): PatientNumberValue =>
  result.kind === 'student'
    ? { kind: 'student', number: result.lrn }
    : { kind: 'personnel', number: result.staffNumber }

/** Screen-reader text of a result: the full name, Student or Staff, and the masked number. */
export const patientOptionLabel = (result: PatientSearchResult) =>
  result.kind === 'student'
    ? `${result.fullName}, student, LRN ending in ${result.lrn.slice(-4)}`
    : `${result.fullName}, staff, ${result.staffNumber}`

/** One result row: masked number, full name, grade or type, and the Student or Staff label. */
export function PatientOption({ result }: { result: PatientSearchResult }) {
  return (
    <span className="flex w-full items-baseline gap-3">
      <span className="text-text-secondary">
        <PatientNumber patient={numberOf(result)} chip={false} />
      </span>{' '}
      <span className="font-semibold">{result.fullName}</span>{' '}
      <span className="ml-auto flex items-baseline gap-2 pl-3 text-xs text-text-secondary">
        {result.kind === 'student' ? result.gradeLevel : result.type}{' '}
        <PatientKindBadge kind={result.kind} />
      </span>
    </span>
  )
}

/**
 * The patient search behind `PatientPicker` and the top bar's search: asks only once typing pauses,
 * and lists nothing while a search is pending or running, so Enter never picks a stale result.
 */
export function usePatientSearch(
  query: string,
  search: (query: string) => Promise<PatientSearchResult[]>,
) {
  const trimmed = query.trim()
  // The server is asked only once typing pauses.
  const settled = useDebouncedValue(trimmed)
  const ready = trimmed.length >= STUDENT_SEARCH_MIN_LENGTH
  const settledReady = settled.length >= STUDENT_SEARCH_MIN_LENGTH
  const { data, status, isRefetching } = useAsyncData(
    `patient-search|${settledReady ? settled.toLowerCase() : ''}`,
    () => (settledReady ? search(settled) : Promise.resolve([])),
  )
  const loading = ready && (settled !== trimmed || status === 'loading' || isRefetching)
  const failed = ready && status === 'error'
  const results = ready && !loading && !failed ? (data ?? []) : []
  const noMatch = ready && !loading && !failed && results.length === 0
  return { trimmed, results, loading, failed, noMatch }
}

/**
 * The one patient box on New Visit, New Incident and Dispense (ADR-043, D10): students by LRN or
 * name and staff by Staff No. or name, in one search. It follows `StudentPicker`
 * (cliniq-combobox-patterns): a Combobox without free text, results from the first character,
 * at most 8 active people, nothing medical. Each result carries a Student or Staff label.
 *
 * Pass `selected` and `onClear` to show the picked patient in place of the field, with Change.
 */
export function PatientPicker({
  search,
  onSelect,
  label = 'Student or staff member',
  hint = 'Type an LRN, a Staff No. or a name, then pick the student or staff member.',
  required = true,
  error,
  addStudentHref,
  addStaffHref,
  autoFocus,
  selected,
  onClear,
}: {
  search: (query: string) => Promise<PatientSearchResult[]>
  onSelect: (result: PatientSearchResult) => void
  label?: string
  hint?: string
  required?: boolean
  error?: string
  /** Shown with "no match"; pass them only to the School Clinician. */
  addStudentHref?: string
  addStaffHref?: string
  autoFocus?: boolean
  selected?: Patient | null
  onClear?: () => void
}) {
  const [query, setQuery] = useState('')
  const [focusSearch, setFocusSearch] = useState(false)
  const { trimmed, results, loading, failed, noMatch } = usePatientSearch(query, search)

  if (selected && onClear) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
          <p className="flex flex-wrap items-center gap-x-1 text-sm text-text-primary">
            <span className="font-semibold">{selected.fullName}</span>
            {/* Masked here, as in the results; the form's header carries the full number (ADR-040). */}
            <span className="text-text-secondary">
              {' · '}
              <PatientNumber
                patient={
                  selected.kind === 'student'
                    ? { kind: 'student', number: selected.lrn }
                    : { kind: 'personnel', number: selected.staffNumber }
                }
                chip={false}
              />
              {' · '}
              {selected.kind === 'student' ? selected.gradeLevel : selected.type}
            </span>
            <PatientKindBadge kind={selected.kind} />
          </p>
          <Button
            type="button"
            size="sm"
            aria-label={`Change student or staff member (${selected.fullName})`}
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
        optionKey={(result) => `${result.kind}:${result.id}`}
        optionLabel={patientOptionLabel}
        renderOption={(result) => <PatientOption result={result} />}
        onPick={(result) => {
          setQuery('')
          onSelect(result)
        }}
        allowFreeText={false}
        // A complete 12-digit LRN or a full Staff No.: Enter picks its match.
        autoHighlight={
          (isLrn(normalizeLrn(trimmed)) && /^[\d\s-]+$/.test(trimmed)) ||
          /^stf-\d{4}$/i.test(trimmed)
        }
        openOnFocus={false}
        loading={loading}
        loadError={failed ? "Couldn't search patients. Keep typing to try again." : undefined}
        noMatchesText={null}
        placeholder="LRN, Staff No. or name"
        hint={hint}
        error={error}
        autoFocus={autoFocus || focusSearch}
      />
      {noMatch && (
        <p role="status" className="text-xs text-text-secondary">
          No active student or staff member matches “{trimmed}”.{' '}
          {addStudentHref && <ListItemLink to={addStudentHref}>Add a student</ListItemLink>}
          {addStudentHref && addStaffHref && ' · '}
          {addStaffHref && <ListItemLink to={addStaffHref}>Add a staff member</ListItemLink>}
        </p>
      )}
    </div>
  )
}
