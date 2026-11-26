/**
 * The data layer the app imports (ADR-080): every export of the mock layer, with each connected
 * function routed by its module's mode (`lib/api/mode.ts`). Mock mode calls the mock function
 * unchanged; API mode calls the HTTP function in `lib/api/http/`, which returns the mock's types.
 * Screens and feature `api/` modules import from here, never from `lib/mock-db` directly.
 */
export * from '../mock-db'

import * as mock from '../mock-db'
import * as auth from '../api/http/auth'
import { routed } from '../api/routed'

// AUTH (S1): sign-in, session, password, authenticator and recovery, own profile.
export const authenticateMockUser = routed(
  'AUTH',
  mock.authenticateMockUser,
  auth.authenticateMockUser,
)
export const getAuthenticatedUser = routed(
  'AUTH',
  mock.getAuthenticatedUser,
  auth.getAuthenticatedUser,
)
export const startMockSession = routed('AUTH', mock.startMockSession, auth.startMockSession)
export const getMockSessionUser = routed('AUTH', mock.getMockSessionUser, auth.getMockSessionUser)
export const beginPasswordChange = routed(
  'AUTH',
  mock.beginPasswordChange,
  auth.beginPasswordChange,
)
export const clearPendingPasswordChange = routed(
  'AUTH',
  mock.clearPendingPasswordChange,
  auth.clearPendingPasswordChange,
)
export const getPendingPasswordChangeUser = routed(
  'AUTH',
  mock.getPendingPasswordChangeUser,
  auth.getPendingPasswordChangeUser,
)
export const logoutMockSession = routed('AUTH', mock.logoutMockSession, auth.logoutMockSession)
export const changeMockPassword = routed('AUTH', mock.changeMockPassword, auth.changeMockPassword)
export const changeOwnPassword = routed('AUTH', mock.changeOwnPassword, auth.changeOwnPassword)
export const getIdleSignoutMinutes = routed(
  'AUTH',
  mock.getIdleSignoutMinutes,
  auth.getIdleSignoutMinutes,
)
export const checkRecoveryAccount = routed(
  'AUTH',
  mock.checkRecoveryAccount,
  auth.checkRecoveryAccount,
)
export const verifyPasswordRecovery = routed(
  'AUTH',
  mock.verifyPasswordRecovery,
  auth.verifyPasswordRecovery,
)
export const resetPasswordWithRecovery = routed(
  'AUTH',
  mock.resetPasswordWithRecovery,
  auth.resetPasswordWithRecovery,
)
export const getAuthenticatorStatus = routed(
  'AUTH',
  mock.getAuthenticatorStatus,
  auth.getAuthenticatorStatus,
)
export const startAuthenticatorSetup = routed(
  'AUTH',
  mock.startAuthenticatorSetup,
  auth.startAuthenticatorSetup,
)
export const confirmAuthenticatorSetup = routed(
  'AUTH',
  mock.confirmAuthenticatorSetup,
  auth.confirmAuthenticatorSetup,
)
export const turnOffAuthenticator = routed(
  'AUTH',
  mock.turnOffAuthenticator,
  auth.turnOffAuthenticator,
)
export const getOwnAccount = routed('AUTH', mock.getOwnAccount, auth.getOwnAccount)
export const updateOwnProfile = routed('AUTH', mock.updateOwnProfile, auth.updateOwnProfile)

// SETTINGS: the idle sign-out limits (ADR-078).
export const getIdleSignoutSettings = routed(
  'SETTINGS',
  mock.getIdleSignoutSettings,
  auth.getIdleSignoutSettings,
)
export const saveIdleSignoutSettings = routed(
  'SETTINGS',
  mock.saveIdleSignoutSettings,
  auth.saveIdleSignoutSettings,
)
export const getOperationalSettings = routed(
  'SETTINGS',
  mock.getOperationalSettings,
  auth.getOperationalSettings,
)
export const saveOperationalSettings = routed(
  'SETTINGS',
  mock.saveOperationalSettings,
  auth.saveOperationalSettings,
)

import * as records from '../api/http/records'

