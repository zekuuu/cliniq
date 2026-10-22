import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
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
  EmptyState,
  ErrorState,
  Icon,
  Input,
  ItemsGivenField,
  SegmentedControl,
  Skeleton,
  StudentPicker,
  type ItemLineDraft,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useCancelNavigation } from '../../hooks/useCancelNavigation'
import { useFocusFirstInvalid } from '../../hooks/useFocusFirstInvalid'
import { useIdentifiedStudent } from '../../hooks/useIdentifiedStudent'
import { cn } from '../../lib/cn'
import { cleanComplaint, normalizeComplaint } from '../../lib/complaints'
import { addDays, todayISO } from '../../lib/dates'
import { getMockSessionUser, LATE_ENTRY_MINUTES, StockRuleError, type ComplaintType, type InventoryItemView, type SessionUser } from '../../lib/mock-db'
import { paths } from '../../routes/paths'
import type { Disposition } from '../../types/entities'
import {
  fetchComplaintSuggestions,
  fetchNewVisitContext,
  fetchVisitItems,
  findVisitStudent,
  searchVisitStudents,
  submitNewVisit,
} from './api/newVisitApi'
import { ComplaintField } from './ComplaintField'
import { MedicineInNotesHint } from './MedicineInNotesHint'
import type { EscalationPrefill } from '../emergency-response/api/incidentEntryApi'
import { DispositionFields } from './DispositionFields'
import {
  dispositionErrors,
  dispositionPayload,
  emptyDispositionValues,
  type DispositionErrors,
} from './dispositionValues'
import { LogbookFields } from './LogbookFields'
import {
  currentClock,
  emptyLogbookValues,
  filledLogbookCount,
  logbookErrors,
  logbookPayload,
  type LogbookErrors,
} from './logbookValues'
import { maskLrn } from '../../lib/lrn'
import { DISPOSITION_OPTIONS as dispositionOptions } from '../../lib/dispositions'

/** The first-aid checklist's complaint type for what was typed: a case-insensitive match, or none. */
function matchComplaintType(complaint: string, complaintTypes: ComplaintType[]): ComplaintType | undefined {
  const typed = cleanComplaint(complaint).toLowerCase()
  return typed ? complaintTypes.find((type) => type.label.toLowerCase() === typed) : undefined
}



interface Errors extends DispositionErrors, LogbookErrors {
  complaint?: string
  visitTime?: string
  itemsGiven?: string
  followUpDate?: string
  followUpReason?: string
}

function VisitSkeleton({ back }: { back: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Card className="p-5">
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        </Card>
        <Card className="p-5">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-72 max-w-full" />
          </div>
        </Card>
      </div>
    </div>
  )
}

