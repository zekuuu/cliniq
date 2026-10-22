import { excusedPeriodError } from '../../lib/mock-db'
import type { Disposition, ExcuseLetterDraft } from '../../types/entities'

/** The form values behind the disposition-specific fields (New Visit and the Visit Detail edit form). */
export interface DispositionValues {
  prepareLetter: boolean
  excusedFrom: string
  excusedUntil: string
  letterNote: string
  referredTo: string
}

export interface DispositionErrors {
  excusedUntil?: string
}

/** Fresh values for a disposition: letter prepared, excused from `fromDate`, nothing else filled in. */
export function emptyDispositionValues(fromDate: string): DispositionValues {
  return { prepareLetter: true, excusedFrom: fromDate, excusedUntil: '', letterNote: '', referredTo: '' }
}

/** Only a student who left (sent home or referred) gets an excuse letter; resting in the clinic does not. */
export const hasExcuseLetter = (disposition: Disposition) => disposition === 'sent_home' || disposition === 'referred_to_hospital'

/** Validates only what is visible for this disposition. */
export function dispositionErrors(disposition: Disposition, values: DispositionValues, lettersLocked = false): DispositionErrors {
  if (!hasExcuseLetter(disposition) || !values.prepareLetter || lettersLocked) return {}
  const error = excusedPeriodError({ excusedFrom: values.excusedFrom, excusedUntil: values.excusedUntil })
  return error ? { excusedUntil: error } : {}
}

/** What the data layer stores: a draft only while the letter section is shown and ticked. */
export function dispositionPayload(
  disposition: Disposition,
  values: DispositionValues,
): { excuseLetterDraft: ExcuseLetterDraft | null; referredTo: string | null } {
  return {
    excuseLetterDraft:
      hasExcuseLetter(disposition) && values.prepareLetter
        ? { excusedFrom: values.excusedFrom, excusedUntil: values.excusedUntil, note: values.letterNote.trim() || null }
        : null,
    referredTo: disposition === 'referred_to_hospital' ? values.referredTo.trim() || null : null,
  }
}
