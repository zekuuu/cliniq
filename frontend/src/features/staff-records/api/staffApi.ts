import {
  archivePersonnel,
  getPersonnel,
  getPersonnelDepartments,
  getPersonnelHistory,
  getPersonnelTypes,
  listPersonnel,
  recordView,
  savePersonnel,
  type PersonnelHistory,
  type SessionUser,
} from '../../../lib/mock-db'
import type { EmergencyContact, Personnel } from '../../../types/entities'
import { isNoneRecorded } from '../../../lib/patients'

/**
 * Staff patients (ADR-043): the Staff List, Staff Profile and Staff Form. School Clinician only.
 * Writes are audited in the data layer under the target "Staff".
 */

export interface StaffListQuery {
  search: string
  type: string
  includeArchived: boolean
}

export function fetchStaffList(query: StaffListQuery): Promise<Personnel[]> {
  return listPersonnel(query)
}

export function fetchStaffTypes(): Promise<string[]> {
  return getPersonnelTypes()
}

export interface StaffProfileData extends PersonnelHistory {
  personnel: Personnel
}

export async function fetchStaffProfile(personnelId: string, viewer?: SessionUser): Promise<StaffProfileData> {
  const [personnel, history] = await Promise.all([getPersonnel(personnelId), getPersonnelHistory(personnelId, Infinity)])
  // ADR-048: opening a staff profile is audit-logged once per session.
  if (viewer) await recordView({ type: 'staff', id: personnel.id }, viewer)
  return { personnel, ...history }
}

export function archiveStaffRecord(personnelId: string, actor: SessionUser): Promise<Personnel> {
  return archivePersonnel(personnelId, actor)
}

export interface StaffFormValues {
  fullName: string
  type: string
  department: string
  contactInfo: string
  emergencyContacts: Array<Pick<EmergencyContact, 'name' | 'relationship' | 'phone' | 'verified'>>
  /** Comma-separated, like the student form; blank or "None recorded" stores nothing (D5, ADR-051). */
  allergies: string
  medicalConditions: string
}

export interface StaffFormContext {
  mode: 'add' | 'edit'
  types: string[]
  departments: string[]
  personnel: Personnel | null
}

export async function fetchStaffFormContext(personnelId?: string): Promise<StaffFormContext> {
  const [personnel, types, departments] = await Promise.all([
    personnelId ? getPersonnel(personnelId) : Promise.resolve(null),
    getPersonnelTypes(),
    getPersonnelDepartments(),
  ])
  return { mode: personnelId ? 'edit' : 'add', types, departments, personnel }
}

function parseList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !isNoneRecorded(item))
}

export function submitStaffForm(values: StaffFormValues, options: { personnelId?: string; actor: SessionUser }) {
  return savePersonnel(
    {
      fullName: values.fullName,
      type: values.type,
      department: values.department,
      contactInfo: values.contactInfo,
      allergies: parseList(values.allergies),
      medicalConditions: parseList(values.medicalConditions),
      emergencyContacts: values.emergencyContacts
        .filter((contact) => [contact.name, contact.relationship, contact.phone].some((value) => value.trim()))
        .map((contact) => ({ name: contact.name.trim(), relationship: contact.relationship.trim(), phone: contact.phone.trim(), verified: contact.verified })),
    },
    options,
  )
}
