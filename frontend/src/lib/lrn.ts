/**
 * The LRN (Learner Reference Number) identifies a student (ADR-028). It is exactly 12 digits, kept
 * as text so leading zeros survive. Lists, pickers, printouts and the Audit Trail show only its last
 * four digits; the full LRN appears only on the single-student view and the edit form.
 */
export const LRN_LENGTH = 12

const LRN = /^\d{12}$/

/** Strips spaces, dashes and anything else typed or pasted, keeping at most 12 digits. */
export function normalizeLrn(value: string): string {
  return value.replace(/\D/g, '').slice(0, LRN_LENGTH)
}

export function isLrn(value: string): boolean {
  return LRN.test(value)
}

/** The masked LRN shown on multi-student screens, printouts and the Audit Trail: `••••••••1234`. */
export function maskLrn(lrn: string): string {
  return `••••••••${lrn.slice(-4)}`
}

/** What a screen reader says for a masked LRN. */
export function lrnLabel(lrn: string): string {
  return `LRN ending in ${lrn.slice(-4)}`
}

/** Shortest query a student search answers; below it nothing is listed (no browsable roster). */
export const STUDENT_SEARCH_MIN_LENGTH = 1
