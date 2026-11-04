import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { BackButton, Button, Card, CardBody, CardHeader, ErrorState, Icon, ComboboxWithOther, HealthListField, Input, NameFields, Select, SexRadios, Skeleton } from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useCancelNavigation } from '../../hooks/useCancelNavigation'
import { useFocusFirstInvalid } from '../../hooks/useFocusFirstInvalid'
import { isPhilippinePhone, PHONE_ERROR } from '../../lib/phone'
import { getMockSessionUser, type SessionUser } from '../../lib/mock-db'
import { paths } from '../../routes/paths'
import { NONE_RECORDED } from '../../lib/patients'
import { STARTER_ALLERGIES, STARTER_CONDITIONS } from '../../config/healthStarterList'
import { setSavedMessage } from '../../lib/savedMessage'
import type { Personnel } from '../../types/entities'
import { fetchStaffFormContext, submitStaffForm, type StaffFormContext, type StaffFormValues } from './api/staffApi'

/** D4: a choice from the values in use, or Other to type one; at most 60 characters (PERSONNEL_DEPARTMENT_MAX in the data layer). */
const DEPARTMENT_MAX = 60
const RELATIONSHIP_SUGGESTIONS = ['Spouse', 'Parent', 'Sister or brother', 'Son or daughter', 'Relative']
const EMPTY_CONTACT = { name: '', relationship: '', phone: '', verified: false }

type Errors = Partial<Record<string, string>>

function valuesFrom(person: Personnel | null): StaffFormValues {
  if (!person) return { firstName: '', lastName: '', middleName: '', sex: '', type: '', department: '', contactInfo: '', emergencyContacts: [EMPTY_CONTACT], allergies: '', medicalConditions: '' }
  return {
    firstName: person.firstName,
    lastName: person.lastName,
    middleName: person.middleName ?? '',
    sex: person.sex ?? '',
    type: person.type,
    department: person.department ?? '',
    contactInfo: person.contactInfo,
    emergencyContacts: person.emergencyContacts.length
      ? person.emergencyContacts.map(({ name, relationship, phone, verified }) => ({ name, relationship, phone, verified }))
      : [EMPTY_CONTACT],
    allergies: person.allergies.length ? person.allergies.join(', ') : NONE_RECORDED,
    medicalConditions: person.medicalConditions.length ? person.medicalConditions.join(', ') : NONE_RECORDED,
  }
}

const contactKey = (index: number, field: 'name' | 'relationship' | 'phone') => `emergencyContacts.${index}.${field}`

/** Only the name, sex and type are required (D3 to D6, ADR-063); a contact that is started must be complete. */
function validate(values: StaffFormValues): Errors {
  const errors: Errors = {}
  if (!values.firstName.trim()) errors.firstName = "Enter the staff member's first name."
  if (!values.lastName.trim()) errors.lastName = "Enter the staff member's last name."
  if (!values.sex) errors.sex = 'Choose the sex.'
  if (!values.type) errors.type = 'Select the staff type.'
  if (values.department.trim().length > DEPARTMENT_MAX) errors.department = `Use at most ${DEPARTMENT_MAX} characters.`
  values.emergencyContacts.forEach((contact, index) => {
    if (![contact.name, contact.relationship, contact.phone].some((value) => value.trim())) return
    if (!contact.name.trim()) errors[contactKey(index, 'name')] = 'Enter the emergency contact name.'
    if (!contact.relationship.trim()) errors[contactKey(index, 'relationship')] = 'Enter the contact relationship.'
    if (!contact.phone.trim()) errors[contactKey(index, 'phone')] = 'Enter the emergency contact phone.'
    else if (!isPhilippinePhone(contact.phone)) errors[contactKey(index, 'phone')] = PHONE_ERROR
  })
  return errors
}

