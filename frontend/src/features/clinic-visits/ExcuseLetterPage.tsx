import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  BackButton,
  Badge,
  Button,
  buttonClassName,
  Card,
  CardBody,
  CardHeader,
  DatePicker,
  ErrorState,
  Icon,
  Input,
  Modal,
  PrintDocument,
  PrintFields,
  Skeleton,
  Textarea,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { paths } from '../../routes/paths'
import { formatDate, formatDateRange, formatDateTime } from '../../lib/dates'
import { getMockSessionUser, ROLE_LABELS, type SessionUser } from '../../lib/mock-db'
import {
  approveExcuseLetter,
  defaultBody,
  excusedPeriodError,
  fetchExcuseLetterContext,
  issueReplacement,
  type ExcuseLetterContext,
  type ExcusedPeriod,
} from './api/excuseLetterApi'
import { maskLrn } from '../../lib/lrn'
import { MaskedLrn } from '../../components/ui/MaskedLrn'
import { ExcusedPeriodPresets } from './ExcusedPeriodPresets'

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
        <div className="mt-6 w-64 max-w-full border-t border-text-primary pt-1">
          <p className="font-semibold">{context.checkedBy}</p>
          <p className="text-text-secondary">{ROLE_LABELS.staff}, School Clinic</p>
          <p className="text-xs text-text-secondary">Signature over printed name</p>
        </div>
        {/* Internal record status: on screen only, never on paper (panel review EX-4). */}
        <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs print:hidden">
          Student: {context.student.fullName} · LRN <MaskedLrn lrn={context.student.lrn} />
          <br />
          Clinic visit: {formatDateTime(context.visit.dateTime)}
          <br />
          Storage status: {approved ? 'Approved and stored in student record' : 'Draft, not stored'}
        </div>
      </div>
    </article>
  )
}

/**
 * The letter on A4 (ADR-026): letterhead, date, recipient, excused period, body, teacher note, and a
 * signature block, then a reference block without internal ids. A draft prints with a DRAFT mark so
 * it can't pass for an approved letter. Single student, so the full name is correct (ADR-004).
 */
