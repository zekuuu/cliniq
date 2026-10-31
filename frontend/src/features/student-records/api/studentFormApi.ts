import {
  checkStudentDuplicates,
  DUPLICATE_LRN_MESSAGE,
  DuplicateLrnError,
  getGradeLevels,
  getMockToday,
  getStudent,
  getUnusualAgeYears,
  NAME_CORRECTION_REASON_MIN,
  saveStudent,
  type DuplicateMatch,
  type SessionUser,
  type StudentDuplicateCheck,
} from '../../../lib/mock-db'
import type { EmergencyContact, ISODate, Student, StudentSex } from '../../../types/entities'
import { isNoneRecorded } from '../../../lib/patients'

export { checkStudentDuplicates, DUPLICATE_LRN_MESSAGE, DuplicateLrnError, NAME_CORRECTION_REASON_MIN }
export type { DuplicateMatch, StudentDuplicateCheck }
export type StudentFormMode = 'add' | 'edit'

export interface StudentFormValues {
  /** Typed by Staff; spaces and dashes are stripped (ADR-028). */
  lrn: string
  fullName: string
  gradeLevel: string
  sex: StudentSex | ''
  /** `YYYY-MM-DD`, or '' when not given. Optional (ADR-054). */
  birthDate: string
  emergencyContacts: Array<Pick<EmergencyContact, 'name' | 'relationship' | 'phone' | 'verified'>>
  allergies: string
  medicalConditions: string
}

export interface StudentFormContext {
  mode: StudentFormMode
  gradeLevels: string[]
  student: Student | null
  today: ISODate
  unusualAgeYears: number
}

export type StudentFormSubmitResult =
  | { status: 'duplicate'; matches: DuplicateMatch[] }
  | { status: 'saved'; student: Student; action: 'create' | 'update' }

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !isNoneRecorded(item))
}

/** Edit mode when `studentId` is given (`/students/:studentId/edit`); add mode otherwise. */
export async function fetchStudentFormContext(studentId?: string): Promise<StudentFormContext> {
  const [student, gradeLevels, unusualAgeYears] = await Promise.all([
    studentId ? getStudent(studentId) : Promise.resolve(null),
    getGradeLevels(),
    getUnusualAgeYears(),
  ])
  return { mode: studentId ? 'edit' : 'add', gradeLevels, student, today: getMockToday(), unusualAgeYears }
}

export async function submitStudentForm(
  values: StudentFormValues,
  options: { mode: StudentFormMode; studentId?: string; confirmDuplicate?: boolean; actor?: SessionUser; nameCorrectionReason?: string },
): Promise<StudentFormSubmitResult> {
  return saveStudent(
    {
      lrn: values.lrn,
      fullName: values.fullName,
      gradeLevel: values.gradeLevel,
      sex: values.sex as StudentSex,
      birthDate: values.birthDate || null,
      allergies: parseList(values.allergies),
      medicalConditions: parseList(values.medicalConditions),
      emergencyContacts: values.emergencyContacts
        .filter((contact) => [contact.name, contact.relationship, contact.phone].some((value) => value.trim()))
        .map((contact) => ({
          name: contact.name.trim(),
          relationship: contact.relationship.trim(),
          phone: contact.phone.trim(),
          verified: contact.verified,
        })),
    },
    {
      studentId: options.mode === 'edit' ? options.studentId : undefined,
      confirmDuplicate: options.confirmDuplicate,
      actor: options.actor,
      nameCorrectionReason: options.nameCorrectionReason,
    },
  )
}

