/**
 * Every URL in the app, built in one place (Development-Phases.md §0: path = which screen,
 * query = what state that screen is in). Screens link through these builders instead of
 * hand-writing strings, so a route change is one edit here.
 *
 * Kept free of page imports so any feature can import it without pulling in other screens'
 * lazily-loaded code.
 */
import type { UserRole } from '../types/entities'

const seg = encodeURIComponent

function withStudent(path: string, studentNumber?: string): string {
  return studentNumber ? `${path}?student=${seg(studentNumber)}` : path
}

export const paths = {
  login: '/login',
  forcePasswordChange: '/force-password-change',
  dashboard: '/',
  calendar: '/calendar',
  students: '/students',
  studentNew: '/students/new',
  incompleteRecords: '/students/incomplete',
  studentProfile: (studentNumber: string) => `/students/${seg(studentNumber)}`,
  studentEdit: (studentNumber: string) => `/students/${seg(studentNumber)}/edit`,
  visits: '/visits',
  visitsWithPendingLetter: '/visits?letter=pending',
  visitsInRange: (from: string, to: string) => `/visits?from=${seg(from)}&to=${seg(to)}`,
  /** The Visits list opened on one day's custom range (the Dashboard calendar's "View visits"). */
  visitsOnDate: (date: string) => `/visits?from=${date}&to=${date}`,
  /** `?student=` pre-selects the identified student (e.g. from a QR lookup). */
  visitNew: (studentNumber?: string) => withStudent('/visits/new', studentNumber),
  /** `?student=` pre-selects the identified student (the QR quick-action passes it). */
  peReferral: (studentNumber?: string) => withStudent('/visits/pe-referral', studentNumber),
  visitDetail: (visitId: string) => `/visits/${seg(visitId)}`,
  excuseLetter: (visitId: string) => `/visits/${seg(visitId)}/excuse-letter`,
  incidents: '/incidents',
  incidentsInRange: (from: string, to: string) => `/incidents?from=${seg(from)}&to=${seg(to)}`,
  /** `?student=` pre-selects the identified student; the Emergency button opens it without one. */
  incidentNew: (studentNumber?: string) => withStudent('/incidents/new', studentNumber),
  /** Reopens a saved Stage-1 incident to complete Stage 2 (Screen #16b). */
  incidentComplete: (incidentId: string) => `/incidents/${seg(incidentId)}/complete`,
  qrScan: '/qr/scan',
  inventory: '/inventory',
  inventoryNew: '/inventory/new',
  inventoryDispense: (studentNumber?: string) => withStudent('/inventory/dispense', studentNumber),
  followUps: '/follow-ups',
  qrPrint: '/qr/print',
  emergencyMobile: '/emergency/mobile',
  reports: '/reports',
  auditLog: '/audit-log',
  privacyPolicy: '/privacy-policy',
  incidentNotifications: (incidentId?: string) =>
    incidentId
      ? `/incidents/${encodeURIComponent(incidentId)}/notifications`
      : '/incidents/notifications',
  incidentReport: (incidentId?: string) =>
    incidentId ? `/incidents/${encodeURIComponent(incidentId)}/report` : '/incidents/report',
  users: '/users',
  userNew: '/users/new',
  userEdit: (userId: string) => `/users/${encodeURIComponent(userId)}/edit`,
  backup: '/backup',
} as const

/** Where a role lands on `/`, when it opens a screen it can't use, and where Back falls back to. */
export function homePathFor(role: UserRole): string {
  return role === 'instructor' ? paths.qrScan : paths.dashboard
}