function ExcuseLetterPrint({
  context,
  viewer,
  recipient,
  body,
  period,
  note,
  approved,
}: {
  context: ExcuseLetterContext
  viewer: SessionUser
  recipient: string
  body: string
  period: ExcusedPeriod
  note: string
  approved: boolean
}) {
  const { student, visit } = context
  // A letter whose visit was entered in error is void, draft or approved (panel review D2); a letter
  // replaced by a later one is superseded. Neither is valid, and the printout says so.
  const voided = Boolean(visit.enteredInError)
  const superseded = Boolean(context.approval?.superseded)
  const periodText = excusedPeriodError(period) ? 'Not set' : formatDateRange(period.excusedFrom, period.excusedUntil)
  return (
    <PrintDocument
      title="Clinic Excuse Letter"
      viewer={viewer}
      scope={`For ${student.fullName} (LRN ${maskLrn(student.lrn)}), ${student.gradeLevel}, after a clinic visit on ${formatDateTime(visit.dateTime)}.`}
    >
      {(!approved || voided || superseded) && (
        <>
          <div aria-hidden="true" className="pointer-events-none fixed inset-0 flex items-center justify-center">
            <span className="-rotate-30 text-[110pt] font-bold tracking-widest text-border">{voided ? 'VOID' : superseded ? 'SUPERSEDED' : 'DRAFT'}</span>
          </div>
          <p className="relative mb-[5mm] border-2 border-text-primary px-[3mm] py-[2mm] text-[11pt] font-bold">
            {voided
              ? 'VOID. The clinic visit was entered in error, so this letter is not valid.'
              : superseded
                ? 'SUPERSEDED. A later letter replaced this one, so this letter is not valid.'
                : 'DRAFT, NOT APPROVED. This letter is not valid until the school clinic approves it.'}
          </p>
        </>
      )}
      <div className="relative flex flex-col gap-[4mm] text-[11.5pt] leading-relaxed">
        <p>{formatDate(context.issuedAt.slice(0, 10))}</p>
        <p>To: {recipient}</p>
        <p className="font-semibold">Excused period: {periodText}</p>
        <div className="whitespace-pre-line">{body}</div>
        {note.trim() && <p>Note for the teacher: {note.trim()}</p>}
        <div className="mt-[14mm] w-[70mm] break-inside-avoid border-t border-text-primary pt-[1.5mm]">
          <p className="font-semibold">{context.checkedBy}</p>
          <p className="text-[10pt]">{ROLE_LABELS.staff}, School Clinic</p>
          <p className="text-[9pt]">Signature over printed name</p>
        </div>
        <p className="text-[9.5pt]">
          Not a medical certificate. Hospital-issued certificates are outside CLINIQ scope.
        </p>
      </div>
      <div className="relative mt-[10mm] break-inside-avoid border-t border-text-secondary pt-[3mm] text-[9pt]">
        <p className="mb-[2mm] font-semibold">Reference</p>
        <PrintFields
          fields={[
            { label: 'Student', value: `${student.fullName} · LRN ${maskLrn(student.lrn)}` },
            { label: 'Grade level', value: student.gradeLevel },
            { label: 'Clinic visit', value: formatDateTime(visit.dateTime) },
            {
              label: 'Status',
              value: voided
                ? 'Void'
                : superseded && context.approval?.superseded
                  ? `Superseded ${formatDateTime(context.approval.superseded.at)}`
                  : context.approval
                  ? `Approved ${formatDateTime(context.approval.approvedAt)}`
                  : approved
                    ? 'Approved'
                    : 'Draft, not approved',
            },
          ]}
        />
      </div>
    </PrintDocument>
  )
}

