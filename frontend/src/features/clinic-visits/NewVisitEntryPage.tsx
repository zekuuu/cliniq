import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
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
import { getMockSessionUser, StockRuleError, type ComplaintType, type InventoryItemView, type SessionUser } from '../../lib/mock-db'
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
import { DispositionFields } from './DispositionFields'
import {
  dispositionErrors,
  dispositionPayload,
  emptyDispositionValues,
  type DispositionErrors,
} from './dispositionValues'

/** Smart Triage's complaint type for what was typed: a case-insensitive match, or none. */
function matchComplaintType(complaint: string, complaintTypes: ComplaintType[]): ComplaintType | undefined {
  const typed = cleanComplaint(complaint).toLowerCase()
  return typed ? complaintTypes.find((type) => type.label.toLowerCase() === typed) : undefined
}


const dispositionOptions = [
  { value: 'returned_to_class', label: 'Returned to class' },
  { value: 'sent_home', label: 'Sent home' },
  { value: 'referred_to_hospital', label: 'Referred to hospital' },
] satisfies Array<{ value: Disposition; label: string }>

interface Errors extends DispositionErrors {
  complaint?: string
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
export function NewVisitEntryPage({
  viewer = getMockSessionUser(),
  studentNumber,
}: {
  viewer?: SessionUser
  studentNumber?: string
}) {
  const today = todayISO()
  const { data, status, reload } = useAsyncData(`new-visit|${studentNumber ?? 'unidentified'}`, () =>
    fetchNewVisitContext(studentNumber),
  )
  const identified = useIdentifiedStudent(data?.student, findVisitStudent)
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
  // Anything typed or chosen beyond the defaults; a save clears the form back to them.
  const { cancel, discardDialog } = useCancelNavigation(
    paths.visits,
    complaint.trim() !== '' ||
      treatment.trim() !== '' ||
      lines.length > 0 ||
      triageSteps.length > 0 ||
      disposition !== 'returned_to_class' ||
      needsFollowUp,
  )

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
    if (lines.some((line) => line.quantity < 1)) next.itemsGiven = 'Each quantity must be at least 1.'
    if (needsFollowUp) {
      if (!followUpDate) next.followUpDate = 'Choose a follow-up date.'
      if (!followUpReason.trim()) next.followUpReason = 'Enter the follow-up reason.'
    }
    return { ...next, ...dispositionErrors(disposition, dispositionValues) }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!data) return
    const nextErrors = validate()
    const studentOk = identified.validate('Choose the student: type a Student Number or name, then pick from the list.')
    setErrors(nextErrors)
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
      setDisposition('returned_to_class')
      setDispositionValues(emptyDispositionValues(today))
      setTriageSteps([])
      setNeedsFollowUp(false)
      setFollowUpDate(addDays(today, 1))
      setFollowUpReason('')
      setFollowUpNotes('')
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
                ? `${identified.student.fullName} · ${identified.student.studentNumber} · ${identified.student.gradeLevel}`
                : 'Student not identified yet. Search by Student Number or name below.'}
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
            description={
              data.student
                ? 'Required fields are marked. The student is already identified from lookup/scan.'
                : 'Required fields are marked. Search by Student Number or name to identify the student.'
            }
          />
          <CardBody className="flex flex-col gap-4">
            {!data.student && (
              <StudentPicker
                search={searchVisitStudents}
                selected={identified.student}
                onClear={identified.reset}
                onSelect={(student) => {
                  setSaved(null)
                  void identified.select(student.studentNumber)
                }}
                error={identified.error}
                addStudentHref={viewer.role === 'staff' ? paths.studentNew : undefined}
              />
            )}
            <ComplaintField
              value={complaint}
              onChange={updateComplaint}
              suggestions={suggestions}
              error={errors.complaint}
            />
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
                title="Enter a complaint to show Smart Triage"
                description="A first-aid checklist appears when the complaint matches a predefined type."
                className="rounded-md border border-border bg-surface"
              />
            )}
            <TextareaField
              label="Treatment notes"
              hint="Optional. Care that isn't stock: rest, cold compress, wound cleaning, advice."
              value={treatment}
              onChange={setTreatment}
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

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              {!treatment.trim() && !lines.length && (
                <p className="mr-auto text-xs text-text-secondary">No treatment recorded. You can still save.</p>
              )}
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
