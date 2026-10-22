import { Button, Icon, type ItemLineDraft } from '../../components'
import { itemsNamedInNotes } from '../../lib/itemsGiven'
import type { InventoryItemView } from '../../lib/mock-db'

/**
 * Under Treatment notes (panel review VS-4): when the notes name a stocked item that isn't on a line,
 * suggest adding it so stock stays correct. Never blocks saving (ADR-018).
 */
export function MedicineInNotesHint({
  notes,
  items,
  lines,
  onAdd,
}: {
  notes: string
  items: InventoryItemView[]
  lines: ItemLineDraft[]
  onAdd: (line: ItemLineDraft) => void
}) {
  const named = itemsNamedInNotes(notes, items, lines)
  if (!named.length) return null
  return (
    <ul className="flex flex-col gap-2" aria-label="Medicines named in the treatment notes">
      {named.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning bg-warning/10 px-3 py-2 text-sm text-text-primary"
        >
          <span className="flex min-w-0 items-start gap-2">
            <Icon name="alertTriangle" size={16} className="mt-0.5 shrink-0 text-warning" />
            <span>
              This looks like {item.name}. Add it under Medicines &amp; supplies given so stock stays correct.
            </span>
          </span>
          <Button size="sm" onClick={() => onAdd({ itemId: item.id, quantity: 1, instructions: '' })}>
            Add {item.name}
          </Button>
        </li>
      ))}
    </ul>
  )
}
