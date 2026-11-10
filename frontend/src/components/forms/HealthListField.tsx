import type { StarterEntry } from '../../config/healthStarterList'
import { isNoneRecorded, NONE_RECORDED } from '../../lib/patients'
import { Combobox } from '../ui/Combobox'

interface Suggestion {
  key: string
  /** The whole field once this is picked. */
  full: string
  name: string
  aliases: string[]
}

const known = (list: StarterEntry[], word: string) => {
  const typed = word.toLowerCase()
  return list.some((entry) => entry.name.toLowerCase() === typed || entry.aliases.includes(typed))
}

/**
 * Allergies or medical conditions as a comma-separated list, with type-ahead from the starter list
 * (review round 2, R16; `config/healthStarterList.ts`). Typing the first letters of the current entry,
 * in English or Filipino, lists the matches; picking one stores its English name. Anything typed by
 * hand stays, and is named under the field so it can be checked. The stored shape is unchanged.
 */
export function HealthListField({
  label,
  list,
  value,
  error,
  onValueChange,
}: {
  label: string
  list: StarterEntry[]
  value: string
  error?: string
  onValueChange: (value: string) => void
}) {
  const cut = value.lastIndexOf(',') + 1
  const before = value.slice(0, cut)
  const current = value.slice(cut).trim().toLowerCase()
  const suggestions: Suggestion[] = []
  // An empty field offers None recorded (ADR-051).
  if (
    !before.trim() &&
    NONE_RECORDED.toLowerCase().startsWith(current) &&
    current !== NONE_RECORDED.toLowerCase()
  )
    suggestions.push({ key: NONE_RECORDED, full: NONE_RECORDED, name: NONE_RECORDED, aliases: [] })
  if (current)
    for (const entry of list)
      if (
        [entry.name, ...entry.aliases].some((word) => word.toLowerCase().startsWith(current)) &&
        entry.name.toLowerCase() !== current
      )
        suggestions.push({
          key: entry.name,
          full: before ? `${before} ${entry.name}, ` : `${entry.name}, `,
          name: entry.name,
          aliases: entry.aliases,
        })

  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry && !isNoneRecorded(entry))
  // The entry still being typed is not flagged while it could become a starter entry.
  const stillTyping = (entry: string, index: number) =>
    index === entries.length - 1 &&
    !value.trimEnd().endsWith(',') &&
    list.some((item) =>
      [item.name, ...item.aliases].some((word) =>
        word.toLowerCase().startsWith(entry.toLowerCase()),
      ),
    )
  const byHand = entries.filter((entry, index) => !known(list, entry) && !stillTyping(entry, index))

  return (
    <div className="flex flex-col gap-1">
      <Combobox<Suggestion>
        label={label}
        placeholder={NONE_RECORDED}
        hint="Pick from the list or type your own, separated by commas."
        value={value}
        options={suggestions}
        optionKey={(option) => option.key}
        optionLabel={(option) => option.full}
        renderOption={(option) => (
          <span>
            {option.name}
            {option.aliases.length > 0 && (
              <span className="ml-2 text-text-secondary">{option.aliases.join(', ')}</span>
            )}
          </span>
        )}
        allowFreeText
        noMatchesText={null}
        error={error}
        onValueChange={onValueChange}
      />
      {byHand.length > 0 && (
        <p className="text-xs text-text-secondary">
          Typed by hand, not on the starter list: {byHand.join(', ')}
        </p>
      )}
    </div>
  )
}
