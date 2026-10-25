import { lrnLabel, maskLrn } from './lrn'
import type { PatientRef, Personnel, Student } from '../types/entities'

/**
 * A patient is a student or a staff member (ADR-043). These helpers keep the two kinds apart on
 * screen: a list shows the masked LRN or the Staff No., never a name (ADR-004); a single-person
 * screen shows the name.
 */

export type PatientKind = 'student' | 'personnel'

/** One patient, loaded in full for a form or a single-person screen. */
export type Patient = ({ kind: 'student' } & Student) | ({ kind: 'personnel' } & Personnel)

/** The identifier a multi-person list may show: an LRN (masked on screen) or a Staff No. */
export interface PatientNumber {
  kind: PatientKind
  number: string
}

export const PATIENT_KIND_LABELS: Record<PatientKind, string> = { student: 'Student', personnel: 'Staff' }

export function patientRefOf(patient: { kind: PatientKind; id: string }): PatientRef {
  return patient.kind === 'student' ? { studentId: patient.id, personnelId: null } : { studentId: null, personnelId: patient.id }
}

/** The single-person header line: "LRN 000000260001 · Grade 4" or "STF-0002 · Teacher · Science department". */
export function patientLine(patient: Patient): string {
  if (patient.kind === 'student') return `LRN ${patient.lrn} · ${patient.gradeLevel}`
  return [patient.staffNumber, patient.type, patient.department].filter(Boolean).join(' · ')
}

/** What a list shows for the patient in text (print, aria labels): masked LRN or the Staff No. */
export function maskPatientNumber(patient: PatientNumber): string {
  return patient.kind === 'student' ? maskLrn(patient.number) : patient.number
}

/** What a screen reader says for it: "LRN ending in 1234" or "Staff No. STF-0002". */
export function patientNumberLabel(patient: PatientNumber): string {
  return patient.kind === 'student' ? lrnLabel(patient.number) : `Staff No. ${patient.number}`
}

/** The Everyone / Students / Staff filter on lists with more than one person (D11). */
export type PatientFilter = 'everyone' | 'students' | 'staff'

export function matchesPatientFilter(kind: PatientKind, filter: PatientFilter): boolean {
  return filter === 'everyone' || (filter === 'students') === (kind === 'student')
}

/** The contact an incident's call goes to: a parent or guardian for a student, an emergency contact for staff (D12). */
export function contactNoun(kind: PatientKind): string {
  return kind === 'student' ? 'parent or guardian' : 'emergency contact'
}

/** The single-person identifier in text: "LRN 000000260001" or "STF-0002". */
export function patientIdText(patient: Patient): string {
  return patient.kind === 'student' ? `LRN ${patient.lrn}` : patient.staffNumber
}

/** The field beside the name: grade level for a student, staff type for a staff member. */
export function patientGroup(patient: Patient): { label: string; value: string } {
  return patient.kind === 'student' ? { label: 'Grade level', value: patient.gradeLevel } : { label: 'Type', value: patient.type }
}

/** Who an incident's calls go to, as a title word: "Parent" or "Emergency contact" (D12). */
export const NOTIFIED_PARTY: Record<PatientKind, string> = { student: 'Parent', personnel: 'Emergency contact' }

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** "Students 12 · Staff 3": the split shown wherever a total counts people (ADR-043, D14). */
export function splitText(split: { students: number; staff: number }): string {
  return `Students ${split.students} · Staff ${split.staff}`
}
