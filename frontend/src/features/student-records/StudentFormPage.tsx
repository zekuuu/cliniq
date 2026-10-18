import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  BackButton,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
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
  fetchStudentFormContext,
  submitStudentForm,
  type DuplicateMatch,
  type StudentFormContext,
  type StudentFormMode,
  type StudentFormValues,
} from './api/studentFormApi'

interface StudentFormErrors {
  fullName?: string
  gradeLevel?: string
  sex?: string
  contactInfo?: string
  emergencyContactName?: string
  emergencyContactRelationship?: string
  emergencyContactPhone?: string
  allergies?: string
  medicalConditions?: string
}

const EMPTY_VALUES: StudentFormValues = {
  fullName: '',
  gradeLevel: '',
  sex: '',
  contactInfo: '',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
  allergies: '',
  medicalConditions: '',
}

function valuesFromStudent(student: Student | null): StudentFormValues {
  if (!student) return EMPTY_VALUES
  return {
    fullName: student.fullName,
    gradeLevel: student.gradeLevel,
    sex: student.sex,
    contactInfo: student.contactInfo,
    emergencyContactName: student.emergencyContact?.name ?? '',
    emergencyContactRelationship: student.emergencyContact?.relationship ?? '',
    emergencyContactPhone: student.emergencyContact?.phone ?? '',
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
                {match.studentNumber} · {match.gradeLevel}
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

function validate(values: StudentFormValues): StudentFormErrors {
  const errors: StudentFormErrors = {}
  if (!values.fullName.trim()) errors.fullName = 'Enter the student full name.'
  if (!values.gradeLevel) errors.gradeLevel = 'Select the grade level.'
  if (!values.sex) errors.sex = 'Select the sex recorded by the school.'
  if (!values.contactInfo.trim()) errors.contactInfo = 'Enter the student contact information.'
  if (!values.emergencyContactName.trim()) {
    errors.emergencyContactName = 'Enter the emergency contact name.'
  }
  if (!values.emergencyContactRelationship.trim()) {
    errors.emergencyContactRelationship = 'Enter the contact relationship.'
  }
  if (!values.emergencyContactPhone.trim()) {
    errors.emergencyContactPhone = 'Enter the emergency contact phone.'
  } else if (!isPhilippinePhone(values.emergencyContactPhone)) {
    errors.emergencyContactPhone = PHONE_ERROR
  }
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
  const studentNumber = data.student?.studentNumber ?? data.nextStudentNumber
  // What the form last matched in storage: the loaded record, then a newly created one.
  const [baseline, setBaseline] = useState<StudentFormValues>(() => valuesFromStudent(data.student))
  const { cancel, discardDialog } = useCancelNavigation(
    data.student ? paths.studentProfile(data.student.studentNumber) : paths.students,
    (Object.keys(values) as Array<keyof StudentFormValues>).some((field) => values[field] !== baseline[field]),
  )
  const title = mode === 'edit' ? 'Edit Student' : 'Add Student'
  const description =
    mode === 'edit'
      ? 'Update the record fields Staff maintain directly.'
      : 'Encode a new student record. Student Number is assigned by the system on save.'

  const requiredCount = useMemo(
    () => Object.keys(validate(values)).length,
    [values],
  )

  function setField<K extends keyof StudentFormValues>(field: K, value: StudentFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSuccessMessage('')
  }

  async function save(confirmDuplicate = false) {
    const nextErrors = validate(values)
    setErrors(nextErrors)
    invalid.report(Object.keys(nextErrors).length)
    if (Object.keys(nextErrors).length > 0) return

    setIsSaving(true)
    try {
      const result = await submitStudentForm(values, {
        mode,
        studentId: data.student?.id,
        confirmDuplicate,
      })
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
        void navigate(paths.studentProfile(result.student.studentNumber), {
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
          <div className="rounded-md border border-border bg-surface px-3 py-2 text-right">
            <p className="text-xs font-semibold text-text-secondary">Student Number</p>
            <p className="font-semibold text-text-primary">{studentNumber}</p>
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
                required
                value={values.contactInfo}
                error={errors.contactInfo}
                onChange={(event) => setField('contactInfo', event.target.value)}
              />
            </section>

            <section aria-labelledby="emergency-contact-title">
              <h2 id="emergency-contact-title" className="mb-3 text-sm font-bold text-text-primary">
                Emergency contact
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input
                  label="Contact name"
                  required
                  value={values.emergencyContactName}
                  error={errors.emergencyContactName}
                  onChange={(event) => setField('emergencyContactName', event.target.value)}
                />
                <Input
                  label="Relationship"
                  required
                  value={values.emergencyContactRelationship}
                  error={errors.emergencyContactRelationship}
                  onChange={(event) =>
                    setField('emergencyContactRelationship', event.target.value)
                  }
                />
                <Input
                  label="Contact phone"
                  required
                  value={values.emergencyContactPhone}
                  error={errors.emergencyContactPhone}
                  onChange={(event) => setField('emergencyContactPhone', event.target.value)}
                />
              </div>
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
  studentNumber,
}: {
  viewer?: SessionUser
  studentNumber?: string
}) {
  const { data, status, isRefetching, reload } = useAsyncData(
    `student-form|${studentNumber ?? 'new'}`,
    () => fetchStudentFormContext(studentNumber),
  )

  if (viewer.role !== 'staff') {
    return (
      <div className="mx-auto max-w-page-narrow px-4 pt-10 pb-8 sm:px-8">
        <ErrorState title="Staff access required." />
      </div>
    )
  }

  const back = (
    <BackButton fallback={studentNumber ? paths.studentProfile(studentNumber) : paths.students} />
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

  const editorKey = `${data.mode}:${data.student?.id ?? data.nextStudentNumber}`
  return <StudentFormEditor key={editorKey} data={data} isRefetching={isRefetching} />
}
