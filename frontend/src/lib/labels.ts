/**
 * Words people read, kept in one place so a wording decision is one edit (professor's consultation,
 * Friday, November 6, 2026; Zean, Saturday, November 7, 2026 — 04:18 PHT).
 *
 * Labels only: the data names stay as they are (`complaint`, `extraComplaints`, `collectedBy`, the
 * ERD columns and the API), so changing a word here never touches stored data.
 */

/** What a visit or incident records about how the patient feels (was "Complaint"). */
export const SYMPTOM = 'Symptom'
export const SYMPTOMS = 'Symptoms'
/** Lower-case forms for the middle of a sentence. */
export const symptom = 'symptom'
export const symptoms = 'symptoms'

/** The question over the Visit form's symptom fields. */
export const SYMPTOMS_QUESTION = 'What symptoms is the patient feeling?'

/** Who took a sent-home or referred student from the clinic (was "Collected by"). */
export const RELEASED_TO = 'Released to'
