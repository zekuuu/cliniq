import type { PatientFilter } from '../../lib/patients'
import { Select } from '../ui/Select'

const OPTIONS: Array<{ value: PatientFilter; label: string }> = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'students', label: 'Students' },
  { value: 'staff', label: 'Staff' },
]

export function PatientFilterSelect({
  value,
  onChange,
  className = 'w-40',
}: {
  value: PatientFilter
  onChange: (next: PatientFilter) => void
  className?: string
}) {
  return <Select label="Patient" value={value} options={OPTIONS} onChange={(next) => onChange(next as PatientFilter)} className={className} />
}
