import {
  BackButton,
  Badge,
  Button,
  buttonClassName,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  EmergencyContactList,
  ErrorState,
  Icon,
  ListRow,
  Modal,
  PrintButton,
  PrintDocument,
  PrintFields,
  PrintSection,
  PrintTable,
  RowList,
  Skeleton,
  StatusBadge,
  type StatusMap,
} from '../../components'
import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useConfirmItsYou } from '../../hooks/useConfirmItsYou'
import { formatDateRange, formatDateTime } from '../../lib/dates'
import { incidentCareSummary, visitCareSummary } from '../../lib/itemsGiven'
import { getMockSessionUser, type SessionUser, type StudentExcuseLetter } from '../../lib/mock-db'
import type { Incident, Student, Visit } from '../../types/entities'
import { DISPOSITION_LABELS as dispositionLabel, DISPOSITION_TONES as dispositionTone } from '../../lib/dispositions'
import { paths } from '../../routes/paths'
import { archiveStudentRecord, fetchStudentProfile, type StudentProfileData } from './api/studentProfileApi'

const incidentStageMap = {
  1: { label: 'Needs completion', tone: 'warning', icon: 'alertTriangle', variant: 'soft' },
  2: { label: 'Complete', tone: 'info', icon: 'checkCircle', variant: 'soft' },
} satisfies StatusMap<'1' | '2'>

/** The screen lists the most recent records; the printout lists them all. */
const HISTORY_ON_SCREEN = 8

