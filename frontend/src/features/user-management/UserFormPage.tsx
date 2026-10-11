import { useState, type FormEvent } from 'react'
import { Button, Card, CardBody, CardHeader, ErrorState, Icon, Input, Select, Skeleton } from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useCancelNavigation } from '../../hooks/useCancelNavigation'
import { getMockSessionUser } from '../../lib/mock-db'
import { paths } from '../../routes/paths'
import type { UserRole } from '../../types/entities'
import { DuplicateUsernameError, fetchUser, submitUser } from './api/userApi'

export function UserFormPage({ userId }: { userId?: string }) {
  const { data: existing, status, reload } = useAsyncData(`user|${userId ?? 'new'}`, () =>
    userId ? fetchUser(userId) : Promise.resolve(null),
  )
  if (status === 'error')
    return (
      <div className="mx-auto max-w-page-narrow px-4 pt-10 pb-8 sm:px-8">
        <ErrorState title="Unable to load this account." onRetry={reload} />
      </div>
    )
  if (existing === undefined) return <FormSkeleton />
  return <UserForm key={existing?.id ?? 'new'} userId={userId} initial={existing} />
}

function FormSkeleton() {
  return (
    <>
      <p className="sr-only" role="status">
        Loading account...
      </p>
      <div aria-hidden="true" className="mx-auto max-w-page-narrow px-4 pt-10 pb-8 sm:px-8">
        <Card className="p-5">
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
  initial: { name: string; username: string; role: UserRole } | null
}) {
  const cancel = useCancelNavigation(paths.users)
  const [name, setName] = useState(initial?.name ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [role, setRole] = useState<UserRole>(initial?.role ?? 'staff')
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; username?: string }>({})
  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors = {
      name: name.trim() ? undefined : "Enter the person's full name.",
      username: username.trim() ? undefined : 'Enter a username for this account.',
    }
    setErrors(nextErrors)
    setSaved(false)
    if (nextErrors.name || nextErrors.username) return
    try {
      await submitUser({ name, username, role }, { userId, actor: getMockSessionUser() })
    } catch (cause) {
      if (!(cause instanceof DuplicateUsernameError)) throw cause
      setErrors({ username: 'Another account already uses this username. Choose a different one.' })
      return
    }
    setSaved(true)
  }
  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
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
          <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
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
