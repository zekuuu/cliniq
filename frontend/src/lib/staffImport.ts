import { splitFullName } from './personName'
export { parseCsv } from './studentImport'

/**
 * The staff list import (ADR-069): the school's file format is unknown, so the clinician maps its
 * columns to these fields, as on the student import. A row with a Staff No. updates that record;
 * without one it matches an existing staff member by name and type, or adds a new one.
 */
export const STAFF_IMPORT_FIELDS = [
  { key: 'staffNumber', label: 'Staff No.', required: false, guess: /staff\s*(no|num|#)|employee/i },
  { key: 'lastName', label: 'Last name', required: true, guess: /last|surname|family/i },
  { key: 'firstName', label: 'First name', required: true, guess: /first|given/i },
  { key: 'middleName', label: 'Middle name', required: false, guess: /middle/i },
  { key: 'fullName', label: 'Full name (one column)', required: false, guess: /^\s*(full\s*)?name\s*$/i },
  { key: 'sex', label: 'Sex', required: true, guess: /sex|gender/i },
  { key: 'type', label: 'Type', required: true, guess: /^\s*(staff\s*)?type|category|position/i },
  { key: 'department', label: 'Department or role', required: false, guess: /department|dept|role|office/i },
  { key: 'contactInfo', label: 'Contact number', required: false, guess: /^(?!.*emergency).*(contact\s*(no|num)|mobile|phone|cell)/i },
  { key: 'contactName', label: 'Emergency contact name', required: false, guess: /emergency.*name|contact\s*person/i },
  { key: 'contactRelationship', label: 'Emergency contact relationship', required: false, guess: /relation/i },
  { key: 'contactPhone', label: 'Emergency contact phone', required: false, guess: /emergency.*(phone|number|mobile)/i },
] as const

export type StaffImportFieldKey = (typeof STAFF_IMPORT_FIELDS)[number]['key']
/** Each field's column index, or -1 when not mapped. */
export type StaffImportMapping = Record<StaffImportFieldKey, number>
export type StaffImportRow = Record<StaffImportFieldKey, string>

export function guessStaffMapping(headers: string[]): StaffImportMapping {
  const mapping = {} as StaffImportMapping
  // "Contact number" skips headers that say "emergency", so the two phone columns don't collide.
  for (const field of STAFF_IMPORT_FIELDS) mapping[field.key] = headers.findIndex((header) => field.guess.test(header))
  return mapping
}

/** True when the name comes from one full-name column, with no First or Last name column matched. */
export const staffNamesFromOneColumn = (mapping: StaffImportMapping) => mapping.fullName >= 0 && mapping.firstName < 0 && mapping.lastName < 0

/** Labels of the required fields still unmatched. A full-name column stands in for First and Last name. */
export function missingStaffImportFields(mapping: StaffImportMapping): string[] {
  const oneColumn = staffNamesFromOneColumn(mapping)
  return STAFF_IMPORT_FIELDS.filter((field) => field.required && mapping[field.key] < 0 && !(oneColumn && (field.key === 'firstName' || field.key === 'lastName'))).map((field) => field.label)
}

export function mapStaffRows(rows: string[][], mapping: StaffImportMapping): StaffImportRow[] {
  const oneColumn = staffNamesFromOneColumn(mapping)
  return rows.map((cells) => {
    const row = {} as StaffImportRow
    for (const field of STAFF_IMPORT_FIELDS) row[field.key] = (cells[mapping[field.key]] ?? '').trim()
    if (oneColumn) {
      const name = splitFullName(row.fullName)
      Object.assign(row, { firstName: name.firstName, lastName: name.lastName, middleName: name.middleName ?? '' })
    }
    return row
  })
}
