import type { ChangeEvent } from 'react'
import { DatePicker, Input } from '../../components'
import { formatDateRange } from '../../lib/dates'
import type { ExcusedPeriod } from '../../lib/mock-db'
import type { Disposition } from '../../types/entities'
import { hasExcuseLetter, type DispositionErrors, type DispositionValues } from './dispositionValues'
import { ExcusedPeriodPresets } from './ExcusedPeriodPresets'

/**
 * Progressive disclosure under Disposition: nothing for Returned to class; the excuse-letter
 * section for Sent home; that section plus "Referred to" for Referred to hospital. When the
 * visit's letter is already approved, its fixed period replaces the draft fields. A staff patient
 * gets no excuse letter (ADR-043, D13): only "Referred to" can show.
 */
export function DispositionFields({
  disposition,
  values,
  onChange,
  errors,
  approvedPeriod,
  noLetter = false,
}: {
  disposition: Disposition
  values: DispositionValues
  onChange: (next: DispositionValues) => void
  errors: DispositionErrors
  /** Set when the visit already has an approved letter. */
  approvedPeriod?: ExcusedPeriod | null
  /** A staff patient: no excuse-letter section (D13). Pass `prepareLetter: false` in the values too. */
  noLetter?: boolean
}) {
  const set = <K extends keyof DispositionValues>(field: K, value: DispositionValues[K]) =>
    onChange({ ...values, [field]: value })

  if (approvedPeriod) {
    return (
      <div className="flex flex-col gap-4">
        {disposition === 'referred_to_hospital' && (
          <ReferredToField value={values.referredTo} onChange={(value) => set('referredTo', value)} />
        )}
        <p role="note" className="rounded-md border border-info/40 bg-info/10 px-3 py-2 text-sm text-text-primary">
          An approved excuse letter exists for this visit (
          {formatDateRange(approvedPeriod.excusedFrom, approvedPeriod.excusedUntil)}). This edit doesn't change or
          remove it, whatever the disposition.
        </p>
      </div>
    )
  }

  if (noLetter)
    return disposition === 'referred_to_hospital' ? <ReferredToField value={values.referredTo} onChange={(value) => set('referredTo', value)} /> : null

  if (!hasExcuseLetter(disposition)) return null

  return (
    <div className="flex flex-col gap-4">
      {disposition === 'referred_to_hospital' && (
        <ReferredToField value={values.referredTo} onChange={(value) => set('referredTo', value)} />
      )}
      <fieldset className="rounded-md border border-border p-4">
        <legend className="px-1 text-sm font-semibold text-text-primary">Excuse letter</legend>
        <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface motion-reduce:transition-none">
          <input
            type="checkbox"
            checked={values.prepareLetter}
            onChange={(event: ChangeEvent<HTMLInputElement>) => set('prepareLetter', event.target.checked)}
            className="mt-0.5 size-4 cursor-pointer accent-brand-green-dark"
          />
          <span>
            <span className="block text-sm font-semibold text-text-primary">Prepare an excuse letter</span>
            <span className="block text-xs text-text-secondary">
              Saved with the visit as a draft. Staff reviews and approves it on the excuse letter page.
            </span>
          </span>
        </label>
        {values.prepareLetter && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DatePicker
              label="Excused from"
              required
              value={values.excusedFrom}
              onChange={(value) => set('excusedFrom', value)}
            />
            <DatePicker
              label="Excused until"
              required
              value={values.excusedUntil}
              min={values.excusedFrom || undefined}
              onChange={(value) => set('excusedUntil', value)}
              error={errors.excusedUntil}
            />
            <div className="sm:col-span-2">
              <ExcusedPeriodPresets from={values.excusedFrom} onPick={(until) => set('excusedUntil', until)} />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Note for the teacher"
                value={values.letterNote}
                placeholder="Optional"
                onChange={(event) => set('letterNote', event.target.value)}
              />
            </div>
          </div>
        )}
      </fieldset>
    </div>
  )
}

function ReferredToField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Input
      label="Referred to (hospital or clinic)"
      value={value}
      placeholder="Optional"
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