// STUDENTS (S2).
export const listStudents = routed('STUDENTS', mock.listStudents, records.listStudents)
export const searchStudents = routed('STUDENTS', mock.searchStudents, records.searchStudents)
export const getStudent = routed('STUDENTS', mock.getStudent, records.getStudent)
export const getDemoStudent = routed('STUDENTS', mock.getDemoStudent, records.getDemoStudent)
export const getStudentHistory = routed(
  'STUDENTS',
  mock.getStudentHistory,
  records.getStudentHistory,
)
export const checkStudentDuplicates = routed(
  'STUDENTS',
  mock.checkStudentDuplicates,
  records.checkStudentDuplicates,
)
export const saveStudent = routed('STUDENTS', mock.saveStudent, records.saveStudent)
export const archiveStudent = routed('STUDENTS', mock.archiveStudent, records.archiveStudent)
export const restoreStudent = routed('STUDENTS', mock.restoreStudent, records.restoreStudent)
export const previewStudentImport = routed(
  'STUDENTS',
  mock.previewStudentImport,
  records.previewStudentImport,
)
export const applyStudentImport = routed(
  'STUDENTS',
  mock.applyStudentImport,
  records.applyStudentImport,
)
export const getIncompleteRecordQueue = routed(
  'STUDENTS',
  mock.getIncompleteRecordQueue,
  records.getIncompleteRecordQueue,
)

// STAFF_PATIENTS (S2), with the one patient box that spans both lists.
export const listPersonnel = routed('STAFF_PATIENTS', mock.listPersonnel, records.listPersonnel)
export const getPersonnel = routed('STAFF_PATIENTS', mock.getPersonnel, records.getPersonnel)
export const searchPersonnel = routed(
  'STAFF_PATIENTS',
  mock.searchPersonnel,
  records.searchPersonnel,
)
export const getPersonnelHistory = routed(
  'STAFF_PATIENTS',
  mock.getPersonnelHistory,
  records.getPersonnelHistory,
)
export const savePersonnel = routed('STAFF_PATIENTS', mock.savePersonnel, records.savePersonnel)
export const archivePersonnel = routed(
  'STAFF_PATIENTS',
  mock.archivePersonnel,
  records.archivePersonnel,
)
export const restorePersonnel = routed(
  'STAFF_PATIENTS',
  mock.restorePersonnel,
  records.restorePersonnel,
)
export const previewStaffImport = routed(
  'STAFF_PATIENTS',
  mock.previewStaffImport,
  records.previewStaffImport,
)
export const applyStaffImport = routed(
  'STAFF_PATIENTS',
  mock.applyStaffImport,
  records.applyStaffImport,
)
export const getStaffIncompleteQueue = routed(
  'STAFF_PATIENTS',
  mock.getStaffIncompleteQueue,
  records.getStaffIncompleteQueue,
)
export const searchPatients = routed('STAFF_PATIENTS', mock.searchPatients, records.searchPatients)
export const getPatient = routed('STAFF_PATIENTS', mock.getPatient, records.getPatient)

// SCHOOL_YEARS (S2), with the Archive page.
export const getSchoolYearSettings = routed(
  'SCHOOL_YEARS',
  mock.getSchoolYearSettings,
  records.getSchoolYearSettings,
)
export const getSchoolYearHistory = routed(
  'SCHOOL_YEARS',
  mock.getSchoolYearHistory,
  records.getSchoolYearHistory,
)
export const getSchoolYearReminder = routed(
  'SCHOOL_YEARS',
  mock.getSchoolYearReminder,
  records.getSchoolYearReminder,
)
export const saveSchoolYearSettings = routed(
  'SCHOOL_YEARS',
  mock.saveSchoolYearSettings,
  records.saveSchoolYearSettings,
)
export const endSchoolYear = routed('SCHOOL_YEARS', mock.endSchoolYear, records.endSchoolYear)
export const startSchoolYear = routed('SCHOOL_YEARS', mock.startSchoolYear, records.startSchoolYear)
export const getArchive = routed('SCHOOL_YEARS', mock.getArchive, records.getArchive)

