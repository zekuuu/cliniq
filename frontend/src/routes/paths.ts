/**
 * Every URL in the app, built in one place (Development-Phases.md §0: path = which screen,
 * query = what state that screen is in). Screens link through these builders instead of
 * hand-writing strings, so a route change is one edit here.
 *
 * Kept free of page imports so any feature can import it without pulling in other screens'
 * lazily-loaded code.
 */
const seg = encodeURIComponent

export const paths = {
  login: '/login',
  forcePasswordChange: '/force-password-change',
  dashboard: '/',
  calendar: '/calendar',
  students: '/students',
  studentNew: '/students/new',
  incompleteRecords: '/students/incomplete',
  /** By the internal id: an LRN never goes in an address, history or logs (ADR-028). */
  studentProfile: (studentId: string) => `/students/${seg(studentId)}`,
  studentEdit: (studentId: string) => `/students/${seg(studentId)}/edit`,
  visits: '/visits',
  visitsWithPendingLetter: '/visits?letter=pending',
  visitsInRange: (from: string, to: string) => `/visits?from=${seg(from)}&to=${seg(to)}`,
  /** The Visits list opened on one day's custom range (the Dashboard calendar's "View visits"). */
  visitsOnDate: (date: string) => `/visits?from=${date}&to=${date}`,
  visitNew: '/visits/new',
  peReferral: '/visits/pe-referral',
  visitDetail: (visitId: string) => `/visits/${seg(visitId)}`,
  excuseLetter: (visitId: string) => `/visits/${seg(visitId)}/excuse-letter`,
  incidents: '/incidents',
  incidentsInRange: (from: string, to: string) => `/incidents?from=${seg(from)}&to=${seg(to)}`,
  incidentNew: '/incidents/new',
  /** Reopens a saved Stage-1 incident to complete Stage 2 (Screen #16b). */
  incidentComplete: (incidentId: string) => `/incidents/${seg(incidentId)}/complete`,
  inventory: '/inventory',
  inventoryNew: '/inventory/new',
  inventoryDispense: '/inventory/dispense',
  followUps: '/follow-ups',
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

