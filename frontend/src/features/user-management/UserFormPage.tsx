import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { BackButton, Button, Card, CardBody, CardHeader, ErrorState, Icon, Input, Select, Skeleton } from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useCancelNavigation } from '../../hooks/useCancelNavigation'
import { useFocusFirstInvalid } from '../../hooks/useFocusFirstInvalid'
import { getMockSessionUser } from '../../lib/mock-db'
import { paths } from '../../routes/paths'
import type { UserRole } from '../../types/entities'
import { DuplicateUsernameError, fetchUser, submitUser } from './api/userApi'
import { profilePictureError, resizeProfilePicture, PROFILE_PICTURE_ACCEPT } from './profilePicture'
import { UserAvatar } from './UserAvatar'

export function UserFormPage({ userId }: { userId?: string }) {
  const { data: existing, status, reload } = useAsyncData(`user|${userId ?? 'new'}`, () =>
    userId ? fetchUser(userId) : Promise.resolve(null),
  )
  const back = <BackButton fallback={paths.users} />
  if (status === 'error')
    return (
      <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState title="Unable to load this account." onRetry={reload} />
      </div>
    )
  if (existing === undefined) return <FormSkeleton back={back} />
  return <UserForm key={existing?.id ?? 'new'} userId={userId} initial={existing} />
}

function FormSkeleton({ back }: { back: ReactNode }) {
  return (
    <>
      <p className="sr-only" role="status">
        Loading account...
      </p>
      <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <Card aria-hidden="true" className="p-5">
          <Skeleton className="h-7 w-40" />
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="mt-4 h-12" />
          ))}
        </Card>
      </div>
    </>
  )
}

function UserForm({
  userId,
  initial,
}: {
  userId?: string
  initial: { name: string; username: string; role: UserRole; profilePicture?: string | null } | null
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [role, setRole] = useState<UserRole>(initial?.role ?? 'staff')
  const [profilePicture, setProfilePicture] = useState<string | null>(initial?.profilePicture ?? null)
  const [pictureError, setPictureError] = useState<string>()
  const [preparingPicture, setPreparingPicture] = useState(false)
  const [saved, setSaved] = useState(false)
  // What the form last matched in storage: the loaded account, then each saved version.
  const [baseline, setBaseline] = useState({ name: initial?.name ?? '', username: initial?.username ?? '', role: initial?.role ?? 'staff', profilePicture: initial?.profilePicture ?? null })
  const { cancel, discardDialog } = useCancelNavigation(
    paths.users,
    name !== baseline.name || username !== baseline.username || role !== baseline.role || profilePicture !== baseline.profilePicture,
  )
  const [errors, setErrors] = useState<{ name?: string; username?: string }>({})
  const invalidRef = useRef<HTMLFormElement>(null)
  const invalid = useFocusFirstInvalid(invalidRef)
  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors = {
      name: name.trim() ? undefined : "Enter the person's full name.",
      username: username.trim() ? undefined : 'Enter a username for this account.',
    }
    setErrors(nextErrors)
    invalid.report([nextErrors.name, nextErrors.username].filter(Boolean).length)
    setSaved(false)
    if (nextErrors.name || nextErrors.username) return
    try {
      await submitUser({ name, username, role, profilePicture }, { userId, actor: getMockSessionUser() })
    } catch (cause) {
      if (!(cause instanceof DuplicateUsernameError)) throw cause
      setErrors({ username: 'Another account already uses this username. Choose a different one.' })
      return
    }
    setSaved(true)
    setBaseline({ name, username, role, profilePicture })
  }
  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {discardDialog}
      <BackButton onBack={cancel} />
      <Card className="p-5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {userId ? 'Edit User' : 'Add User'}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Assign the smallest role needed for the person's work.
        </p>
      </Card>
      <Card>
        <CardHeader title="Account details" icon={<Icon name="userCog" />} />
        <CardBody>
          <form ref={invalidRef} className="flex flex-col gap-4" onSubmit={submit} noValidate>
            <p role="status" className="sr-only">
              {invalid.announcement}
            </p>
            <Input
              label="Full name"
              value={name}
              required
              error={errors.name}
              onChange={(event) => setName(event.target.value)}
            />
            <Input
              label="Username"
              value={username}
              required
              error={errors.username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <Select
              label="Role"
              value={role}
              options={[
                { value: 'staff', label: 'School Clinician' },
                { value: 'admin', label: 'Admin / Principal' },
                { value: 'instructor', label: 'PE/Sports Instructor' },
              ]}
              onChange={(value) => setRole(value as UserRole)}
            />
            <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3">
              <div className="flex items-center gap-3">
                <UserAvatar name={name || 'New user'} picture={profilePicture} className="size-12 text-sm" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Profile picture</p>
                  <p className="text-xs text-text-secondary">Optional. JPEG, PNG, or WebP; maximum 2 MB. Stored as a 256 px square in this mock only.</p>
                </div>
              </div>
              <Input
                label="Upload profile picture"
                type="file"
                accept={PROFILE_PICTURE_ACCEPT}
                disabled={preparingPicture}
                error={pictureError}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0]
                  event.currentTarget.value = ''
                  if (!file) return
                  const invalidPicture = profilePictureError(file)
                  if (invalidPicture) {
                    setPictureError(invalidPicture)
                    return
                  }
                  setPictureError(undefined)
                  setPreparingPicture(true)
                  void resizeProfilePicture(file)
                    .then(setProfilePicture)
                    .catch((cause: unknown) => setPictureError(cause instanceof Error ? cause.message : 'The image could not be prepared.'))
                    .finally(() => setPreparingPicture(false))
                }}
              />
              {profilePicture && (
                <Button type="button" size="sm" variant="neutral" className="self-start" onClick={() => setProfilePicture(null)}>
                  Remove picture
                </Button>
              )}
            </div>
            <p className="text-xs text-text-secondary">
              Passwords are provisioned through the future Sanctum account workflow and are never
              displayed here.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="neutral" onClick={cancel}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                {userId ? 'Save Changes' : 'Create User'}
              </Button>
            </div>
            {saved && (
              <p
                role="status"
                className="rounded-md border border-success bg-success/10 px-3 py-2 text-sm font-semibold text-text-primary"
              >
                User saved and audit event recorded.
              </p>
            )}
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