import * as visits from '../api/http/visits'

// VISITS (S3), with the excuse letters, the sports referral and the follow-ups.
export const listVisits = routed('VISITS', mock.listVisits, visits.listVisits)
export const getVisit = routed('VISITS', mock.getVisit, visits.getVisit)
export const getLatestVisit = routed('VISITS', mock.getLatestVisit, visits.getLatestVisit)
export const recordVisit = routed('VISITS', mock.recordVisit, visits.recordVisit)
export const updateVisit = routed('VISITS', mock.updateVisit, visits.updateVisit)
export const markVisitEnteredInError = routed(
  'VISITS',
  mock.markVisitEnteredInError,
  visits.markVisitEnteredInError,
)
export const getExcuseLetterApproval = routed(
  'VISITS',
  mock.getExcuseLetterApproval,
  visits.getExcuseLetterApproval,
)
export const getExcuseLetterById = routed(
  'VISITS',
  mock.getExcuseLetterById,
  visits.getExcuseLetterById,
)
export const issueReplacementExcuseLetter = routed(
  'VISITS',
  mock.issueReplacementExcuseLetter,
  visits.issueReplacementExcuseLetter,
)
export const approveExcuseLetter = routed(
  'VISITS',
  mock.approveExcuseLetter,
  visits.approveExcuseLetter,
)
export const listPendingExcuseLetters = routed(
  'VISITS',
  mock.listPendingExcuseLetters,
  visits.listPendingExcuseLetters,
)
export const getStudentExcuseLetters = routed(
  'VISITS',
  mock.getStudentExcuseLetters,
  visits.getStudentExcuseLetters,
)
export const submitPeReferral = routed('VISITS', mock.submitPeReferral, visits.submitPeReferral)
export const listFollowUps = routed('VISITS', mock.listFollowUps, visits.listFollowUps)
export const setFollowUpStatus = routed('VISITS', mock.setFollowUpStatus, visits.setFollowUpStatus)
export const rescheduleFollowUp = routed(
  'VISITS',
  mock.rescheduleFollowUp,
  visits.rescheduleFollowUp,
)

import * as incidents from '../api/http/incidents'

// INCIDENTS (S4).
export const listIncidents = routed('INCIDENTS', mock.listIncidents, incidents.listIncidents)
export const getIncident = routed('INCIDENTS', mock.getIncident, incidents.getIncident)
export const saveIncidentStageOne = routed(
  'INCIDENTS',
  mock.saveIncidentStageOne,
  incidents.saveIncidentStageOne,
)
export const completeIncidentStageTwo = routed(
  'INCIDENTS',
  mock.completeIncidentStageTwo,
  incidents.completeIncidentStageTwo,
)
export const addParentNotification = routed(
  'INCIDENTS',
  mock.addParentNotification,
  incidents.addParentNotification,
)
export const listApprovedIncidentReportIds = routed(
  'INCIDENTS',
  mock.listApprovedIncidentReportIds,
  incidents.listApprovedIncidentReportIds,
)
export const getIncidentTrail = routed(
  'INCIDENTS',
  mock.getIncidentTrail,
  incidents.getIncidentTrail,
)
export const approveIncidentReport = routed(
  'INCIDENTS',
  mock.approveIncidentReport,
  incidents.approveIncidentReport,
)

import * as inventory from '../api/http/inventory'

// INVENTORY (S5).
export const listInventory = routed('INVENTORY', mock.listInventory, inventory.listInventory)
export const getInventoryItem = routed(
  'INVENTORY',
  mock.getInventoryItem,
  inventory.getInventoryItem,
)
export const saveInventoryItem = routed(
  'INVENTORY',
  mock.saveInventoryItem,
  inventory.saveInventoryItem,
)
export const listInventoryHistory = routed(
  'INVENTORY',
  mock.listInventoryHistory,
  inventory.listInventoryHistory,
)
export const listInventoryMovements = routed(
  'INVENTORY',
  mock.listInventoryMovements,
  inventory.listInventoryMovements,
)
export const dispenseInventoryItem = routed(
  'INVENTORY',
  mock.dispenseInventoryItem,
  inventory.dispenseInventoryItem,
)
export const restockInventoryItem = routed(
  'INVENTORY',
  mock.restockInventoryItem,
  inventory.restockInventoryItem,
)
export const adjustInventoryStock = routed(
  'INVENTORY',
  mock.adjustInventoryStock,
  inventory.adjustInventoryStock,
)

