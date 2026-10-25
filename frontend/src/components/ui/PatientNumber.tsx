import { PATIENT_KIND_LABELS, type PatientNumber as PatientNumberValue } from '../../lib/patients'
import { Badge } from './Badge'
import { MaskedLrn } from './MaskedLrn'

/**
 * The patient on a multi-person list (ADR-043, D11): the masked LRN for a student or the Staff No.
 * for a staff member, never the name (ADR-004), with a small Student or Staff chip.
 */
export function PatientNumber({ patient, chip = true }: { patient: PatientNumberValue; chip?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {patient.kind === 'student' ? (
        <MaskedLrn lrn={patient.number} />
      ) : (
        <span className="tabular-nums">
          <span className="sr-only">Staff No. </span>
          {patient.number}
        </span>
      )}
      {chip && (
        <Badge tone="neutral" variant="outline" icon={null}>
          {PATIENT_KIND_LABELS[patient.kind]}
        </Badge>
      )}
    </span>
  )
}
