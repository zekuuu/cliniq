import { Button } from '../../components'
import { addDays } from '../../lib/dates'

const PRESETS = [
  { label: 'Today only', days: 0 },
  { label: '+1 day', days: 1 },
  { label: '+2 days', days: 2 },
] as const

/**
 * Quick "Excused until" values counted from "Excused from" (panel review EX-1). Nothing is picked by
 * default and both dates stay editable.
 */
export function ExcusedPeriodPresets({
  from,
  onPick,
  disabled = false,
}: {
  from: string
  onPick: (until: string) => void
  disabled?: boolean
}) {
  return (
    <div role="group" aria-label="Quick excused periods" className="flex flex-wrap gap-2">
      {PRESETS.map((preset) => (
        <Button key={preset.label} size="sm" variant="neutral" disabled={disabled || !from} onClick={() => onPick(addDays(from, preset.days))}>
          {preset.label}
        </Button>
      ))}
    </div>
  )
}
