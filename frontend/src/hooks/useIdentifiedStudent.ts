import { useState } from 'react'
import type { Student } from '../types/entities'

/**
 * Which student an entry form is about. The student is either identified before the form opens (a
 * QR scan or a quick-action passes `?student=`), or searched and picked on the form (`StudentPicker`).
 * A form never falls back to a default student.
 *
 * `find` is the feature's own lookup (its `api/` module), so this hook stays free of data access.
 */
export function useIdentifiedStudent(
  /** The student identified before the form opened; may arrive once the form's data has loaded. */
  preselected: Student | null | undefined,
  find: (studentNumber: string) => Promise<Student>,
) {
  const [picked, setPicked] = useState<Student | null>(null)
  const student = preselected ?? picked
  const [error, setError] = useState<string | undefined>()

  return {
    student,
    error,
    /** Inline check, run with the rest of the form's validation. */
    validate(
      message = 'Choose the student: type a Student Number or name, then pick from the list.',
    ): boolean {
      if (student) return true
      setError(message)
      return false
    },
    /** A student picked from a search (`StudentPicker`), looked up in full (allergies included). */
    async select(studentNumber: string): Promise<void> {
      try {
        setPicked(await find(studentNumber))
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
