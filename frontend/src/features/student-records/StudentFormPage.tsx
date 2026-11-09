import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  BackButton,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ComboboxWithOther,
  DatePicker,
  ErrorState,
  FormSection,
  FORM_DIVIDER,
  Icon,
  Input,
  MaskedLrn,
  NameFields,
  HealthListField,
  Modal,
  Select,
  SexRadios,
  Skeleton,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useCancelNavigation } from '../../hooks/useCancelNavigation'
import { useFocusFirstInvalid } from '../../hooks/useFocusFirstInvalid'
import { useGoBack } from '../../hooks/useGoBack'
import { isPhilippinePhone, PHONE_ERROR } from '../../lib/phone'
import { paths } from '../../routes/paths'
import type { SessionUser } from '../../lib/mock-db'
import { getMockSessionUser } from '../../lib/mock-db'
import type { ISODate, Student } from '../../types/entities'
import {
  checkStudentDuplicates,
  DUPLICATE_LRN_MESSAGE,
  DuplicateLrnError,
  fetchStudentFormContext,
  NAME_CORRECTION_REASON_MIN,
  submitStudentForm,
  type DuplicateMatch,
  type StudentDuplicateCheck,
  type StudentFormContext,
  type StudentFormMode,
  type StudentFormValues,
} from './api/studentFormApi'
import { unusualAgeNote } from '../../lib/age'
import { formatPersonName } from '../../lib/personName'
import { isLrn, normalizeLrn } from '../../lib/lrn'
import { setSavedMessage } from '../../lib/savedMessage'
import { NONE_RECORDED } from '../../lib/patients'
import { STARTER_ALLERGIES, STARTER_CONDITIONS } from '../../config/healthStarterList'

type StudentFormErrors = Partial<Record<string, string>>

const EMPTY_VALUES: StudentFormValues = {
  lrn: '',
  firstName: '',
  lastName: '',
  middleName: '',
  gradeLevel: '',
  section: '',
  sex: '',
  birthDate: '',
  emergencyContacts: [{ name: '', relationship: '', phone: '', verified: false }],
  allergies: '',
  medicalConditions: '',
}

/** Offers "None recorded" while the field is empty or being typed toward it (ADR-051). */
function valuesFromStudent(student: Student | null): StudentFormValues {
  if (!student) return EMPTY_VALUES
  return {
    lrn: student.lrn,
    firstName: student.firstName,
    lastName: student.lastName,
    middleName: student.middleName ?? '',
    gradeLevel: student.gradeLevel,
    section: student.section ?? '',
    sex: student.sex,
    birthDate: student.birthDate ?? '',
    emergencyContacts: student.emergencyContacts.length
      ? student.emergencyContacts.map(({ name, relationship, phone, verified }) => ({ name, relationship, phone, verified }))
      : [{ name: '', relationship: '', phone: '', verified: false }],
    allergies: student.allergies.length ? student.allergies.join(', ') : NONE_RECORDED,
    medicalConditions: student.medicalConditions.length
      ? student.medicalConditions.join(', ')
      : NONE_RECORDED,
  }
}

function StudentFormSkeleton({ back }: { back: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Card className="p-5">
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </Card>
        <Card className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
          <Skeleton className="mt-5 h-10 w-48" />
        </Card>
      </div>
    </div>
  )
}

