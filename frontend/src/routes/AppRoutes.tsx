import { lazy, Suspense, useEffect, type ComponentType, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router'
import { AppShell } from '../layouts/AppShell'
import type { NavKey } from '../layouts/navigation'
import type { SessionUser } from '../lib/mock-db'
import type { UserRole } from '../types/entities'
import { NotFoundPage } from './NotFoundPage'
import { paths } from './paths'
import { Card, Skeleton } from '../components'
import { LoginPage } from '../features/auth/LoginPage'
import { ForcePasswordChangePage } from '../features/auth/ForcePasswordChangePage'

/**
 * The route table (Development-Phases.md §0: path-based routes, React Router).
 *
 * - Each screen is its own lazy chunk, so opening the Dashboard doesn't download screens that
 *   haven't been visited (Performance NFR, 4GB-RAM workstation).
 * - Role access is declared on the route (`roles`) and enforced by one guard, so "who can open
 *   what" is readable in this file alone. Screens still keep their own role checks as a second
 *   layer, since the backend will enforce roles independently anyway.
 * - Every screen renders inside the App Shell (sidebar, header with Log out).
 */

/** Lazily loads a named page export as its own chunk. */
function page<K extends string, P>(load: () => Promise<Record<K, ComponentType<P>>>, name: K) {
  return lazy(async () => ({ default: (await load())[name] }))
}

const DashboardPage = page(() => import('../features/dashboard/DashboardPage'), 'DashboardPage')
const CalendarPage = page(() => import('../features/dashboard/CalendarPage'), 'CalendarPage')
const StudentListPage = page(
  () => import('../features/student-records/StudentListPage'),
  'StudentListPage',
)
const StudentFormPage = page(
  () => import('../features/student-records/StudentFormPage'),
  'StudentFormPage',
)
const IncompleteRecordsQueuePage = page(
  () => import('../features/student-records/IncompleteRecordsQueuePage'),
  'IncompleteRecordsQueuePage',
)
const StudentProfilePage = page(
  () => import('../features/student-records/StudentProfilePage'),
  'StudentProfilePage',
)
const VisitLogListPage = page(
  () => import('../features/clinic-visits/VisitLogListPage'),
  'VisitLogListPage',
)
const NewVisitEntryPage = page(
  () => import('../features/clinic-visits/NewVisitEntryPage'),
  'NewVisitEntryPage',
)
const PeSportsReferralPage = page(
  () => import('../features/clinic-visits/PeSportsReferralPage'),
  'PeSportsReferralPage',
)
const VisitDetailPage = page(
  () => import('../features/clinic-visits/VisitDetailPage'),
  'VisitDetailPage',
)
const ExcuseLetterPage = page(
  () => import('../features/clinic-visits/ExcuseLetterPage'),
  'ExcuseLetterPage',
)
const IncidentEntryPage = page(
  () => import('../features/emergency-response/IncidentEntryPage'),
  'IncidentEntryPage',
)
const IncidentLogListPage = page(
  () => import('../features/emergency-response/IncidentLogListPage'),
  'IncidentLogListPage',
)
const InventoryListPage = page(
  () => import('../features/inventory/InventoryListPage'),
  'InventoryListPage',
)
const InventoryFormPage = page(
  () => import('../features/inventory/InventoryFormPage'),
  'InventoryFormPage',
)
const InventoryDispensePage = page(
  () => import('../features/inventory/InventoryDispensePage'),
  'InventoryDispensePage',
)
const FollowUpListPage = page(
  () => import('../features/emergency-response/FollowUpListPage'),
  'FollowUpListPage',
)
const ReportsPage = page(() => import('../features/reports/ReportsPage'), 'ReportsPage')
const SportsReportListPage = page(() => import('../features/reports/SportsReportListPage'), 'SportsReportListPage')
const SportsReportPage = page(() => import('../features/reports/SportsReportPage'), 'SportsReportPage')
const SportsReportFormPage = page(() => import('../features/reports/SportsReportFormPage'), 'SportsReportFormPage')
const ParentNotificationPage = page(
  () => import('../features/emergency-response/ParentNotificationPage'),
  'ParentNotificationPage',
)
const IncidentReportPage = page(
  () => import('../features/emergency-response/IncidentReportPage'),
  'IncidentReportPage',
)
const UserListPage = page(() => import('../features/user-management/UserListPage'), 'UserListPage')
const UserFormPage = page(() => import('../features/user-management/UserFormPage'), 'UserFormPage')
const BackupStatusPage = page(
  () => import('../features/backup/BackupStatusPage'),
  'BackupStatusPage',
)
const AuditLogPage = page(() => import('../features/audit-log/AuditLogPage'), 'AuditLogPage')
const PrivacyPolicyPage = page(
  () => import('../features/legal/PrivacyPolicyPage'),
  'PrivacyPolicyPage',
)

type Viewer = { viewer: SessionUser }

function StudentProfileRoute({ viewer }: Viewer) {
  const { studentId } = useParams()
  return <StudentProfilePage viewer={viewer} studentId={studentId} />
}

function StudentEditRoute({ viewer }: Viewer) {
  const { studentId } = useParams()
  return <StudentFormPage viewer={viewer} studentId={studentId} />
}

function IncidentCompleteRoute({ viewer }: Viewer) {
  const { incidentId } = useParams()
  return <IncidentEntryPage viewer={viewer} incidentId={incidentId} />
}

function VisitDetailRoute({ viewer }: Viewer) {
  const { visitId } = useParams()
  return <VisitDetailPage viewer={viewer} visitId={visitId} />
}

function ExcuseLetterRoute({ viewer }: Viewer) {
  const { visitId } = useParams()
  return <ExcuseLetterPage viewer={viewer} visitId={visitId} />
}
function IncidentNotificationRoute({ viewer }: Viewer) {
  const { incidentId } = useParams()
  return <ParentNotificationPage viewer={viewer} incidentId={incidentId} />
}
function IncidentReportRoute({ viewer }: Viewer) {
  const { incidentId } = useParams()
  return <IncidentReportPage viewer={viewer} incidentId={incidentId} />
}
function SportsReportRoute({ viewer }: Viewer) {
  const { reportId } = useParams()
  return <SportsReportPage reportId={reportId} viewer={viewer} />
}
function SportsReportEditRoute({ viewer }: Viewer) {
  const { reportId } = useParams()
  return <SportsReportFormPage reportId={reportId} viewer={viewer} />
}
function UserFormRoute({ viewer }: Viewer) {
  const { userId } = useParams()
  return <UserFormPage userId={userId} viewer={viewer} />
}
/**
 * Every app route requires a signed-in account (ADR-002, security clarification). Without one the
 * visitor goes to Login, which returns them here afterwards.
 */
function RequireLogin() {
  const location = useLocation()
  return (
    <Navigate to={paths.login} replace state={{ from: `${location.pathname}${location.search}` }} />
  )
}

interface AppRoute {
  path: string
  /** Browser-tab label, paired with the route so it changes with the active screen. */
  title: string
  roles: UserRole[]
  /** Sidebar item highlighted while this screen is open. */
  nav: NavKey | null
  render: (viewer: SessionUser) => ReactNode
}

function PageTitle({ children, title }: { children: ReactNode; title: string }) {
  useEffect(() => {
    document.title = `CLINIQ — ${title}`
  }, [title])

  return children
}

const APP_ROUTES: AppRoute[] = [
  {
    path: paths.dashboard,
    title: 'Clinic Overview',
    roles: ['staff', 'admin'],
    nav: 'dashboard',
    render: (viewer) => <DashboardPage viewer={viewer} />,
  },
  {
    path: paths.calendar,
    title: 'Clinic Calendar',
    roles: ['staff', 'admin'],
    nav: 'calendar',
    render: (viewer) => <CalendarPage viewer={viewer} />,
  },
  {
    path: paths.students,
    title: 'Student List',
    roles: ['staff'],
    nav: 'students',
    render: () => <StudentListPage />,
  },
  {
    path: paths.studentNew,
    title: 'Add Student',
    roles: ['staff'],
    nav: 'students',
    render: (viewer) => <StudentFormPage viewer={viewer} />,
  },
  {
    path: paths.incompleteRecords,
    title: 'Incomplete Records',
    roles: ['staff'],
    nav: 'students',
    render: (viewer) => <IncompleteRecordsQueuePage viewer={viewer} />,
  },
  {
    path: '/students/:studentId',
    title: 'Student Profile',
    roles: ['staff'],
    nav: 'students',
    render: (viewer) => <StudentProfileRoute viewer={viewer} />,
  },
  {
    path: '/students/:studentId/edit',
    title: 'Edit Student',
    roles: ['staff'],
    nav: 'students',
    render: (viewer) => <StudentEditRoute viewer={viewer} />,
  },
  {
    path: paths.visits,
    title: 'Visit Log',
    roles: ['staff'],
    nav: 'visits',
    render: () => <VisitLogListPage />,
  },
  {
    path: '/visits/new',
    title: 'New Visit',
    roles: ['staff'],
    nav: 'visits',
    render: (viewer) => <NewVisitEntryPage viewer={viewer} />,
  },
  {
    path: '/visits/pe-referral',
    title: 'PE/Sports Referrals',
    roles: ['staff'],
    nav: 'visits',
    render: (viewer) => <PeSportsReferralPage viewer={viewer} />,
  },
  {
    path: '/visits/:visitId',
    title: 'Visit Details',
    roles: ['staff'],
    nav: 'visits',
    render: (viewer) => <VisitDetailRoute viewer={viewer} />,
  },
  {
    path: '/visits/:visitId/excuse-letter',
    title: 'Excuse Letter',
    roles: ['staff'],
    nav: 'visits',
    render: (viewer) => <ExcuseLetterRoute viewer={viewer} />,
  },
  {
    path: paths.incidents,
    title: 'Incident Log',
    roles: ['staff'],
    nav: 'incidents',
    render: () => <IncidentLogListPage />,
  },
  {
    path: '/incidents/new',
    title: 'Report Incident',
    roles: ['staff'],
    nav: 'incidents',
    render: (viewer) => <IncidentEntryPage viewer={viewer} />,
  },
  {
    path: '/incidents/:incidentId/complete',
    title: 'Complete Incident',
    roles: ['staff'],
    nav: 'incidents',
    render: (viewer) => <IncidentCompleteRoute viewer={viewer} />,
  },
  {
    path: '/incidents/notifications',
    title: 'Parent Notifications',
    roles: ['staff'],
    nav: 'incidents',
    render: (viewer) => <IncidentNotificationRoute viewer={viewer} />,
  },
  {
    path: '/incidents/:incidentId/notifications',
    title: 'Parent Notifications',
    roles: ['staff'],
    nav: 'incidents',
    render: (viewer) => <IncidentNotificationRoute viewer={viewer} />,
  },
  {
    path: '/incidents/report',
    title: 'Incident Report',
    roles: ['staff'],
    nav: 'incidents',
    render: (viewer) => <IncidentReportRoute viewer={viewer} />,
  },
  {
    path: '/incidents/:incidentId/report',
    title: 'Incident Report',
    roles: ['staff'],
    nav: 'incidents',
    render: (viewer) => <IncidentReportRoute viewer={viewer} />,
  },
  {
    path: paths.inventory,
    title: 'Inventory',
    roles: ['staff'],
    nav: 'inventory',
    render: () => <InventoryListPage />,
  },
  {
    path: paths.inventoryNew,
    title: 'Add Inventory Item',
    roles: ['staff'],
    nav: 'inventory',
    render: () => <InventoryFormPage />,
  },
  {
    path: '/inventory/dispense',
    title: 'Dispense Item',
    roles: ['staff'],
    nav: 'inventory',
    render: () => <InventoryDispensePage />,
  },
  {
    path: paths.followUps,
    title: 'Follow-Ups',
    roles: ['staff'],
    nav: 'followUps',
    render: () => <FollowUpListPage />,
  },
  {
    path: paths.reports,
    title: 'Reports',
    roles: ['staff', 'admin'],
    nav: 'reports',
    render: (viewer) => <ReportsPage viewer={viewer} />,
  },
  // Sports Reports (ADR-034): the clinician's only; the Admin/Principal can't open them.
  {
    path: paths.sportsReports,
    title: 'Sports Reports',
    roles: ['staff'],
    nav: 'reports',
    render: (viewer) => <SportsReportListPage viewer={viewer} />,
  },
  {
    path: paths.sportsReportNew,
    title: 'New Sports Report',
    roles: ['staff'],
    nav: 'reports',
    render: (viewer) => <SportsReportFormPage viewer={viewer} />,
  },
  {
    path: '/reports/sports/:reportId',
    title: 'Sports Report',
    roles: ['staff'],
    nav: 'reports',
    render: (viewer) => <SportsReportRoute viewer={viewer} />,
  },
  {
    path: '/reports/sports/:reportId/edit',
    title: 'Edit Sports Report',
    roles: ['staff'],
    nav: 'reports',
    render: (viewer) => <SportsReportEditRoute viewer={viewer} />,
  },
  {
    path: paths.auditLog,
    title: 'Audit Log',
    roles: ['staff', 'admin'],
    nav: 'auditLog',
    render: (viewer) => <AuditLogPage viewer={viewer} />,
  },
  {
    path: paths.privacyPolicy,
    title: 'Privacy Policy',
    roles: ['staff', 'admin'],
    nav: null,
    render: (viewer) => <PrivacyPolicyPage viewer={viewer} />,
  },
  {
    path: paths.users,
    title: 'User Accounts',
    roles: ['admin'],
    nav: 'accounts',
    render: (viewer) => <UserListPage viewer={viewer} />,
  },
  {
    path: paths.userNew,
    title: 'Add User',
    roles: ['admin'],
    nav: 'accounts',
    render: (viewer) => <UserFormPage viewer={viewer} />,
  },
  {
    path: '/users/:userId/edit',
    title: 'Edit User',
    roles: ['admin'],
    nav: 'accounts',
    render: (viewer) => <UserFormRoute viewer={viewer} />,
  },
  {
    path: paths.backup,
    title: 'Backup',
    // ADR-037: the Admin/Principal gets Backup too, with the same abilities as Staff.
    roles: ['staff', 'admin'],
    nav: 'backup',
    render: () => <BackupStatusPage />,
  },
]

function RouteLoading() {
  return (
    <div
      className="mx-auto flex max-w-page-wide flex-col gap-4 px-4 pt-10 pb-8 sm:px-8"
      aria-busy="true"
    >
      <p className="sr-only" role="status">
        Loading screen…
      </p>
      <Card className="p-5">
        <Skeleton className="h-7 w-56 max-w-full" />
        <Skeleton className="mt-2 h-4 w-96 max-w-full" />
      </Card>
      <Card className="p-5">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="mt-4 h-40 w-full" />
      </Card>
    </div>
  )
}

function withShell(user: SessionUser, nav: NavKey | null, content: ReactNode, onLogout: () => void) {
  return (
    <AppShell user={user} active={nav} onLogout={onLogout}>
      {content}
    </AppShell>
  )
}

export function AppRoutes({
  user,
  onLogout,
  onLogin = () => {},
}: {
  /** `null` until someone signs in; every route except Login and Force Password Change then redirects to Login. */
  user: SessionUser | null
  onLogout: () => void
  onLogin?: (user: SessionUser) => void
}) {
  return (
    <Routes>
      <Route
        path={paths.login}
        element={
          <PageTitle title="Sign In">
            <LoginPage onLogin={onLogin} />
          </PageTitle>
        }
      />
      <Route
        path={paths.forcePasswordChange}
        element={
          <PageTitle title="Change Password">
            <ForcePasswordChangePage onComplete={onLogin} />
          </PageTitle>
        }
      />
      {APP_ROUTES.map((route) => {
        if (!user) {
          // The privacy notice is static and holds no student data, so Login can link to it.
          const element =
            route.path === paths.privacyPolicy ? (
              <PageTitle title={route.title}>
                <main id="main-content" className="min-h-dvh bg-surface">
                  <Suspense fallback={<RouteLoading />}>
                    <PrivacyPolicyPage viewer={null} />
                  </Suspense>
                </main>
              </PageTitle>
            ) : (
              <RequireLogin />
            )
          return <Route key={route.path} path={route.path} element={element} />
        }
        const allowed = route.roles.includes(user.role)
        const content = (
          <PageTitle title={route.title}>
            <Suspense fallback={<RouteLoading />}>{route.render(user)}</Suspense>
          </PageTitle>
        )
        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              !allowed ? (
                <Navigate to={paths.dashboard} replace />
              ) : (
                withShell(user, route.nav, content, onLogout)
              )
            }
          />
        )
      })}
      <Route
        path="*"
        element={
          user ? (
            withShell(
              user,
              null,
              <PageTitle title="Page Not Found">
                <NotFoundPage home={paths.dashboard} />
              </PageTitle>,
              onLogout,
            )
          ) : (
            <RequireLogin />
          )
        }
      />
    </Routes>
  )
}
