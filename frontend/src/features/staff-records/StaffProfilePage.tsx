import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import {
  BackButton,
  Badge,
  Button,
  buttonClassName,
  Card,
  CardBody,
  CardHeader,
  EmergencyContactList,
  EmptyState,
  ErrorState,
  Icon,
  ListRow,
  Modal,
  RowList,
  Skeleton,
  StatusBadge,
  type StatusMap,
} from '../../components'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate, formatDateTime } from '../../lib/dates'
import { dispositionLabel, DISPOSITION_TONES as dispositionTone } from '../../lib/dispositions'
import { complaintWithExtras, incidentCareSummary, visitCareSummary } from '../../lib/itemsGiven'
import { getMockSessionUser, type SessionUser } from '../../lib/mock-db'
import type { FollowUp, Incident, Personnel, Visit } from '../../types/entities'
import { paths } from '../../routes/paths'
import { archiveStaffRecord, fetchStaffProfile } from './api/staffApi'

const incidentStageMap = {
  1: { label: 'Needs completion', tone: 'warning', icon: 'alertTriangle', variant: 'soft' },
  2: { label: 'Complete', tone: 'info', icon: 'checkCircle', variant: 'soft' },
} satisfies StatusMap<'1' | '2'>

const FOLLOW_UP_STATUS: Record<FollowUp['status'], string> = {
  pending: 'Pending',
  completed: 'Completed',
  missed: 'Missed',
  cancelled: 'Cancelled',
}

/** The screen lists the most recent records, like the Student Profile. */
const HISTORY_ON_SCREEN = 8

function tagList(items: string[], empty: string) {
  if (!items.length) return <p className="text-sm text-text-secondary">{empty}</p>
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item}>
          <Badge tone="neutral" variant="soft" icon={null}>
            {item}
          </Badge>
        </li>
      ))}
    </ul>
  )
}

function Skeletons({ back }: { back: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <Card aria-hidden="true" className="p-5">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="mt-2 h-4 w-52 max-w-full" />
      </Card>
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index} aria-hidden="true" className="p-5">
          <Skeleton className="h-5 w-40" />
          <div className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </Card>
      ))}
    </div>
  )
}

