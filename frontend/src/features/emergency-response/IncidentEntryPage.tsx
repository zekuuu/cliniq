import { useId, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DatePicker,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  ItemsGivenField,
  ListRow,
  RowList,
  SegmentedControl,
  Select,
  Skeleton,
  StatusBadge,
  StudentPicker,
  type ItemLineDraft,
  type StatusMap,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useCancelNavigation } from '../../hooks/useCancelNavigation'
import { useFocusFirstInvalid } from '../../hooks/useFocusFirstInvalid'
import { paths } from '../../routes/paths'
import { useIdentifiedStudent } from '../../hooks/useIdentifiedStudent'
import { addDays, todayISO } from '../../lib/dates'
import { draftsFrom, formatItemGiven } from '../../lib/itemsGiven'
import {
  getMockSessionUser,
  StockRuleError,
  type SessionUser,
  type VitalsWarningRanges,
} from '../../lib/mock-db'
import type { HospitalReferral, Incident, ParentNotificationOutcome } from '../../types/entities'
import {
  completeStageTwoIncident,
  fetchIncidentEntryContext,
  findIncidentStudent,
  searchIncidentStudents,
  saveStageOneIncident,
  type IncidentEntryContext,
} from './api/incidentEntryApi'

type ScreenStage = 'stage1' | 'stage2'
type IncidentStatus = 'needs_completion' | 'in_progress' | 'complete'

const incidentStatusMap = {
  needs_completion: {
    label: 'Needs completion',
    tone: 'warning',
    icon: 'alertTriangle',
    variant: 'soft',
  },
  in_progress: { label: 'In progress', tone: 'info', icon: 'clock', variant: 'soft' },
  complete: { label: 'Complete', tone: 'success', icon: 'checkCircle', variant: 'soft' },
} satisfies StatusMap<IncidentStatus>

const notificationOutcomes = [
  { value: 'reached', label: 'Reached' },
  { value: 'not_reached', label: 'Not reached' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'left_message', label: 'Left message' },
] satisfies Array<{ value: ParentNotificationOutcome; label: string }>

interface Errors {
  complaint?: string
  temperatureC?: string
  pulseBpm?: string
  bloodPressure?: string
  oxygenSaturation?: string
  itemsGiven?: string
  referralDestination?: string
  notificationDetail?: string
  followUpReason?: string
}

function IncidentSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      <Card className="p-5">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </Card>
      <Card className="p-5">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-56 max-w-full" />
        </div>
      </Card>
    </div>
  )
}

function TextareaField({
  label,
  value,
  onChange,
  error,
  required,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  rows?: number
}) {
  const id = useId()
  const errorId = error ? `${id}-error` : undefined
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
        aria-describedby={errorId}
        onChange={(event) => onChange(event.target.value)}
        className={`resize-y rounded-md border bg-background px-3 py-2 text-sm text-text-primary shadow-card transition-colors duration-150 hover:border-brand-green motion-reduce:transition-none ${
          error ? 'border-error' : 'border-border'
        }`}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  )
}

function validateStageOne(complaint: string, temperatureC: string, pulseBpm: string): Errors {
  const next: Errors = {}
  if (!complaint) next.complaint = 'Select the emergency complaint.'
  if (!temperatureC) next.temperatureC = 'Enter the temperature.'
  if (!pulseBpm) next.pulseBpm = 'Enter the pulse.'
  return next
}

/**
 * Readings outside the configured ranges. A warning only, never a reason to block the save: Stage 1
 * is fast capture, and the ranges are placeholder sanity bounds until the nurse sets real ones.
 */
function unusualVitals(
  temperatureC: string,
  pulseBpm: string,
  ranges: VitalsWarningRanges,
): string[] {
  const outside = (value: string, { min, max }: { min: number; max: number }) =>
    value.trim() !== '' && Number.isFinite(Number(value)) && (Number(value) < min || Number(value) > max)
  const notes: string[] = []
  if (outside(temperatureC, ranges.temperatureC)) notes.push(`Temperature ${temperatureC} °C looks unusual.`)
  if (outside(pulseBpm, ranges.pulseBpm)) notes.push(`Pulse ${pulseBpm} bpm looks unusual.`)
  return notes
}

