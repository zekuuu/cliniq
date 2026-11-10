/**
 * A student's or staff member's name, stored as parts (ADR-064): first name, last name and an
 * optional middle name. The full name shown on screens and printouts is always built from the
 * parts here, never stored, so it cannot drift from them.
 */
export interface NameParts {
  firstName: string
  middleName: string | null
  lastName: string
}

/** Longest each part may be. Together, with spaces, they stay inside the ERD's 150-character name. */
export const NAME_PART_MAX = { firstName: 50, middleName: 40, lastName: 50 } as const

/** Trims a typed part and collapses repeated spaces. */
export const cleanNamePart = (value: string) => value.trim().replace(/\s+/g, ' ')

/** "First Middle Last", for example "Maria Angela Santos Dela Cruz". */
export function formatPersonName({ firstName, middleName, lastName }: NameParts): string {
  return [firstName, middleName, lastName]
    .map((part) => cleanNamePart(part ?? ''))
    .filter(Boolean)
    .join(' ')
}

/** Comparison key: case-, accent- and space-insensitive ("José  Peña" equals "jose pena"). */
export const nameKey = (value: string) =>
  cleanNamePart(value).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** True when every word typed appears in the name, in any order ("dela cruz", "maria santos"). */
export function nameMatches(fullName: string, query: string): boolean {
  const name = nameKey(fullName)
  const words = nameKey(query).split(' ').filter(Boolean)
  return words.length > 0 && words.every((word) => name.includes(word))
}

/** School-list order: last name, then first name, then middle name. */
export function compareByLastName(a: NameParts, b: NameParts): number {
  return (
    a.lastName.localeCompare(b.lastName) ||
    a.firstName.localeCompare(b.firstName) ||
    (a.middleName ?? '').localeCompare(b.middleName ?? '')
  )
}

/**
 * Splits one full-name column from an import file. "Surname, First Middle": the last name is
 * before the comma, and the last of two or more words after it is the middle name. Without a
 * comma, the last word is the last name and the rest is the first name. The import preview shows
 * every split so the registrar can correct the file.
 */
export function splitFullName(value: string): NameParts {
  const [before, after] = cleanNamePart(value).split(/\s*,\s*/, 2)
  if (after !== undefined) {
    const words = after.split(' ').filter(Boolean)
    return words.length > 1
      ? { firstName: words.slice(0, -1).join(' '), middleName: words.at(-1)!, lastName: before }
      : { firstName: after, middleName: null, lastName: before }
  }
  const words = before.split(' ').filter(Boolean)
  return { firstName: words.slice(0, -1).join(' '), middleName: null, lastName: words.at(-1) ?? '' }
}