import * as dashboard from '../api/http/dashboard'

// DASHBOARD (S6), with the calendar and holidays.
export const getDashboardSummary = routed(
  'DASHBOARD',
  mock.getDashboardSummary,
  dashboard.getDashboardSummary,
)
export const listClusterAlerts = routed(
  'DASHBOARD',
  mock.listClusterAlerts,
  dashboard.listClusterAlerts,
)
export const getCalendarDays = routed('DASHBOARD', mock.getCalendarDays, dashboard.getCalendarDays)
export const getHolidays = routed('DASHBOARD', mock.getHolidays, dashboard.getHolidays)
export const listCalendarEvents = routed(
  'DASHBOARD',
  mock.listCalendarEvents,
  dashboard.listCalendarEvents,
)
export const createCalendarEvent = routed(
  'DASHBOARD',
  mock.createCalendarEvent,
  dashboard.createCalendarEvent,
)
export const updateCalendarEvent = routed(
  'DASHBOARD',
  mock.updateCalendarEvent,
  dashboard.updateCalendarEvent,
)
export const deleteCalendarEvent = routed(
  'DASHBOARD',
  mock.deleteCalendarEvent,
  dashboard.deleteCalendarEvent,
)
export const restoreCalendarEvent = routed(
  'DASHBOARD',
  mock.restoreCalendarEvent,
  dashboard.restoreCalendarEvent,
)

export const undoInventoryMovement = routed(
  'INVENTORY',
  mock.undoInventoryMovement,
  inventory.undoInventoryMovement,
)
export const archiveNewInventoryItem = routed(
  'INVENTORY',
  mock.archiveNewInventoryItem,
  inventory.archiveNewInventoryItem,
)

export const undoVisitEnteredInError = routed(
  'VISITS',
  mock.undoVisitEnteredInError,
  visits.undoVisitEnteredInError,
)
export const undoFollowUpReschedule = routed(
  'VISITS',
  mock.undoFollowUpReschedule,
  visits.undoFollowUpReschedule,
)

// REPORTS (S6), with Sports Reports.
export const getMonthlyReport = routed('REPORTS', mock.getMonthlyReport, dashboard.getMonthlyReport)
export const getLatestRecordedMonth = routed(
  'REPORTS',
  mock.getLatestRecordedMonth,
  dashboard.getLatestRecordedMonth,
)
export const listSportsReports = routed(
  'REPORTS',
  mock.listSportsReports,
  dashboard.listSportsReports,
)
export const getSportsReport = routed('REPORTS', mock.getSportsReport, dashboard.getSportsReport)
export const getSportsReportContent = routed(
  'REPORTS',
  mock.getSportsReportContent,
  dashboard.getSportsReportContent,
)
export const createSportsReport = routed(
  'REPORTS',
  mock.createSportsReport,
  dashboard.createSportsReport,
)
export const updateSportsReport = routed(
  'REPORTS',
  mock.updateSportsReport,
  dashboard.updateSportsReport,
)
export const duplicateSportsReport = routed(
  'REPORTS',
  mock.duplicateSportsReport,
  dashboard.duplicateSportsReport,
)
export const setSportsReportArchived = routed(
  'REPORTS',
  mock.setSportsReportArchived,
  dashboard.setSportsReportArchived,
)

import * as audit from '../api/http/audit'

// AUDIT (S7): the log, record views and the print entries.
export const listAuditLog = routed('AUDIT', mock.listAuditLog, audit.listAuditLog)
export const recordView = routed('AUDIT', mock.recordView, audit.recordView)
export const recordPrint = routed('AUDIT', mock.recordPrint, audit.recordPrint)

