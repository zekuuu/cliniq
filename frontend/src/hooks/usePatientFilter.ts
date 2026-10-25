import { useSearchParams } from 'react-router'
import type { PatientFilter } from '../lib/patients'

/**
 * The Everyone / Students / Staff filter (ADR-043, D11), kept in the address as `?patient=`, so a
 * reload or a shared link keeps it. Everyone is the default and leaves the address clean.
 */
export function usePatientFilter(): [PatientFilter, (next: PatientFilter) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('patient')
  const filter: PatientFilter = raw === 'students' || raw === 'staff' ? raw : 'everyone'
  const setFilter = (next: PatientFilter) =>
    setParams(
      (current) => {
        const updated = new URLSearchParams(current)
        if (next === 'everyone') updated.delete('patient')
        else updated.set('patient', next)
        return updated
      },
      { replace: true },
    )
  return [filter, setFilter]
}
