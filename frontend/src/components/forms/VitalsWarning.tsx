import type { AgeGroup, VitalsWarningRanges } from '../../lib/mock-db'
import { feverNote, unusualReadings, usualRangeNotes, type TypedReadings } from '../../lib/vitals'
import { Icon } from '../icons/Icon'

/**
 * The non-blocking reading notes (`lib/vitals.ts`): the fever flag, "looks unusual" for a likely
 * typing slip, and "outside the usual range for this age" (ADR-051) once the patient's age group is
 * known. Renders nothing when there is none; never blocks a save.
 */
export function VitalsWarning({ readings, ranges, ageGroup = null }: { readings: TypedReadings; ranges: VitalsWarningRanges; ageGroup?: AgeGroup | null }) {
  const fever = feverNote(readings.temperatureC, ranges)
  const unusual = unusualReadings(readings, ranges)
  const usual = usualRangeNotes(readings, ranges, ageGroup)
  if (!fever && !unusual.length && !usual.length) return null
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-md border border-warning bg-warning/10 px-3 py-2 text-sm text-text-primary"
    >
      <Icon name="alertTriangle" className="mt-0.5 shrink-0 text-warning" />
      <p>
        {[
          fever,
          unusual.length ? `${unusual.join(' ')} Please check the reading.` : null,
          usual.length ? `Outside the usual range for this age (starting range, nurse to confirm): ${usual.join('; ')}.` : null,
        ]
          .filter(Boolean)
          .join(' ')}{' '}
        You can still save.
      </p>
    </div>
  )
}
