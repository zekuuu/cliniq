import { useState } from 'react'
import type { Student } from '../types/entities'

/**
 * Which student an entry form is about: searched and picked on the form (`StudentPicker`), or the
 * student of a saved incident reopened for Stage 2.
 * A form never falls back to a default student.
 *
 * `find` is the feature's own lookup (its `api/` module), so this hook stays free of data access.
 */
export function useIdentifiedStudent(
  /** A reopened incident's student; may arrive once the form's data has loaded. */
  preselected: Student | null | undefined,
  find: (studentId: string) => Promise<Student>,
) {
  const [picked, setPicked] = useState<Student | null>(null)
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
    /** A student picked from a search (`StudentPicker`), looked up in full (allergies included). */
    async select(studentId: string): Promise<void> {
      try {
        setPicked(await find(studentId))
        setError(undefined)
      } catch {
        setError("This student couldn't be loaded. Search again.")
      }
    },
    /** The identified student; `null` when none was picked. */
    async resolve(): Promise<Student | null> {
      return student
    },
    /** Clears the pick: after a save, or when Change brings the search back. */
    reset() {
      setPicked(null)
      setError(undefined)
    },
  }
}
