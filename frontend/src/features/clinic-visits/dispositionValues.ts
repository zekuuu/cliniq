import { excusedPeriodError } from '../../lib/mock-db'
import { todayISO } from '../../lib/dates'
import type { CollectedBy, Disposition, ExcuseLetterDraft } from '../../types/entities'
import { currentClock } from './logbookValues'

/** The form values behind the disposition-specific fields (New Visit and the Visit Detail edit form). */
export interface DispositionValues {
  prepareLetter: boolean
  excusedFrom: string
  excusedUntil: string
  letterNote: string
  /** "Stay home until cleared" on the letter (ADR-049, D5). */
  stayHome: boolean
  stayHomeNote: string
  referredTo: string
  /** Who collected the student, Sent home or Referred only (ADR-049, D4). All optional. */
  collectedName: string
  collectedRelationship: string
  /** Who "Other" is (neighbour, relative, guardian); required when the relationship is Other. */
  collectedRelationshipOther: string
  /** "HH:MM", now by default. */
  collectedTime: string
}

export interface DispositionErrors {
  excusedUntil?: string
  collectedTime?: string
  collectedRelationshipOther?: string
}

/** The relationship choice that asks the user to say who (review of November 6, 2026). */
export const isOtherRelationship = (relationship: string) =>
  relationship.trim().toLowerCase() === 'other'

/** Fresh values for a disposition: letter prepared, excused from `fromDate`, collection time now, nothing else filled in. */
export function emptyDispositionValues(fromDate: string): DispositionValues {
  return {
    prepareLetter: true,
    excusedFrom: fromDate,
    excusedUntil: '',
    letterNote: '',
    stayHome: false,
    stayHomeNote: '',
    referredTo: '',
    collectedName: '',
    collectedRelationship: '',
    collectedRelationshipOther: '',
    collectedTime: currentClock(),
  }
}

/** The form values for a saved collection; blank fields when nobody was recorded. */
export function collectedValuesFrom(
  collected: CollectedBy | null | undefined,
): Pick<
  DispositionValues,
  'collectedName' | 'collectedRelationship' | 'collectedRelationshipOther' | 'collectedTime'
> {
  // A saved "Other" is stored as who it was ("Neighbour"), so it loads back as typed text.
  return collected
    ? {
        collectedName: collected.name ?? '',
        collectedRelationship: collected.relationship ?? '',
        collectedRelationshipOther: '',
        collectedTime: collected.time ?? '',
      }
    : {
        collectedName: '',
        collectedRelationship: '',
        collectedRelationshipOther: '',
        collectedTime: currentClock(),
      }
}

/** Only a student who left (sent home or referred) gets an excuse letter; resting in the clinic does not. */
export const hasExcuseLetter = (disposition: Disposition) =>
  disposition === 'sent_home' || disposition === 'referred_to_hospital'

/**
 * Validates only what is visible for this disposition. `visitDate` is the visit's date: on today's
 * visit a collection time can't be later than now.
 */
export function dispositionErrors(
  disposition: Disposition,
  values: DispositionValues,
  lettersLocked = false,
  visitDate = todayISO(),
): DispositionErrors {
  if (!hasExcuseLetter(disposition)) return {}
  const errors: DispositionErrors = {}
  if (values.collectedTime && visitDate === todayISO() && values.collectedTime > currentClock())
    errors.collectedTime = "The release time can't be in the future."
  if (
    isOtherRelationship(values.collectedRelationship) &&
    !values.collectedRelationshipOther.trim()
  )
    errors.collectedRelationshipOther =
      'Say who the student was released to, for example a neighbour or a relative.'
  if (!values.prepareLetter || lettersLocked) return errors
  const error = excusedPeriodError({
    excusedFrom: values.excusedFrom,
    excusedUntil: values.excusedUntil,
  })
  return error ? { ...errors, excusedUntil: error } : errors
}

/** What the data layer stores: a draft only while the letter section is shown and ticked. */
export function dispositionPayload(
  disposition: Disposition,
  values: DispositionValues,
): {
  excuseLetterDraft: ExcuseLetterDraft | null
  referredTo: string | null
  collectedBy: CollectedBy | null
} {
  const name = values.collectedName.trim() || null
  // "Other" is stored as who it was, so the record says "Neighbour", not "Other".
  const relationship =
    (isOtherRelationship(values.collectedRelationship)
      ? values.collectedRelationshipOther
      : values.collectedRelationship
    ).trim() || null
  return {
    excuseLetterDraft:
      hasExcuseLetter(disposition) && values.prepareLetter
        ? {
            excusedFrom: values.excusedFrom,
            excusedUntil: values.excusedUntil,
            note: values.letterNote.trim() || null,
            ...(values.stayHome && {
              stayHomeUntilCleared: true,
              stayHomeNote: values.stayHomeNote.trim() || null,
            }),
          }
        : null,
    referredTo: disposition === 'referred_to_hospital' ? values.referredTo.trim() || null : null,
    // Nobody named means nobody recorded; the default time alone is not a record.
    collectedBy:
      hasExcuseLetter(disposition) && (name || relationship)
        ? { name, relationship, time: values.collectedTime || null }
        : null,
  }
}