function ExcuseLetterEditor({
  onReplaced,
  context,
  back,
  viewer,
}: {
  context: ExcuseLetterContext
  back: ReactNode
  viewer: SessionUser
  /** Reloads the page after "Issue a replacement" opened a new draft. */
  onReplaced: () => void
}) {
  const [recipient, setRecipient] = useState(context.recipient)
  // The wording names the excused dates and follows them until Staff edit it (panel review EX-4).
  const [editedBody, setBody] = useState<string | null>(null)
  const [replacing, setReplacing] = useState(false)
  const [replaceReason, setReplaceReason] = useState('')
  const [replaceError, setReplaceError] = useState('')
  const [replaceSaving, setReplaceSaving] = useState(false)
  const [period, setPeriod] = useState(context.period)
  const [note, setNote] = useState(context.note)
  const [checked, setChecked] = useState(Boolean(context.approval))
  const [approved, setApproved] = useState(Boolean(context.approval))
  const [saving, setSaving] = useState(false)
  const periodError = excusedPeriodError(period)
  const voided = context.visit.enteredInError ?? null
  // Opened from the student's record: a letter a later one replaced. Read-only.
  const superseded = context.approval?.superseded ?? null
  const body = editedBody ?? defaultBody(context.student, context.visit, period)

  async function replace() {
    if (!replaceReason.trim()) {
      setReplaceError('Give the reason for the replacement.')
      return
    }
    setReplaceSaving(true)
    try {
      await issueReplacement(context.visit.id, replaceReason)
      setReplacing(false)
      onReplaced()
    } finally {
      setReplaceSaving(false)
    }
  }

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
              {context.student.fullName} · LRN <MaskedLrn lrn={context.student.lrn} /> · visit on{' '}
              {formatDateTime(context.visit.dateTime)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon="printer" onClick={() => window.print()}>
              Print / Save as PDF
            </Button>
            {approved && !voided && !superseded && (
              <Button variant="neutral" onClick={() => { setReplaceReason(''); setReplaceError(''); setReplacing(true) }}>
                Issue a replacement
              </Button>
            )}
            <Badge tone={voided ? 'error' : superseded ? 'neutral' : approved ? 'success' : 'warning'} variant="soft">
              {voided ? 'Voided' : superseded ? 'Superseded' : approved ? 'Approved' : 'Draft'}
            </Badge>
          </div>
        </div>
      </Card>

      {superseded && !voided && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary print:hidden">
          Superseded {formatDateTime(superseded.at)}: {superseded.reason}. A later letter replaced this one; it is kept in the record and is not valid.
          <Link to={paths.excuseLetter(context.visit.id)} className={buttonClassName({ size: 'sm' })}>
            Open the current letter
          </Link>
        </div>
      )}
      {voided ? (
        <div role="status" className="rounded-md border border-error bg-error/10 px-4 py-3 text-sm font-semibold text-text-primary print:hidden">
          Voided: the visit was entered in error ({voided.reason}). This letter can't be approved, and it prints marked VOID.
        </div>
      ) : approved && !superseded && (
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
                disabled={approved || Boolean(voided)}
              />
              <DatePicker
                label="Excused until"
                required
                value={period.excusedUntil}
                min={period.excusedFrom || undefined}
                onChange={(excusedUntil) => setPeriod((current) => ({ ...current, excusedUntil }))}
                error={periodError ?? undefined}
                hint={approved ? 'Fixed once the letter is approved.' : undefined}
                disabled={approved || Boolean(voided)}
              />
              <div className="sm:col-span-2">
                <ExcusedPeriodPresets
                  from={period.excusedFrom}
                  disabled={approved || Boolean(voided)}
                  onPick={(excusedUntil) => setPeriod((current) => ({ ...current, excusedUntil }))}
                />
              </div>
            </div>
            <Input
              label="Note for the teacher"
              value={note}
              placeholder="Optional"
              onChange={(event) => setNote(event.target.value)}
              hint={approved ? 'Fixed once the letter is approved.' : undefined}
              disabled={approved || Boolean(voided)}
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
                disabled={approved || Boolean(voided)}
                onChange={(event) => setChecked(event.target.checked)}
                className="mt-0.5 size-4 cursor-pointer accent-brand-green-dark disabled:cursor-not-allowed"
              />
              I checked the letter and approve storing it in the student's record.
            </label>
            <Button
              variant="primary"
              icon="checkCircle"
              loading={saving}
              disabled={!checked || approved || Boolean(periodError) || Boolean(voided)}
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
      <Modal open={replacing} title="Issue a replacement letter?" onClose={() => setReplacing(false)}>
        <p className="text-sm text-text-secondary">
          The approved letter is kept and marked Superseded; it is no longer valid. A new draft with the same
          period and note opens for you to correct and approve.
        </p>
        <Textarea
          className="mt-4"
          label="Reason"
          required
          rows={3}
          maxLength={300}
          value={replaceReason}
          onChange={(value) => {
            setReplaceReason(value)
            setReplaceError('')
          }}
          error={replaceError}
        />
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="neutral" data-autofocus onClick={() => setReplacing(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={replaceSaving} onClick={() => void replace()}>
            Issue a replacement
          </Button>
        </div>
      </Modal>
      <ExcuseLetterPrint
        context={context}
        viewer={viewer}
        recipient={recipient}
        body={body}
        period={period}
        note={note}
        approved={approved}
      />
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
  const letterId = useSearchParams()[0].get('letter') ?? undefined
  const { data, status, reload } = useAsyncData(`excuse-letter|${visitId ?? 'default'}|${letterId ?? ''}`, () =>
    fetchExcuseLetterContext(visitId, letterId),
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

  // Keyed by the letter shown, so a replacement starts a fresh editor.
  return <ExcuseLetterEditor key={data.approval?.id ?? 'draft'} context={data} back={back} viewer={viewer} onReplaced={reload} />
}
