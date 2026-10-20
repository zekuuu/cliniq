import type { VitalRange, VitalsWarningRanges } from './mock-db'
import { formatDecimal } from './numbers'

/** Readings as typed into a form; a blank or missing one is simply not checked. */
export interface TypedReadings {
  temperatureC?: string
  pulseBpm?: string
  oxygenSaturationPct?: string
}

/**
 * Readings outside the configured ranges, as "please check" notes. A warning only, never a reason to
 * block a save: the ranges are placeholder sanity bounds until the clinician sets real ones. A
 * reading whose range is `null` (the oximeter, for now) gets no warning.
 */
export function unusualReadings(readings: TypedReadings, ranges: VitalsWarningRanges): string[] {
  const outside = (value: string | undefined, range: VitalRange | null) =>
    range !== null &&
    value !== undefined &&
    value.trim() !== '' &&
    Number.isFinite(Number(value)) &&
    (Number(value) < range.min || Number(value) > range.max)
  const notes: string[] = []
  if (outside(readings.temperatureC, ranges.temperatureC))
    notes.push(`Temperature ${formatDecimal(readings.temperatureC ?? '')} °C looks unusual.`)
  if (outside(readings.pulseBpm, ranges.pulseBpm)) notes.push(`Pulse ${formatDecimal(readings.pulseBpm ?? '')} bpm looks unusual.`)
  if (outside(readings.oxygenSaturationPct, ranges.oxygenSaturationPct))
    notes.push(`Oxygen saturation ${formatDecimal(readings.oxygenSaturationPct ?? '')}% looks unusual.`)
  return notes
}

/**
 * The fever flag: a plausible temperature at or above `ranges.feverFromC` (37 °C, the team's rule of
 * Tuesday, October 20, 2026; the clinician to confirm). A reading the sanity check already calls
 * unusual (a typing slip such as 370) gets that note instead, never both.
 */
export function feverNote(temperatureC: string | undefined, ranges: VitalsWarningRanges): string | null {
  const value = temperatureC?.trim() ?? ''
  const reading = Number(value)
  if (value === '' || !Number.isFinite(reading) || reading < ranges.feverFromC) return null
  if (unusualReadings({ temperatureC: value }, ranges).length) return null
  return `Fever: ${formatDecimal(value)} °C (${formatDecimal(ranges.feverFromC)} °C and up).`
}

/** The incident's four optional readings, in form and display order ("take what the case needs"). */
export const READING_KEYS = ['temperatureC', 'pulseBpm', 'bloodPressure', 'oxygenSaturationPct'] as const
export type ReadingKey = (typeof READING_KEYS)[number]
export type ReadingValues = Record<ReadingKey, string>

/** Readable labels for the provisional `vitals` keys; unknown keys fall back to the key itself. */
export const READING_LABELS: Record<string, { label: string; unit?: string }> = {
  temperatureC: { label: 'Temperature', unit: '°C' },
  pulseBpm: { label: 'Pulse', unit: 'bpm' },
  bloodPressure: { label: 'Blood pressure', unit: 'mmHg' },
  oxygenSaturationPct: { label: 'Oxygen saturation', unit: '%' },
  // Records saved before the oximeter became a whole percent held free text such as "98%".
  oxygenSaturation: { label: 'Oxygen saturation' },
}

/** The readings typed into a form, as the record stores them: blanks left out, blood pressure kept as text. */
export function storedReadings(values: ReadingValues): Record<string, string | number> {
  const stored: Record<string, string | number> = {}
  for (const key of READING_KEYS) {
    const value = values[key].trim()
    if (value) stored[key] = key === 'bloodPressure' ? value : Number(value)
  }
  return stored
}

/** The readings a record holds, in display order; Stage 2's treatment notes live in `vitals` but aren't one. */
export function takenReadings(vitals: Record<string, string | number>): Array<[string, string | number]> {
  const order = (key: string) => {
    const index = (READING_KEYS as readonly string[]).indexOf(key)
    return index === -1 ? READING_KEYS.length : index
  }
  return Object.entries(vitals)
    .filter(([key, value]) => key !== 'treatmentNotes' && String(value).trim() !== '')
    .sort(([a], [b]) => order(a) - order(b))
}

/** A reading as shown: the same rounding, with the unit unless the value already has it ("37.2 °C", "98%"). */
export function readingText(key: string, value: string | number): string {
  const unit = READING_LABELS[key]?.unit
  if (!unit || String(value).endsWith(unit)) return formatDecimal(value)
  return `${formatDecimal(value)}${unit === '%' ? '' : ' '}${unit}`
}
