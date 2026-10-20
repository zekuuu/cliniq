import {
  getGradeLevels,
  getNextStudentNumber,
  getStudent,
  saveStudent,
  type DuplicateMatch,
  type SessionUser,
} from '../../../lib/mock-db'
import type { EmergencyContact, Student, StudentNumber, StudentSex } from '../../../types/entities'

export type { DuplicateMatch }
export type StudentFormMode = 'add' | 'edit'

export interface StudentFormValues {
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
  nextStudentNumber: StudentNumber
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

/** Edit mode when `studentNumber` is given (`/students/:studentNumber/edit`); add mode otherwise. */
export async function fetchStudentFormContext(studentNumber?: string): Promise<StudentFormContext> {
  const [student, gradeLevels, nextStudentNumber] = await Promise.all([
    studentNumber ? getStudent(studentNumber) : Promise.resolve(null),
    getGradeLevels(),
    getNextStudentNumber(),
  ])
  return { mode: studentNumber ? 'edit' : 'add', gradeLevels, nextStudentNumber, student }
}

export async function submitStudentForm(
  values: StudentFormValues,
  options: { mode: StudentFormMode; studentId?: string; confirmDuplicate?: boolean; actor?: SessionUser },
): Promise<StudentFormSubmitResult> {
  return saveStudent(
    {
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
    { studentId: options.mode === 'edit' ? options.studentId : undefined, confirmDuplicate: options.confirmDuplicate, actor: options.actor },
  )
}

