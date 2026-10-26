import { formatDateTime } from '../../../lib/dates'
import {
  addParentNotification,
  approveIncidentReport,
  getIncident,
  getIncidentTrail,
  getPrincipalName,
  getPatient,
  getVisit,
  listApprovedIncidentReportIds,
  listIncidents,
  recordAdminView,
  type IncidentTrail,
  type SessionUser,
} from '../../../lib/mock-db'
import type { CalledContact, Incident, ItemGivenLine, ParentNotificationOutcome } from '../../../types/entities'
import type { Patient } from '../../../lib/patients'

/**
 * One incident, deliberately opened (Incident Report #18, Parent Notification #17): full name is
 * correct here (single deliberate lookup, ADR-004).
 */
export interface IncidentRecord {
  incident: Incident
  /** A student or a staff member (ADR-043). */
  student: Patient
  /** True once this incident's report has been signed off. */
  approved: boolean
  /** Who recorded, completed, and signed it off, for the printed report. */
  trail: IncidentTrail
  /**
   * Selector options: only reports still pending sign-off, so a nurse can't pick and approve a
   * record that is already signed. The open record is included even when it is already approved.
   */
  options: Array<{ value: string; label: string }>
  /** The visit this incident was escalated from (ADR-036), with what was given there. */
  sourceVisit: { id: string; itemsGiven: ItemGivenLine[] } | null
  /** The Admin/Principal account's name for the printout's Principal signature line. */
  principalName: string | null
}

/** `null` when there is nothing to show: no incidents, or (opened without an id) none pending sign-off. */
export async function fetchIncidentRecord(incidentId?: string, viewer?: SessionUser): Promise<IncidentRecord | null> {
  const [incidents, approvedIds] = await Promise.all([listIncidents(undefined, viewer), listApprovedIncidentReportIds()])
  const approved = new Set(approvedIds)
  const pending = incidents.filter((item) => !approved.has(item.id))
  const incident = incidentId ? await getIncident(incidentId, viewer) : pending[0]
  if (!incident) return null
  const [student, trail, source, principalName] = await Promise.all([
    getPatient(incident),
    getIncidentTrail(incident.id),
    incident.sourceVisitId ? getVisit(incident.sourceVisitId) : null,
    getPrincipalName(),
  ])
  // ADR-038 item 4: the Admin's opening of a report is audit-logged.
  if (viewer) await recordAdminView({ type: 'incident', id: incident.id }, viewer)
  const listed = approved.has(incident.id) ? [incident, ...pending] : pending
  return {
    incident,
    student,
    approved: approved.has(incident.id),
    trail,
    sourceVisit: source && { id: source.id, itemsGiven: source.itemsGiven },
    principalName,
    options: listed.map((item) => ({
      value: item.id,
      label: `${formatDateTime(item.time)} · ${item.complaint}${approved.has(item.id) ? ' (approved)' : ''}`,
    })),
  }
}

export async function approveReport(incidentId: string, actor?: SessionUser): Promise<void> {
  await approveIncidentReport(incidentId, actor)
}

export async function logParentNotification(
  incidentId: string,
  outcome: ParentNotificationOutcome,
  actor?: SessionUser,
  calledContact: CalledContact | null = null,
) {
  return addParentNotification(incidentId, outcome, actor, calledContact)
}
