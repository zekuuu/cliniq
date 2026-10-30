import type { BadgeTone } from '../components'
import type { Disposition } from '../types/entities'

/** The one wording for a visit's disposition, on screens and printouts. */
export const DISPOSITION_LABELS: Record<Disposition, string> = {
  returned_to_class: 'Returned to class',
  sent_home: 'Sent home',
  referred_to_hospital: 'Referred to hospital',
  resting_in_clinic: 'Resting in clinic',
}

export const DISPOSITION_TONES: Record<Disposition, BadgeTone> = {
  returned_to_class: 'success',
  sent_home: 'warning',
  referred_to_hospital: 'error',
  resting_in_clinic: 'info',
}

/**
 * ADR-053: a staff patient's "Returned to class" reads "Returned to work". The stored value is the
 * same; only the words change, wherever one visit's disposition is shown.
 */
export function dispositionLabel(disposition: Disposition, kind: 'student' | 'personnel' = 'student'): string {
  return kind === 'personnel' && disposition === 'returned_to_class' ? 'Returned to work' : DISPOSITION_LABELS[disposition]
}

/** Shown on New Visit and the Visit Detail edit form, in the logbook's order. */
export function dispositionOptionsFor(kind: 'student' | 'personnel' = 'student') {
  return (['returned_to_class', 'resting_in_clinic', 'sent_home', 'referred_to_hospital'] as const).map((value) => ({ value, label: dispositionLabel(value, kind) }))
}

export const DISPOSITION_OPTIONS = dispositionOptionsFor('student')