/**
 * Incident Entry (Screen #16 / #16b, Reference 5). Stage 1 intentionally accepts only the fast
 * essentials; Stage 2 completes the same incident with full vitals, referral, notifications, and
 * optional follow-up.
 */
export function IncidentEntryPage({
  viewer = getMockSessionUser(),
  studentNumber,
  incidentId,
}: {
  viewer?: SessionUser
  studentNumber?: string
  /** Reopens this saved incident at Stage 2 (Screen #16b). */
  incidentId?: string
}) {
  const { data, status, reload } = useAsyncData(
    `incident-entry|${incidentId ?? ''}|${studentNumber ?? 'unidentified'}`,
    () => fetchIncidentEntryContext({ studentNumber, incidentId }),
  )

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-page-narrow px-4 pt-10 pb-8 sm:px-8">
        <ErrorState title="Unable to load the incident form." onRetry={reload} />
      </div>
    )
  }
  if (!data) {
    return (
      <>
        <p className="sr-only" role="status">
          Loading incident form…
        </p>
        <IncidentSkeleton />
      </>
    )
  }
  return (
    <IncidentEntryForm
      key={data.incident?.id ?? data.student?.id ?? 'unidentified'}
      viewer={viewer}
      data={data}
    />
  )
}

function vital(incident: Incident | null, key: string): string {
  const value = incident?.vitals[key]
  return value === undefined ? '' : String(value)
}

