import type { ISODate } from '../types/entities'

/**
 * Whole years from the birthdate to `onDate` (ADR-054). Calculated, never stored. Comparing "MM-DD"
 * makes a 29 February birthdate turn on 1 March in a year with no 29 February. Null with no birthdate,
 * or when `onDate` is before it.
 */
export function ageOn(birthDate: ISODate | null | undefined, onDate: ISODate): number | null {
  if (!birthDate || birthDate > onDate) return null
  const years = Number(onDate.slice(0, 4)) - Number(birthDate.slice(0, 4))
  return onDate.slice(5) < birthDate.slice(5) ? years - 1 : years
}

/** "9 years old", "1 year old". */
export function ageText(age: number): string {
  return `${age} year${age === 1 ? '' : 's'} old`
}

/** The usual age for a grade: Kinder 5, Grade n is n + 5. Null for any other grade label. */
export function usualAgeForGrade(gradeLevel: string): number | null {
  if (gradeLevel === 'Kinder') return 5
  const grade = gradeLevel.match(/^Grade (\d+)$/)?.[1]
  return grade ? Number(grade) + 5 : null
}

/** A soft note, never a block (ADR-018, ADR-054): the age is more than `unusualAgeYears` from the usual one. */
export function unusualAgeNote(
  birthDate: ISODate | null | undefined,
  gradeLevel: string,
  onDate: ISODate,
  unusualAgeYears: number,
): string | null {
  const age = ageOn(birthDate, onDate)
  const usual = usualAgeForGrade(gradeLevel)
  if (age === null || usual === null || Math.abs(age - usual) <= unusualAgeYears) return null
  return `Age ${age} is unusual for ${gradeLevel}. Check the birthdate.`
}
