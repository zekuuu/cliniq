import { Input } from '../ui/Input'

/**
 * "Stay home until cleared" (ADR-049, D5): an optional tick and a one-line note the clinician sets on
 * a follow-up or an excuse letter. No list of conditions; she decides from the complaint.
 */
export function StayHomeField({
  checked,
  note,
  onChange,
  disabled = false,
}: {
  checked: boolean
  note: string
  onChange: (next: { checked: boolean; note: string }) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface motion-reduce:transition-none has-disabled:cursor-not-allowed">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange({ checked: event.target.checked, note })}
          className="mt-0.5 size-4 cursor-pointer accent-brand-green-dark disabled:cursor-not-allowed"
        />
        <span className="text-sm font-semibold text-text-primary">Stay home until cleared</span>
      </label>
      {checked && (
        <Input
          label="Stay-home note"
          value={note}
          maxLength={120}
          placeholder="Optional"
          disabled={disabled}
          onChange={(event) => onChange({ checked, note: event.target.value })}
        />
      )}
    </div>
  )
}
