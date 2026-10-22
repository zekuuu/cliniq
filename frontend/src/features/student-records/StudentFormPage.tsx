import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { contactInfoRequired } from '../../lib/students'
import { useLocation, useNavigate } from 'react-router'
import {
  BackButton,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Combobox,
  ErrorState,
  Icon,
  Input,
  Modal,
  Select,
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
import type { Student } from '../../types/entities'
import {
  DuplicateLrnError,
  fetchStudentFormContext,
  submitStudentForm,
  type DuplicateMatch,
  type StudentFormContext,
  type StudentFormMode,
  type StudentFormValues,
} from './api/studentFormApi'
import { isLrn, maskLrn, normalizeLrn } from '../../lib/lrn'

type StudentFormErrors = Partial<Record<string, string>>

const EMPTY_VALUES: StudentFormValues = {
  lrn: '',
  fullName: '',
  gradeLevel: '',
  sex: '',
  contactInfo: '',
  emergencyContacts: [{ name: '', relationship: '', phone: '', verified: false }],
  allergies: '',
  medicalConditions: '',
}

function valuesFromStudent(student: Student | null): StudentFormValues {
  if (!student) return EMPTY_VALUES
  return {
    lrn: student.lrn,
    fullName: student.fullName,
    gradeLevel: student.gradeLevel,
    sex: student.sex,
    contactInfo: student.contactInfo,
    emergencyContacts: student.emergencyContacts.length
      ? student.emergencyContacts.map(({ name, relationship, phone, verified }) => ({ name, relationship, phone, verified }))
      : [{ name: '', relationship: '', phone: '', verified: false }],
    allergies: student.allergies.length ? student.allergies.join(', ') : 'None',
    medicalConditions: student.medicalConditions.length
      ? student.medicalConditions.join(', ')
      : 'None',
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
          <Icon name="alertTriangle" className="mt-1 shrink-0 text-warning" />
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
                LRN {maskLrn(match.lrn)} · {match.gradeLevel}
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

const RELATIONSHIP_SUGGESTIONS = ['Mother', 'Father', 'Guardian', 'Sister or brother', 'Relative', 'Other']

function contactErrorKey(index: number, field: 'name' | 'relationship' | 'phone') {
  return `emergencyContacts.${index}.${field}`
}

function validate(values: StudentFormValues): StudentFormErrors {
  const errors: StudentFormErrors = {}
  if (!values.lrn) errors.lrn = 'Enter the 12-digit LRN.'
  else if (!isLrn(values.lrn)) errors.lrn = 'The LRN must be exactly 12 digits.'
  if (!values.fullName.trim()) errors.fullName = 'Enter the student full name.'
  if (!values.gradeLevel) errors.gradeLevel = 'Select the grade level.'
  if (!values.sex) errors.sex = 'Select the sex recorded by the school.'
  if (contactInfoRequired(values.gradeLevel) && !values.contactInfo.trim()) errors.contactInfo = 'Enter the student contact information.'
  values.emergencyContacts.forEach((contact, index) => {
    const started = index === 0 || [contact.name, contact.relationship, contact.phone].some((value) => value.trim())
    if (!started) return
    if (!contact.name.trim()) errors[contactErrorKey(index, 'name')] = 'Enter the emergency contact name.'
    if (!contact.relationship.trim()) errors[contactErrorKey(index, 'relationship')] = 'Enter the contact relationship.'
    if (!contact.phone.trim()) errors[contactErrorKey(index, 'phone')] = 'Enter the emergency contact phone.'
    else if (!isPhilippinePhone(contact.phone)) errors[contactErrorKey(index, 'phone')] = PHONE_ERROR
  })
  if (!values.allergies.trim()) errors.allergies = 'Enter allergies, or write None.'
  if (!values.medicalConditions.trim()) {
    errors.medicalConditions = 'Enter medical conditions, or write None.'
  }
  return errors
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
  const navigate = useNavigate()
  // Set by the Incomplete Records queue's Edit Record, so a save goes back there instead of to the profile.
  const returnTo = (useLocation().state as { returnTo?: string } | null)?.returnTo
  const goBackToReturn = useGoBack(returnTo ?? paths.students)
  const invalidRef = useRef<HTMLFormElement>(null)
  const invalid = useFocusFirstInvalid(invalidRef)

  const mode: StudentFormMode = data.mode
  // What the form last matched in storage: the loaded record, then a newly created one.
  const [baseline, setBaseline] = useState<StudentFormValues>(() => valuesFromStudent(data.student))
  const { cancel, discardDialog } = useCancelNavigation(
    data.student ? paths.studentProfile(data.student.id) : paths.students,
    JSON.stringify(values) !== JSON.stringify(baseline),
  )
  const title = mode === 'edit' ? 'Edit Student' : 'Add Student'
  const description =
    mode === 'edit'
      ? 'Update the record fields Staff maintain directly.'
      : 'Encode a new student record with the LRN from the school records.'

  const requiredCount = useMemo(
    () => Object.keys(validate(values)).length,
    [values],
  )

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
    const nextErrors = validate(values)
    setErrors(nextErrors)
    invalid.report(Object.keys(nextErrors).length)
    if (Object.keys(nextErrors).length > 0) return

    setIsSaving(true)
    try {
      let result
      try {
        result = await submitStudentForm(values, {
          mode,
          studentId: data.student?.id,
          confirmDuplicate,
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
        goBackToReturn()
        return
      }
      if (result.action === 'update') {
        // An edit ends on the record it changed, like Visit Details; the profile shows the confirmation.
        void navigate(paths.studentProfile(result.student.id), {
          replace: true,
          state: { savedMessage: `Student record updated for ${result.student.fullName}.` },
        })
        return
      }
      setBaseline(values)
      setSuccessMessage(
        result.action === 'create'
          ? `Student record created for ${result.student.fullName}.`
          : `Student record updated for ${result.student.fullName}.`,
      )
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
              <Badge tone={mode === 'edit' ? 'info' : 'success'} variant="soft">
                {mode === 'edit' ? 'Editing existing' : 'New record'}
              </Badge>
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
              <Badge tone={isRefetching ? 'warning' : 'neutral'} variant="soft">
                {isRefetching ? 'Refreshing' : 'Staff only'}
              </Badge>
            }
          />
          <CardBody className="flex flex-col gap-5">
            {successMessage && (
              <div className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm font-semibold text-success">
                {successMessage}
              </div>
            )}

            <section aria-labelledby="identity-title" className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <h2 id="identity-title" className="sr-only">
                Identity
              </h2>
              <Input
                label="LRN"
                required
                inputMode="numeric"
                autoComplete="off"
                value={values.lrn}
                error={errors.lrn}
                hint="The 12-digit Learner Reference Number. Spaces and dashes are removed."
                onChange={(event) => setField('lrn', normalizeLrn(event.target.value))}
              />
              <Input
                label="Full name"
                required
                value={values.fullName}
                error={errors.fullName}
                onChange={(event) => setField('fullName', event.target.value)}
              />
              <Select
                label="Grade level"
                required
                size="sm"
                value={values.gradeLevel}
                placeholder="Select grade level"
                options={data.gradeLevels.map((grade) => ({ value: grade, label: grade }))}
                error={errors.gradeLevel}
                onChange={(value) => setField('gradeLevel', value)}
              />
              <Select
                label="Sex"
                required
                size="sm"
                value={values.sex}
                placeholder="Select sex"
                options={[
                  { value: 'female', label: 'Female' },
                  { value: 'male', label: 'Male' },
                ]}
                error={errors.sex}
                onChange={(value) => setField('sex', value as StudentFormValues['sex'])}
              />
              <Input
                label="Student contact information"
                required={contactInfoRequired(values.gradeLevel)}
                hint={contactInfoRequired(values.gradeLevel) ? undefined : 'Optional for Kinder. The emergency contacts below are still required.'}
                value={values.contactInfo}
                error={errors.contactInfo}
                onChange={(event) => setField('contactInfo', event.target.value)}
              />
            </section>

            <section aria-labelledby="emergency-contact-title">
              <h2 id="emergency-contact-title" className="text-sm font-bold text-text-primary">
                Emergency contacts
              </h2>
              <p className="mt-1 text-sm text-text-secondary">The first contact is primary. Add every person the clinic may need to reach.</p>
              <div className="mt-3 flex flex-col gap-3">
                {values.emergencyContacts.map((contact, index) => {
                  const label = index === 0 ? 'Primary emergency contact' : `Emergency contact ${index + 1}`
                  return (
                    <fieldset key={index} className="rounded-md border border-border bg-surface p-3">
                      <legend className="px-1 text-sm font-semibold text-text-primary">{label}</legend>
                      <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <Input
                          label={`${label} name`}
                          required={index === 0}
                          value={contact.name}
                          error={errors[contactErrorKey(index, 'name')]}
                          onChange={(event) => setEmergencyContact(index, 'name', event.target.value)}
                        />
                        <Combobox
                          label={`${label} relationship`}
                          required={index === 0}
                          value={contact.relationship}
                          options={RELATIONSHIP_SUGGESTIONS}
                          optionKey={(option) => option}
                          optionLabel={(option) => option}
                          allowFreeText
                          error={errors[contactErrorKey(index, 'relationship')]}
                          onValueChange={(value) => setEmergencyContact(index, 'relationship', value)}
                        />
                        <Input
                          label={`${label} phone`}
                          required={index === 0}
                          value={contact.phone}
                          error={errors[contactErrorKey(index, 'phone')]}
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
              <Button variant="secondary" className="mt-3" onClick={addEmergencyContact}>Add another contact</Button>
            </section>

            <section aria-labelledby="medical-title">
              <h2 id="medical-title" className="mb-3 text-sm font-bold text-text-primary">
                Medical history
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Allergies"
                  required
                  hint="Comma-separated list, or write None."
                  value={values.allergies}
                  error={errors.allergies}
                  onChange={(event) => setField('allergies', event.target.value)}
                />
                <Input
                  label="Medical conditions"
                  required
                  hint="Comma-separated list, or write None."
                  value={values.medicalConditions}
                  error={errors.medicalConditions}
                  onChange={(event) => setField('medicalConditions', event.target.value)}
                />
              </div>
            </section>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button variant="neutral" onClick={cancel}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" icon="checkCircle" loading={isSaving}>
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
        <ErrorState title="Staff access required." />
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
        <ErrorState title="Unable to load student form." onRetry={reload} />
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
