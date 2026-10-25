import { useState, type ReactNode } from 'react'
import { formatDateTime } from '../../lib/dates'
import { BackButton, Badge, Button, Card, CardBody, CardHeader, EmergencyContactList, EmptyState, ErrorState, Icon, Input, Select, Skeleton } from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { paths } from '../../routes/paths'
import { getMockSessionUser, type SessionUser } from '../../lib/mock-db'
import type { ParentNotificationOutcome } from '../../types/entities'
import { fetchIncidentRecord, logParentNotification } from './api/incidentRecordApi'
import { calledContactText, initialCalledDraft, OUTCOME_LABELS, PARENT_NOTIFICATION_OUTCOMES, resolveCalledContact, type CalledContactDraft, type CalledContactErrors } from './notificationOutcomes'
import { CalledContactField } from './CalledContactField'

function NotificationSkeleton({ back }: { back: ReactNode }) {
  return <div className="mx-auto flex flex max-w-page-narrow flex-col gap-4 flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">{back}<div aria-hidden="true"><Card className="p-5"><Skeleton className="h-7 w-64" /><Skeleton className="mt-2 h-4 w-80 max-w-full" /></Card><Card className="p-5"><div className="grid gap-3 sm:grid-cols-[14rem_minmax(0,1fr)_auto]"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10 w-32" /></div><Skeleton className="mt-5 h-24" /></Card></div></div>
}

export function ParentNotificationPage({ viewer = getMockSessionUser(), incidentId }: { viewer?: SessionUser; incidentId?: string }) {
  const { data, status, reload } = useAsyncData(`parent-notification|${incidentId ?? 'default'}`, () => fetchIncidentRecord(incidentId))
  const [outcome, setOutcome] = useState<ParentNotificationOutcome>('reached')
  const [note, setNote] = useState('')
  // The §5 attempt shape is outcome + timestamp only, so a typed note is shown for this session but
  // not stored (ADR-014 lists it as a gap for the API contract).
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  // null means the default: the primary contact, or "Other" when the student has none.
  const [calledDraft, setCalledDraft] = useState<CalledContactDraft | null>(null)
  const [calledErrors, setCalledErrors] = useState<CalledContactErrors>({})

  const back = <BackButton fallback={paths.incidents} />
  if (status === 'error') return <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">{back}<ErrorState title="Unable to load this incident." onRetry={reload} /></div>
  if (data === undefined) return <><p className="sr-only" role="status">Loading parent notification log...</p><NotificationSkeleton back={back} /></>
  if (data === null) return <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">{back}<EmptyState icon="activity" title="No incident selected" description="Open this screen from an incident record to log a parent notification." /></div>
  const { incident, student } = data
  const draft = calledDraft ?? initialCalledDraft(student.emergencyContacts)

  async function addAttempt() {
    const called = resolveCalledContact(draft, student.emergencyContacts)
    setCalledErrors(called.errors ?? {})
    if (!called.contact) return
    setSaving(true)
    try {
      const attempt = await logParentNotification(incident.id, outcome, viewer, called.contact)
      setNotes((current) => ({ ...current, [attempt.timestamp]: note.trim() }))
      setNote(''); setSaved(true); setCalledDraft(null)
      reload()
    } finally { setSaving(false) }
  }

  const attempts = incident.parentNotifications
  return <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
    {back}
    <Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold tracking-tight text-text-primary">Parent Notification Log</h1><p className="mt-1 text-sm text-text-secondary">{student.fullName} · LRN {student.lrn} · {incident.complaint}</p></div><Badge tone={incident.stage === 1 ? 'warning' : 'info'} variant="soft">{incident.stage === 1 ? 'Needs completion' : 'Complete'}</Badge></div></Card>
    <Card aria-labelledby="notification-title"><CardHeader titleId="notification-title" title="Record a notification attempt" icon={<Icon name="activity" />} description="Keep every attempt tied to this incident with its real timestamp." /><CardBody className="flex flex-col gap-4">
      <div className="rounded-md border border-border bg-surface p-3" aria-label="Emergency contact details">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Emergency contact</p>
        <EmergencyContactList contacts={student.emergencyContacts} emptyMessage="No emergency contact is recorded for this student." />
      </div>
      <CalledContactField contacts={student.emergencyContacts} draft={draft} onChange={(next) => { setCalledDraft(next); setCalledErrors({}) }} errors={calledErrors} />
      <div className="grid gap-3 sm:grid-cols-[14rem_minmax(0,1fr)_auto] sm:items-end"><Select label="Outcome" value={outcome} options={PARENT_NOTIFICATION_OUTCOMES}onChange={(value) => setOutcome(value as ParentNotificationOutcome)} /><Input label="Attempt note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional context" /><Button variant="primary" onClick={addAttempt} loading={saving}>Add Attempt</Button></div>
      {saved && <p role="status" className="rounded-md border border-success bg-success/10 px-3 py-2 text-sm font-semibold text-text-primary">Notification attempt saved with an audit entry.</p>}
      {attempts.length ? <ol className="divide-y divide-border rounded-md border border-border">{attempts.map((attempt, index) => <li key={`${attempt.timestamp}-${index}`} className="flex flex-wrap items-center justify-between gap-2 p-3"><span className="min-w-0"><span className="block font-semibold text-text-primary">{OUTCOME_LABELS[attempt.outcome]}</span><span className="block text-xs text-text-secondary">Called: {calledContactText(attempt.calledContact)}</span></span><span className="text-sm text-text-secondary">{notes[attempt.timestamp] ? `${notes[attempt.timestamp]} · ` : ''}{formatDateTime(attempt.timestamp)}</span></li>)}</ol> : <p className="text-sm text-text-secondary">No notification attempts have been logged for this incident yet.</p>}
    </CardBody></Card>
  </div>
}
