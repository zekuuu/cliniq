import {
  getDemoStudent,
  listStudents,
  lookupStudentByScan,
  searchStudents,
  type SessionUser,
} from '../../../lib/mock-db'
import type { Incident, Student, StudentNumber, StudentSearchResult, Visit } from '../../../types/entities'

export interface QrLookupResult {
  student: Student
  visits: Visit[]
  incidents: Incident[]
}

/** The "Use Demo Scan" button's Student Number: a real record from the seed, never hardcoded. */
export async function demoStudentNumber(): Promise<StudentNumber> {
  return (await getDemoStudent()).studentNumber
}

/** Every lookup is audited as a scan (who viewed which student, when), Staff or Instructor. */
export function lookupStudentByNumber(studentNumber: StudentNumber, user: SessionUser): Promise<QrLookupResult> {
  return lookupStudentByScan(studentNumber, user)
}

/** Students a QR sticker can be printed for (active records only). */
export function fetchPrintableStudents(): Promise<Student[]> {
  return listStudents()
}

/** the QR manual student search: Student Number prefix or name, active students, at most 8. */
export function searchQrStudents(query: string): Promise<StudentSearchResult[]> {
  return searchStudents(query)
}
