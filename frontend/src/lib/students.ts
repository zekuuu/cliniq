/**
 * The student's own phone is optional for Kinder (panel review ST-3, D8, Zean's answer): a Kinder pupil
 * rarely has one, and requiring it left records "incomplete" or filled with a fake number. Every other
 * grade still needs it; the emergency contacts stay required for everyone.
 */
export function contactInfoRequired(gradeLevel: string): boolean {
  return gradeLevel !== 'Kinder'
}
