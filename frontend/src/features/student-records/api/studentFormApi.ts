import {
  getGradeLevels,
  getNextStudentNumber,
  getStudent,
  getStudentById,
  saveStudent,
  type DuplicateMatch,
  type SessionUser,
} from '../../../lib/mock-db'
import type { Student, StudentNumber, StudentSex } from '../../../types/entities'

export type { DuplicateMatch }
export type StudentFormMode = 'add' | 'edit'

export interface StudentFormValues {
  fullName: string
  gradeLevel: string
  sex: StudentSex | ''
  contactInfo: string
  emergencyContactName: string
  emergencyContactRelationship: string
  emergencyContactPhone: string
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
  const current = options.studentId ? await getStudentById(options.studentId) : null
  return saveStudent(
    {
      fullName: values.fullName,
      gradeLevel: values.gradeLevel,
      sex: values.sex as StudentSex,
      contactInfo: values.contactInfo,
      allergies: parseList(values.allergies),
      medicalConditions: parseList(values.medicalConditions),
      emergencyContact: {
        name: values.emergencyContactName.trim(),
        relationship: values.emergencyContactRelationship.trim(),
        phone: values.emergencyContactPhone.trim(),
        verified: current?.emergencyContact?.verified ?? false,
      },
    },
    { studentId: options.mode === 'edit' ? options.studentId : undefined, confirmDuplicate: options.confirmDuplicate, actor: options.actor },
  )
}

