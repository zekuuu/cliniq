import { useState, type ReactNode } from 'react'
import {
  BackButton,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DatePicker,
  ErrorState,
  Icon,
  Input,
  Skeleton,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { paths } from '../../routes/paths'
import { formatDate, formatDateRange, formatDateTime } from '../../lib/dates'
import { getMockSessionUser, type SessionUser } from '../../lib/mock-db'
import {
  approveExcuseLetter,
  excusedPeriodError,
  fetchExcuseLetterContext,
  type ExcuseLetterContext,
  type ExcusedPeriod,
} from './api/excuseLetterApi'

function LetterSkeleton({ back }: { back: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Card className="p-5">
          <Skeleton className="h-7 w-72 max-w-full" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </Card>
        <div className="grid grid-cols-1 gap-4">
          <Card className="p-5">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-4 h-10 w-full" />
            <Skeleton className="mt-3 h-32 w-full" />
          </Card>
          <Card className="p-5">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="mt-5 h-60 w-full" />
          </Card>
        </div>
      </div>
    </div>
  )
}

function PrintableLetter({
  context,
  recipient,
  body,
  period,
  note,
  approved,
}: {
  context: ExcuseLetterContext
  recipient: string
  body: string
  period: ExcusedPeriod
  note: string
  approved: boolean
}) {
  const periodValid = !excusedPeriodError(period)
  return (
    <article className="rounded-md border border-border bg-background p-6 text-text-primary print:border-0 print:p-0">
      <div className="border-b border-border pb-4 text-center print:pb-3">
        <p className="text-xs font-semibold tracking-wide text-brand-green-dark uppercase">
          Mendez Christian Academy Clinic
        </p>
        <h2 className="mt-1 text-xl font-bold">Clinic Excuse Letter</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Not a medical certificate. Hospital-issued certificates are outside CLINIQ scope.
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4 text-sm leading-6">
        <p>{formatDate(context.issuedAt.slice(0, 10))}</p>
        <p>To: {recipient}</p>
        <p className="font-semibold">
          Excused period:{' '}
          {periodValid ? formatDateRange(period.excusedFrom, period.excusedUntil) : 'Not set'}
        </p>
        <div className="whitespace-pre-line">{body}</div>
        {note.trim() && <p>Note for the teacher: {note.trim()}</p>}
        <div className="mt-6">
          <p className="font-semibold">{context.checkedBy}</p>
          <p className="text-text-secondary">School Clinic Staff</p>
        </div>
        <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs print:bg-transparent">
          Student: {context.student.fullName} · {context.student.studentNumber}
          <br />
          Clinic visit: {formatDateTime(context.visit.dateTime)}
          <br />
          Storage status: {approved ? 'Approved and stored in student record' : 'Draft, not stored'}
        </div>
      </div>
    </article>
  )
}

function ExcuseLetterEditor({ context, back }: { context: ExcuseLetterContext; back: ReactNode }) {
  const [recipient, setRecipient] = useState(context.recipient)
  const [body, setBody] = useState(context.body)
  const [period, setPeriod] = useState(context.period)
  const [note, setNote] = useState(context.note)
  const [checked, setChecked] = useState(Boolean(context.approval))
  const [approved, setApproved] = useState(Boolean(context.approval))
  const [saving, setSaving] = useState(false)
  const periodError = excusedPeriodError(period)

  async function approve() {
    setSaving(true)
    try {
      await approveExcuseLetter(context, period, note)
      setApproved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8 print:max-w-none print:px-0 print:py-0">
      {back}
      <Card className="p-5 print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Excuse Letter
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {context.student.fullName} · {context.student.studentNumber} · visit on{' '}
              {formatDateTime(context.visit.dateTime)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon="printer" onClick={() => window.print()}>
              Print
            </Button>
            <Badge tone={approved ? 'success' : 'warning'} variant="soft">
              {approved ? 'Approved' : 'Draft'}
            </Badge>
          </div>
        </div>
      </Card>

      {approved && (
        <div
          role="status"
          className="rounded-md border border-success bg-success/10 px-4 py-3 text-sm font-semibold text-text-primary print:hidden"
        >
          Excuse letter approved and stored in the student record.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 print:block">
        <Card aria-labelledby="letter-controls-title" className="print:hidden">
          <CardHeader
            titleId="letter-controls-title"
            title="Check and approve"
            description="The nurse reviews the wording before storing the letter permanently."
            icon={<Icon name="fileText" />}
          />
          <CardBody className="flex flex-col gap-4">
            <Input
              label="Recipient"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DatePicker
                label="Excused from"
                required
                value={period.excusedFrom}
                onChange={(excusedFrom) => setPeriod((current) => ({ ...current, excusedFrom }))}
                disabled={approved}
              />
              <DatePicker
                label="Excused until"
                required
                value={period.excusedUntil}
                min={period.excusedFrom || undefined}
                onChange={(excusedUntil) => setPeriod((current) => ({ ...current, excusedUntil }))}
                error={periodError ?? undefined}
                hint={approved ? 'Fixed once the letter is approved.' : undefined}
                disabled={approved}
              />
            </div>
            <Input
              label="Note for the teacher"
              value={note}
              placeholder="Optional"
              onChange={(event) => setNote(event.target.value)}
              hint={approved ? 'Fixed once the letter is approved.' : undefined}
              disabled={approved}
            />
            <div className="flex flex-col gap-1">
              <label htmlFor="excuse-body" className="text-xs font-semibold text-text-primary">
                Letter body
              </label>
              <textarea
                id="excuse-body"
                rows={8}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className="resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary shadow-card transition-colors duration-150 hover:border-brand-green motion-reduce:transition-none"
              />
            </div>
            <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-text-primary">
              This tool generates clinic excuse letters only. It must not be used as a medical
              certificate.
            </div>
            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-surface p-3 text-sm text-text-primary transition-colors hover:bg-background">
              <input
                type="checkbox"
                checked={checked}
                disabled={approved}
                onChange={(event) => setChecked(event.target.checked)}
                className="mt-0.5 size-4 cursor-pointer accent-brand-green-dark disabled:cursor-not-allowed"
              />
              I checked the letter and approve storing it in the student's record.
            </label>
            <Button
              variant="primary"
              icon="checkCircle"
              loading={saving}
              disabled={!checked || approved || Boolean(periodError)}
              onClick={() => void approve()}
            >
              Approve and Store
            </Button>
          </CardBody>
        </Card>

        <Card aria-labelledby="letter-preview-title" className="print:shadow-none">
          <CardHeader
            titleId="letter-preview-title"
            title="Printable letter"
            description="Print view keeps only the letter content."
            icon={<Icon name="printer" />}
            className="print:hidden"
          />
          <CardBody className="print:p-0">
            <PrintableLetter
              context={context}
              recipient={recipient}
              body={body}
              period={period}
              note={note}
              approved={approved}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

export function ExcuseLetterPage({
  viewer = getMockSessionUser(),
  visitId,
}: {
  viewer?: SessionUser
  visitId?: string
}) {
  const { data, status, reload } = useAsyncData(`excuse-letter|${visitId ?? 'default'}`, () =>
    fetchExcuseLetterContext(visitId),
  )

  if (viewer.role !== 'staff') {
    return (
      <div className="mx-auto max-w-page-narrow px-4 pt-10 pb-8 sm:px-8">
        <ErrorState title="Staff access required." />
      </div>
    )
  }

  const back = <BackButton fallback={visitId ? paths.visitDetail(visitId) : paths.visits} />

  if (status === 'error') {
    return (
      <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState title="Unable to load excuse letter." onRetry={reload} />
      </div>
    )
  }

  if (!data) {
    return (
      <>
        <p className="sr-only" role="status">
          Loading excuse letter...
        </p>
        <LetterSkeleton back={back} />
      </>
    )
  }

  return <ExcuseLetterEditor context={data} back={back} />
}
