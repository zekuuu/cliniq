import { useMemo, useState, type ReactNode } from 'react'
import { BackButton, Button, Card, CardBody, CardHeader, EmptyState, ErrorState, Icon, PrintDocument, Select, Skeleton } from '../../../components'
import { cn } from '../../../lib/cn'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { paths } from '../../../routes/paths'
import { fetchPrintableStudents } from '../api/qrLookupApi'

function MockQr({ value, className = 'size-48' }: { value: string; className?: string }) {
  const cells = useMemo(() => Array.from({ length: 81 }, (_, index) => ((index * 17 + value.charCodeAt(index % value.length)) % 7) < 3), [value])
  return <svg role="img" aria-label={`QR code for ${value}`} viewBox="0 0 9 9" className={cn(className, 'border-8 border-white bg-white')} shapeRendering="crispEdges">{cells.map((filled, index) => filled && <rect key={index} x={index % 9} y={Math.floor(index / 9)} width="1" height="1" fill="currentColor" />)}<rect x="0" y="0" width="3" height="3" fill="none" stroke="currentColor" strokeWidth=".35" /><rect x="6" y="0" width="3" height="3" fill="none" stroke="currentColor" strokeWidth=".35" /><rect x="0" y="6" width="3" height="3" fill="none" stroke="currentColor" strokeWidth=".35" /></svg>
}

function PrintSkeleton({ back }: { back: ReactNode }) {
  return <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">{back}<div aria-hidden="true" className="flex flex-col gap-4"><Card className="p-5"><Skeleton className="h-7 w-56" /><Skeleton className="mt-2 h-4 w-72 max-w-full" /></Card><Card className="p-5"><div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center"><Skeleton className="size-48" /><div><Skeleton className="h-3 w-40" /><Skeleton className="mt-3 h-7 w-44" /><Skeleton className="mt-2 h-4 w-56" /></div></div><Skeleton className="mt-6 h-12 w-80 max-w-full" /></Card></div></div>
}

/**
 * The sticker on A4 (ADR-026): one sticker in a dashed cut box, top left, with the QR and the Student
 * Number as readable text. No footer, since the sheet is cut up; nothing else from the screen prints.
 */
function QrStickerPrint({ studentNumber }: { studentNumber: string }) {
  return (
    <PrintDocument
      title="QR Health ID Sticker"
      footer={false}
      scope={`One sticker for Student Number ${studentNumber}. The QR encodes the Student Number only. Cut along the dashed line.`}
    >
      <div className="flex w-[80mm] break-inside-avoid items-center gap-[4mm] border border-dashed border-text-secondary p-[4mm]">
        <MockQr value={studentNumber} className="size-[32mm] shrink-0" />
        <div className="min-w-0">
          <p className="text-[8pt] font-semibold uppercase">Mendez Christian Academy</p>
          <p className="mt-[1.5mm] text-[15pt] leading-tight font-bold">{studentNumber}</p>
          <p className="mt-[1mm] text-[8pt]">School Clinic Health ID</p>
        </div>
      </div>
    </PrintDocument>
  )
}

export function QrPrintPage() {
  const { data: students, status, reload } = useAsyncData('qr-print-students', fetchPrintableStudents)
  const [chosen, setChosen] = useState('')
  const back = <BackButton fallback={paths.students} />
  if (status === 'error') return <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">{back}<ErrorState title="Unable to load students." onRetry={reload} /></div>
  if (!students) return <><p className="sr-only" role="status">Loading QR print view...</p><PrintSkeleton back={back} /></>
  if (!students.length) return <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">{back}<EmptyState icon="qrCode" title="No active students" description="Add a student record before printing a QR sticker." /></div>
  const student = students.find((candidate) => candidate.studentNumber === chosen) ?? students[0]
  return <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">{back}<Card className="p-5 print:hidden"><h1 className="text-2xl font-bold tracking-tight text-text-primary">Print QR Health IDs</h1><p className="mt-1 text-sm text-text-secondary">Print a Student Number QR sticker for Staff use.</p></Card><Card className="print:border print:shadow-none"><CardHeader title="Student QR sticker" description="The QR encodes the Student Number only." icon={<Icon name="qrCode" />} actions={<Button variant="secondary" icon="printer" className="print:hidden" onClick={() => window.print()}>Print Sticker</Button>} /><CardBody><div className="grid gap-6 rounded-md border-2 border-brand-green-dark p-6 sm:grid-cols-[auto_1fr] sm:items-center"><MockQr value={student.studentNumber} /><div><p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Mendez Christian Academy</p><p className="mt-2 text-2xl font-bold tracking-tight text-text-primary">{student.studentNumber}</p><p className="mt-1 text-sm text-text-secondary">Scan to identify this student in CLINIQ.</p></div></div><div className="mt-6 max-w-sm print:hidden"><Select label="Preview student" value={student.studentNumber} options={students.map((item) => ({ value: item.studentNumber, label: `${item.studentNumber} — ${item.fullName}` }))} onChange={setChosen} /></div></CardBody></Card><QrStickerPrint studentNumber={student.studentNumber} /></div>
}
