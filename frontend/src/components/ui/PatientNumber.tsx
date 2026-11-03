import { PATIENT_KIND_LABELS, type PatientKind, type PatientNumber as PatientNumberValue } from '../../lib/patients'
import { Badge } from './Badge'
import { MaskedLrn } from './MaskedLrn'

/** Student outlined, Staff filled grey, so the two tell apart at a glance (review round 2, R22). */
export function PatientKindBadge({ kind }: { kind: PatientKind }) {
  return (
    <Badge tone="neutral" variant={kind === 'personnel' ? 'soft' : 'outline'} icon={null}>
      {PATIENT_KIND_LABELS[kind]}
    </Badge>
  )
}

/**
 * The patient on a multi-person list (ADR-043, D11): the masked LRN for a student or the Staff No.
 * for a staff member, never the name (ADR-004), with a small Student or Staff chip.
 */
export function PatientNumber({ patient, chip = true }: { patient: PatientNumberValue; chip?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {patient.kind === 'student' ? (
        <MaskedLrn lrn={patient.number} />
      ) : (
        <span className="tabular-nums">
          <span className="sr-only">Staff No. </span>
          {patient.number}
        </span>
      )}
      {chip && <PatientKindBadge kind={patient.kind} />}
    </span>
  )
}