function FormSkeleton({ back }: { back: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Card className="p-5">
          <Skeleton className="h-7 w-56 max-w-full" />
        </Card>
        <Card className="p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function Editor({ data, viewer }: { data: StaffFormContext; viewer: SessionUser }) {
  const initial = valuesFrom(data.personnel)
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const formRef = useRef<HTMLFormElement>(null)
  const invalid = useFocusFirstInvalid(formRef)
  const { cancel, discardDialog, allowLeave } = useCancelNavigation(
    data.personnel ? paths.staffProfile(data.personnel.id) : paths.staff,
    JSON.stringify(values) !== JSON.stringify(initial),
  )
  const editing = data.mode === 'edit'

  function setField<K extends keyof StaffFormValues>(field: K, value: StaffFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function setContact(index: number, field: 'name' | 'relationship' | 'phone', value: string) {
    setValues((current) => ({
      ...current,
      emergencyContacts: current.emergencyContacts.map((contact, i) => (i === index ? { ...contact, [field]: value } : contact)),
    }))
    setErrors((current) => ({ ...current, [contactKey(index, field)]: undefined }))
  }

  function setContacts(next: StaffFormValues['emergencyContacts']) {
    setValues((current) => ({ ...current, emergencyContacts: next.length ? next : [EMPTY_CONTACT] }))
    setErrors({})
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = validate(values)
    setErrors(next)
    invalid.report(Object.keys(next).length)
    if (Object.keys(next).length) return
    setSaving(true)
    setSaveError('')
    try {
      const { personnel, action } = await submitStaffForm(values, { personnelId: data.personnel?.id, actor: viewer })
      setSavedMessage(`Staff record ${action === 'create' ? 'created' : 'updated'} for ${personnel.fullName}.`)
      // An edit returns through history, so the next Back leaves the profile instead of showing it again.
      allowLeave()
      if (action === 'update' && location.key !== 'default') void navigate(-1)
      else void navigate(paths.staffProfile(personnel.id), { replace: true })
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'The staff record could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {discardDialog}
      <BackButton onBack={cancel} />
      <Card className="p-5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">{editing ? 'Edit Staff' : 'Add Staff'}</h1>
        <p className="mt-1 text-sm text-text-secondary">
          A teacher, non-teaching staff member or utility worker seen at the clinic. Only the name, sex and type are required.
        </p>
      </Card>

      <form ref={formRef} noValidate onSubmit={(event) => void onSubmit(event)}>
        <p role="status" className="sr-only">
          {invalid.announcement}
        </p>
        <Card aria-labelledby="staff-form-title">
          <CardHeader titleId="staff-form-title" title="Staff information" icon={<Icon name="user" />} />
          <CardBody className="flex flex-col gap-5">
            {saveError && (
              <p role="alert" className="rounded-md border border-error bg-error/10 px-3 py-2 text-sm font-semibold text-text-primary">
                {saveError}
              </p>
            )}
            <section aria-labelledby="staff-identity" className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <h2 id="staff-identity" className="sr-only">
                Identity
              </h2>
              {editing && (
                <Input
                  label="Staff No."
                  readOnly
                  value={data.personnel?.staffNumber ?? ''}
                  hint="Assigned by CLINIQ; it can't be changed."
                  inputClassName="cursor-default bg-surface hover:border-border"
                />
              )}
              <NameFields
                className="md:col-span-2"
                values={values}
                errors={errors}
                hint="Write the name as it appears on the school's staff records."
                onChange={(field, value) => setField(field, value)}
              />
              <SexRadios value={values.sex} error={errors.sex} onChange={(value) => setField('sex', value)} />
              <Select
                label="Type"
                required
                value={values.type}
                placeholder="Select type"
                options={data.types.map((type) => ({ value: type, label: type }))}
                error={errors.type}
                onChange={(value) => setField('type', value)}
              />
              {/* R19: every department or role in use, as a type-ahead; Other (specify) for a new one. */}
              <ComboboxWithOther
                label="Department or role"
                otherOption="Other (specify)"
                otherLabel="Specify other department or role"
                value={values.department}
                options={data.departments}
                pickOnly
                maxLength={DEPARTMENT_MAX}
                hint={`Optional. Type to find one in use, or Other (specify) for a new one (at most ${DEPARTMENT_MAX} characters).`}
                error={errors.department}
                onValueChange={(value) => setField('department', value)}
              />
              <Input label="Contact number" hint="Optional." value={values.contactInfo} onChange={(event) => setField('contactInfo', event.target.value)} />
            </section>

            <section aria-labelledby="staff-contacts">
              <h2 id="staff-contacts" className="text-sm font-bold text-text-primary">
                Emergency contacts
              </h2>
              <p className="mt-1 text-sm text-text-secondary">Optional. The first contact is primary.</p>
              <div className="mt-3 flex flex-col gap-3">
                {values.emergencyContacts.map((contact, index) => {
                  const label = index === 0 ? 'Primary emergency contact' : `Emergency contact ${index + 1}`
                  return (
                    <fieldset key={index} className="rounded-md border border-border bg-surface p-3">
                      <legend className="px-1 text-sm font-semibold text-text-primary">{label}</legend>
                      <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <Input label="Name"
                          icon="user"
                          aria-label={`${label} name`} value={contact.name} error={errors[contactKey(index, 'name')]} onChange={(event) => setContact(index, 'name', event.target.value)} />
                        <ComboboxWithOther
                          label="Relationship"
                          icon="users"
                          otherOption="Other"
                          otherLabel="Say which relationship"
                          aria-label={`${label} relationship`}
                          value={contact.relationship}
                          options={RELATIONSHIP_SUGGESTIONS}
                          error={errors[contactKey(index, 'relationship')]}
                          onValueChange={(value) => setContact(index, 'relationship', value)}
                        />
                        <Input label="Phone"
                          icon="phone"
                          type="tel"
                          aria-label={`${label} phone`} value={contact.phone} error={errors[contactKey(index, 'phone')]} onChange={(event) => setContact(index, 'phone', event.target.value)} />
                      </div>
                      {values.emergencyContacts.length > 1 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {index > 0 && (
                            <Button variant="secondary" size="sm" onClick={() => setContacts([contact, ...values.emergencyContacts.filter((_, i) => i !== index)])}>
                              Make primary
                            </Button>
                          )}
                          <Button variant="neutral" size="sm" onClick={() => setContacts(values.emergencyContacts.filter((_, i) => i !== index))}>
                            Remove contact
                          </Button>
                        </div>
                      )}
                    </fieldset>
                  )
                })}
              </div>
              <Button variant="secondary" className="mt-3" onClick={() => setContacts([...values.emergencyContacts, EMPTY_CONTACT])}>
                Add another contact
              </Button>
            </section>

            <section aria-labelledby="staff-medical-title">
              <h2 id="staff-medical-title" className="mb-3 text-sm font-bold text-text-primary">
                Allergies and conditions
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <HealthListField label="Allergies" list={STARTER_ALLERGIES} value={values.allergies} onValueChange={(value) => setField('allergies', value)} />
                <HealthListField
                  label="Medical conditions"
                  list={STARTER_CONDITIONS}
                  value={values.medicalConditions}
                  onValueChange={(value) => setField('medicalConditions', value)}
                />
              </div>
            </section>

            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button variant="neutral" onClick={cancel}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" icon="checkCircle" loading={saving}>
                {editing ? 'Save Changes' : 'Save Staff'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  )
}

/** Add Staff and Edit Staff (ADR-043, D3 to D6, D9). School Clinician only. */
export function StaffFormPage({ viewer = getMockSessionUser(), personnelId }: { viewer?: SessionUser; personnelId?: string }) {
  const { data, status, reload } = useAsyncData(`staff-form|${personnelId ?? 'new'}`, () => fetchStaffFormContext(personnelId))
  const back = <BackButton fallback={personnelId ? paths.staffProfile(personnelId) : paths.staff} />

  if (viewer.role !== 'staff') {
    return (
      <div className="mx-auto max-w-page-narrow px-4 pt-10 pb-8 sm:px-8">
        <ErrorState asPageTitle title="Staff access required." />
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState asPageTitle title="Unable to load the staff form." onRetry={reload} />
      </div>
    )
  }
  if (!data) {
    return (
      <>
        <p className="sr-only" role="status">
          Loading staff form...
        </p>
        <FormSkeleton back={back} />
      </>
    )
  }
  return <Editor key={data.personnel?.id ?? 'new'} data={data} viewer={viewer} />
}