function DuplicateDialog({
  matches,
  onCancel,
  onConfirm,
  saving,
}: {
  matches: DuplicateMatch[]
  onCancel: () => void
  onConfirm: () => void
  saving: boolean
}) {
  return (
    <Modal open title="Possible duplicate record" onClose={onCancel}>
        <div className="flex items-start gap-3">
          <Icon name="alertTriangle" className="mt-1 shrink-0 text-warning-text" />
          <div>
            <p className="text-sm text-text-secondary">
              A student with the same full name and grade level already exists. Confirm only if
              this is a different student.
            </p>
          </div>
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {matches.map((match) => (
            <li key={match.id} className="rounded-md border border-border bg-surface px-3 py-2">
              <p className="text-sm font-semibold text-text-primary">{match.fullName}</p>
              <p className="text-xs text-text-secondary">
                <MaskedLrn lrn={match.lrn} /> · {match.gradeLevel}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="neutral" data-autofocus onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" icon="checkCircle" loading={saving} onClick={onConfirm}>
            Confirm Create
          </Button>
        </div>
    </Modal>
  )
}

const RELATIONSHIP_SUGGESTIONS = ['Mother', 'Father', 'Guardian', 'Sister or brother', 'Relative']

/** Saving needs no contact (ADR-059; the record shows as Incomplete until one is added), but a started one must be complete. */
function contactStarted(contact: StudentFormValues['emergencyContacts'][number]): boolean {
  return [contact.name, contact.relationship, contact.phone].some((value) => value.trim())
}

function contactErrorKey(index: number, field: 'name' | 'relationship' | 'phone') {
  return `emergencyContacts.${index}.${field}`
}

function validate(values: StudentFormValues, today: ISODate): StudentFormErrors {
  const errors: StudentFormErrors = {}
  if (!values.lrn) errors.lrn = 'Enter the 12-digit LRN.'
  else if (!isLrn(values.lrn)) errors.lrn = 'The LRN must be exactly 12 digits.'
  if (!values.firstName.trim()) errors.firstName = "Enter the student's first name."
  if (!values.lastName.trim()) errors.lastName = "Enter the student's last name."
  if (!values.gradeLevel) errors.gradeLevel = 'Select the grade level.'
  if (!values.sex) errors.sex = 'Select the sex recorded by the school.'
  if (values.birthDate > today) errors.birthDate = "The birthdate can't be in the future."
  values.emergencyContacts.forEach((contact, index) => {
    if (!contactStarted(contact)) return
    if (!contact.name.trim()) errors[contactErrorKey(index, 'name')] = 'Enter the emergency contact name.'
    if (!contact.relationship.trim()) errors[contactErrorKey(index, 'relationship')] = 'Enter the contact relationship.'
    if (!contact.phone.trim()) errors[contactErrorKey(index, 'phone')] = 'Enter the emergency contact phone.'
    else if (!isPhilippinePhone(contact.phone)) errors[contactErrorKey(index, 'phone')] = PHONE_ERROR
  })
  // Allergies and conditions may be left empty: an empty field reads "None recorded" (ADR-051).
  return errors
}

const MISSING = 'Missing. Fill this in to complete the record.'

/**
 * Edit only: the fields an imported record still lacks (the same ones `missingRequiredFields` counts),
 * marked in red until filled, so Staff who step away and come back see what's left (Zean,
 * November 5, 2026). Saving never blocks on them (ADR-054).
 */
function completionGaps(values: StudentFormValues): StudentFormErrors {
  const gaps: StudentFormErrors = {}
  if (!values.firstName.trim()) gaps.firstName = MISSING
  if (!values.lastName.trim()) gaps.lastName = MISSING
  if (!values.gradeLevel) gaps.gradeLevel = MISSING
  if (!values.sex) gaps.sex = MISSING
  if (!values.birthDate) gaps.birthDate = MISSING
  values.emergencyContacts.forEach((contact, index) => {
    if (!contact.name.trim()) gaps[contactErrorKey(index, 'name')] = MISSING
    if (!contact.relationship.trim()) gaps[contactErrorKey(index, 'relationship')] = MISSING
    if (!contact.phone.trim()) gaps[contactErrorKey(index, 'phone')] = MISSING
  })
  return gaps
}

function StudentFormEditor({
  data,
  isRefetching,
}: {
  data: StudentFormContext
  isRefetching: boolean
}) {
  const [values, setValues] = useState<StudentFormValues>(() => valuesFromStudent(data.student))
  const [errors, setErrors] = useState<StudentFormErrors>({})
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const successRef = useRef<HTMLParagraphElement>(null)
  const [liveDuplicates, setLiveDuplicates] = useState<StudentDuplicateCheck>({ lrnTaken: false, nameMatches: [] })
  // Sir Rey (October 25, 2026): the LRN is locked after creation; a name correction asks why.
  const [nameReason, setNameReason] = useState('')
  const typedName = formatPersonName(values)
  const nameChanged = data.mode === 'edit' && typedName !== (data.student?.fullName ?? '')
  const navigate = useNavigate()
  // Set by the Incomplete Records queue's Edit Record, so a save goes back there instead of to the profile.
  const location = useLocation()
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo
  const goBackToReturn = useGoBack(returnTo ?? paths.students)
  const invalidRef = useRef<HTMLFormElement>(null)
  const invalid = useFocusFirstInvalid(invalidRef)

  const mode: StudentFormMode = data.mode
  // What the form last matched in storage: the loaded record, then a newly created one.
  const [baseline, setBaseline] = useState<StudentFormValues>(() => valuesFromStudent(data.student))
  const { cancel, discardDialog, allowLeave } = useCancelNavigation(
    data.student ? paths.studentProfile(data.student.id) : paths.students,
    JSON.stringify(values) !== JSON.stringify(baseline),
  )
  const ageNote = unusualAgeNote(values.birthDate, values.gradeLevel, data.today, data.unusualAgeYears)
  const title = mode === 'edit' ? 'Edit Student' : 'Add Student'
  const description =
    mode === 'edit'
      ? 'Update the record fields Staff maintain directly.'
      : 'Encode a new student record with the LRN from the school records.'

  // A real error wins over the "Missing" mark; a cleared error (undefined) doesn't hide it.
  const shown = useMemo<StudentFormErrors>(() => {
    if (mode !== 'edit') return errors
    const defined = Object.fromEntries(Object.entries(errors).filter(([, message]) => message))
    return { ...completionGaps(values), ...defined }
  }, [mode, errors, values])

  // Edit Record from the queue lands on the first missing field, not the top of the form.
  const landed = useRef(false)
  useEffect(() => {
    if (landed.current || mode !== 'edit') return
    landed.current = true
    const count = Object.keys(completionGaps(values)).length
    if (count) invalid.report(count)
  }, [mode, values, invalid])

  const requiredCount = useMemo(
    () => Object.keys(validate(values, data.today)).length,
    [values, data.today],
  )

  // Add only: say while typing whether the LRN is taken or the name is already listed.
  useEffect(() => {
    if (mode !== 'add') return
    let stale = false
    const timer = setTimeout(() => {
      void checkStudentDuplicates(values.lrn, typedName).then((result) => {
        if (!stale) setLiveDuplicates(result)
      })
    }, 300)
    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [mode, values.lrn, typedName])

  function setField<K extends keyof StudentFormValues>(field: K, value: StudentFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSuccessMessage('')
  }

  function setEmergencyContact(index: number, field: 'name' | 'relationship' | 'phone', value: string) {
    setValues((current) => ({
      ...current,
      emergencyContacts: current.emergencyContacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact,
      ),
    }))
    setErrors((current) => ({ ...current, [contactErrorKey(index, field)]: undefined }))
    setSuccessMessage('')
  }

  function addEmergencyContact() {
    setValues((current) => ({
      ...current,
      emergencyContacts: [...current.emergencyContacts, { name: '', relationship: '', phone: '', verified: false }],
    }))
    setSuccessMessage('')
  }

  function removeEmergencyContact(index: number) {
    setValues((current) => ({
      ...current,
      emergencyContacts: current.emergencyContacts.filter((_, contactIndex) => contactIndex !== index),
    }))
    setErrors({})
    setSuccessMessage('')
  }

  function makePrimaryEmergencyContact(index: number) {
    setValues((current) => ({
      ...current,
      emergencyContacts: [
        current.emergencyContacts[index],
        ...current.emergencyContacts.filter((_, contactIndex) => contactIndex !== index),
      ],
    }))
    setErrors({})
    setSuccessMessage('')
  }

  async function save(confirmDuplicate = false) {
    const nextErrors = validate(values, data.today)
    if (nameChanged && nameReason.trim().length < NAME_CORRECTION_REASON_MIN)
      nextErrors.nameCorrectionReason = `Enter why the name is being corrected (at least ${NAME_CORRECTION_REASON_MIN} characters).`
    setErrors(nextErrors)
    invalid.report(Object.keys(nextErrors).length)
    if (Object.keys(nextErrors).length > 0) return

    setSuccessMessage('')
    setIsSaving(true)
    try {
      let result
      try {
        result = await submitStudentForm(values, {
          mode,
          studentId: data.student?.id,
          confirmDuplicate,
          nameCorrectionReason: nameChanged ? nameReason : undefined,
        })
      } catch (cause) {
        if (!(cause instanceof DuplicateLrnError)) throw cause
        setErrors({ lrn: cause.message })
        invalid.report(1)
        return
      }
      if (result.status === 'duplicate') {
        setDuplicateMatches(result.matches)
        return
      }
      setDuplicateMatches([])
      if (result.action === 'update' && returnTo) {
        // Back through history, not a new entry, so Back on the queue doesn't show the queue again.
        allowLeave()
        goBackToReturn()
        return
      }
      if (result.action === 'update') {
        // An edit ends on the record it changed, like Visit Details; the profile shows the confirmation.
        // Back through history, so the next Back leaves the profile instead of showing it again.
        setSavedMessage(`Student record updated for ${result.student.fullName}.`)
        allowLeave()
        if (location.key === 'default') void navigate(paths.studentProfile(result.student.id), { replace: true })
        else void navigate(-1)
        return
      }
      // A create clears the form for the next student; the banner says what was saved.
      setValues(EMPTY_VALUES)
      setBaseline(EMPTY_VALUES)
      setSuccessMessage(`Student record created for ${result.student.fullName}.`)
      successRef.current?.scrollIntoView?.({ block: 'center' })
    } finally {
      setIsSaving(false)
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void save(false)
  }

  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {discardDialog}
      <BackButton onBack={cancel} />
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">{title}</h1>
            </div>
            <p className="mt-1 text-sm text-text-secondary">{description}</p>
          </div>
        </div>
      </Card>

      <form ref={invalidRef} noValidate onSubmit={onSubmit}>
        <p role="status" className="sr-only">
          {invalid.announcement}
        </p>
        <Card aria-labelledby="student-form-title">
          <CardHeader
            titleId="student-form-title"
            title="Student information"
            description={`${requiredCount} required field${requiredCount === 1 ? '' : 's'} remaining`}
            icon={<Icon name="userCog" />}
            actions={
              isRefetching ? <Badge tone="warning" variant="soft">Refreshing</Badge> : undefined
            }
          />
          <CardBody className="flex flex-col gap-5">
            <p
              ref={successRef}
              role="status"
              className={successMessage ? 'rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm font-semibold text-success' : 'sr-only'}
            >
              {successMessage}
            </p>

            <FormSection id="identity-title" title="Identity" description="Who the student is, as written in the school records.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {mode === 'edit' ? (
                <Input
                  label="LRN"
                  readOnly
                  value={values.lrn}
                  hint="The LRN is the student's identifier and can't be changed."
                  inputClassName="cursor-default bg-surface hover:border-border"
                />
              ) : (
                <Input
                  label="LRN"
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  value={values.lrn}
                  error={shown.lrn ?? (liveDuplicates.lrnTaken ? DUPLICATE_LRN_MESSAGE : undefined)}
                  hint="12 digits. Spaces and dashes are removed."
                  onChange={(event) => setField('lrn', normalizeLrn(event.target.value))}
                />
              )}
              {/* R12: one answer of two, as radio buttons (the Staff form's SexRadios, ADR-063). */}
              <SexRadios value={values.sex} error={shown.sex} onChange={(value) => setField('sex', value)} />
              <div className="flex flex-col gap-2">
                <DatePicker
                  label="Birthdate"
                  placeholder="Optional"
                  value={values.birthDate}
                  max={data.today}
                  error={shown.birthDate}
                  onChange={(value) => setField('birthDate', value)}
                />
                {ageNote && !shown.birthDate && (
                  <p
                    role="status"
                    className="flex items-start gap-2 rounded-md border border-warning bg-warning-fill px-3 py-2 text-xs text-text-primary"
                  >
                    <Icon name="alertTriangle" className="mt-0.5 shrink-0 text-warning-text" />
                    {ageNote}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 md:col-span-3">
                <NameFields
                  values={values}
                  errors={shown}
                  hint="Write the name as it appears on the school's list."
                  onChange={(field, value) => setField(field, value)}
                />
                {mode === 'add' && liveDuplicates.nameMatches.length > 0 && (
                  <div
                    role="status"
                    className="flex items-start gap-2 rounded-md border border-warning bg-warning-fill px-3 py-2 text-xs text-text-primary"
                  >
                    <Icon name="alertTriangle" className="mt-0.5 shrink-0 text-warning-text" />
                    <div>
                      <p className="font-semibold">Already in the Student List:</p>
                      <ul>
                        {liveDuplicates.nameMatches.map((match) => (
                          <li key={match.id}>
                            {match.gradeLevel} · <MaskedLrn lrn={match.lrn} />
                          </li>
                        ))}
                      </ul>
                      <p>Check it isn't the same student. You can still save.</p>
                    </div>
                  </div>
                )}
              </div>
              {nameChanged && (
                <Input
                  className="md:col-span-3"
                  label="Reason for the name correction"
                  required
                  value={nameReason}
                  error={shown.nameCorrectionReason}
                  hint="For example, a misspelling corrected against the school records. Saved in the audit log."
                  onChange={(event) => {
                    setNameReason(event.target.value)
                    setErrors((current) => ({ ...current, nameCorrectionReason: undefined }))
                  }}
                />
              )}
              </div>
            </FormSection>

            <FormSection id="school-title" title="School details" description="Where the student is enrolled this school year.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Select
                label="Grade level"
                required
                value={values.gradeLevel}
                placeholder="Select grade level"
                options={data.gradeLevels.map((grade) => ({ value: grade, label: grade }))}
                error={shown.gradeLevel}
                onChange={(value) => setField('gradeLevel', value)}
              />
              <Input label="Section" placeholder="Optional" value={values.section} onChange={(event) => setField('section', event.target.value)} />
              </div>
            </FormSection>

            <FormSection id="emergency-contact-title" title="Emergency contacts" description="Who the clinic calls first. The first contact is primary.">
              <div className="flex flex-col gap-3">
                {values.emergencyContacts.map((contact, index) => {
                  const label = index === 0 ? 'Primary emergency contact' : `Emergency contact ${index + 1}`
                  return (
                    <fieldset key={index} className="rounded-md border border-border bg-surface p-3">
                      <legend className="px-1 text-sm font-semibold text-text-primary">{label}</legend>
                      <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <Input
                          label="Name"
                          icon="user"
                          aria-label={`${label} name`}
                          required={contactStarted(contact)}
                          value={contact.name}
                          error={shown[contactErrorKey(index, 'name')]}
                          onChange={(event) => setEmergencyContact(index, 'name', event.target.value)}
                        />
                        <ComboboxWithOther
                          label="Relationship"
                          icon="users"
                          otherOption="Other"
                          otherLabel="Say which relationship"
                          aria-label={`${label} relationship`}
                          required={contactStarted(contact)}
                          value={contact.relationship}
                          options={RELATIONSHIP_SUGGESTIONS}
                          error={shown[contactErrorKey(index, 'relationship')]}
                          onValueChange={(value) => setEmergencyContact(index, 'relationship', value)}
                        />
                        <Input
                          label="Phone"
                          icon="phone"
                          type="tel"
                          aria-label={`${label} phone`}
                          required={contactStarted(contact)}
                          value={contact.phone}
                          error={shown[contactErrorKey(index, 'phone')]}
                          onChange={(event) => setEmergencyContact(index, 'phone', event.target.value)}
                        />
                      </div>
                      {values.emergencyContacts.length > 1 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {index > 0 && <Button variant="secondary" size="sm" onClick={() => makePrimaryEmergencyContact(index)}>Make primary</Button>}
                          <Button variant="neutral" size="sm" onClick={() => removeEmergencyContact(index)}>Remove contact</Button>
                        </div>
                      )}
                    </fieldset>
                  )
                })}
              </div>
              <Button variant="secondary" size="sm" icon="plus" className="self-start" onClick={addEmergencyContact}>Add another contact</Button>
            </FormSection>

            <FormSection id="medical-title" title="Medical history" description="Allergies and conditions the clinic should know before treating.">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <HealthListField label="Allergies" list={STARTER_ALLERGIES} value={values.allergies} error={shown.allergies} onValueChange={(value) => setField('allergies', value)} />
                <HealthListField label="Medical conditions" list={STARTER_CONDITIONS} value={values.medicalConditions} error={shown.medicalConditions} onValueChange={(value) => setField('medicalConditions', value)} />
              </div>
            </FormSection>

            <div className={`flex flex-wrap justify-end gap-2 pt-4 ${FORM_DIVIDER}`}>
              <Button variant="neutral" onClick={cancel}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" icon="checkCircle" loading={isSaving} done={Boolean(successMessage)}>
                {mode === 'edit' ? 'Save Changes' : 'Save Student'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>

      {duplicateMatches.length > 0 && (
        <DuplicateDialog
          matches={duplicateMatches}
          saving={isSaving}
          onCancel={() => setDuplicateMatches([])}
          onConfirm={() => void save(true)}
        />
      )}
    </div>
  )
}

export function StudentFormPage({
  viewer = getMockSessionUser(),
  studentId,
}: {
  viewer?: SessionUser
  studentId?: string
}) {
  const { data, status, isRefetching, reload } = useAsyncData(
    `student-form|${studentId ?? 'new'}`,
    () => fetchStudentFormContext(studentId),
  )

  if (viewer.role !== 'staff') {
    return (
      <div className="mx-auto max-w-page-narrow px-4 pt-10 pb-8 sm:px-8">
        <ErrorState asPageTitle title="Staff access required." />
      </div>
    )
  }

  const back = (
    <BackButton fallback={studentId ? paths.studentProfile(studentId) : paths.students} />
  )

  if (status === 'error') {
    return (
      <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState asPageTitle title="Unable to load student form." onRetry={reload} />
      </div>
    )
  }

  if (!data) {
    return (
      <>
        <p className="sr-only" role="status">
          Loading student form...
        </p>
        <StudentFormSkeleton back={back} />
      </>
    )
  }

  const editorKey = `${data.mode}:${data.student?.id ?? 'new'}`
  return <StudentFormEditor key={editorKey} data={data} isRefetching={isRefetching} />
}
