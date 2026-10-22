import type { ItemLineDraft } from '../components/forms/ItemsGivenField'
import type { Incident, ItemGivenLine, Visit } from '../types/entities'

/** "Paracetamol 500mg × 2 tablets (1 tablet every 6 hours)", from the line's own snapshot. */
export function formatItemGiven(line: Pick<ItemGivenLine, 'itemName' | 'quantity' | 'unit' | 'instructions'>): string {
  return `${line.itemName} × ${line.quantity} ${line.unit}${line.instructions ? ` (${line.instructions})` : ''}`
}

/** One line of care for a visit in a history list: the treatment notes, then what was given. Both are optional. */
export function visitCareSummary(visit: Pick<Visit, 'treatment' | 'itemsGiven'>): string {
  const given = visit.itemsGiven.map(formatItemGiven).join('; ')
  return [visit.treatment.trim(), given && `Given: ${given}`].filter(Boolean).join(' · ') || 'No treatment recorded'
}

/** One line of incident care: treatment notes followed by any medicines or supplies given. */
export function incidentCareSummary(incident: Pick<Incident, 'vitals' | 'itemsGiven'>): string {
  const notes = String(incident.vitals.treatmentNotes ?? '').trim()
  const given = incident.itemsGiven.map(formatItemGiven).join('; ')
  return [notes, given && `Given: ${given}`].filter(Boolean).join(' · ') || 'No treatment recorded'
}

/** Only presence matters, so a draft's lines count the same as saved ones. */
type IncidentCare = Pick<Incident, 'vitals' | 'noFurtherActionReason'> & {
  itemsGiven: ReadonlyArray<unknown>
  parentNotifications: ReadonlyArray<unknown>
  hospitalReferral: unknown
}

/**
 * Why an incident can't be completed or approved yet (panel review IN-3), or null when it can. It
 * needs one of: treatment notes, a medicine line, a parent notification attempt, a hospital
 * referral, or a "Nothing further was needed or done" reason. No reading is required.
 */
export function incidentCompletionBlocker(incident: IncidentCare): string | null {
  const done =
    String(incident.vitals.treatmentNotes ?? '').trim() ||
    incident.itemsGiven.length ||
    incident.parentNotifications.length ||
    incident.hospitalReferral ||
    incident.noFurtherActionReason?.trim()
  return done
    ? null
    : 'Add treatment notes, a medicine, a parent notification or a hospital referral, or tick "Nothing further was needed or done" with a reason.'
}

/** Names shorter than this are ignored by `itemsNamedInNotes`, so "ORS" or "Ice" can't match by accident. */
const MIN_NAME_LENGTH = 4

/**
 * Stocked items whose name appears in typed treatment notes (panel review VS-4), so the form can
 * suggest adding them as lines. Case-insensitive, whole words, matched on the name without its
 * strength ("Paracetamol 500mg" matches "paracetamol"). Items already on a line, and expired or
 * out-of-stock items, are skipped. A hint only; it never blocks saving (ADR-018).
 */
export function itemsNamedInNotes<T extends { id: string; name: string; currentStock: number; flags: ReadonlyArray<string> }>(
  notes: string,
  items: ReadonlyArray<T>,
  onLines: ReadonlyArray<{ itemId: string }>,
): T[] {
  const text = notes.toLowerCase()
  if (!text.trim()) return []
  const taken = new Set(onLines.map((line) => line.itemId))
  return items.filter((item) => {
    if (taken.has(item.id) || item.currentStock < 1 || item.flags.includes('expired')) return false
    const name = item.name.replace(/\s+\S*\d\S*$/, '').trim().toLowerCase()
    if (name.length < MIN_NAME_LENGTH) return false
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(text)
  })
}

/** Editable drafts from a saved record's lines, for an edit form. */
export function draftsFrom(lines: ReadonlyArray<ItemGivenLine>): ItemLineDraft[] {
  return lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity, instructions: line.instructions ?? '' }))
}