function IncidentEntryForm({ viewer, data }: { viewer: SessionUser; data: IncidentEntryContext }) {
  const today = todayISO()
  const existing = data.incident
  const identified = useIdentifiedStudent(data.student, findIncidentStudent)
  const student = identified.student
  const [stage, setStage] = useState<ScreenStage>(existing ? 'stage2' : 'stage1')
  const [incident, setIncident] = useState<Incident | null>(existing)
  const [completed, setCompleted] = useState(existing?.stage === 2)
  const [complaint, setComplaint] = useState(existing?.complaint ?? '')
  const [temperatureC, setTemperatureC] = useState(vital(existing, 'temperatureC'))
  const [pulseBpm, setPulseBpm] = useState(vital(existing, 'pulseBpm'))
  const [generalNotes, setGeneralNotes] = useState(existing?.generalNotes ?? '')
  const [bloodPressure, setBloodPressure] = useState(vital(existing, 'bloodPressure'))
  const [oxygenSaturation, setOxygenSaturation] = useState(vital(existing, 'oxygenSaturation'))
  const [treatmentNotes, setTreatmentNotes] = useState(vital(existing, 'treatmentNotes'))
  const [referToHospital, setReferToHospital] = useState(false)
  const [referralDestination, setReferralDestination] = useState('')
  const [transportMode, setTransportMode] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [departureClock, setDepartureClock] = useState('')
  const [notificationOutcome, setNotificationOutcome] = useState<ParentNotificationOutcome>('reached')
  const [notificationDetail, setNotificationDetail] = useState('')
  const [notifications, setNotifications] = useState<
    Array<{ outcome: ParentNotificationOutcome; timestamp: string; detail: string }>
  >([])
  const [needsFollowUp, setNeedsFollowUp] = useState(false)
  const [followUpDate, setFollowUpDate] = useState(addDays(today, 1))
  const [followUpReason, setFollowUpReason] = useState('')
  const [followUpNotes, setFollowUpNotes] = useState('')
  const [lines, setLines] = useState<ItemLineDraft[]>(() => draftsFrom(existing?.itemsGiven ?? []))
  const [stockMessage, setStockMessage] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [savingStageOne, setSavingStageOne] = useState(false)
  const [savingStageTwo, setSavingStageTwo] = useState(false)
  const invalidRef = useRef<HTMLFormElement>(null)
  const invalid = useFocusFirstInvalid(invalidRef)
  const vitalsWarnings = unusualVitals(temperatureC, pulseBpm, data.vitalsRanges)
  // Stage 1 typed but not saved, or Stage 2 changed from the saved incident but not completed.
  const stageOneDirty =
    !incident && (complaint !== '' || temperatureC !== '' || pulseBpm !== '' || generalNotes.trim() !== '')
  const stageTwoDirty =
    incident !== null &&
    !completed &&
    (bloodPressure !== vital(incident, 'bloodPressure') ||
      oxygenSaturation !== vital(incident, 'oxygenSaturation') ||
      treatmentNotes !== vital(incident, 'treatmentNotes') ||
      referToHospital ||
      notifications.length > 0 ||
      notificationDetail.trim() !== '' ||
      needsFollowUp ||
      lines.length !== incident.itemsGiven.length)
  const { cancel, discardDialog } = useCancelNavigation(paths.incidents, stageOneDirty || stageTwoDirty)

  const statusValue: IncidentStatus = completed ? 'complete' : incident ? 'in_progress' : 'needs_completion'

  async function onStageOneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Stage 1 is saved once; a second submit would create a duplicate incident.
    if (incident) return
    const nextErrors = validateStageOne(complaint, temperatureC, pulseBpm)
    const studentOk = identified.validate()
    setErrors(nextErrors)
    invalid.report(Object.keys(nextErrors).length + (studentOk ? 0 : 1))
    if (Object.keys(nextErrors).length || !studentOk) return
    setSavingStageOne(true)
    try {
      const target = await identified.resolve()
      if (!target) return
      const saved = await saveStageOneIncident(
        { studentId: target.id, complaint, temperatureC, pulseBpm, generalNotes },
        viewer,
      )
      setIncident(saved)
      setStage('stage2')
    } finally {
      setSavingStageOne(false)
    }
  }

  function addNotification() {
    if (!notificationDetail.trim()) {
      setErrors((current) => ({
        ...current,
        notificationDetail: 'Add a short note for this notification attempt.',
      }))
      return
    }
    setNotifications((current) => [
      ...current,
      {
        outcome: notificationOutcome,
        timestamp: new Date().toISOString(),
        detail: notificationDetail.trim(),
      },
    ])
    setNotificationDetail('')
    setErrors((current) => ({ ...current, notificationDetail: undefined }))
  }

  function validateStageTwo(): Errors {
    const next: Errors = {}
    if (!bloodPressure.trim()) next.bloodPressure = 'Enter the blood pressure.'
    if (!oxygenSaturation.trim()) next.oxygenSaturation = 'Enter oxygen saturation.'
    if (referToHospital && !referralDestination.trim()) {
      next.referralDestination = 'Enter the hospital or clinic destination.'
    }
    if (needsFollowUp && !followUpReason.trim()) next.followUpReason = 'Enter the follow-up reason.'
    if (lines.some((line) => line.quantity < 1)) next.itemsGiven = 'Each quantity must be at least 1.'
    return next
  }

  async function onStageTwoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!incident || !student) return
    const nextErrors = validateStageTwo()
    setErrors(nextErrors)
    invalid.report(Object.keys(nextErrors).length)
    if (Object.keys(nextErrors).length) return
    setSavingStageTwo(true)
    setStockMessage('')
    try {
      const hospitalReferral: HospitalReferral | null = referToHospital
        ? {
            destination: referralDestination.trim(),
            transportMode: transportMode.trim() || 'Not recorded',
            departureTime:
              departureDate || departureClock
                ? `${departureDate || today}T${departureClock || '00:00'}`
                : new Date().toISOString(),
          }
        : null
      const result = await completeStageTwoIncident(
        {
          incidentId: incident.id,
          studentId: student.id,
          complaint,
          temperatureC,
          pulseBpm,
          bloodPressure,
          oxygenSaturation,
          treatmentNotes,
          hospitalReferral,
          parentNotifications: notifications.map((item) => ({
            outcome: item.outcome,
            timestamp: item.timestamp,
          })),
          followUp: needsFollowUp
            ? {
                followUpDate,
                reason: followUpReason.trim(),
                notes: followUpNotes.trim() || null,
              }
            : null,
          itemsGiven: lines.map((line) => ({ itemId: line.itemId, quantity: line.quantity, instructions: line.instructions })),
        },
        viewer,
      )
      setIncident(result.incident)
      setCompleted(true)
      if (result.belowZero.length) setStockMessage(`Now below zero: ${result.belowZero.join(', ')}. Recount and restock.`)
    } catch (caught) {
      // The data layer rejected a medicine line; nothing was saved and stock is unchanged.
      if (!(caught instanceof StockRuleError)) throw caught
      setStockMessage(`${caught.message} Nothing was saved.`)
    } finally {
      setSavingStageTwo(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {discardDialog}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {existing ? 'Complete Incident Record' : 'Report Incident'}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {student
                ? `${student.fullName} · ${student.studentNumber} · ${student.gradeLevel}`
                : 'Student not identified yet. Enter the Student Number in Stage 1.'}
            </p>
          </div>
          <StatusBadge status={statusValue} map={incidentStatusMap} />
        </div>
      </Card>

      {incident && (!existing || completed) && (
        <div
          role="status"
          className="rounded-md border border-warning bg-warning/10 px-4 py-3 text-sm font-semibold text-text-primary"
        >
          {completed
            ? 'Incident completed. Stage 2 details are now saved.'
            : 'Stage 1 saved. This incident still needs completion.'}
        </div>
      )}

      {stockMessage && (
        <div role="alert" className="rounded-md border border-error bg-error/10 px-4 py-3 text-sm font-semibold text-text-primary">
          {stockMessage}
        </div>
      )}

      <SegmentedControl
        label="Incident stage"
        value={stage}
        onChange={setStage}
        options={[
          { value: 'stage1', label: 'Stage 1: Fast capture', icon: 'alertTriangle' },
          { value: 'stage2', label: 'Stage 2: Complete later', icon: 'clipboardList' },
        ]}
        size="md"
      />

      {stage === 'stage1' ? (
        <form ref={invalidRef} onSubmit={onStageOneSubmit} noValidate>
          <p role="status" className="sr-only">
            {invalid.announcement}
          </p>
          <Card aria-labelledby="stage-one-title">
            <CardHeader
              titleId="stage-one-title"
              title="Stage 1 fast capture"
              icon={<Icon name="alertTriangle" />}
              description="Capture only the essentials now. Stage 2 can be completed after the immediate situation is handled."
            />
            <CardBody className="flex flex-col gap-4">
              {!data.student && (
                <StudentPicker
                  search={searchIncidentStudents}
                  selected={identified.student}
                  onClear={identified.reset}
                  onSelect={(picked) => void identified.select(picked.studentNumber)}
                  error={identified.error}
                  hint="No student was identified before this emergency. Type a Student Number or the student name, then pick the student."
                  addStudentHref={viewer.role === 'staff' ? paths.studentNew : undefined}
                />
              )}
              <Select
                label="Complaint"
                required
                value={complaint}
                placeholder="Select complaint"
                onChange={(value) => {
                  setComplaint(value)
                  setErrors((current) => ({ ...current, complaint: undefined }))
                }}
                options={data.complaintTypes.map((type) => ({ value: type, label: type }))}
                error={errors.complaint}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  type="number"
                  step="0.1"
                  label="Temperature (°C)"
                  value={temperatureC}
                  required
                  onChange={(event) => {
                    setTemperatureC(event.target.value)
                    setErrors((current) => ({ ...current, temperatureC: undefined }))
                  }}
                  error={errors.temperatureC}
                />
                <Input
                  type="number"
                  label="Pulse (bpm)"
                  value={pulseBpm}
                  required
                  onChange={(event) => {
                    setPulseBpm(event.target.value)
                    setErrors((current) => ({ ...current, pulseBpm: undefined }))
                  }}
                  error={errors.pulseBpm}
                />
              </div>
              {vitalsWarnings.length > 0 && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-md border border-warning bg-warning/10 px-3 py-2 text-sm text-text-primary"
                >
                  <Icon name="alertTriangle" className="mt-0.5 shrink-0 text-warning" />
                  <p>
                    {vitalsWarnings.join(' ')} Please check the reading. You can still save.
                  </p>
                </div>
              )}
              <TextareaField label="Additional notes (optional)" value={generalNotes} onChange={setGeneralNotes} rows={3} />
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button type="button" variant="neutral" className="h-11" onClick={cancel}>Cancel</Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={savingStageOne}
                  disabled={Boolean(incident)}
                  className="h-11 bg-warning text-white hover:bg-warning hover:brightness-90"
                >
                  Save Stage 1
                </Button>
              </div>
            </CardBody>
          </Card>
        </form>
      ) : (
        <form ref={invalidRef} onSubmit={onStageTwoSubmit} noValidate>
          <p role="status" className="sr-only">
            {invalid.announcement}
          </p>
          <Card aria-labelledby="stage-two-title">
            <CardHeader
              titleId="stage-two-title"
              title="Stage 2 completion"
              icon={<Icon name="clipboardList" />}
              description="Complete the same incident record with full vitals, treatment notes, referral details, and parent notification attempts."
            />
            <CardBody className="flex flex-col gap-4">
              {!incident ? (
                <EmptyState
                  icon="alertTriangle"
                  title="Save Stage 1 first"
                  description="Stage 2 opens after the fast-capture record exists."
                  className="rounded-md border border-border bg-surface"
                />
              ) : (
                <>
                  <div className="rounded-md border border-border bg-surface p-3">
                    <p className="text-xs font-semibold text-text-secondary">Stage 1 summary</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{complaint}</p>
                    <p className="text-xs text-text-secondary">
                      {temperatureC}°C · {pulseBpm} bpm
                    </p>
                    {incident.generalNotes && (
                      <p className="mt-2 text-sm whitespace-pre-line text-text-primary">
                        <span className="text-xs font-semibold text-text-secondary">Additional notes: </span>
                        {incident.generalNotes}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      label="Blood pressure"
                      value={bloodPressure}
                      required
                      onChange={(event) => {
                        setBloodPressure(event.target.value)
                        setErrors((current) => ({ ...current, bloodPressure: undefined }))
                      }}
                      error={errors.bloodPressure}
                    />
                    <Input
                      label="Oxygen saturation"
                      value={oxygenSaturation}
                      required
                      onChange={(event) => {
                        setOxygenSaturation(event.target.value)
                        setErrors((current) => ({ ...current, oxygenSaturation: undefined }))
                      }}
                      error={errors.oxygenSaturation}
                    />
                  </div>
                  <TextareaField
                    label="Treatment notes"
                    value={treatmentNotes}
                    onChange={(value) => {
                      setTreatmentNotes(value)
                    }}
                  />
                  {completed && incident && !treatmentNotes.trim() && !incident.itemsGiven.length && (
                    <p className="text-sm text-text-secondary">No treatment recorded</p>
                  )}
                  {completed && incident ? (
                    <section aria-labelledby="incident-items-title" className="rounded-md border border-border p-4">
                      <h2 id="incident-items-title" className="text-sm font-semibold text-text-primary">Medicines &amp; supplies given</h2>
                      {incident.itemsGiven.length ? (
                        <ul className="mt-1 flex flex-col gap-1 text-sm text-text-primary">
                          {incident.itemsGiven.map((line) => <li key={line.itemId}>{formatItemGiven(line)}</li>)}
                        </ul>
                      ) : (
                        <p className="mt-1 text-sm text-text-secondary">None recorded.</p>
                      )}
                      <p className="mt-2 text-xs text-text-secondary">Recorded when Stage 2 was completed; these can't be changed here.</p>
                    </section>
                  ) : (
                    <ItemsGivenField
                      items={data.items}
                      lines={lines}
                      onChange={(next) => {
                        setLines(next)
                        setErrors((current) => ({ ...current, itemsGiven: undefined }))
                      }}
                      allergies={student?.allergies ?? null}
                      error={errors.itemsGiven}
                    />
                  )}

                  <fieldset className="rounded-md border border-border p-4">
                    <legend className="px-1 text-sm font-semibold text-text-primary">
                      Hospital referral
                    </legend>
                    <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface motion-reduce:transition-none">
                      <input
                        type="checkbox"
                        checked={referToHospital}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setReferToHospital(event.target.checked)
                        }
                        className="mt-0.5 size-4 cursor-pointer accent-brand-green-dark"
                      />
                      <span className="text-sm font-semibold text-text-primary">
                        Referred to hospital or clinic
                      </span>
                    </label>
                    {referToHospital && (
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          label="Destination"
                          value={referralDestination}
                          required
                          onChange={(event) => {
                            setReferralDestination(event.target.value)
                            setErrors((current) => ({ ...current, referralDestination: undefined }))
                          }}
                          error={errors.referralDestination}
                        />
                        <Input
                          label="Transport mode"
                          value={transportMode}
                          onChange={(event) => setTransportMode(event.target.value)}
                        />
                        <DatePicker
                          label="Departure date"
                          value={departureDate}
                          max={today}
                          onChange={setDepartureDate}
                        />
                        <Input
                          type="time"
                          label="Departure time"
                          value={departureClock}
                          onChange={(event) => setDepartureClock(event.target.value)}
                        />
                      </div>
                    )}
                  </fieldset>

                  <fieldset className="rounded-md border border-border p-4">
                    <legend className="px-1 text-sm font-semibold text-text-primary">
                      Parent notification log
                    </legend>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[14rem_minmax(0,1fr)_auto]">
                      <div>
                        <p className="mb-1 text-xs font-semibold text-text-primary">Outcome</p>
                        <SegmentedControl
                          label="Notification outcome"
                          value={notificationOutcome}
                          onChange={setNotificationOutcome}
                          options={notificationOutcomes}
                        />
                      </div>
                      <Input
                        label="Attempt note"
                        value={notificationDetail}
                        onChange={(event) => setNotificationDetail(event.target.value)}
                        error={errors.notificationDetail}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="self-end"
                        onClick={addNotification}
                      >
                        Add Attempt
                      </Button>
                    </div>
                    {notifications.length ? (
                      <RowList className="mt-3 rounded-md border border-border">
                        {notifications.map((item, index) => (
                          <ListRow
                            key={`${item.timestamp}-${index}`}
                            primary={notificationOutcomes.find((o) => o.value === item.outcome)?.label}
                            secondary={item.detail}
                            meta={item.timestamp.slice(11, 16)}
                          />
                        ))}
                      </RowList>
                    ) : (
                      <p className="mt-3 text-xs text-text-secondary">
                        No notification attempts added yet.
                      </p>
                    )}
                  </fieldset>

                  <fieldset className="rounded-md border border-border p-4">
                    <legend className="px-1 text-sm font-semibold text-text-primary">
                      Follow-up prompt
                    </legend>
                    <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface motion-reduce:transition-none">
                      <input
                        type="checkbox"
                        checked={needsFollowUp}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setNeedsFollowUp(event.target.checked)
                        }
                        className="mt-0.5 size-4 cursor-pointer accent-brand-green-dark"
                      />
                      <span className="text-sm font-semibold text-text-primary">
                        This incident needs a follow-up
                      </span>
                    </label>
                    {needsFollowUp && (
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <DatePicker
                          label="Follow-up date"
                          value={followUpDate}
                          min={today}
                          required
                          onChange={setFollowUpDate}
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
                          <TextareaField label="Notes" value={followUpNotes} onChange={setFollowUpNotes} rows={3} />
                        </div>
                      </div>
                    )}
                  </fieldset>

                  <div className="flex flex-wrap justify-end gap-2 pt-2">
                    {!treatmentNotes.trim() && !lines.length && !completed && (
                      <p className="mr-auto text-xs text-text-secondary">No treatment recorded. You can still save.</p>
                    )}
                    <Button type="button" variant="neutral" onClick={cancel}>Cancel</Button>
                    <Button type="submit" variant="primary" loading={savingStageTwo}>
                      Complete Incident
                    </Button>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </form>
      )}
    </div>
  )
}
