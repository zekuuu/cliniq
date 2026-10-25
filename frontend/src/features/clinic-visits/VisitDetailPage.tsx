import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
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
  ItemsGivenField,
  Modal,
  SegmentedControl,
  Textarea,
  Skeleton,
  type ItemLineDraft,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useFocusFirstInvalid } from '../../hooks/useFocusFirstInvalid'
import { cn } from '../../lib/cn'
import { cleanComplaint } from '../../lib/complaints'
import { formatDate, formatDateRange, formatDateTime, todayISO } from '../../lib/dates'
import { draftsFrom, formatItemGiven } from '../../lib/itemsGiven'
import { formatDecimal } from '../../lib/numbers'
import { getMockSessionUser, StockRuleError, type SessionUser } from '../../lib/mock-db'
import { paths } from '../../routes/paths'
import type { Disposition } from '../../types/entities'
import { ComplaintField } from './ComplaintField'
import { MedicineInNotesHint } from './MedicineInNotesHint'
import { DispositionFields } from './DispositionFields'
import { dispositionErrors, emptyDispositionValues, type DispositionErrors } from './dispositionValues'
import { LogbookFields } from './LogbookFields'
import { currentClock, filledLogbookCount, formatClock, logbookErrors, type LogbookErrors, type LogbookValues } from './logbookValues'
import {
  fetchVisitDetail,
  markEnteredInError,
  updateVisitDetail,
  valuesFromVisit,
  type VisitDetail,
  type VisitDetailValues,
} from './api/visitDetailApi'
import { DISPOSITION_LABELS as dispositionLabel, DISPOSITION_OPTIONS as dispositionOptions, DISPOSITION_TONES as dispositionTone } from '../../lib/dispositions'

interface Errors extends DispositionErrors, LogbookErrors {
  visitTime?: string
  complaint?: string
  itemsGiven?: string
}

