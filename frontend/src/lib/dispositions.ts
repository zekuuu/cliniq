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

/** Shown on New Visit and the Visit Detail edit form, in the logbook's order. */
export const DISPOSITION_OPTIONS = (
  ['returned_to_class', 'resting_in_clinic', 'sent_home', 'referred_to_hospital'] as const
).map((value) => ({ value, label: DISPOSITION_LABELS[value] }))
