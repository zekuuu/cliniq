import { useState } from 'react'
import type { Student } from '../types/entities'

/**
 * Which student (or, on the visit, incident and dispense forms, which patient: ADR-043) an entry
 * form is about: searched and picked on the form (`StudentPicker` / `PatientPicker`), or the
 * patient of a saved incident reopened for Stage 2.
 * A form never falls back to a default student or patient.
 *
 * `find` is the feature's own lookup (its `api/` module), so this hook stays free of data access.
 * `K` is what a pick hands it: a student id, or a patient search result.
 */
export function useIdentifiedStudent<T = Student, K = string>(
  /** A reopened incident's patient; may arrive once the form's data has loaded. */
  preselected: T | null | undefined,
  find: (key: K) => Promise<T>,
) {
  const [picked, setPicked] = useState<T | null>(null)
  const student = preselected ?? picked
  const [error, setError] = useState<string | undefined>()

  return {
    student,
    error,
    /** Inline check, run with the rest of the form's validation. */
    validate(
      message = 'Choose the student: type the LRN or name, then pick from the list.',
    ): boolean {
      if (student) return true
      setError(message)
      return false
    },
    /** A pick from a search, looked up in full (allergies included); `null` if it failed. */
    async select(key: K): Promise<T | null> {
      try {
        const found = await find(key)
        setPicked(found)
        setError(undefined)
        return found
      } catch {
        setError("This record couldn't be loaded. Search again.")
        return null
      }
    },
    /** The identified student or patient; `null` when none was picked. */
    async resolve(): Promise<T | null> {
      return student
    },
    /** Clears the pick: after a save, or when Change brings the search back. */
    reset() {
      setPicked(null)
      setError(undefined)
    },
  }
}
