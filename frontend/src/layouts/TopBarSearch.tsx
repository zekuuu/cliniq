import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Combobox } from '../components'
import {
  PatientOption,
  patientOptionLabel,
  usePatientSearch,
} from '../components/forms/PatientPicker'
import { searchPatients } from '../lib/data'
import { paths } from '../routes/paths'

/**
 * The top bar's search (Zean, Sunday, November 22, 2026): one box that finds a student by LRN or name,
 * or a staff member by Staff No. or name, and opens the picked person's profile. Staff only: the
 * patient search is a Staff-only API route (`role:staff`). Shown from the `xl` width up, where the
 * top bar has room beside the clock and the account menu; every list keeps its own search below that.
 *
 * It is the patient box of New Visit (`usePatientSearch`, ADR-043): results once typing pauses, at
 * most 8 active people, masked numbers (cliniq-display-privacy), nothing medical.
 */
export function TopBarSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const { results, loading, failed, noMatch, trimmed } = usePatientSearch(query, searchPatients)

  return (
    <Combobox
      label="Search students and staff"
      hideLabel
      icon="search"
      className="w-full max-w-sm"
      value={query}
      onValueChange={setQuery}
      options={results}
      optionKey={(result) => `${result.kind}:${result.id}`}
      optionLabel={patientOptionLabel}
      renderOption={(result) => <PatientOption result={result} />}
      onPick={(result) => {
        setQuery('')
        void navigate(
          result.kind === 'student'
            ? paths.studentProfile(result.id)
            : paths.staffProfile(result.id),
        )
      }}
      allowFreeText={false}
      openOnFocus={false}
      loading={loading}
      loadError={failed ? "Couldn't search. Keep typing to try again." : undefined}
      noMatchesText={noMatch ? `No active student or staff member matches “${trimmed}”.` : null}
      placeholder="Search LRN, Staff No. or name"
    />
  )
}
