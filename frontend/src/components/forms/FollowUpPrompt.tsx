import type { ISODate } from '../../types/entities'
import { DatePicker } from '../ui/DatePicker'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'

export interface FollowUpDraft {
  needed: boolean
  followUpDate: ISODate
  reason: string
  notes: string
}

export interface FollowUpErrors {
  followUpDate?: string
  reason?: string
}

/**
 * Screen Inventory #18b: the inline "Does this student need a follow-up?" prompt at the end of New
 * Visit Entry (#11) and Incident Entry (#16). One component, so both flows capture the same fields
 * (date, reason/instruction, optional notes) with the same validation.
 */
export function FollowUpPrompt({
  subject,
  draft,
  onChange,
  errors = {},
  minDate,
}: {
  /** Checkbox wording: "This student needs…" (visit) vs "This incident needs…". */
  subject: 'student' | 'incident'
  draft: FollowUpDraft
  onChange: (next: FollowUpDraft) => void
  errors?: FollowUpErrors
  minDate: ISODate
}) {
  const set = <K extends keyof FollowUpDraft>(field: K, value: FollowUpDraft[K]) =>
    onChange({ ...draft, [field]: value })
  const related = subject === 'student' ? 'visit' : 'incident'
  return (
    <fieldset className="rounded-md border border-border p-4">
      <legend className="px-1 text-sm font-semibold text-text-primary">Follow-up prompt</legend>
      <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface motion-reduce:transition-none">
        <input
          type="checkbox"
          checked={draft.needed}
          onChange={(event) => set('needed', event.target.checked)}
          className="mt-0.5 size-4 cursor-pointer accent-brand-green-dark"
        />
        <span>
          <span className="block text-sm font-semibold text-text-primary">
            This {subject} needs a follow-up
          </span>
          <span className="block text-xs text-text-secondary">
            Creates a pending follow-up connected to this {related}.
          </span>
        </span>
      </label>
      {draft.needed && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DatePicker
            label="Follow-up date"
            value={draft.followUpDate}
            min={minDate}
            required
            onChange={(next) => set('followUpDate', next)}
            error={errors.followUpDate}
          />
          <Input
            label="Reason"
            value={draft.reason}
            required
            onChange={(event) => set('reason', event.target.value)}
            error={errors.reason}
          />
          <Textarea
            label="Notes"
            value={draft.notes}
            onChange={(value) => set('notes', value)}
            rows={3}
            className="sm:col-span-2"
          />
        </div>
      )}
    </fieldset>
  )
}
