import type { RefObject } from 'react'
import { ExpandableSection, Input, Textarea, VitalsWarning } from '../../components'
import type { VitalsWarningRanges } from '../../lib/mock-db'
import { filledLogbookCount, type LogbookErrors, type LogbookValues } from './logbookValues'

/**
 * The visit's optional logbook fields (body temperature, time out, assisted by, parent/guardian,
 * remarks) in a collapsed "Show more fields" section under the fields filled on every visit. Which
 * fields go here is a first guess to confirm with the clinician; moving one out is a one-line change.
 */
export function LogbookFields({
  values,
  onChange,
  errors,
  open,
  onOpenChange,
  ranges,
  timeOutRef,
}: {
  values: LogbookValues
  onChange: (next: LogbookValues) => void
  errors: LogbookErrors
  open: boolean
  onOpenChange: (open: boolean) => void
  ranges: VitalsWarningRanges
  timeOutRef: RefObject<HTMLInputElement | null>
}) {
  const set = (field: keyof LogbookValues, value: string) => onChange({ ...values, [field]: value })
  return (
    <ExpandableSection open={open} onOpenChange={onOpenChange} filledCount={filledLogbookCount(values)}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            type="number"
            step="0.1"
            inputMode="decimal"
            label="Body temperature (°C)"
            hint="Optional. Leave blank if not taken."
            value={values.temperatureC}
            onChange={(event) => set('temperatureC', event.target.value)}
          />
          <Input
            ref={timeOutRef}
            type="time"
            label="Time out"
            hint="When the student left the clinic."
            value={values.timeOut}
            onChange={(event) => set('timeOut', event.target.value)}
            error={errors.timeOut}
          />
        </div>
        <VitalsWarning readings={{ temperatureC: values.temperatureC }} ranges={ranges} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Assisted by"
            hint="Name of whoever helped, even without an account."
            value={values.assistedBy}
            onChange={(event) => set('assistedBy', event.target.value)}
          />
          <Input
            label="Parent or guardian"
            value={values.parentGuardian}
            onChange={(event) => set('parentGuardian', event.target.value)}
          />
        </div>
        <Textarea label="Remarks" rows={3} value={values.remarks} onChange={(value) => set('remarks', value)} />
      </div>
    </ExpandableSection>
  )
}
