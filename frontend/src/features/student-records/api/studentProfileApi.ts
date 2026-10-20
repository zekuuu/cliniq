import {
  archiveStudent,
  getDemoStudent,
  getStudent,
  getStudentExcuseLetters,
  getStudentHistory,
  type SessionUser,
  type StudentExcuseLetter,
} from '../../../lib/mock-db'
import type { Incident, Student, Visit } from '../../../types/entities'

/**
 * Student Profile data access (Screen #7 / Reference 3). A read-only profile fetch, so no audit-log
 * write is needed.
 *
 * Preview an empty history with `?mockEmpty=visits,incidents` (`lib/mock-db/devToggles.ts`).
 * The whole history loads, newest first: the screen lists the most recent, the printed Student Health
 * Record lists all of it (printing never fetches).
 */

export interface StudentProfileData {
  student: Student
  visits: Visit[]
  incidents: Incident[]
  /** Staff only (Module 3 is Staff-only); always empty for other roles. */
  excuseLetters: StudentExcuseLetter[]
}

/** `studentId` comes from the `/students/:studentId` route; omitted, a demo student is used. */
export async function fetchStudentProfile(
  studentId?: string,
  viewer?: SessionUser,
): Promise<StudentProfileData> {
  const student = studentId ? await getStudent(studentId) : await getDemoStudent({ withHistory: true })
  const [history, excuseLetters] = await Promise.all([
    getStudentHistory(student.id, Infinity),
    viewer?.role === 'staff' ? getStudentExcuseLetters(student.id) : [],
  ])
  return { student, ...history, excuseLetters }
}

/** Archive hides the student from active lists without deleting anything; the write is audited. */
export function archiveStudentRecord(studentId: string, actor: SessionUser): Promise<Student> {
  return archiveStudent(studentId, actor)
}
