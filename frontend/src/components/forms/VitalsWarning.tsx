import type { VitalsWarningRanges } from '../../lib/mock-db'
import { feverNote, unusualReadings, type TypedReadings } from '../../lib/vitals'
import { Icon } from '../icons/Icon'

/**
 * The non-blocking reading notes (`lib/vitals.ts`): the fever flag, and "looks unusual" for a likely
 * typing slip. Renders nothing when there is neither; never blocks a save.
 */
export function VitalsWarning({ readings, ranges }: { readings: TypedReadings; ranges: VitalsWarningRanges }) {
  const fever = feverNote(readings.temperatureC, ranges)
  const unusual = unusualReadings(readings, ranges)
  if (!fever && !unusual.length) return null
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-md border border-warning bg-warning/10 px-3 py-2 text-sm text-text-primary"
    >
      <Icon name="alertTriangle" className="mt-0.5 shrink-0 text-warning" />
      <p>
        {[fever, unusual.length ? `${unusual.join(' ')} Please check the reading.` : null].filter(Boolean).join(' ')} You
        can still save.
      </p>
    </div>
  )
}
