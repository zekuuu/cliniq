import { useState, type FormEvent } from 'react'
import { notify } from '../../lib/notify'
import { scrollToTop } from '../../lib/scrollToTop'
import { Button, Card, ErrorState, Input, Skeleton } from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useSaveFeedback } from '../../hooks/useSaveFeedback'
import {
  getIdleSignoutSettings,
  IDLE_SIGNOUT_MAX,
  IDLE_SIGNOUT_MIN,
  IdleSignoutSettingsError,
  getOperationalSettings,
  saveOperationalSettings,
  OperationalSettingsError,
  saveIdleSignoutSettings,
  validIdleMinutes,
  type IdleSignoutSettings,
  type OperationalSettings,
  type SessionUser,
} from '../../lib/data'

/*
 * Settings (ADR-078, ADR-091): idle sign-out and operational warning periods. Staff edit them;
 * the Admin reads them. The fixed 7-day session maximum is not a setting.
 */

const RANGE_MESSAGE = `Enter whole minutes from ${IDLE_SIGNOUT_MIN} to ${IDLE_SIGNOUT_MAX}.`

export function SettingsPage({ viewer }: { viewer: SessionUser }) {
  const canEdit = viewer.role === 'staff'
  const settings = useAsyncData('idle-signout-settings', getIdleSignoutSettings)
  const operational = useAsyncData('operational-settings', getOperationalSettings)
  return (
    <div className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      <Card className="p-5">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {canEdit
            ? 'Clinic-wide settings. Changes apply to everyone.'
            : 'Clinic-wide settings, set by the clinic staff.'}
        </p>
      </Card>
      <Card className="p-5" aria-labelledby="idle-signout-title">
        <h2 id="idle-signout-title" className="text-lg font-semibold text-text-primary">
          Sign out after inactivity
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          People are signed out after this many minutes without activity. Shorter is safer on a
          shared computer.
        </p>
        {settings.status === 'error' ? (
          <ErrorState title="Unable to load the settings." onRetry={settings.reload} />
        ) : !settings.data ? (
          <Skeleton className="mt-4 h-24 w-full max-w-md" />
        ) : (
          <IdleSignoutForm initial={settings.data} viewer={viewer} canEdit={canEdit} />
        )}
      </Card>
      <Card className="p-5" aria-labelledby="warning-periods-title">
        <h2 id="warning-periods-title" className="text-lg font-semibold text-text-primary">
          Warning periods
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Choose how far ahead follow-ups and supply expiration appear as upcoming.
        </p>
        {operational.status === 'error' ? (
          <ErrorState title="Unable to load the warning periods." onRetry={operational.reload} />
        ) : !operational.data ? (
          <Skeleton className="mt-4 h-24 w-full max-w-md" />
        ) : (
          <OperationalForm initial={operational.data} viewer={viewer} canEdit={canEdit} />
        )}
      </Card>
    </div>
  )
}

function OperationalForm({
  initial,
  viewer,
  canEdit,
}: {
  initial: OperationalSettings
  viewer: SessionUser
  canEdit: boolean
}) {
  const [values, setValues] = useState({
    followUps: String(initial.upcomingFollowUpDays),
    expiry: String(initial.expiryWarningDays),
  })
  const [error, setError] = useState('')
  const feedback = useSaveFeedback()
  async function submit(event: FormEvent) {
    event.preventDefault()
    const input = {
      upcomingFollowUpDays: Number(values.followUps),
      expiryWarningDays: Number(values.expiry),
    }
    if (
      !Number.isInteger(input.upcomingFollowUpDays) ||
      input.upcomingFollowUpDays < 1 ||
      input.upcomingFollowUpDays > 30 ||
      !Number.isInteger(input.expiryWarningDays) ||
      input.expiryWarningDays < 1 ||
      input.expiryWarningDays > 180
    ) {
      const message = 'Enter whole days: follow-ups 1–30; expiry 1–180.'
      notify.checkFields(message)
      return setError(message)
    }
    let previous = initial
    const result = await feedback.run(
      async () => {
        previous = await getOperationalSettings()
        return saveOperationalSettings(input, viewer)
      },
      {
        saved: 'Warning periods saved',
        failed: (cause) => (cause instanceof OperationalSettingsError ? cause.message : undefined),
        undo: (saved) => ({
          run: () => saveOperationalSettings(previous, viewer),
          checkCurrent: async () => {
            const current = await getOperationalSettings()
            return (
              current.upcomingFollowUpDays === saved.upcomingFollowUpDays &&
              current.expiryWarningDays === saved.expiryWarningDays
            )
          },
          undone: 'Undone: warning periods restored',
          onUndone: () =>
            setValues({
              followUps: String(previous.upcomingFollowUpDays),
              expiry: String(previous.expiryWarningDays),
            }),
        }),
      },
    )
    if (result.ok) scrollToTop()
  }
  return (
    <form noValidate onSubmit={submit} className="mt-4 flex max-w-md flex-col gap-4">
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        <Input
          label="Upcoming follow-ups (days)"
          type="number"
          min="1"
          max="30"
          step="1"
          value={values.followUps}
          disabled={!canEdit}
          clearable={false}
          onChange={(event) => {
            setValues((current) => ({ ...current, followUps: event.target.value }))
            setError('')
          }}
        />
        <Input
          label="Supply expiry warning (days)"
          type="number"
          min="1"
          max="180"
          step="1"
          value={values.expiry}
          disabled={!canEdit}
          clearable={false}
          onChange={(event) => {
            setValues((current) => ({ ...current, expiry: event.target.value }))
            setError('')
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-error">
          {error}
        </p>
      )}
      {canEdit && (
        <div>
          <Button
            type="submit"
            variant="primary"
            loading={feedback.saving}
            done={feedback.result?.kind === 'saved'}
          >
            Save Warning Periods
          </Button>
        </div>
      )}
    </form>
  )
}

