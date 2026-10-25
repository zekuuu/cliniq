import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { formatDateTime } from '../../lib/dates'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  Modal,
  Skeleton,
  buttonClassName,
  type DataTableColumn,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { sortTableRows, toggleTableSort, type TableSortState } from '../../lib/tableSort'
import { getMockSessionUser, ROLE_LABELS, type SessionUser } from '../../lib/mock-db'
import { paths } from '../../routes/paths'
import type { User } from '../../types/entities'
import { changeUserStatus, fetchUsers, LastAdminError, resetPassword } from './api/userApi'
import { UserAvatar } from './UserAvatar'

type UserSortKey = 'name' | 'username' | 'role' | 'status' | 'lastLogin'

const baseColumns: Array<DataTableColumn<User>> = [
  {
    key: 'name',
    header: 'Name',
    rowHeader: true,
    cell: (user) => (
      <span className="flex min-w-0 items-center gap-2">
        <UserAvatar name={user.name} picture={user.profilePicture} />
        <span className="truncate">{user.name}</span>
      </span>
    ),
  },
  { key: 'username', header: 'Username', cell: (user) => user.username },
  {
    key: 'role',
    header: 'Role',
    cell: (user) => (
      <Badge tone="neutral" variant="soft">
        {ROLE_LABELS[user.role]}
      </Badge>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    cell: (user) =>
      user.deactivatedAt ? (
        <Badge tone="neutral" variant="outline">
          Disabled
        </Badge>
      ) : (
        <Badge tone="success" variant="soft">
          Active
        </Badge>
      ),
  },
  {
    key: 'lastLogin',
    header: 'Last login',
    cell: (user) => (user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'),
  },
]
function UserListSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      <Card className="p-5">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </Card>
      <Card className="p-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="mt-3 h-8 w-full" />
        ))}
      </Card>
    </div>
  )
}

export function UserListPage({ viewer = getMockSessionUser() }: { viewer?: SessionUser }) {
  const { data: users, status, reload } = useAsyncData('users', fetchUsers)
  const [sort, setSort] = useState<TableSortState<UserSortKey>>({ key: 'lastLogin', direction: 'descending' })
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [resetFor, setResetFor] = useState<User | null>(null)
  // Panel review AC-7: enabling, disabling and resetting a password ask for the Admin's password first.

  async function toggleStatus(user: User) {
    const enable = Boolean(user.deactivatedAt)
    try {
      await changeUserStatus(user.id, enable, viewer)
      setNotice({ tone: 'success', text: `${user.name}'s account is ${enable ? 'enabled' : 'disabled'}.` })
      reload()
    } catch (cause) {
      if (!(cause instanceof LastAdminError)) throw cause
      setNotice({ tone: 'error', text: cause.message })
    }
  }
  if (status === 'error')
    return (
      <div className="mx-auto max-w-page-wide px-4 pt-10 pb-8 sm:px-8">
        <ErrorState title="Unable to load user accounts." onRetry={reload} />
      </div>
    )
  if (!users)
    return (
      <>
        <p className="sr-only" role="status">
          Loading user accounts...
        </p>
        <UserListSkeleton />
      </>
    )
  const sortColumn = (key: UserSortKey, label: string) => ({
    label,
    direction: sort.key === key ? sort.direction : undefined,
    onSort: () => setSort((current) => toggleTableSort(current, key)),
  })
  const columns: Array<DataTableColumn<User>> = baseColumns.map((column) => {
    if (column.key === 'name') return { ...column, sort: sortColumn('name', 'Name') }
    if (column.key === 'username') return { ...column, sort: sortColumn('username', 'Username') }
    if (column.key === 'role') return { ...column, sort: sortColumn('role', 'Role') }
    if (column.key === 'status') return { ...column, sort: sortColumn('status', 'Status') }
    if (column.key === 'lastLogin') return { ...column, sort: sortColumn('lastLogin', 'Last login') }
    return column
  })
  columns.push({
    key: 'actions',
    header: 'Actions',
    cell: (user) => (
      <span className="flex flex-wrap gap-2">
        <Link className={buttonClassName({ variant: 'secondary', size: 'sm' })} to={paths.userEdit(user.id)}>
          Edit
        </Link>
        <Button size="sm" variant="neutral" onClick={() => void toggleStatus(user)} aria-label={`${user.deactivatedAt ? 'Enable' : 'Disable'} ${user.name}`}>
          {user.deactivatedAt ? 'Enable' : 'Disable'}
        </Button>
        <Button size="sm" variant="neutral" onClick={() => setResetFor(user)} aria-label={`Reset password for ${user.name}`}>
          Reset Password
        </Button>
      </span>
    ),
  })
  const sortedUsers = sortTableRows(users, sort, (user, key) => {
    if (key === 'name') return user.name
    if (key === 'username') return user.username
    if (key === 'role') return ROLE_LABELS[user.role]
    if (key === 'status') return user.deactivatedAt ? 'Disabled' : 'Active'
    return user.lastLogin ?? null
  })
  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">User Management</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Add, disable and reset the accounts of the clinic team. Disabled accounts stay listed and can't sign in.
            </p>
          </div>
          <Link className={buttonClassName({ variant: 'primary' })} to={paths.userNew}>
            <Icon name="userCog" />
            Add User
          </Link>
        </div>
      </Card>
      {notice && (
        <p
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={`rounded-md border px-3 py-2 text-sm font-semibold text-text-primary ${notice.tone === 'error' ? 'border-error bg-error/10' : 'border-success bg-success/10'}`}
        >
          {notice.text}
        </p>
      )}
      <ResetPasswordDialog
        user={resetFor}
        viewer={viewer}
        onClose={() => setResetFor(null)}
        onDone={(user) => {
          setResetFor(null)
          setNotice({ tone: 'success', text: `${user.name} must change the temporary password at the next sign-in.` })
          reload()
        }}
      />
      <Card aria-labelledby="users-title">
        <CardHeader
          titleId="users-title"
          title="Accounts"
          description={`${users.length} account${users.length === 1 ? '' : 's'}`}
          icon={<Icon name="userCog" />}
        />
        <CardBody>
          {users.length ? (
            <DataTable
              caption="User accounts"
              columns={columns}
              rows={sortedUsers}
              rowKey={(user) => user.id}
              fixedLayout
              minTableWidth="60rem"
            />
          ) : (
            <EmptyState icon="userCog" title="No user accounts" description="Add the first account." />
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function ResetPasswordDialog({
  user,
  viewer,
  onClose,
  onDone,
}: {
  user: User | null
  viewer: SessionUser
  onClose: () => void
  onDone: (user: User) => void
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  function close() {
    setPassword('')
    setError(undefined)
    onClose()
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    if (password.trim().length < 8) return setError('Use at least 8 characters.')
    setSaving(true)
    try {
      await resetPassword(user.id, password, viewer)
      setPassword('')
      setError(undefined)
      onDone(user)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The password could not be reset.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal open={Boolean(user)} title={`Reset password for ${user?.name ?? ''}`} onClose={close}>
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <p className="text-sm text-text-secondary">
          Set a temporary password and tell {user?.name} in private. They must change it at the next sign-in.
          It is not shown again.
        </p>
        <Input
          label="Temporary password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          error={error}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="neutral" onClick={close} data-autofocus>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={saving}>
            Reset Password
          </Button>
        </div>
      </form>
    </Modal>
  )
}
