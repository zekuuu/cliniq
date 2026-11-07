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

/**
 * Each disposition box on the form shows its Visit Log badge colour, so it's noticed at once (Zean,
 * November 5, 2026): a soft tint while not chosen, the solid colour with a ring when chosen. The ring
 * and weight still mark the choice without colour.
 */
const DISPOSITION_IDLE: Record<Disposition, string> = {
  returned_to_class: 'bg-success/10',
  resting_in_clinic: 'bg-info/10',
  sent_home: 'bg-warning-fill',
  referred_to_hospital: 'bg-error/10',
}
const DISPOSITION_SELECTED: Record<Disposition, string> = {
  returned_to_class: 'bg-success text-white ring-success',
  resting_in_clinic: 'bg-info text-white ring-info',
  sent_home: 'bg-warning text-text-primary ring-warning',
  referred_to_hospital: 'bg-error text-white ring-error',
}

/** Shown on New Visit and the Visit Detail edit form, in the logbook's order. */
export function dispositionOptionsFor(kind: 'student' | 'personnel' = 'student') {
  return (['returned_to_class', 'resting_in_clinic', 'sent_home', 'referred_to_hospital'] as const).map((value) => ({
    value,
    label: dispositionLabel(value, kind),
    className: DISPOSITION_IDLE[value],
    selectedClassName: DISPOSITION_SELECTED[value],
  }))
}

export const DISPOSITION_OPTIONS = dispositionOptionsFor('student')