function VisitDetailSkeleton({ back }: { back: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Card className="p-5">
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </Card>
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <Card key={index} className="p-5">
              <Skeleton className="h-5 w-40" />
              <div className="mt-4 flex flex-col gap-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function TextareaField({
  label,
  value,
  onChange,
  error,
  required = true,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  hint?: string
}) {
  const id = useId()
  const errorId = error ? `${id}-error` : undefined
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-text-primary">
        {label} {required && <span className="text-error">*</span>}
      </label>
      <textarea
        id={id}
        rows={4}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(hintId, errorId) || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'resize-y rounded-md border bg-background px-3 py-2 text-sm text-text-primary shadow-card',
          'transition-colors duration-150 hover:border-brand-green motion-reduce:transition-none',
          error ? 'border-error' : 'border-border',
        )}
      />
      {hint && !error && (
        <p id={hintId} className="text-xs text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  )
}

function VisitDetailEditor({ initialVisit }: { initialVisit: VisitDetail }) {
  const [visit, setVisit] = useState(initialVisit)
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<VisitDetailValues>(() => valuesFromVisit(initialVisit))
  const [lines, setLines] = useState<ItemLineDraft[]>(() => draftsFrom(initialVisit.itemsGiven))
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  /** Set after a successful save; lists any items the edit took below zero. */
  const [saved, setSaved] = useState<null | { belowZero: string[] }>(null)
  const invalidRef = useRef<HTMLFormElement>(null)
  const invalid = useFocusFirstInvalid(invalidRef)
  /** "Show more fields": opens by itself when the visit already has a value in it, or an error sits in it. */
  const [moreOpen, setMoreOpen] = useState(false)
  const timeOutRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  // "Entered in error" (panel review VS-9, D2): a confirmation with a required reason.
  const [markingError, setMarkingError] = useState(false)
  const [errorReason, setErrorReason] = useState('')
  const [errorReasonMessage, setErrorReasonMessage] = useState('')
  const [markingSaving, setMarkingSaving] = useState(false)
  const locked = Boolean(visit.enteredInError)

  async function confirmEnteredInError() {
    if (!errorReason.trim()) {
      setErrorReasonMessage('Give the reason this visit was entered in error.')
      return
    }
    setMarkingSaving(true)
    try {
      setVisit(await markEnteredInError(visit.id, errorReason))
      setMarkingError(false)
      setSaved(null)
    } finally {
      setMarkingSaving(false)
    }
  }

  function startEdit() {
    setMoreOpen(filledLogbookCount(valuesFromVisit(visit)) > 0)
    setEditing(true)
  }

  function setField<K extends keyof VisitDetailValues>(field: K, value: VisitDetailValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSaved(null)
  }

  function setDisposition(disposition: Disposition) {
    // Disposition-specific fields start fresh whenever the disposition changes.
    setValues((current) => ({ ...current, ...emptyDispositionValues(visit.dateTime.slice(0, 10)), disposition }))
    setErrors((current) => ({ ...current, excusedUntil: undefined }))
    setSaved(null)
  }

  function validate(): Errors {
    const next: Errors = {}
    if (!cleanComplaint(values.complaint)) next.complaint = 'Enter the visit complaint.'
    if (!values.visitDate || !values.visitClock) next.visitTime = 'Enter the visit date and time.'
    else if (`${values.visitDate}T${values.visitClock}` > `${todayISO()}T${currentClock()}`) next.visitTime = "The visit date and time can't be in the future."
    if (lines.some((line) => line.quantity < 1)) next.itemsGiven = 'Each quantity must be at least 1.'
    return {
      ...next,
      ...dispositionErrors(values.disposition, values, Boolean(visit.approval)),
      ...logbookErrors(values, values.visitClock || visit.dateTime.slice(11, 16), timeOutRef.current?.validity.badInput),
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (nextErrors.timeOut) setMoreOpen(true)
    invalid.report(Object.keys(nextErrors).length)
    if (Object.keys(nextErrors).length) return
    setSaving(true)
    setSaveError('')
    try {
      const { visit: updated, belowZero } = await updateVisitDetail(
        visit,
        values,
        lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity, instructions: line.instructions })),
      )
      setVisit(updated)
      setValues(valuesFromVisit(updated))
      setLines(draftsFrom(updated.itemsGiven))
      setEditing(false)
      setSaved({ belowZero })
    } catch (caught) {
      // The data layer rejected a line; nothing was saved and stock is unchanged.
      if (!(caught instanceof StockRuleError)) throw caught
      setSaveError(`${caught.message} Nothing was saved.`)
    } finally {
      setSaving(false)
    }
  }

  function cancelEdit() {
    setValues(valuesFromVisit(visit))
    setLines(draftsFrom(visit.itemsGiven))
    setErrors({})
    setSaveError('')
    setEditing(false)
  }

  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {/* While editing, Back is the in-page Cancel: it returns to the read view, never saves. */}
      <BackButton {...(editing ? { onBack: cancelEdit } : { fallback: paths.visits })} />
      <Card className="p-5">
        {/* The date keeps the top-right corner; the actions get their own row so a long set of
            buttons wraps among themselves instead of pushing the date below the title. */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Visit Details
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {visit.student.fullName} · LRN {visit.student.lrn} · {visit.student.gradeLevel}
            </p>
          </div>
          <Badge tone="info" variant="soft" icon="calendarClock">
            {formatDateTime(visit.dateTime)}
          </Badge>
        </div>
        {!editing && !locked && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" icon="fileText" onClick={startEdit}>
              Edit
            </Button>
            {!visit.escalatedIncidentId && (
              <Button variant="secondary" icon="alertTriangle" onClick={() => navigate(`${paths.incidentNew}?fromVisit=${encodeURIComponent(visit.id)}`)}>
                Escalate to incident
              </Button>
            )}
            <Button variant="neutral" onClick={() => { setErrorReason(''); setErrorReasonMessage(''); setMarkingError(true) }}>
              Entered in error
            </Button>
          </div>
        )}
      </Card>

      {visit.enteredInError && (
        <div role="status" className="rounded-md border border-error bg-error/10 px-4 py-3 text-sm text-text-primary">
          <p className="font-semibold">Entered in error. This visit is kept but left out of lists, counts and reports.</p>
          <p className="mt-1">
            Reason: {visit.enteredInError.reason}. Marked by {visit.enteredInErrorBy ?? 'Unknown user'}, {formatDateTime(visit.enteredInError.at)}.
            Its medicines went back to stock and its excuse letter is void. It can no longer be edited.
          </p>
        </div>
      )}

      {visit.escalatedIncidentId && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning bg-warning/10 px-4 py-3 text-sm font-semibold text-text-primary">
          Escalated to incident. The event counts once, as the incident.
          <Link to={paths.incidentReport(visit.escalatedIncidentId)} className={buttonClassName({ size: 'sm' })}>
            Open the incident
          </Link>
        </div>
      )}

      {saved && (
        <div
          role="status"
          className="rounded-md border border-success bg-success/10 px-4 py-3 text-sm font-semibold text-text-primary"
        >
          Visit updated.
          {saved.belowZero.length > 0 && (
            <span className="mt-1 block text-warning">
              Now below zero: {saved.belowZero.join(', ')}. Recount and restock.
            </span>
          )}
        </div>
      )}

      {saveError && (
        <div role="alert" className="rounded-md border border-error bg-error/10 px-4 py-3 text-sm font-semibold text-text-primary">
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        <Card aria-labelledby="visit-context-title">
          <CardHeader
            titleId="visit-context-title"
            title="Visit context"
            icon={<Icon name="stethoscope" />}
          />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-text-secondary">Student</p>
              <p className="text-sm font-semibold text-text-primary">{visit.student.fullName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-secondary">LRN</p>
              <p className="text-sm font-semibold text-text-primary tabular-nums">{visit.student.lrn}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-secondary">Logged by</p>
              <p className="text-sm font-semibold text-text-primary">{visit.loggedBy}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-secondary">Event tag</p>
              <p className="text-sm font-semibold text-text-primary">
                {visit.eventTag || 'No event tag'}
              </p>
            </div>
            {visit.lateEntry && (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold text-text-secondary">Entered late</p>
                <p className="text-sm font-semibold text-text-primary">
                  Recorded more than 30 minutes after the visit time.{visit.lateEntryReason ? ` Reason: ${visit.lateEntryReason}` : ' No reason given.'}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        <Card aria-labelledby="visit-detail-title">
          <CardHeader
            titleId="visit-detail-title"
            title={editing ? 'Edit visit details' : 'Visit details'}
            description={
              editing
                ? 'Updating this record writes an audit entry.'
                : 'Clinical details are visible because this is one deliberately opened visit.'
            }
            icon={<Icon name="clipboardList" />}
            actions={
              <Badge tone={editing ? 'warning' : dispositionTone[visit.disposition]} variant="soft">
                {editing ? 'Editing' : dispositionLabel[visit.disposition]}
              </Badge>
            }
          />
          <CardBody>
            {editing ? (
              <form ref={invalidRef} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
                <p role="status" className="sr-only">
                  {invalid.announcement}
                </p>
                {/* Correcting when the visit happened (Zean, Thursday, October 22, 2026); audited as "date and time". */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DatePicker
                    label="Visit date"
                    value={values.visitDate}
                    max={todayISO()}
                    onChange={(next) => {
                      setField('visitDate', next)
                      setErrors((current) => ({ ...current, visitTime: undefined }))
                    }}
                    error={errors.visitTime}
                  />
                  <Input
                    type="time"
                    label="Time"
                    value={values.visitClock}
                    onChange={(event) => {
                      setField('visitClock', event.target.value)
                      setErrors((current) => ({ ...current, visitTime: undefined }))
                    }}
                  />
                </div>
                <ComplaintField
                  value={values.complaint}
                  onChange={(value) => setField('complaint', value)}
                  suggestions={visit.complaintSuggestions}
                  error={errors.complaint}
                />
                <TextareaField
                  label="Treatment notes"
                  required={false}
                  hint="Optional. Care that isn't stock: rest, cold compress, wound cleaning, advice."
                  value={values.treatment}
                  onChange={(value) => setField('treatment', value)}
                />
                <MedicineInNotesHint
                  notes={values.treatment}
                  items={visit.items}
                  lines={lines}
                  onAdd={(line) => {
                    setLines((current) => [...current, line])
                    setSaved(null)
                  }}
                />
                <ItemsGivenField
                  items={visit.items}
                  lines={lines}
                  saved={visit.itemsGiven}
                  allergies={visit.student.allergies}
                  error={errors.itemsGiven}
                  onChange={(next) => {
                    setLines(next)
                    setSaved(null)
                    setErrors((current) => ({ ...current, itemsGiven: undefined }))
                  }}
                />
                <div>
                  <p className="mb-1 text-xs font-semibold text-text-primary">Disposition</p>
                  <SegmentedControl
                    label="Disposition"
                    // Four options: two by two on a phone, one row from sm up (panel review VS-1 added Resting).
                    className="max-sm:grid max-sm:w-full max-sm:grid-cols-2"
                    value={values.disposition}
                    onChange={setDisposition}
                    options={dispositionOptions}
                    size="md"
                  />
                </div>
                <DispositionFields
                  disposition={values.disposition}
                  values={values}
                  onChange={(next) => {
                    setValues((current) => ({ ...current, ...next }))
                    setErrors((current) => ({ ...current, excusedUntil: undefined }))
                    setSaved(null)
                  }}
                  errors={errors}
                  approvedPeriod={visit.approval}
                />
                <Input
                  label="Event tag"
                  value={values.eventTag}
                  placeholder="Optional school event"
                  onChange={(event) => setField('eventTag', event.target.value)}
                />
                <LogbookFields
                  values={values}
                  onChange={(next: LogbookValues) => {
                    setValues((current) => ({ ...current, ...next }))
                    setErrors((current) => ({ ...current, timeOut: undefined }))
                    setSaved(null)
                  }}
                  errors={errors}
                  open={moreOpen}
                  onOpenChange={setMoreOpen}
                  ranges={visit.vitalsRanges}
                  timeOutRef={timeOutRef}
                />
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
                  {!values.treatment.trim() && !lines.length && (
                    <p className="mr-auto text-xs text-text-secondary">No treatment recorded. You can still save.</p>
                  )}
                  <Button variant="neutral" onClick={cancelEdit}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" icon="checkCircle" loading={saving}>
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                <section>
                  <h2 className="text-sm font-bold text-text-primary">Complaint</h2>
                  <p className="mt-1 text-sm text-text-primary">{visit.complaint}</p>
                </section>
                <section>
                  <h2 className="text-sm font-bold text-text-primary">Treatment notes</h2>
                  {visit.treatment.trim() ? (
                    <p className="mt-1 text-sm text-text-primary">{visit.treatment}</p>
                  ) : (
                    <p className="mt-1 text-sm text-text-secondary">
                      {visit.itemsGiven.length ? 'No treatment notes.' : 'No treatment recorded.'}
                    </p>
                  )}
                </section>
                <section>
                  <h2 className="text-sm font-bold text-text-primary">Medicines &amp; supplies given</h2>
                  {visit.itemsGiven.length ? (
                    <ul className="mt-1 flex flex-col gap-1 text-sm text-text-primary">
                      {visit.itemsGiven.map((line) => (
                        <li key={line.itemId}>{formatItemGiven(line)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-sm text-text-secondary">None recorded.</p>
                  )}
                </section>
                <section>
                  <h2 className="text-sm font-bold text-text-primary">Disposition</h2>
                  <Badge tone={dispositionTone[visit.disposition]} variant="soft">
                    {dispositionLabel[visit.disposition]}
                  </Badge>
                </section>
                {visit.referredTo && (
                  <section>
                    <h2 className="text-sm font-bold text-text-primary">Referred to</h2>
                    <p className="mt-1 text-sm text-text-primary">{visit.referredTo}</p>
                  </section>
                )}
                {/* The optional logbook fields: only the filled ones, nothing collapsed. */}
                {visit.temperatureC !== null && (
                  <section>
                    <h2 className="text-sm font-bold text-text-primary">Body temperature</h2>
                    <p className="mt-1 text-sm text-text-primary">{formatDecimal(visit.temperatureC)} °C</p>
                  </section>
                )}
                {visit.timeOut && (
                  <section>
                    <h2 className="text-sm font-bold text-text-primary">Time out</h2>
                    {/* The input is time only (a same-day visit); the date shows with it (Sir Rey, October 25, 2026). */}
                    <p className="mt-1 text-sm text-text-primary">{formatDate(visit.dateTime.slice(0, 10))} · {formatClock(visit.timeOut)}</p>
                  </section>
                )}
                {visit.assistedBy && (
                  <section>
                    <h2 className="text-sm font-bold text-text-primary">Assisted by</h2>
                    <p className="mt-1 text-sm text-text-primary">{visit.assistedBy}</p>
                  </section>
                )}
                {visit.parentGuardian && (
                  <section>
                    <h2 className="text-sm font-bold text-text-primary">Parent or guardian</h2>
                    <p className="mt-1 text-sm text-text-primary">{visit.parentGuardian}</p>
                  </section>
                )}
                {visit.remarks && (
                  <section>
                    <h2 className="text-sm font-bold text-text-primary">Remarks</h2>
                    <p className="mt-1 text-sm whitespace-pre-line text-text-primary">{visit.remarks}</p>
                  </section>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        <ExcuseLetterCard visit={visit} />
      </div>

      <Modal open={markingError} title="Mark this visit as entered in error?" onClose={() => setMarkingError(false)}>
        <p className="text-sm text-text-secondary">
          Nothing is deleted. The visit leaves every list and count, its medicines go back to stock, and its
          excuse letter is voided. It can't be edited afterwards, and this can't be undone from this screen.
        </p>
        <Textarea
          className="mt-4"
          label="Reason"
          required
          rows={3}
          maxLength={300}
          value={errorReason}
          onChange={(value) => {
            setErrorReason(value)
            setErrorReasonMessage('')
          }}
          error={errorReasonMessage}
        />
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="neutral" data-autofocus onClick={() => setMarkingError(false)}>
            Cancel
          </Button>
          <Button variant="primary" loading={markingSaving} onClick={confirmEnteredInError}>
            Mark entered in error
          </Button>
        </div>
      </Modal>
    </div>
  )
}

/**
 * The visit's excuse letter (Staff only, like the whole page and the profile's Excuse Letters card).
 * An approved letter wins: its stored period and note are shown, the same ones the profile lists.
 * Before approval the draft saved with the visit is shown; approval clears that draft.
 */
function ExcuseLetterCard({ visit }: { visit: VisitDetail }) {
  const letter = visit.approval ?? visit.excuseLetterDraft
  // A letter whose visit was entered in error is void, draft or approved (D2).
  const voided = Boolean(visit.enteredInError && letter)
  const status = voided ? 'Voided' : visit.approval ? 'Approved' : visit.excuseLetterDraft ? 'Pending approval' : 'Not prepared'
  return (
    <Card aria-labelledby="visit-excuse-letter-title">
      <CardHeader
        titleId="visit-excuse-letter-title"
        title="Excuse letter"
        icon={<Icon name="fileText" />}
        actions={
          <Badge tone={voided ? 'error' : visit.approval ? 'success' : visit.excuseLetterDraft ? 'warning' : 'neutral'} variant="soft">
            {status}
          </Badge>
        }
      />
      <CardBody className="flex flex-col gap-4">
        {letter ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-text-secondary">Excused period</p>
              <p className="text-sm font-semibold text-text-primary">
                {formatDateRange(letter.excusedFrom, letter.excusedUntil)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-secondary">Note for the teacher</p>
              <p className={cn('text-sm', letter.note ? 'text-text-primary' : 'text-text-secondary')}>
                {letter.note || 'No note.'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No excuse letter has been prepared for this visit.</p>
        )}
        {voided ? (
          <p className="text-sm text-text-secondary">Voided because the visit was entered in error. It is not a valid excuse letter.</p>
        ) : !visit.enteredInError && (
          <div>
            <Link to={paths.excuseLetter(visit.id)} className={buttonClassName({ size: 'sm' })}>
              {visit.approval ? 'View excuse letter' : visit.excuseLetterDraft ? 'Review excuse letter' : 'Prepare excuse letter'}
            </Link>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export function VisitDetailPage({
  viewer = getMockSessionUser(),
  visitId,
}: {
  viewer?: SessionUser
  visitId?: string
}) {
  const { data, status, reload } = useAsyncData(`visit-detail|${visitId ?? 'default'}`, () =>
    fetchVisitDetail(visitId),
  )

  if (viewer.role !== 'staff') {
    return (
      <div className="mx-auto max-w-page-narrow px-4 pt-10 pb-8 sm:px-8">
        <ErrorState title="Staff access required." />
      </div>
    )
  }

  const back = <BackButton fallback={paths.visits} />

  if (status === 'error') {
    return (
      <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState title="Unable to load visit detail." onRetry={reload} />
      </div>
    )
  }

  if (!data) {
    return (
      <>
        <p className="sr-only" role="status">
          Loading visit detail...
        </p>
        <VisitDetailSkeleton back={back} />
      </>
    )
  }

  return <VisitDetailEditor initialVisit={data} />
}
