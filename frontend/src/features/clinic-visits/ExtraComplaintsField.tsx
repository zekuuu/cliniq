import { useState } from 'react'
import { Button, Combobox, Icon } from '../../components'
import { cleanComplaint, COMPLAINT_MAX_LENGTH } from '../../lib/complaints'
import { EXTRA_COMPLAINTS_MAX } from '../../lib/mock-db'

/**
 * Up to three more complaints as tags (ADR-053), from the same suggestions as the main complaint, or
 * typed. Optional; the reports count only the main complaint, so one visit still counts once.
 */
export function ExtraComplaintsField({
  value,
  onChange,
  main,
  suggestions,
}: {
  value: string[]
  onChange: (next: string[]) => void
  main: string
  suggestions: string[]
}) {
  const [typed, setTyped] = useState('')
  const [message, setMessage] = useState('')
  const taken = new Set([main, ...value].map((text) => cleanComplaint(text).toLowerCase()))
  const search = typed.trim().toLowerCase()
  const options = suggestions.filter((option) => !taken.has(option.toLowerCase()) && option.toLowerCase().includes(search)).slice(0, 8)

  function add(text: string) {
    const complaint = cleanComplaint(text)
    if (!complaint) return
    if (value.length >= EXTRA_COMPLAINTS_MAX) {
      setMessage(`Up to ${EXTRA_COMPLAINTS_MAX} extra complaints. Remove one to add another.`)
      return
    }
    if (taken.has(complaint.toLowerCase())) {
      setMessage(`${complaint} is already on this visit.`)
      return
    }
    onChange([...value, complaint])
    setTyped('')
    setMessage('')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <Combobox
          className="min-w-0 flex-1"
          label="Other complaints (optional)"
          value={typed}
          onValueChange={(text) => {
            setTyped(text)
            setMessage('')
          }}
          options={options}
          optionKey={(option) => option}
          optionLabel={(option) => option}
          onPick={(option) => {
            add(option)
            return true
          }}
          allowFreeText
          noMatchesText={null}
          maxLength={COMPLAINT_MAX_LENGTH}
        />
        <Button variant="secondary" disabled={!typed.trim()} onClick={() => add(typed)}>
          Add
        </Button>
      </div>
      <p className="-mt-1 text-xs text-text-secondary">Up to {EXTRA_COMPLAINTS_MAX}. Reports count the main complaint only.</p>
      {message && (
        <p role="alert" className="text-xs font-semibold text-error">
          {message}
        </p>
      )}
      {value.length > 0 && (
        <ul aria-label="Other complaints" className="flex flex-wrap gap-2">
          {value.map((complaint) => (
            <li key={complaint} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface py-1 pr-1 pl-2 text-sm text-text-primary">
              {complaint}
              <button
                type="button"
                aria-label={`Remove ${complaint}`}
                onClick={() => {
                  onChange(value.filter((item) => item !== complaint))
                  setMessage('')
                }}
                className="inline-flex cursor-pointer rounded-sm p-0.5 text-text-secondary transition-colors hover:text-brand-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green motion-reduce:transition-none"
              >
                <Icon name="xCircle" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
