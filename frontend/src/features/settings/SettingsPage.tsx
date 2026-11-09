import { useState, type FormEvent } from 'react'
import { Button, Card, ErrorState, Input, Skeleton } from '../../components'
import { SaveFeedback } from '../../components/forms/SaveFeedback'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useSaveFeedback } from '../../hooks/useSaveFeedback'
import {
  getIdleSignoutSettings,
  IDLE_SIGNOUT_MAX,
  IDLE_SIGNOUT_MIN,
  IdleSignoutSettingsError,
  saveIdleSignoutSettings,
  validIdleMinutes,
  type IdleSignoutSettings,
  type SessionUser,
} from '../../lib/mock-db'

/*
 * Settings (ADR-078): the idle sign-out minutes per role. Staff edit them; the Admin reads them. Saved
 * values apply to each person's next idle countdown. The fixed 7-day session maximum is not a setting.
 */

const RANGE_MESSAGE = `Enter whole minutes from ${IDLE_SIGNOUT_MIN} to ${IDLE_SIGNOUT_MAX}.`

export function SettingsPage({ viewer }: { viewer: SessionUser }) {
  const canEdit = viewer.role === 'staff'
  const settings = useAsyncData('idle-signout-settings', getIdleSignoutSettings)
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
    </div>
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
    )
      return setError(RANGE_MESSAGE)
    await feedback.run(() => saveIdleSignoutSettings(input, viewer), {
      saved: 'Sign-out times saved.',
      failed: (cause) => (cause instanceof IdleSignoutSettingsError ? cause.message : undefined),
    })
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
      {feedback.result && <SaveFeedback result={feedback.result} />}
      {canEdit && (
        <div>
          <Button type="submit" variant="primary" loading={feedback.saving} done={feedback.result?.kind === 'saved'}>
            Save
          </Button>
        </div>
      )}
    </form>
  )
}
