import {
  getStudent,
  searchStudents,
  listUsers,
  submitPeReferral as submitToLayer,
  type SessionUser,
} from '../../../lib/mock-db'
import type { Disposition, Student, StudentSearchResult } from '../../../types/entities'

export interface PeReferralContext {
  /** `null` when the form was opened without an identified student; it then asks for the Student Number. */
  student: Student | null
  /** Starter text for "Use PE Defaults". Every field stays editable before saving. */
  defaults: Pick<PeReferralValues, 'referredBy' | 'activity' | 'injurySummary' | 'clinicalAssessment' | 'treatment'>
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
 * not findings. No requirement specifies them; the School Head Nurse should confirm or replace them
 * (tracked in Issues-and-TODOs.md).
 */
const CLINICAL_DEFAULTS = {
  injurySummary: 'Injury reported during PE/Sports activity. Area affected: ',
  clinicalAssessment: 'Assessed in the clinic. Findings: ',
  treatment: 'First aid given: ',
}

/** `studentNumber` is the route's `?student=` pre-selection (the QR quick-action passes it). */
export async function fetchPeReferralContext(studentNumber?: string): Promise<PeReferralContext> {
  const [student, users] = await Promise.all([
    studentNumber ? getStudent(studentNumber) : Promise.resolve(null),
    listUsers(),
  ])
  const instructor = users.find((user) => user.role === 'instructor')
  return {
    student,
    defaults: {
      referredBy: instructor?.name ?? '',
      activity: 'Physical Education class',
      ...CLINICAL_DEFAULTS,
    },
  }
}

/** Resolves the Student Number typed on the form when the student wasn't identified beforehand. */
export function findReferralStudent(studentNumber: string): Promise<Student> {
  return getStudent(studentNumber)
}

/**
 * Stores the referral (a mock-only record: §5 has no PE referral entity yet, see ADR-014). The
 * referring instructor is linked when the name matches a known account. The data layer writes the
 * submission audit entry, plus an escalation entry when the student is referred to hospital.
 */
export async function submitPeReferral(
  values: PeReferralValues,
  student: Student,
  actor?: SessionUser,
): Promise<void> {
  const users = await listUsers()
  const referrer = users.find(
    (user) => user.name.toLowerCase() === values.referredBy.trim().toLowerCase(),
  )
  await submitToLayer(
    {
      studentNumber: student.studentNumber,
      referredByUserId: referrer?.id,
      activity: values.activity,
      injurySummary: values.injurySummary,
      clinicalAssessment: values.clinicalAssessment,
      treatment: values.treatment,
      disposition: values.disposition,
    },
    actor,
  )
}

/** the PE/Sports Referral student search: Student Number prefix or name, active students, at most 8. */
export function searchReferralStudents(query: string): Promise<StudentSearchResult[]> {
  return searchStudents(query)
}
