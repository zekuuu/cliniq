import {
  getStudent,
  searchStudents,
  submitPeReferral as submitToLayer,
  type SessionUser,
} from '../../../lib/mock-db'
import type { Disposition, Student, StudentSearchResult } from '../../../types/entities'

export interface PeReferralContext {
  /** Starter text for "Use PE Defaults". Every field stays editable before saving. */
  defaults: Pick<PeReferralValues, 'activity' | 'injurySummary' | 'clinicalAssessment' | 'treatment'>
}

export interface PeReferralValues {
  referredBy: string
  activity: string
  injurySummary: string
  clinicalAssessment: string
  treatment: string
  disposition: Disposition
}

/**
 * PLACEHOLDER WORDING. The three clinical defaults are neutral starter text for the nurse to edit,
 * not findings. No requirement specifies them; the School Clinician should confirm or replace them
 * (tracked in Issues-and-TODOs.md).
 */
const CLINICAL_DEFAULTS = {
  injurySummary: 'Injury reported during PE/Sports activity. Area affected: ',
  clinicalAssessment: 'Assessed in the clinic. Findings: ',
  treatment: 'First aid given: ',
}

/** PE/Sports Instructors have no account (ADR-029), so "Referred by" is the name as Staff type it. */
export async function fetchPeReferralContext(): Promise<PeReferralContext> {
  return { defaults: { activity: 'Physical Education class', ...CLINICAL_DEFAULTS } }
}

/** Loads the picked student in full. */
export function findReferralStudent(studentId: string): Promise<Student> {
  return getStudent(studentId)
}

/**
 * Stores the referral (a mock-only record: §5 has no PE referral entity yet, see ADR-014), with the
 * referring instructor's name as typed. The data layer writes the submission audit entry, plus an
 * escalation entry when the student is referred to hospital.
 */
export async function submitPeReferral(
  values: PeReferralValues,
  student: Student,
  actor?: SessionUser,
): Promise<void> {
  await submitToLayer(
    {
      studentId: student.id,
      referredBy: values.referredBy.trim(),
      activity: values.activity,
      injurySummary: values.injurySummary,
      clinicalAssessment: values.clinicalAssessment,
      treatment: values.treatment,
      disposition: values.disposition,
    },
    actor,
  )
}

/** the PE/Sports Referral student search: LRN prefix or name, active students, at most 8. */
export function searchReferralStudents(query: string): Promise<StudentSearchResult[]> {
  return searchStudents(query)
}
