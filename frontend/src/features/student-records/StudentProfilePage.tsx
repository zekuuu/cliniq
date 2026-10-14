import {
  BackButton,
  Badge,
  Button,
  buttonClassName,
  Card,
  CardBody,
  CardHeader,
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
import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { useAsyncData } from '../../hooks/useAsyncData'
import { cn } from '../../lib/cn'
import { formatDateRange, formatDateTime } from '../../lib/dates'
import { incidentCareSummary, visitCareSummary } from '../../lib/itemsGiven'
import { getMockSessionUser, type SessionUser, type StudentExcuseLetter } from '../../lib/mock-db'
import type { Disposition, Incident, Student, Visit } from '../../types/entities'
import { paths } from '../../routes/paths'
import { archiveStudentRecord, fetchStudentProfile } from './api/studentProfileApi'

const incidentStageMap = {
  1: { label: 'Needs completion', tone: 'warning', icon: 'alertTriangle', variant: 'soft' },
  2: { label: 'Complete', tone: 'success', icon: 'checkCircle', variant: 'soft' },
} satisfies StatusMap<'1' | '2'>

const dispositionLabel: Record<Disposition, string> = {
  returned_to_class: 'Returned to class',
  sent_home: 'Sent home',
  referred_to_hospital: 'Referred to hospital',
}

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

function StudentProfileSkeleton({ back }: { back: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <Card aria-hidden="true" className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-8 w-64 max-w-full" />
            <Skeleton className="h-4 w-52 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </Card>
      <div aria-hidden="true" className="grid grid-cols-1 gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="p-5">
            <Skeleton className="h-5 w-40" />
            <div className="mt-4 flex flex-col gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function ProfileHeader({
  student,
  viewer,
  onArchived,
}: {
  student: Student
  viewer: SessionUser
  onArchived: () => void
}) {
  const staffCanAct = viewer.role === 'staff'
  const [confirmingArchive, setConfirmingArchive] = useState(false)
  const [archiving, setArchiving] = useState(false)

  async function archive() {
    setArchiving(true)
    try {
      await archiveStudentRecord(student.studentNumber, viewer)
      setConfirmingArchive(false)
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
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {student.fullName}
            </h1>
            {student.archived && (
              <Badge tone="neutral" variant="outline" icon="archive">
                Archived
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {student.studentNumber} · {student.gradeLevel}
          </p>
          {viewer.role === 'instructor' && (
            <p className="mt-2 text-xs font-semibold text-text-secondary">
              Read-only profile view. No record actions are available for this role.
            </p>
          )}
        </div>
        {staffCanAct && (
          <div className="flex flex-wrap justify-end gap-2 print:hidden">
            <Link to={paths.studentEdit(student.studentNumber)} className={buttonClassName()}>
              Edit
            </Link>
            <Button variant="secondary" icon="printer" onClick={() => window.print()}>
              Print
            </Button>
            {!student.archived && (
              <Button variant="neutral" onClick={() => setConfirmingArchive(true)}>
                Archive
              </Button>
            )}
          </div>
        )}
      </div>
      <Modal
        open={confirmingArchive}
        title="Archive this student record?"
        onClose={() => setConfirmingArchive(false)}
      >
        <p className="text-sm text-text-secondary">
          {student.fullName} ({student.studentNumber}) will be hidden from active lists. Nothing is
          deleted: the record, visits, and incidents stay available under "Include archived".
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="neutral" data-autofocus onClick={() => setConfirmingArchive(false)}>
            Cancel
          </Button>
          <Button variant="secondary" loading={archiving} onClick={archive}>
            Archive Record
          </Button>
        </div>
      </Modal>
    </Card>
  )
}

function OverviewCard({ student }: { student: Student }) {
  const contact = student.emergencyContact
  return (
    <Card aria-labelledby="profile-overview">
      <CardHeader titleId="profile-overview" title="Overview" icon={<Icon name="users" />} />
      <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-text-secondary">Grade level</p>
          <p className="text-sm font-semibold text-text-primary">{student.gradeLevel}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-text-secondary">Student Number</p>
          <p className="text-sm font-semibold text-text-primary">{student.studentNumber}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-text-secondary">Contact info</p>
          <p className="text-sm font-semibold text-text-primary">{student.contactInfo || 'Not recorded'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-text-secondary">Record status</p>
          <Badge tone={student.recordComplete ? 'success' : 'warning'} variant="soft">
            {student.recordComplete ? 'Complete' : 'Incomplete'}
          </Badge>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold text-text-secondary">Emergency contact</p>
          {contact ? (
            <div className="mt-1 flex flex-wrap items-start justify-between gap-x-4 gap-y-2 rounded-md border border-border bg-surface p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">{contact.name}</p>
                <p className="text-xs text-text-secondary">{contact.relationship}</p>
                <p className="mt-2 text-sm font-semibold tabular-nums text-text-primary">
                  <span className="sr-only">Phone: </span>
                  {contact.phone}
                </p>
              </div>
              <Badge tone={contact.verified ? 'success' : 'warning'} variant="soft">
                {contact.verified ? 'Verified' : 'Needs verification'}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No emergency contact recorded.</p>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

function MedicalHistoryCard({ student }: { student: Student }) {
  return (
    <Card aria-labelledby="medical-history">
      <CardHeader
        titleId="medical-history"
        title="Medical History"
        icon={<Icon name="stethoscope" />}
      />
      <CardBody className="flex flex-col gap-4">
        <section aria-labelledby="allergies-heading">
          <h3 id="allergies-heading" className="text-sm font-semibold text-text-primary">
            Allergies and restrictions
          </h3>
          <div className="mt-2">
            {tagList(student.allergies, 'No allergies or food restrictions recorded.')}
          </div>
        </section>
        <section aria-labelledby="conditions-heading">
          <h3 id="conditions-heading" className="text-sm font-semibold text-text-primary">
            Conditions
          </h3>
          <div className="mt-2">
            {tagList(student.medicalConditions, 'No medical conditions recorded.')}
          </div>
        </section>
      </CardBody>
    </Card>
  )
}

function VisitHistoryCard({ visits }: { visits: Visit[] }) {
  return (
    <Card aria-labelledby="visit-history" className="flex flex-col">
      <CardHeader
        titleId="visit-history"
        title="Visit History"
        icon={<Icon name="stethoscope" />}
        description="Most recent clinic visits for this student."
      />
      {visits.length ? (
        <RowList labelledBy="visit-history">
          {visits.map((visit) => (
            <ListRow
              key={visit.id}
              primary={visit.complaint}
              secondary={visitCareSummary(visit)}
              meta={formatDateTime(visit.dateTime)}
              trailing={
                <Badge tone="info" variant="soft" icon="checkCircle">
                  {dispositionLabel[visit.disposition]}
                </Badge>
              }
            />
          ))}
        </RowList>
      ) : (
        <EmptyState title="No visit history yet" description="No clinic visits are recorded for this student." />
      )}
    </Card>
  )
}

function ExcuseLettersCard({ letters }: { letters: StudentExcuseLetter[] }) {
  return (
    <Card aria-labelledby="excuse-letters" className="flex flex-col">
      <CardHeader
        titleId="excuse-letters"
        title="Excuse Letters"
        icon={<Icon name="fileText" />}
        description="Approved letters and drafts awaiting approval, with the dates excused. For cross-checking attendance; not linked to the attendance system."
      />
      {letters.length ? (
        <RowList labelledBy="excuse-letters">
          {letters.map((letter) => (
            <ListRow
              key={letter.id}
              primary={`${formatDateRange(letter.excusedFrom, letter.excusedUntil)} · ${dispositionLabel[letter.disposition]}`}
              trailing={
                letter.status === 'pending' ? (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge tone="warning" variant="soft">
                      Pending approval
                    </Badge>
                    <Link to={paths.excuseLetter(letter.visitId)} className={buttonClassName({ size: 'sm' })}>
                      Review letter
                    </Link>
                  </div>
                ) : (
                  <Link to={paths.visitDetail(letter.visitId)} className={buttonClassName({ size: 'sm' })}>
                    View visit
                  </Link>
                )
              }
            />
          ))}
        </RowList>
      ) : (
        <EmptyState title="No excuse letters yet" description="No excuse letters are stored or awaiting approval for this student." />
      )}
    </Card>
  )
}

function IncidentHistoryCard({ incidents }: { incidents: Incident[] }) {
  return (
    <Card aria-labelledby="incident-history" className="flex flex-col">
      <CardHeader
        titleId="incident-history"
        title="Incident History"
        icon={<Icon name="alertTriangle" />}
        description="Emergency incidents, including fast-capture records that still need completion."
      />
      {incidents.length ? (
        <RowList labelledBy="incident-history">
          {incidents.map((incident) => (
            <ListRow
              key={incident.id}
              primary={incident.complaint}
              secondary={
                <>
                  <span>{incidentCareSummary(incident)}</span>
                  <span className="block">
                    {incident.hospitalReferral
                      ? `Hospital referral: ${incident.hospitalReferral.destination}`
                      : 'No hospital referral recorded'}
                  </span>
                </>
              }
              meta={formatDateTime(incident.time)}
              trailing={<StatusBadge status={String(incident.stage) as '1' | '2'} map={incidentStageMap} />}
            />
          ))}
        </RowList>
      ) : (
        <EmptyState
          title="No incident history yet"
          description="No emergency incidents are recorded for this student."
        />
      )}
    </Card>
  )
}

/**
 * Student Profile (Screen #7 / Reference 3). This is a deliberate single-student lookup, so the
 * full name is correct per ADR-004 and `.claude/skills/cliniq-display-privacy`.
 */
export function StudentProfilePage({
  viewer = getMockSessionUser(),
  studentNumber,
}: {
  viewer?: SessionUser
  studentNumber?: string
}) {
  const { data, status, reload } = useAsyncData(`student-profile|${studentNumber ?? 'default'}`, () =>
    fetchStudentProfile(studentNumber, viewer),
  )
  // Set by Edit Student after a successful save, which returns here.
  const savedMessage = (useLocation().state as { savedMessage?: string } | null)?.savedMessage
  // Instructors reach the profile only from QR Lookup and can never open the Student List.
  // On the Instructor's shell-free screen Back is the main way out, so it is the prominent style.
  const back = (
    <BackButton
      fallback={viewer.role === 'instructor' ? paths.qrScan : paths.students}
      variant={viewer.role === 'instructor' ? 'prominent' : 'quiet'}
    />
  )

  if (status === 'error') {
    return (
      <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
        {back}
        <ErrorState title="Unable to load the student profile." onRetry={reload} />
      </div>
    )
  }

  if (!data) {
    return (
      <>
        <p className="sr-only" role="status">
          Loading student profile…
        </p>
        <StudentProfileSkeleton back={back} />
      </>
    )
  }

  return (
    <div
      className={cn(
        'mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8',
        viewer.role === 'instructor' && 'min-h-screen bg-surface',
      )}
    >
      {back}
      <ProfileHeader student={data.student} viewer={viewer} onArchived={reload} />
      {savedMessage && (
        <div
          role="status"
          className="rounded-md border border-success bg-success/10 px-4 py-3 text-sm font-semibold text-text-primary"
        >
          {savedMessage}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4">
        <div className="flex flex-col gap-4">
          <OverviewCard student={data.student} />
          <MedicalHistoryCard student={data.student} />
        </div>
        <div className="flex flex-col gap-4">
          <VisitHistoryCard visits={data.visits} />
          {viewer.role === 'staff' && <ExcuseLettersCard letters={data.excuseLetters} />}
          <IncidentHistoryCard incidents={data.incidents} />
        </div>
      </div>
    </div>
  )
}