/** Every letter stays in the record, including replaced and voided ones (panel review EX-3). */
const LETTER_STATUS: Record<StudentExcuseLetter['status'], string> = {
  pending: 'Pending approval',
  approved: 'Approved',
  superseded: 'Superseded',
  voided: 'Voided',
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
  const { confirm, dialog: confirmDialog } = useConfirmItsYou(viewer)
  const [confirmingArchive, setConfirmingArchive] = useState(false)
  const [archiving, setArchiving] = useState(false)

  async function archive() {
    setArchiving(true)
    try {
      await archiveStudentRecord(student.id, viewer)
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
            LRN {student.lrn} · {student.gradeLevel}
          </p>
        </div>
        {/* ADR-038: the Admin reads the profile; Print stays visible but disabled for the Admin. */}
        <div className="flex flex-wrap items-start justify-end gap-2 print:hidden">
          {staffCanAct && (
            <Link to={paths.studentEdit(student.id)} className={buttonClassName()}>
              Edit
            </Link>
          )}
          <PrintButton viewer={viewer} />
          {staffCanAct && !student.archived && (
              <Button variant="neutral" onClick={() => setConfirmingArchive(true)}>
                Archive
              </Button>
          )}
        </div>
      </div>
      {confirmDialog}
      <Modal
        open={confirmingArchive}
        title="Archive this student record?"
        onClose={() => setConfirmingArchive(false)}
      >
        <p className="text-sm text-text-secondary">
          {student.fullName} (LRN {student.lrn}) will be hidden from active lists. Nothing is
          deleted: the record, visits, and incidents stay available under "Include archived".
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="neutral" data-autofocus onClick={() => setConfirmingArchive(false)}>
            Cancel
          </Button>
          {/* Panel review AC-7: archiving asks for the password first. */}
          <Button
            variant="secondary"
            loading={archiving}
            onClick={() => {
              setConfirmingArchive(false)
              confirm('archive a student record', archive)
            }}
          >
            Archive Record
          </Button>
        </div>
      </Modal>
    </Card>
  )
}

/**
 * Panel review ST-9: what matters in an emergency, at the top of the profile. Shown only when something
 * is recorded; nothing extra appears otherwise (an empty list still can't mean "none known").
 */
function AllergyBanner({ student }: { student: Student }) {
  if (!student.allergies.length && !student.medicalConditions.length) return null
  return (
    <section aria-label="Allergies and medical conditions" className="flex items-start gap-2 rounded-md border border-warning bg-warning/10 px-4 py-3 text-sm text-text-primary">
      <Icon name="alertTriangle" size={16} className="mt-0.5 shrink-0 text-warning" />
      <div className="flex flex-col gap-0.5">
        {student.allergies.length > 0 && (
          <p>
            <span className="font-semibold">Allergies: </span>
            {student.allergies.join(', ')}
          </p>
        )}
        {student.medicalConditions.length > 0 && (
          <p>
            <span className="font-semibold">Medical conditions: </span>
            {student.medicalConditions.join(', ')}
          </p>
        )}
      </div>
    </section>
  )
}

function OverviewCard({ student }: { student: Student }) {
  return (
    <Card aria-labelledby="profile-overview">
      <CardHeader titleId="profile-overview" title="Overview" icon={<Icon name="users" />} />
      <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-text-secondary">Grade level</p>
          <p className="text-sm font-semibold text-text-primary">{student.gradeLevel}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-text-secondary">LRN</p>
          <p className="text-sm font-semibold text-text-primary tabular-nums">{student.lrn}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-text-secondary">Sex</p>
          <p className="text-sm font-semibold text-text-primary">{student.sex === 'female' ? 'Female' : 'Male'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-text-secondary">Contact info</p>
          <p className="text-sm font-semibold text-text-primary">{student.contactInfo || 'Not recorded'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-text-secondary">Record status</p>
          <Badge tone={student.recordComplete ? 'info' : 'warning'} variant="soft">
            {student.recordComplete ? 'Complete' : 'Incomplete'}
          </Badge>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold text-text-secondary">Emergency contacts</p>
          <EmergencyContactList contacts={student.emergencyContacts} />
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
            Allergies
          </h3>
          <div className="mt-2">
            {tagList(student.allergies, 'None recorded.')}
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
          {visits.slice(0, HISTORY_ON_SCREEN).map((visit) => (
            <ListRow
              key={visit.id}
              primary={visit.complaint}
              secondary={visitCareSummary(visit)}
              meta={formatDateTime(visit.dateTime)}
              trailing={
                <Badge tone={dispositionTone[visit.disposition]} variant="soft" icon="checkCircle">
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
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {letter.status !== 'approved' && (
                      <Badge tone={letter.status === 'voided' ? 'error' : 'neutral'} variant="soft">
                        {LETTER_STATUS[letter.status]}
                      </Badge>
                    )}
                    {/* A stored letter (superseded or voided) opens on its own, marked not valid. */}
                    {letter.status !== 'approved' && !letter.id.startsWith('draft-') && (
                      <Link to={paths.excuseLetterVersion(letter.visitId, letter.id)} className={buttonClassName({ size: 'sm' })}>
                        View letter
                      </Link>
                    )}
                    <Link to={paths.visitDetail(letter.visitId)} className={buttonClassName({ size: 'sm' })}>
                      View visit
                    </Link>
                  </div>
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
          {incidents.slice(0, HISTORY_ON_SCREEN).map((incident) => (
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
 * "Student Health Record": the profile on A4 (ADR-026), a record sheet rather than the cards. One
 * student, deliberately opened, so the full name is correct (ADR-004). It follows the screen's role
 * rules: excuse letters are Staff-only, and no record actions print.
 */
function StudentRecordPrint({ data, viewer }: { data: StudentProfileData; viewer: SessionUser }) {
  const { student, visits, incidents, excuseLetters } = data
  const contact = student.emergencyContacts
    .map((item, index) => `${index === 0 ? 'Primary: ' : ''}${item.name} (${item.relationship}) · ${item.phone} · ${item.verified ? 'verified' : 'needs verification'}`)
    .join('\n')
  return (
    <PrintDocument
      title="Student Health Record"
      viewer={viewer}
      scope={`${student.fullName}, LRN ${student.lrn}, ${student.gradeLevel}.${student.archived ? ' Archived record.' : ''} Every recorded clinic visit and incident, newest first.`}
    >
      <PrintSection title="Student">
        <PrintFields
          fields={[
            { label: 'Full name', value: student.fullName },
            { label: 'LRN', value: student.lrn },
            { label: 'Grade level', value: student.gradeLevel },
            { label: 'Sex', value: student.sex === 'female' ? 'Female' : 'Male' },
            { label: 'Contact info', value: student.contactInfo || 'Not recorded' },
            {
              label: 'Emergency contacts',
              value: contact || 'No emergency contact recorded.',
              wide: true,
            },
            { label: 'Record status', value: `${student.recordComplete ? 'Complete' : 'Incomplete'}${student.archived ? ', archived' : ''}` },
          ]}
        />
      </PrintSection>
      <PrintSection title="Medical history">
        <PrintFields
          fields={[
            { label: 'Allergies', value: student.allergies.join(', ') || 'None recorded' },
            { label: 'Conditions', value: student.medicalConditions.join(', ') || 'None recorded' },
          ]}
        />
      </PrintSection>
      <PrintSection title={`Visit history (${visits.length})`}>
        <PrintTable
          caption="Clinic visits"
          rows={visits}
          rowKey={(visit) => visit.id}
          empty="No clinic visits are recorded for this student."
          columns={[
            { header: 'Date and time', width: '24%', cell: (visit) => formatDateTime(visit.dateTime) },
            { header: 'Complaint', width: '20%', cell: (visit) => visit.complaint },
            { header: 'Care given', cell: visitCareSummary },
            { header: 'Disposition', width: '18%', cell: (visit) => dispositionLabel[visit.disposition] },
          ]}
        />
      </PrintSection>
      <PrintSection title={`Incident history (${incidents.length})`}>
        <PrintTable
          caption="Incidents"
          rows={incidents}
          rowKey={(incident) => incident.id}
          empty="No emergency incidents are recorded for this student."
          columns={[
            { header: 'Date and time', width: '24%', cell: (incident) => formatDateTime(incident.time) },
            { header: 'Complaint', width: '20%', cell: (incident) => incident.complaint },
            {
              header: 'Care and referral',
              cell: (incident) =>
                `${incidentCareSummary(incident)}. ${incident.hospitalReferral ? `Hospital referral: ${incident.hospitalReferral.destination}` : 'No hospital referral'}.`,
            },
            { header: 'Status', width: '18%', cell: (incident) => incidentStageMap[incident.stage].label },
          ]}
        />
      </PrintSection>
      {viewer.role === 'staff' && (
        <PrintSection title="Excuse letters issued">
          <PrintTable
            caption="Excuse letters"
            rows={excuseLetters}
            rowKey={(letter) => letter.id}
            empty="No excuse letters are stored or awaiting approval for this student."
            columns={[
              { header: 'Excused period', cell: (letter) => formatDateRange(letter.excusedFrom, letter.excusedUntil) },
              { header: 'Disposition', width: '30%', cell: (letter) => dispositionLabel[letter.disposition] },
              { header: 'Status', width: '24%', cell: (letter) => LETTER_STATUS[letter.status] },
            ]}
          />
        </PrintSection>
      )}
    </PrintDocument>
  )
}

/**
 * Student Profile (Screen #7 / Reference 3). This is a deliberate single-student lookup, so the
 * full name is correct per ADR-004 and `.claude/skills/cliniq-display-privacy`.
 */
export function StudentProfilePage({
  viewer = getMockSessionUser(),
  studentId,
}: {
  viewer?: SessionUser
  studentId?: string
}) {
  const { data, status, reload } = useAsyncData(`student-profile|${studentId ?? 'default'}`, () =>
    fetchStudentProfile(studentId, viewer),
  )
  // Set by Edit Student after a successful save, which returns here.
  const savedMessage = (useLocation().state as { savedMessage?: string } | null)?.savedMessage
  const back = <BackButton fallback={paths.students} />

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
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-10 pb-8 sm:px-8">
      {back}
      <ProfileHeader student={data.student} viewer={viewer} onArchived={reload} />
      <AllergyBanner student={data.student} />
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
      <StudentRecordPrint data={data} viewer={viewer} />
    </div>
  )
}