function Header({ person, viewer, onArchived }: { person: Personnel; viewer: SessionUser; onArchived: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [archiving, setArchiving] = useState(false)

  async function archive() {
    setArchiving(true)
    try {
      await archiveStaffRecord(person.id, viewer)
      onArchived()
    } finally {
      setArchiving(false)
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">{person.fullName}</h1>
            {person.archived && (
              <Badge tone="neutral" variant="outline" icon="archive">
                Archived
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {person.staffNumber} · {person.type}
            {person.department ? ` · ${person.department}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-2">
          {!person.archived && (
            <>
              <Link to={paths.visitNewForStaff(person.id)} className={buttonClassName({ variant: 'primary' })}>
                Record a visit
              </Link>
              <Link to={paths.incidentNewForStaff(person.id)} className={buttonClassName()}>
                Record an incident
              </Link>
            </>
          )}
          <Link to={paths.staffEdit(person.id)} className={buttonClassName()}>
            Edit
          </Link>
          {!person.archived && (
            <Button variant="neutral" onClick={() => setConfirming(true)}>
              Archive
            </Button>
          )}
        </div>
      </div>
      <Modal open={confirming} title="Archive this staff record?" onClose={() => setConfirming(false)}>
        <p className="text-sm text-text-secondary">
          {person.fullName} ({person.staffNumber}) will be hidden from the Staff List and the patient search. Nothing
          is deleted: the record, visits and incidents stay available under "Show archived".
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="neutral" data-autofocus onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            loading={archiving}
            onClick={() => {
              setConfirming(false)
              void archive()
            }}
          >
            Archive Record
          </Button>
        </div>
      </Modal>
    </Card>
  )
}

/** What matters in an emergency, at the top, as on the Student Profile. Shown only when something is recorded. */
function AllergyBanner({ person }: { person: Personnel }) {
  if (!person.allergies.length && !person.medicalConditions.length) return null
  return (
    <section aria-label="Allergies and medical conditions" className="flex items-start gap-2 rounded-md border border-warning bg-warning/10 px-4 py-3 text-sm text-text-primary">
      <Icon name="alertTriangle" size={16} className="mt-0.5 shrink-0 text-warning" />
      <div className="flex flex-col gap-0.5">
        {person.allergies.length > 0 && (
          <p>
            <span className="font-semibold">Allergies: </span>
            {person.allergies.join(', ')}
          </p>
        )}
        {person.medicalConditions.length > 0 && (
          <p>
            <span className="font-semibold">Medical conditions: </span>
            {person.medicalConditions.join(', ')}
          </p>
        )}
      </div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-text-secondary">{label}</p>
      <div className="text-sm font-semibold text-text-primary">{children}</div>
    </div>
  )
}

function Overview({ person }: { person: Personnel }) {
  return (
    <Card aria-labelledby="staff-overview">
      <CardHeader titleId="staff-overview" title="Overview" icon={<Icon name="user" />} />
      <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Staff No.">
          <span className="tabular-nums">{person.staffNumber}</span>
        </Field>
        <Field label="Type">{person.type}</Field>
        <Field label="Department or role">{person.department ?? 'Not recorded'}</Field>
        <Field label="Contact number">{person.contactInfo || 'Not recorded'}</Field>
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold text-text-secondary">Emergency contacts</p>
          {person.emergencyContacts.length ? (
            <EmergencyContactList contacts={person.emergencyContacts} />
          ) : (
            <p className="text-sm text-text-secondary">No emergency contact recorded.</p>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

function Medical({ person }: { person: Personnel }) {
  return (
    <Card aria-labelledby="staff-medical">
      <CardHeader titleId="staff-medical" title="Allergies and conditions" icon={<Icon name="stethoscope" />} />
      <CardBody className="flex flex-col gap-4">
        <section aria-labelledby="staff-allergies">
          <h3 id="staff-allergies" className="text-sm font-semibold text-text-primary">
            Allergies
          </h3>
          <div className="mt-2">{tagList(person.allergies, 'None recorded.')}</div>
        </section>
        <section aria-labelledby="staff-conditions">
          <h3 id="staff-conditions" className="text-sm font-semibold text-text-primary">
            Conditions
          </h3>
          <div className="mt-2">{tagList(person.medicalConditions, 'None recorded.')}</div>
        </section>
      </CardBody>
    </Card>
  )
}

function Visits({ visits }: { visits: Visit[] }) {
  return (
    <Card aria-labelledby="staff-visits" className="flex flex-col">
      <CardHeader titleId="staff-visits" title="Visit History" icon={<Icon name="stethoscope" />} description="Most recent clinic visits." />
      {visits.length ? (
        <RowList labelledBy="staff-visits">
          {visits.slice(0, HISTORY_ON_SCREEN).map((visit) => (
            <ListRow
              key={visit.id}
              primary={complaintWithExtras(visit)}
              secondary={visitCareSummary(visit)}
              meta={formatDateTime(visit.dateTime)}
              trailing={
                <Badge tone={dispositionTone[visit.disposition]} variant="soft" icon="checkCircle">
                  {dispositionLabel(visit.disposition, 'personnel')}
                </Badge>
              }
            />
          ))}
        </RowList>
      ) : (
        <EmptyState title="No visit history yet" description="No clinic visits are recorded for this staff member." />
      )}
    </Card>
  )
}

function Incidents({ incidents }: { incidents: Incident[] }) {
  return (
    <Card aria-labelledby="staff-incidents" className="flex flex-col">
      <CardHeader titleId="staff-incidents" title="Incident History" icon={<Icon name="alertTriangle" />} description="Emergency incidents, including records that still need completion." />
      {incidents.length ? (
        <RowList labelledBy="staff-incidents">
          {incidents.slice(0, HISTORY_ON_SCREEN).map((incident) => (
            <ListRow
              key={incident.id}
              primary={incident.complaint}
              secondary={incidentCareSummary(incident)}
              meta={formatDateTime(incident.time)}
              trailing={<StatusBadge status={String(incident.stage) as '1' | '2'} map={incidentStageMap} />}
            />
          ))}
        </RowList>
      ) : (
        <EmptyState title="No incident history yet" description="No emergency incidents are recorded for this staff member." />
      )}
    </Card>
  )
}

function FollowUps({ followUps }: { followUps: FollowUp[] }) {
  return (
    <Card aria-labelledby="staff-follow-ups" className="flex flex-col">
      <CardHeader titleId="staff-follow-ups" title="Follow-Ups" icon={<Icon name="calendarClock" />} description="Follow-ups from this staff member's visits and incidents." />
      {followUps.length ? (
        <RowList labelledBy="staff-follow-ups">
          {followUps.slice(0, HISTORY_ON_SCREEN).map((followUp) => (
            <ListRow
              key={followUp.id}
              primary={followUp.reason}
              meta={formatDate(followUp.followUpDate)}
              trailing={
                <Badge tone={followUp.status === 'pending' ? 'warning' : 'neutral'} variant="soft">
                  {FOLLOW_UP_STATUS[followUp.status]}
                </Badge>
              }
            />
          ))}
        </RowList>
      ) : (
        <EmptyState title="No follow-ups yet" description="No follow-ups are recorded for this staff member." />
      )}
    </Card>
  )
}

/**
 * Staff Profile (ADR-043, D8). One staff member, deliberately opened, so the name is shown (ADR-004).
 * School Clinician only; the Admin never reaches it (route guard).
 */
export function StaffProfilePage({ viewer = getMockSessionUser(), personnelId }: { viewer?: SessionUser; personnelId: string }) {
  const { data, status, reload } = useAsyncData(`staff-profile|${personnelId}`, () => fetchStaffProfile(personnelId, viewer))
  const savedMessage = (useLocation().state as { savedMessage?: string } | null)?.savedMessage
  const back = <BackButton fallback={paths.staff} />

  if (viewer.role !== 'staff') {
    return (
      <div className="mx-auto max-w-page-narrow px-4 pt-10 pb-8 sm:px-8">
        <ErrorState title="Staff access required." />
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState title="Unable to load the staff profile." onRetry={reload} />
      </div>
    )
  }
  if (!data) {
    return (
      <>
        <p className="sr-only" role="status">
          Loading staff profile…
        </p>
        <Skeletons back={back} />
      </>
    )
  }

  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <Header person={data.personnel} viewer={viewer} onArchived={reload} />
      <AllergyBanner person={data.personnel} />
      {savedMessage && (
        <div role="status" className="rounded-md border border-success bg-success/10 px-4 py-3 text-sm font-semibold text-text-primary">
          {savedMessage}
        </div>
      )}
      <Overview person={data.personnel} />
      <Medical person={data.personnel} />
      <Visits visits={data.visits} />
      <Incidents incidents={data.incidents} />
      <FollowUps followUps={data.followUps} />
    </div>
  )
}