function IdleSignoutForm({
  initial,
  viewer,
  canEdit,
}: {
  initial: IdleSignoutSettings
  viewer: SessionUser
  canEdit: boolean
}) {
  const [values, setValues] = useState({
    staff: String(initial.idleSignoutMinutesStaff),
    admin: String(initial.idleSignoutMinutesAdmin),
  })
  const [error, setError] = useState('')
  const feedback = useSaveFeedback()

  async function submit(event: FormEvent) {
    event.preventDefault()
    const input: IdleSignoutSettings = {
      idleSignoutMinutesStaff: Number(values.staff),
      idleSignoutMinutesAdmin: Number(values.admin),
    }
    if (
      !validIdleMinutes(input.idleSignoutMinutesStaff) ||
      !validIdleMinutes(input.idleSignoutMinutesAdmin)
    ) {
      notify.checkFields(RANGE_MESSAGE)
      return setError(RANGE_MESSAGE)
    }
    let previous = initial
    const result = await feedback.run(
      async () => {
        previous = await getIdleSignoutSettings()
        return saveIdleSignoutSettings(input, viewer)
      },
      {
        saved: 'Sign-out times saved',
        failed: (cause) => (cause instanceof IdleSignoutSettingsError ? cause.message : undefined),
        undo: (saved) => ({
          run: () => saveIdleSignoutSettings(previous, viewer),
          checkCurrent: async () => {
            const current = await getIdleSignoutSettings()
            return (
              current.idleSignoutMinutesStaff === saved.idleSignoutMinutesStaff &&
              current.idleSignoutMinutesAdmin === saved.idleSignoutMinutesAdmin
            )
          },
          undone: 'Undone: sign-out times restored',
          onUndone: () => {
            setValues({
              staff: String(previous.idleSignoutMinutesStaff),
              admin: String(previous.idleSignoutMinutesAdmin),
            })
          },
        }),
      },
    )
    // ADR-083: the fields keep what was saved; the page goes back to the top.
    if (result.ok) scrollToTop()
  }

  const set = (key: 'staff' | 'admin', value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
    setError('')
  }

  return (
    <form noValidate onSubmit={submit} className="mt-4 flex max-w-md flex-col gap-4">
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        <Input
          label="Staff (minutes)"
          type="number"
          min={String(IDLE_SIGNOUT_MIN)}
          max={String(IDLE_SIGNOUT_MAX)}
          step="1"
          value={values.staff}
          disabled={!canEdit}
          clearable={false}
          onChange={(event) => set('staff', event.target.value)}
        />
        <Input
          label="Admin (minutes)"
          type="number"
          min={String(IDLE_SIGNOUT_MIN)}
          max={String(IDLE_SIGNOUT_MAX)}
          step="1"
          value={values.admin}
          disabled={!canEdit}
          clearable={false}
          onChange={(event) => set('admin', event.target.value)}
        />
      </div>
      <p className="text-xs text-text-secondary">
        From {IDLE_SIGNOUT_MIN} to {IDLE_SIGNOUT_MAX} minutes. A warning appears two minutes before.
        Everyone is also signed out 7 days after signing in.
      </p>
      {error && (
        <p role="alert" className="text-sm font-semibold text-error">
          {error}
        </p>
      )}
      {canEdit && (
        <div>
          <Button
            type="submit"
            variant="primary"
            loading={feedback.saving}
            done={feedback.result?.kind === 'saved'}
          >
            Save
          </Button>
        </div>
      )}
    </form>
  )
}
