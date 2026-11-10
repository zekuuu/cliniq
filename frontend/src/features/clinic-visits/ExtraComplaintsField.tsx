import { useState } from 'react'
import { Button, Icon, Input, Select } from '../../components'
import { cleanComplaint, COMPLAINT_MAX_LENGTH } from '../../lib/complaints'
import { EXTRA_COMPLAINTS_MAX } from '../../lib/mock-db'
import { symptom, symptoms } from '../../lib/labels'

const OTHER_VALUE = '__other__'

/**
 * Up to three more complaints as tags (ADR-053), from the same suggestions as the main complaint, or
 * typed. Optional; the reports count only the main complaint, so one visit still counts once.
 *
 * Laid out like the Complaint field above it (`SelectWithOther`, Zean, November 5, 2026): the dropdown in
 * the first column, so the two line up, with "Other (type your own)" first; the second column holds the
 * Other box (when chosen) and Add. Picking only selects; Add (or Enter in the box) puts it on the visit.
 * The list always shows every suggestion; a duplicate gets a message. Don't wrap it in `FIELD_HALF`.
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
  const [picked, setPicked] = useState('')
  const [typed, setTyped] = useState('')
  const [message, setMessage] = useState('')
  const taken = new Set([main, ...value].map((text) => cleanComplaint(text).toLowerCase()))
  const options = suggestions.slice(0, 8)
  const full = value.length >= EXTRA_COMPLAINTS_MAX
  const otherOpen = picked === OTHER_VALUE
  const pending = otherOpen ? typed : picked

  function add(text: string) {
    const complaint = cleanComplaint(text)
    if (!complaint) return
    if (full) {
      setMessage(`Up to ${EXTRA_COMPLAINTS_MAX} other ${symptoms}. Remove one to add another.`)
      return
    }
    if (taken.has(complaint.toLowerCase())) {
      setMessage(`${complaint} is already on this visit.`)
      return
    }
    onChange([...value, complaint])
    setPicked('')
    setTyped('')
    setMessage('')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label={`Other ${symptoms}`}
          value={picked}
          placeholder={full ? `${EXTRA_COMPLAINTS_MAX} added` : `Select ${symptom} (optional)`}
          disabled={full}
          options={[
            { value: OTHER_VALUE, label: 'Other (type your own)' },
            ...options.map((option) => ({ value: option, label: option })),
          ]}
          onChange={(next) => {
            setPicked(next)
            setMessage('')
          }}
        />
        {/* Bottom-aligned with the dropdown; the hint sits under the whole row so it can't push this down. */}
        <div className="flex items-end gap-2">
          {otherOpen && !full && (
            <Input
              className="min-w-0 flex-1 animate-expand-down motion-reduce:animate-none"
              label={`Specify other ${symptom}`}
              autoFocus
              value={typed}
              maxLength={COMPLAINT_MAX_LENGTH}
              onChange={(event) => {
                setTyped(event.target.value)
                setMessage('')
              }}
              onKeyDown={(event) => {
                // Enter adds the tag here instead of submitting the visit.
                if (event.key === 'Enter') {
                  event.preventDefault()
                  add(typed)
                }
              }}
            />
          )}
          <Button
            variant="secondary"
            disabled={full || !pending.trim()}
            onClick={() => add(pending)}
          >
            Add
          </Button>
        </div>
      </div>
      <p className="-mt-1 text-xs text-text-secondary">
        Up to {EXTRA_COMPLAINTS_MAX}.{full ? ' Remove one to add another.' : ''} Reports count only
        the {symptom} above.
      </p>
      {message && (
        <p role="alert" className="text-xs font-semibold text-error">
          {message}
        </p>
      )}
      {value.length > 0 && (
        <ul aria-label={`Other ${symptoms}`} className="flex flex-wrap gap-2">
          {value.map((complaint) => (
            <li
              key={complaint}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface py-1 pr-1 pl-2 text-sm text-text-primary"
            >
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
