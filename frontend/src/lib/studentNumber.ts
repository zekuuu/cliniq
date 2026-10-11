import type { StudentNumber } from '../types/entities'

/** Student Numbers are `YYYY-NNNNN` (ADR-005). */
const STUDENT_NUMBER = /^\d{4}-\d{5}$/

/** Formats typed or scanned input as `YYYY-NNNNN`, inserting the dash while the user types. */
export function normalizeStudentNumber(value: string): StudentNumber {
  const compact = value.toUpperCase().replace(/[^0-9]/g, '').slice(0, 9)
  return compact.length > 4 ? `${compact.slice(0, 4)}-${compact.slice(4)}` : compact
}

/** Shortest query a student search answers; below it nothing is listed (no browsable roster). */
export const STUDENT_SEARCH_MIN_LENGTH = 1

export function isStudentNumber(value: string): boolean {
  return STUDENT_NUMBER.test(value)
}
