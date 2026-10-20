import { useState } from 'react'
import { Link } from 'react-router'
import {
  BackButton,
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Icon,
  ListRow,
  RowList,
  Skeleton,
} from '../../../components'
import { getMockSessionUser, logoutMockSession, type SessionUser } from '../../../lib/mock-db'
import { formatDateTime } from '../../../lib/dates'
import { incidentCareSummary, visitCareSummary } from '../../../lib/itemsGiven'
import type { StudentNumber } from '../../../types/entities'
import { lookupStudentByNumber, searchQrStudents, type QrLookupResult } from '../api/qrLookupApi'
import { paths } from '../../../routes/paths'
import { QrScannerView } from '../shared/QrScannerView'

type LookupStatus = 'idle' | 'loading' | 'success' | 'error' | 'not_found'

function LoadingCard() {
  return (
    <Card aria-hidden="true" className="p-5">
      <Skeleton className="h-6 w-56 max-w-full" />
      <Skeleton className="mt-2 h-4 w-40" />
      <Skeleton className="mt-4 h-20 w-full" />
    </Card>
  )
}

function StudentSummary({ result }: { result: QrLookupResult }) {
  const { student } = result
  return (
    <Card aria-labelledby="lookup-result-title">
      <CardHeader
        titleId="lookup-result-title"
        title={student.fullName}
        description={`${student.studentNumber} · ${student.gradeLevel}`}
        icon={<Icon name="users" />}
      />
      <CardBody className="flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold text-text-secondary">Allergies and restrictions</p>
          {student.allergies.length ? (
            <ul className="mt-1 flex flex-wrap gap-2">
              {student.allergies.map((item) => (
                <li key={item}>
                  <Badge tone="warning" variant="soft">
                    {item}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-secondary">No allergies recorded.</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-text-secondary">Conditions</p>
          {student.medicalConditions.length ? (
            <ul className="mt-1 flex flex-wrap gap-2">
              {student.medicalConditions.map((item) => (
                <li key={item}>
                  <Badge tone="info" variant="soft">
                    {item}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-secondary">No conditions recorded.</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-text-secondary">Emergency contact</p>
          <p className="text-sm font-semibold text-text-primary">
            {student.emergencyContacts[0]
              ? `${student.emergencyContacts[0].name} · ${student.emergencyContacts[0].phone}`
              : 'No emergency contact recorded'}
          </p>
        </div>
      </CardBody>
    </Card>
  )
}

function StaffActions({ studentNumber }: { studentNumber: StudentNumber }) {
  return (
    <Card aria-labelledby="quick-actions-title">
      <CardHeader
        titleId="quick-actions-title"
        title="Quick actions"
        description="Touch-sized actions after a deliberate student lookup."
        icon={<Icon name="layoutGrid" />}
      />
      <CardBody>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            to={paths.visitNew(studentNumber)}
            className="flex min-h-16 cursor-pointer items-center justify-center gap-3 rounded-md border border-brand-green bg-background px-4 text-sm font-semibold text-brand-green-dark shadow-card transition-colors hover:bg-surface"
          >
            <Icon name="stethoscope" />
            Record Visit
          </Link>
          <Link
            to={paths.incidentNew(studentNumber)}
            className="flex min-h-16 cursor-pointer items-center justify-center gap-3 rounded-md border border-warning bg-warning px-4 text-sm font-semibold text-white shadow-card transition-[filter] hover:brightness-90"
          >
            <Icon name="alertTriangle" />
            Log Emergency
          </Link>
          <Link
            to={paths.studentProfile(studentNumber)}
            className="flex min-h-16 cursor-pointer items-center justify-center gap-3 rounded-md border border-brand-green bg-background px-4 text-sm font-semibold text-brand-green-dark shadow-card transition-colors hover:bg-surface"
          >
            <Icon name="users" />
            View Full Profile
          </Link>
          <Link
            to={paths.inventoryDispense(studentNumber)}
            className="flex min-h-16 cursor-pointer items-center justify-center gap-3 rounded-md border border-brand-green bg-background px-4 text-sm font-semibold text-brand-green-dark shadow-card transition-colors hover:bg-surface"
          >
            <Icon name="package" />
            Dispense Medicine
          </Link>
          <Link
            to={paths.peReferral(studentNumber)}
            className="flex min-h-16 cursor-pointer items-center justify-center gap-3 rounded-md border border-brand-green bg-background px-4 text-sm font-semibold text-brand-green-dark shadow-card transition-colors hover:bg-surface"
          >
            <Icon name="activity" />
            PE/Sports Referral
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}

function InstructorReadOnly({ result }: { result: QrLookupResult }) {
  return (
    <Card aria-labelledby="readonly-title">
      <CardHeader
        titleId="readonly-title"
        title="Read-only health history"
        description="No action buttons are available for PE/Sports Instructor accounts."
        icon={<Icon name="shieldPlus" />}
      />
      <CardBody className="flex flex-col gap-4">
        <section>
          <h3 className="text-sm font-semibold text-text-primary">Recent visits</h3>
          {result.visits.length ? (
            <RowList className="mt-2 rounded-md border border-border">
              {result.visits.map((visit) => (
                <ListRow
                  key={visit.id}
                  primary={visit.complaint}
                  secondary={visitCareSummary(visit)}
                  meta={formatDateTime(visit.dateTime)}
                />
              ))}
            </RowList>
          ) : (
            <EmptyState title="No recent visits" />
          )}
        </section>
        <section>
          <h3 className="text-sm font-semibold text-text-primary">Recent incidents</h3>
          {result.incidents.length ? (
            <RowList className="mt-2 rounded-md border border-border">
              {result.incidents.map((incident) => (
                <ListRow
                  key={incident.id}
                  primary={incident.complaint}
                  secondary={`${incident.stage === 1 ? 'Needs completion' : 'Complete'} · ${incidentCareSummary(incident)}`}
                  meta={formatDateTime(incident.time)}
                />
              ))}
            </RowList>
          ) : (
            <EmptyState title="No recent incidents" />
          )}
        </section>
      </CardBody>
    </Card>
  )
}

export function QrMobileHubPage({
  viewer = getMockSessionUser(),
  onLogout,
}: {
  viewer?: SessionUser
  /** This screen has no shell, so it carries its own sign-out control (the only one Instructors get). */
  onLogout?: () => void
}) {
  const [status, setStatus] = useState<LookupStatus>('idle')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    if (!onLogout) return
    setIsLoggingOut(true)
    try {
      await logoutMockSession(viewer)
      onLogout()
    } catch {
      setIsLoggingOut(false)
    }
  }
  const [result, setResult] = useState<QrLookupResult | null>(null)

  async function lookup(studentNumber: StudentNumber) {
    setStatus('loading')
    setResult(null)
    try {
      const next = await lookupStudentByNumber(studentNumber, viewer)
      setResult(next)
      setStatus('success')
    } catch (error) {
      setStatus(error instanceof Error && error.message === 'Student not found' ? 'not_found' : 'error')
    }
  }

  const instructor = viewer.role === 'instructor'

  return (
    <main className="min-h-screen bg-surface px-4 pt-10 pb-8">
      <div className="mx-auto flex max-w-md flex-col gap-4">
        {/* No shell here, so Back is Staff's way out. QR Lookup is the Instructor's home: no Back,
            and the Log out control below stays their exit. */}
        {!instructor && <BackButton fallback={paths.dashboard} variant="prominent" />}
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-green-dark">CLINIQ mobile</p>
            <h1 className="text-2xl font-bold text-text-primary">
              {instructor ? 'Instructor Lookup' : 'QR Scan / Lookup'}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {instructor
                ? 'Scan or enter a Student Number to view a read-only profile.'
                : 'Scan or enter a Student Number for fast clinic actions.'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Badge tone={instructor ? 'info' : 'success'} variant="soft" icon="shieldPlus">
              {instructor ? 'Read-only' : 'Staff'}
            </Badge>
            {onLogout && (
              <button
                type="button"
                aria-label={isLoggingOut ? 'Logging out' : 'Log out'}
                title="Log out"
                disabled={isLoggingOut}
                onClick={() => void handleLogout()}
                className="inline-flex shrink-0 cursor-pointer rounded-sm text-error transition-[filter] hover:brightness-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 motion-reduce:transition-none"
              >
                <Icon name="logout" />
              </button>
            )}
          </div>
        </header>

        {!instructor && (
          <Link
            to={paths.incidentNew()}
            className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-md bg-warning px-4 text-base font-bold text-white shadow-raised transition-[filter] hover:brightness-90"
          >
            <Icon name="alertTriangle" />
            Emergency
          </Link>
        )}

        <QrScannerView
          title="Identify student"
          description="Use the camera scanner, demo scan, or search by Student Number or student name."
          onDetected={lookup}
          search={searchQrStudents}
          onScanStart={() => setStatus((current) => (current === 'not_found' || current === 'error' ? 'idle' : current))}
        />

        {status === 'loading' && <LoadingCard />}
        {status === 'error' && <ErrorState title="Unable to complete lookup." />}
        {status === 'not_found' && (
          <ErrorState
            title="Student not found."
            description="Check the Student Number, then try the manual fallback again."
          />
        )}
        {result && (
          <>
            <StudentSummary result={result} />
            {instructor ? <InstructorReadOnly result={result} /> : <StaffActions studentNumber={result.student.studentNumber} />}
          </>
        )}
      </div>
    </main>
  )
}