/**
 * Full-LRN data for a Staff printout (ADR-044), fetched by the Print button just before printing.
 * The mock already holds the full LRN, so mock mode reads the same data as the screen. On the API
 * the request itself is the print's audit entry (Zean, Sunday, November 15, 2026, ADR-080).
 */
export const getMonthlyReportForPrint = routed(
  'REPORTS',
  mock.getMonthlyReport,
  audit.getMonthlyReportForPrint,
)
export const listAuditLogForPrint = routed('AUDIT', mock.listAuditLog, audit.listAuditLogForPrint)

import * as admin from '../api/http/admin'

// USERS (S7).
export const listUsers = routed('USERS', mock.listUsers, admin.listUsers)
export const getPrincipalName = routed('USERS', mock.getPrincipalName, admin.getPrincipalName)
export const getUser = routed('USERS', mock.getUser, admin.getUser)
export const saveUser = routed('USERS', mock.saveUser, admin.saveUser)
export const setUserActive = routed('USERS', mock.setUserActive, admin.setUserActive)
export const resetUserPassword = routed('USERS', mock.resetUserPassword, admin.resetUserPassword)

// BACKUP (S7).
export const getBackupStatus = routed('BACKUP', mock.getBackupStatus, admin.getBackupStatus)
export const verifyLatestBackup = routed(
  'BACKUP',
  mock.verifyLatestBackup,
  admin.verifyLatestBackup,
)
export const recordBackupNow = routed('BACKUP', mock.recordBackupNow, admin.recordBackupNow)
export const listBackupFolders = routed('BACKUP', mock.listBackupFolders, admin.listBackupFolders)
export const listBackupLocations = routed(
  'BACKUP',
  mock.listBackupLocations,
  admin.listBackupLocations,
)
export const saveBackupLocation = routed(
  'BACKUP',
  mock.saveBackupLocation,
  admin.saveBackupLocation,
)
export const setBackupLocationEnabled = routed(
  'BACKUP',
  mock.setBackupLocationEnabled,
  admin.setBackupLocationEnabled,
)

// ISSUE_REPORTS (S7).
export const createIssueReport = routed(
  'ISSUE_REPORTS',
  mock.createIssueReport,
  admin.createIssueReport,
)
export const listIssueReports = routed(
  'ISSUE_REPORTS',
  mock.listIssueReports,
  admin.listIssueReports,
)

// REFERENCE (S7): the lists and values the forms use.
export const getVisitComplaintTypes = routed(
  'REFERENCE',
  mock.getVisitComplaintTypes,
  admin.getVisitComplaintTypes,
)
export const getVisitComplaintSuggestions = routed(
  'REFERENCE',
  mock.getVisitComplaintSuggestions,
  admin.getVisitComplaintSuggestions,
)
export const getIncidentComplaintTypes = routed(
  'REFERENCE',
  mock.getIncidentComplaintTypes,
  admin.getIncidentComplaintTypes,
)
export const getVitalsWarningRanges = routed(
  'REFERENCE',
  mock.getVitalsWarningRanges,
  admin.getVitalsWarningRanges,
)
export const getMedicalCertificateAfterDays = routed(
  'REFERENCE',
  mock.getMedicalCertificateAfterDays,
  admin.getMedicalCertificateAfterDays,
)
export const getUnusualAgeYears = routed(
  'REFERENCE',
  mock.getUnusualAgeYears,
  admin.getUnusualAgeYears,
)
export const getLargeWriteOffPercent = routed(
  'REFERENCE',
  mock.getLargeWriteOffPercent,
  admin.getLargeWriteOffPercent,
)
export const getGradeLevels = routed('REFERENCE', mock.getGradeLevels, admin.getGradeLevels)
export const getPersonnelTypes = routed(
  'REFERENCE',
  mock.getPersonnelTypes,
  admin.getPersonnelTypes,
)
export const getPersonnelDepartments = routed(
  'REFERENCE',
  mock.getPersonnelDepartments,
  admin.getPersonnelDepartments,
)
