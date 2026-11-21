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

/**
 * The masked LRN shown on multi-student screens and printouts: `••••••••1234`. Small bullets, not
 * black circles, which read bold (Zean, November 3, 2026).
 * U+25CF, not the bullet `•`: Inter draws small bullets at uneven sizes at 1x, so the mask looked ragged.
 */
export function maskLrn(lrn: string): string {
  return `••••••••${lrn.slice(-4)}`
}

/** What a screen reader says for a masked LRN. */
export function lrnLabel(lrn: string): string {
  return `LRN ending in ${lrn.slice(-4)}`
}

/** Shortest query a student search answers; below it nothing is listed (no browsable roster). */
export const STUDENT_SEARCH_MIN_LENGTH = 1

/**
 * Whether typed digits (spaces and dashes already removed) find a full LRN in a student or patient
 * search: they match its start (the masked part), or, up to 4 digits, are found in its last 4, the
 * digits every list shows (Zean, Sunday, November 22, 2026, ADR-087). Backend twin: `Lrn::searchMatches`.
 */
export function fullLrnMatchesSearch(lrn: string, digits: string): boolean {
  return lrn.startsWith(digits) || (digits.length <= 4 && lrn.slice(-4).includes(digits))
}

/**
 * Whether typed digits find a student's LRN on a log. A full LRN (mock mode) matches by its prefix,
 * as before. A masked LRN (API mode, ADR-040: lists never carry the full one) shows only its last
 * 4 digits, so typed digits match those: a few digits found in them, or a longer entry that ends
 * with them (Zean, Sunday, November 15, 2026, ADR-080).
 */
export function lrnMatchesSearch(lrn: string, typed: string): boolean {
  const digits = typed.replace(/[\s-]/g, '')
  if (!lrn.includes('●')) return lrn.startsWith(digits)
  const tail = lrn.replace(/\D/g, '')
  if (!digits || !/^\d+$/.test(digits)) return false
  return digits.length <= tail.length ? tail.includes(digits) : digits.endsWith(tail)
}
