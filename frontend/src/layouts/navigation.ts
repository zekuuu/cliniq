import type { IconName } from '../components'
import { paths } from '../routes/paths'
import type { UserRole } from '../types/entities'

/**
 * Role-aware navigation (Screen Inventory #3; Module-Overview Access Summary). Staff sees every
 * module, including the Staff patients (ADR-043); Admin/Principal sees Dashboard, Calendar, Students and Incidents (read only, ADR-038), Reports,
 * Audit Log, Accounts and Backup (ADR-033, ADR-037).
 *
 * `to` is the item's route (routes/paths.ts). `available: false` marks screens not built yet (no
 * route exists). The shell shows them as "Soon" and not clickable,
 * so nothing looks like it works when it doesn't. Groups organize destinations around the user's
 * work: overview, care delivery, operations, and administration.
 */
export type NavKey =
  | 'dashboard'
  | 'calendar'
  | 'students'
  | 'staff'
  | 'visits'
  | 'incidents'
  | 'followUps'
  | 'inventory'
  | 'reports'
  | 'auditLog'
  | 'accounts'
  | 'backup'

export interface NavItem {
  key: NavKey
  label: string
  icon: IconName
  available: boolean
  to?: string
}

const ALL: Record<NavKey, NavItem> = {
  dashboard: { key: 'dashboard', label: 'Dashboard', icon: 'layoutGrid', available: true, to: paths.dashboard },
  calendar: { key: 'calendar', label: 'Calendar', icon: 'calendar', available: true, to: paths.calendar },
  students: { key: 'students', label: 'Students', icon: 'users', available: true, to: paths.students },
  staff: { key: 'staff', label: 'Staff', icon: 'user', available: true, to: paths.staff },
  visits: { key: 'visits', label: 'Visits', icon: 'stethoscope', available: true, to: paths.visits },
  incidents: { key: 'incidents', label: 'Incidents', icon: 'alertTriangle', available: true, to: paths.incidents },
  followUps: { key: 'followUps', label: 'Follow-Ups', icon: 'calendarClock', available: true, to: paths.followUps },
  inventory: { key: 'inventory', label: 'Inventory', icon: 'package', available: true, to: paths.inventory },
  reports: { key: 'reports', label: 'Reports', icon: 'fileText', available: true, to: paths.reports },
  auditLog: { key: 'auditLog', label: 'Audit Log', icon: 'clipboardList', available: true, to: paths.auditLog },
  accounts: { key: 'accounts', label: 'Accounts', icon: 'userCog', available: true, to: paths.users },
  backup: { key: 'backup', label: 'Backup', icon: 'refresh', available: true, to: paths.backup },
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export function navGroupsFor(role: UserRole): NavGroup[] {
  if (role === 'admin') {
    return [
      { label: 'Overview', items: [ALL.dashboard, ALL.calendar] },
      { label: 'Patient Care', items: [ALL.students, ALL.incidents] },
      { label: 'Reporting', items: [ALL.reports, ALL.auditLog] },
      { label: 'Administration', items: [ALL.accounts, ALL.backup] },
    ]
  }
  return [
    { label: 'Overview', items: [ALL.dashboard, ALL.calendar] },
    // ADR-043: staff patients are the School Clinician's only; the Admin has no Staff item.
    { label: 'Patient Care', items: [ALL.students, ALL.staff, ALL.visits, ALL.incidents, ALL.followUps] },
    { label: 'Operations', items: [ALL.inventory, ALL.reports] },
    { label: 'Administration', items: [ALL.backup, ALL.auditLog] },
  ]
}