function TextareaField({
  label,
  value,
  onChange,
  error,
  required,
  hint,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  hint?: string
  rows?: number
}) {
  const id = useId()
  const errorId = error ? `${id}-error` : undefined
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-text-primary">
        {label}
        {required && <span className="text-error"> *</span>}
      </label>
      <textarea
        id={id}
        rows={rows}
        required={required}
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

function TriagePanel({
  complaint,
  complaintTypes,
  checked,
  onToggle,
}: {
  complaint: string
  complaintTypes: ComplaintType[]
  checked: string[]
  onToggle: (step: string) => void
}) {
  const selected = matchComplaintType(complaint, complaintTypes)
  // Free text with no matching type has no checklist. Not every complaint has a checklist yet (checklist content is mock-only, see mock-db.json).
  if (!selected || selected.triageSteps.length === 0) return null
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-start gap-2">
        <Icon name="clipboardList" className="mt-0.5 shrink-0 text-brand-green-dark" />
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            Suggested first-aid steps for: {selected.label}
          </h2>
          <p className="text-xs text-text-secondary">
            Guidance only. Staff still records the actual treatment given below.
          </p>
        </div>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {selected.triageSteps.map((step) => (
          <li key={step}>
            <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-background motion-reduce:transition-none">
              <input
                type="checkbox"
                checked={checked.includes(step)}
                onChange={() => onToggle(step)}
                className="mt-0.5 size-4 cursor-pointer accent-brand-green-dark"
              />
              <span className="text-sm text-text-primary">{step}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * New Visit Entry (Screen #11 / Reference 2). Mutating saves call the mock audit helper now, and
 * will become real audit-log writes when the Laravel endpoints land.
 */
export function NewVisitEntryPage({ viewer = getMockSessionUser() }: { viewer?: SessionUser }) {
  const today = todayISO()
  const { data, status, reload } = useAsyncData('new-visit', fetchNewVisitContext)
  const identified = useIdentifiedStudent(null, findVisitStudent)
  const [complaint, setComplaint] = useState('')
  const [treatment, setTreatment] = useState('')
  const [disposition, setDisposition] = useState<Disposition>('returned_to_class')
  const [dispositionValues, setDispositionValues] = useState(() => emptyDispositionValues(today))
  const [triageSteps, setTriageSteps] = useState<string[]>([])
  const [needsFollowUp, setNeedsFollowUp] = useState(false)
  const [followUpDate, setFollowUpDate] = useState(addDays(today, 1))
  const [followUpReason, setFollowUpReason] = useState('')
  const [followUpNotes, setFollowUpNotes] = useState('')
  const [lines, setLines] = useState<ItemLineDraft[]>([])
  const [logbook, setLogbook] = useState(emptyLogbookValues)
  // When the visit happened (panel review VS-8, ADR-029). Shown as now; sent only once Staff changes it,
  // so a form left open for a while is still dated when it is saved.
  const [visitDate, setVisitDate] = useState(today)
  const [visitClock, setVisitClock] = useState(currentClock)
  // When Staff last changed the date or time; lateness is measured from then (render stays pure).
  const [editedAt, setEditedAt] = useState<number | null>(null)
  const whenEdited = editedAt !== null
  const [lateEntryReason, setLateEntryReason] = useState('')
  const navigate = useNavigate()
  /** "Show more fields": closed on a new visit; opens by itself when one of its fields has an error. */
  const [moreOpen, setMoreOpen] = useState(false)
  const timeOutRef = useRef<HTMLInputElement>(null)
  /** Stock figures refreshed after a save; until then, the ones loaded with the form. */
  const [freshItems, setFreshItems] = useState<InventoryItemView[] | null>(null)
  /** Complaint suggestions refreshed after a save, so a newly typed complaint is offered next time. */
  const [freshSuggestions, setFreshSuggestions] = useState<string[] | null>(null)
  /** After "Change", the student search takes focus again. */
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  /** Set after a successful save: whether it created a follow-up, what it took from inventory, and its letter draft. */
  const [saved, setSaved] = useState<null | {
    visitId: string
    withFollowUp: boolean
    given: number
    belowZero: string[]
    letterPrepared: boolean
  }>(null)
  // Allergies sit beside the medicine picker; picking a student loads them in full.
  const allergies = identified.student?.allergies ?? null
  const suggestions = freshSuggestions ?? data?.complaintSuggestions ?? []
  const formRef = useRef<HTMLFormElement>(null)
  const invalid = useFocusFirstInvalid(formRef)
  const saveAndNewRef = useRef(false)
  // The next visit in this open form starts with the last successfully saved disposition.
  const lastSavedDisposition = useRef<Disposition>('returned_to_class')
  // Anything typed or chosen beyond the defaults; a save clears the form back to them.
  const { cancel, discardDialog } = useCancelNavigation(
    paths.visits,
    complaint.trim() !== '' ||
      treatment.trim() !== '' ||
      lines.length > 0 ||
      triageSteps.length > 0 ||
      disposition !== lastSavedDisposition.current ||
      needsFollowUp ||
      whenEdited ||
      filledLogbookCount(logbook) > 0,
  )
  const minutesAgo = editedAt !== null && visitDate && visitClock ? (editedAt - new Date(`${visitDate}T${visitClock}`).getTime()) / 60_000 : 0
  const isLateEntry = minutesAgo > LATE_ENTRY_MINUTES
  // ADR-036: an emergency-type complaint gets a hint, never a block. The one-line Visit-versus-Incident
  // rule waits for the nurse's wording (open DECIDE "Rule for Visit versus Incident"), so none is shown yet.
  const looksLikeEmergency = Boolean(
    data?.emergencyComplaints.some((type) => type.toLowerCase() === cleanComplaint(complaint).toLowerCase()),
  )

  /** Opens Incident Stage 1 with what is typed so far; nothing is saved here and no medicine is carried (ADR-036). */
  function escalateToIncident() {
    const temperature = Number(logbook.temperatureC)
    const escalate: EscalationPrefill = {
      studentId: identified.student?.id,
      complaint: cleanComplaint(complaint),
      time: whenEdited ? `${visitDate}T${visitClock}:00+08:00` : undefined,
      temperatureC: logbook.temperatureC.trim() && Number.isFinite(temperature) ? temperature : null,
    }
    navigate(paths.incidentNew, { state: { escalate } })
  }

  useEffect(() => {
    function saveAndNew() {
      saveAndNewRef.current = true
      formRef.current?.requestSubmit()
    }
    window.addEventListener('cliniq:save-and-new', saveAndNew)
    return () => window.removeEventListener('cliniq:save-and-new', saveAndNew)
  }, [])

  function updateComplaint(value: string) {
    // Ticked steps survive typing that keeps the same complaint type ("fever" to "Fever ").
    const types = data?.complaintTypes ?? []
    if (matchComplaintType(value, types) !== matchComplaintType(complaint, types)) setTriageSteps([])
    setComplaint(value)
    setErrors((current) => ({ ...current, complaint: undefined }))
  }

  function toggleStep(step: string) {
    setTriageSteps((current) =>
      current.includes(step) ? current.filter((item) => item !== step) : [...current, step],
    )
  }

  function validate(): Errors {
    const next: Errors = {}
    if (!cleanComplaint(complaint)) next.complaint = 'Enter the complaint for this visit.'
    if (whenEdited && (!visitDate || !visitClock)) next.visitTime = 'Enter the visit date and time.'
    else if (minutesAgo < -1) next.visitTime = "The visit date and time can't be in the future."
    if (lines.some((line) => line.quantity < 1)) next.itemsGiven = 'Each quantity must be at least 1.'
    if (needsFollowUp) {
      if (!followUpDate) next.followUpDate = 'Choose a follow-up date.'
      if (!followUpReason.trim()) next.followUpReason = 'Enter the follow-up reason.'
    }
    return {
      ...next,
      ...dispositionErrors(disposition, dispositionValues),
      ...logbookErrors(logbook, currentClock(), timeOutRef.current?.validity.badInput),
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!data) return
    const nextErrors = validate()
    const studentOk = identified.validate('Choose the student: type the LRN or name, then pick from the list.')
    setErrors(nextErrors)
    if (nextErrors.timeOut) setMoreOpen(true)
    invalid.report(Object.keys(nextErrors).length + (studentOk ? 0 : 1))
    if (Object.keys(nextErrors).length || !studentOk) return
    setSaving(true)
    setSaveError('')
    try {
      const student = await identified.resolve()
      if (!student) return
      const result = await submitNewVisit(
        {
          studentId: student.id,
          complaint: normalizeComplaint(complaint, suggestions),
          treatment: treatment.trim(),
          disposition,
          triageStepsCompleted: triageSteps,
          followUp: needsFollowUp
            ? {
                followUpDate,
                reason: followUpReason.trim(),
                notes: followUpNotes.trim() || null,
              }
            : null,
          itemsGiven: lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity, instructions: line.instructions })),
          ...dispositionPayload(disposition, dispositionValues),
          ...logbookPayload(logbook),
          ...(whenEdited && { dateTime: `${visitDate}T${visitClock}` }),
          lateEntryReason: isLateEntry ? lateEntryReason : null,
        },
        viewer,
      )
      // Reference 2: a successful save confirms and clears the form, so a second click can't
      // record the same visit twice. The Save-and-new shortcut takes the same path.
      setSaved({
        visitId: result.visit.id,
        withFollowUp: needsFollowUp,
        given: lines.length,
        belowZero: result.belowZero,
        letterPrepared: result.visit.excuseLetterDraft !== null,
      })
      setLines([])
      setFreshItems(await fetchVisitItems())
      setFreshSuggestions(await fetchComplaintSuggestions())
      setComplaint('')
      setTreatment('')
      lastSavedDisposition.current = disposition
      setDisposition(disposition)
      setDispositionValues(emptyDispositionValues(today))
      setTriageSteps([])
      setNeedsFollowUp(false)
      setFollowUpDate(addDays(today, 1))
      setFollowUpReason('')
      setFollowUpNotes('')
      setLogbook(emptyLogbookValues())
      setVisitDate(todayISO())
      setVisitClock(currentClock())
      setEditedAt(null)
      setLateEntryReason('')
      setMoreOpen(false)
      setErrors({})
      identified.reset()
      saveAndNewRef.current = false
    } catch (caught) {
      // The data layer rejected a line (an item expired since the form loaded, say); nothing was saved.
      if (!(caught instanceof StockRuleError)) throw caught
      setSaveError(`${caught.message} Nothing was saved.`)
      setFreshItems(await fetchVisitItems())
    } finally {
      setSaving(false)
    }
  }

  const back = <BackButton fallback={paths.visits} />

  if (status === 'error') {
    return (
      <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState title="Unable to load the visit form." onRetry={reload} />
      </div>
    )
  }

  if (!data) {
    return (
      <>
        <p className="sr-only" role="status">
          Loading visit form…
        </p>
        <VisitSkeleton back={back} />
      </>
    )
  }

  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {discardDialog}
      <BackButton onBack={cancel} />
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">New Visit</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {identified.student
                ? `${identified.student.fullName} · LRN ${maskLrn(identified.student.lrn)} · ${identified.student.gradeLevel}`
                : 'Student not identified yet.'}
            </p>
          </div>
          <Badge tone="info" variant="soft" icon="stethoscope">
            Staff form
          </Badge>
        </div>
      </Card>

      {saved && (
        <div
          role="status"
          className="rounded-md border border-success bg-success/10 px-4 py-3 text-sm font-semibold text-text-primary"
        >
          Visit saved.{' '}
          {saved.given > 0 && `${saved.given} ${saved.given === 1 ? 'item was' : 'items were'} taken from inventory. `}
          {saved.withFollowUp ? 'A pending follow-up was created.' : 'No follow-up was created.'}
          {saved.belowZero.length > 0 && (
            <span className="mt-1 block text-warning">
              Now below zero: {saved.belowZero.join(', ')}. Recount and restock.
            </span>
          )}
          {saved.letterPrepared && (
            <span className="mt-2 flex flex-wrap items-center gap-2 font-normal">
              An excuse letter draft was saved with the visit. It isn't approved yet.
              {/* Replaces the submitted form in history, so Back from the letter can't reopen it. */}
              <Link
                to={paths.excuseLetter(saved.visitId)}
                replace
                className={buttonClassName({ size: 'sm' })}
              >
                Review excuse letter
              </Link>
            </span>
          )}
        </div>
      )}

      {saveError && (
        <div role="alert" className="rounded-md border border-error bg-error/10 px-4 py-3 text-sm font-semibold text-text-primary">
          {saveError}
        </div>
      )}

      <form ref={formRef} onSubmit={onSubmit} noValidate>
        <p role="status" className="sr-only">
          {invalid.announcement}
        </p>
        <Card aria-labelledby="visit-form-title">
          <CardHeader
            titleId="visit-form-title"
            title="Visit details"
            icon={<Icon name="stethoscope" />}
            description="Required fields are marked."
          />
          <CardBody className="flex flex-col gap-4">
            <StudentPicker
              search={searchVisitStudents}
              selected={identified.student}
              onClear={identified.reset}
              onSelect={(student) => {
                setSaved(null)
                void identified.select(student.id)
              }}
              error={identified.error}
              addStudentHref={viewer.role === 'staff' ? paths.studentNew : undefined}
              autoFocus
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DatePicker
                label="Visit date"
                value={visitDate}
                max={today}
                onChange={(next) => {
                  setVisitDate(next)
                  setEditedAt(Date.now())
                  setErrors((current) => ({ ...current, visitTime: undefined }))
                }}
                error={errors.visitTime}
              />
              <Input
                type="time"
                label="Time"
                value={visitClock}
                hint="Now by default. Change it only for a visit entered afterwards."
                onChange={(event) => {
                  setVisitClock(event.target.value)
                  setEditedAt(Date.now())
                  setErrors((current) => ({ ...current, visitTime: undefined }))
                }}
              />
            </div>
            {isLateEntry && (
              <Input
                label="Reason for late entry (optional)"
                value={lateEntryReason}
                maxLength={200}
                hint="For example: system was down, paper entry. Saved as a late entry either way."
                onChange={(event) => setLateEntryReason(event.target.value)}
              />
            )}
            <ComplaintField
              value={complaint}
              onChange={updateComplaint}
              suggestions={suggestions}
              error={errors.complaint}
            />
            {looksLikeEmergency && (
              <div role="note" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning bg-warning/10 px-3 py-2 text-sm text-text-primary">
                <span className="flex items-center gap-2">
                  <Icon name="alertTriangle" size={16} className="shrink-0 text-warning" />
                  This looks like an emergency. Escalate to an incident?
                </span>
                <Button size="sm" onClick={escalateToIncident}>
                  Escalate to incident
                </Button>
              </div>
            )}
            {cleanComplaint(complaint) ? (
              <TriagePanel
                complaint={complaint}
                complaintTypes={data.complaintTypes}
                checked={triageSteps}
                onToggle={toggleStep}
              />
            ) : (
              <EmptyState
                icon="clipboardList"
                title="Enter a complaint to show the first-aid checklist"
                description="The checklist appears when the complaint matches a predefined type."
                className="rounded-md border border-border bg-surface"
              />
            )}
            <TextareaField
              label="Treatment notes"
              hint="Optional. Care that isn't stock: rest, cold compress, wound cleaning, advice."
              value={treatment}
              onChange={setTreatment}
            />
            <MedicineInNotesHint
              notes={treatment}
              items={freshItems ?? data.items}
              lines={lines}
              onAdd={(line) => {
                setLines((current) => [...current, line])
                setSaved(null)
              }}
            />
            <ItemsGivenField
              items={freshItems ?? data.items}
              lines={lines}
              onChange={(next) => {
                setLines(next)
                setSaved(null)
                setErrors((current) => ({ ...current, itemsGiven: undefined }))
              }}
              allergies={allergies}
              error={errors.itemsGiven}
            />
            <div>
              <p className="mb-1 text-xs font-semibold text-text-primary">Disposition</p>
              <SegmentedControl
                label="Disposition"
                // Four options: two by two on a phone, one row from sm up (panel review VS-1 added Resting).
                className="max-sm:grid max-sm:w-full max-sm:grid-cols-2"
                value={disposition}
                onChange={(next) => {
                  // Disposition-specific fields start fresh whenever the disposition changes.
                  setDisposition(next)
                  setDispositionValues(emptyDispositionValues(today))
                  setErrors((current) => ({ ...current, excusedUntil: undefined }))
                }}
                options={dispositionOptions}
                size="md"
              />
            </div>
            <DispositionFields
              disposition={disposition}
              values={dispositionValues}
              onChange={(next) => {
                setDispositionValues(next)
                setErrors((current) => ({ ...current, excusedUntil: undefined }))
              }}
              errors={errors}
            />

            <fieldset className="rounded-md border border-border p-4">
              <legend className="px-1 text-sm font-semibold text-text-primary">Follow-up prompt</legend>
              <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface motion-reduce:transition-none">
                <input
                  type="checkbox"
                  checked={needsFollowUp}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setNeedsFollowUp(event.target.checked)
                  }
                  className="mt-0.5 size-4 cursor-pointer accent-brand-green-dark"
                />
                <span>
                  <span className="block text-sm font-semibold text-text-primary">
                    This student needs a follow-up
                  </span>
                  <span className="block text-xs text-text-secondary">
                    Creates a pending follow-up connected to this visit.
                  </span>
                </span>
              </label>
              {needsFollowUp && (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DatePicker
                    label="Follow-up date"
                    value={followUpDate}
                    min={today}
                    required
                    onChange={(next) => {
                      setFollowUpDate(next)
                      setErrors((current) => ({ ...current, followUpDate: undefined }))
                    }}
                    error={errors.followUpDate}
                  />
                  <Input
                    label="Reason"
                    value={followUpReason}
                    required
                    onChange={(event) => {
                      setFollowUpReason(event.target.value)
                      setErrors((current) => ({ ...current, followUpReason: undefined }))
                    }}
                    error={errors.followUpReason}
                  />
                  <div className="sm:col-span-2">
                    <TextareaField
                      label="Notes"
                      value={followUpNotes}
                      onChange={setFollowUpNotes}
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </fieldset>

            <LogbookFields
              values={logbook}
              onChange={(next) => {
                setLogbook(next)
                setSaved(null)
                setErrors((current) => ({ ...current, timeOut: undefined }))
              }}
              errors={errors}
              open={moreOpen}
              onOpenChange={setMoreOpen}
              ranges={data.vitalsRanges}
              timeOutRef={timeOutRef}
            />

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              {!treatment.trim() && !lines.length && (
                <p className="mr-auto text-xs text-text-secondary">No treatment recorded. You can still save.</p>
              )}
              <Button type="button" variant="secondary" icon="alertTriangle" onClick={escalateToIncident}>
                Escalate to incident
              </Button>
              <Button type="button" variant="neutral" onClick={cancel}>Cancel</Button>
              <Button type="submit" variant="primary" loading={saving}>
                Save Visit
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  )
}
