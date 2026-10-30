import { Icon } from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { medicalCertificateWarning, type LetterPeriod } from '../../lib/excuseLetter'
import { getMedicalCertificateAfterDays } from '../../lib/mock-db'

/** Next to an excused period: a warning, never a block, when it runs past `config.medicalCertificateAfterDays` (ADR-049, D2). */
export function CertificateWarning({ period }: { period: LetterPeriod }) {
  const limit = useAsyncData('medical-certificate-limit', getMedicalCertificateAfterDays)
  const warning = limit.data === undefined ? null : medicalCertificateWarning(period, limit.data)
  if (!warning) return null
  return (
    <p role="note" className="flex items-start gap-2 rounded-md border border-warning bg-warning/10 px-3 py-2 text-sm text-text-primary">
      <Icon name="alertTriangle" size={16} className="mt-0.5 shrink-0 text-warning" />
      {warning}
    </p>
  )
}
