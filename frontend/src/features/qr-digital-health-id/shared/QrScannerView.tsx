import { Button, Card, CardBody, CardHeader, Icon, StudentPicker } from '../../../components'
import type { StudentNumber, StudentSearchResult } from '../../../types/entities'
import { normalizeStudentNumber } from '../../../lib/studentNumber'
import { demoStudentNumber } from '../api/qrLookupApi'
import { useQrScanner } from './useQrScanner'

export interface QrScannerViewProps {
  title: string
  description: string
  onDetected: (studentNumber: StudentNumber) => void
  /** The manual fallback's student search (Student Number or name), from the feature's `api/`. */
  search: (query: string) => Promise<StudentSearchResult[]>
  /** Called when the camera starts, so the host can clear a previous lookup's error message. */
  onScanStart?: () => void
}

/**
 * Shared QR scanner/manual fallback component. Mobile Staff, mobile Instructor, and later desktop
 * scanner flows all use this same wrapper; only their post-scan behavior differs.
 */
export function QrScannerView({ title, description, onDetected, search, onScanStart }: QrScannerViewProps) {
  const { videoRef, status, error, start, stop } = useQrScanner((value) => onDetected(normalizeStudentNumber(value)))

  return (
    <Card aria-labelledby="qr-scanner-title">
      <CardHeader
        titleId="qr-scanner-title"
        title={title}
        description={description}
        icon={<Icon name="qrCode" />}
      />
      <CardBody className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-md border border-border bg-text-primary">
          <video
            ref={videoRef}
            className="aspect-[4/3] w-full bg-text-primary object-cover"
            muted
            playsInline
          />
        </div>
        {error && <p className="text-xs font-semibold text-error">{error}</p>}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="primary"
            icon="qrCode"
            // Reference 4: the scan action is the dominant, thumb-sized control on phones.
            className="max-md:h-14 max-md:text-base"
            loading={status === 'starting'}
            onClick={() => {
              if (status === 'scanning') return stop()
              onScanStart?.()
              return start()
            }}
          >
            {status === 'scanning' ? 'Stop Camera' : 'Scan QR Code'}
          </Button>
          <Button type="button" variant="secondary" onClick={async () => onDetected(await demoStudentNumber())}>
            Use Demo Scan
          </Button>
        </div>
        <StudentPicker
          search={search}
          onSelect={(student) => onDetected(student.studentNumber)}
          label="Enter Student Number or student name (optional)"
          required={false}
          hint="Type a Student Number or the student name, then pick the student."
        />
      </CardBody>
    </Card>
  )
}
