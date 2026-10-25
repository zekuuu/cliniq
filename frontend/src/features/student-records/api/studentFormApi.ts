import {
  DuplicateLrnError,
  getGradeLevels,
  getStudent,
  NAME_CORRECTION_REASON_MIN,
  saveStudent,
  type DuplicateMatch,
  type SessionUser,
} from '../../../lib/mock-db'
import type { EmergencyContact, Student, StudentSex } from '../../../types/entities'

export { DuplicateLrnError, NAME_CORRECTION_REASON_MIN }
export type { DuplicateMatch }
export type StudentFormMode = 'add' | 'edit'

export interface StudentFormValues {
  /** Typed by Staff; spaces and dashes are stripped (ADR-028). */
  lrn: string
  fullName: string
  gradeLevel: string
  sex: StudentSex | ''
  contactInfo: string
  emergencyContacts: Array<Pick<EmergencyContact, 'name' | 'relationship' | 'phone' | 'verified'>>
  allergies: string
  medicalConditions: string
}

export interface StudentFormContext {
  mode: StudentFormMode
  gradeLevels: string[]
  student: Student | null
}

export type StudentFormSubmitResult =
  | { status: 'duplicate'; matches: DuplicateMatch[] }
  | { status: 'saved'; student: Student; action: 'create' | 'update' }

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => item.toLowerCase() !== 'none')
}

/** Edit mode when `studentId` is given (`/students/:studentId/edit`); add mode otherwise. */
export async function fetchStudentFormContext(studentId?: string): Promise<StudentFormContext> {
  const [student, gradeLevels] = await Promise.all([
    studentId ? getStudent(studentId) : Promise.resolve(null),
    getGradeLevels(),
  ])
  return { mode: studentId ? 'edit' : 'add', gradeLevels, student }
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
      contactInfo: values.contactInfo,
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

