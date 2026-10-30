import { diffDays, formatDate } from './dates'
import type { ISODate } from '../types/entities'

/**
 * The excuse letter's wording and rules, shared by the letter page and the data layer, so "Save and
 * approve now" on a visit stores the same text the letter page would (ADR-049).
 */

export const EXCUSE_LETTER_RECIPIENT = 'Class Adviser'

/** Printed on the letter when the clinician ticks "Stay home until cleared" (ADR-049, D5). */
export const STAY_HOME_LINE = 'Stay home until cleared by the school clinic.'

export interface LetterPeriod {
  excusedFrom: ISODate
  excusedUntil: ISODate
}

/**
 * The letter's wording names the dates it excuses (panel review EX-4) and stays non-diagnostic. It
 * follows the excused period until Staff edit the text.
 */
export function excuseLetterBody(fullName: string, visitDate: ISODate, period: LetterPeriod): string {
  const { excusedFrom, excusedUntil } = period
  const dates = !excusedFrom || !excusedUntil
    ? 'for the dates shown above'
    : excusedFrom === excusedUntil
      ? `on ${formatDate(excusedFrom)}`
      : `from ${formatDate(excusedFrom)} to ${formatDate(excusedUntil)}`
  return [
    `This is to confirm that ${fullName} visited the school clinic on ${formatDate(visitDate)}.`,
    `The student was assessed by the clinic staff and is excused ${dates}.`,
    'This clinic excuse letter is for school attendance documentation only.',
  ].join('\n\n')
}

/** Days excused, counting both dates (Oct 1 to Oct 4 is 4 days); 0 when the period is incomplete. */
export function excusedDays({ excusedFrom, excusedUntil }: LetterPeriod): number {
  if (!excusedFrom || !excusedUntil || excusedUntil < excusedFrom) return 0
  return diffDays(excusedFrom, excusedUntil) + 1
}

/** The warning text when a period is longer than `afterDays` (ADR-049, D2); null otherwise. Warns, never blocks. */
export function medicalCertificateWarning(period: LetterPeriod, afterDays: number): string | null {
  return excusedDays(period) > afterDays ? `More than ${afterDays} days: a medical certificate is usually needed.` : null
}
