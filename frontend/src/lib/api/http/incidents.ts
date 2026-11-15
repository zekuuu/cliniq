import {
  StockRuleError,
  type IncidentTrail,
  type StageOneInput,
  type StageTwoInput,
} from '../../mock-db'
import type {
  CalledContact,
  FollowUp,
  ISODate,
  Incident,
  ParentNotificationAttempt,
  ParentNotificationOutcome,
} from '../../../types/entities'
import { http } from '../client'
import { mapped, type ErrorMap } from '../errors'

/**
 * INCIDENTS in API mode (S4; API-Contract.md "Emergency Response"). The server applies who may see
 * what: a staff patient's incident does not exist for the Admin (404, as the mock's `visibleTo`).
 */

/** The entry form shows a refused save in place, as the mock's stock rule did. */
const SAVE_ERRORS: ErrorMap = { validation: (message) => new StockRuleError(message) }

export function listIncidents(range?: { from: ISODate; to: ISODate }): Promise<Incident[]> {
  return http.get('/incidents', { query: { from: range?.from, to: range?.to } })
}

export function getIncident(id: string): Promise<Incident> {
  return http.get(`/incidents/${encodeURIComponent(id)}`)
}

export function saveIncidentStageOne(input: StageOneInput): Promise<Incident> {
  return mapped(http.post('/incidents', input), SAVE_ERRORS)
}

export function completeIncidentStageTwo(
  input: StageTwoInput,
): Promise<{ incident: Incident; followUp: FollowUp | null; belowZero: string[] }> {
  const { incidentId, ...body } = input
  return mapped(
    http.put(`/incidents/${encodeURIComponent(incidentId)}/stage-two`, body),
    SAVE_ERRORS,
  )
}

export function addParentNotification(
  incidentId: string,
  outcome: ParentNotificationOutcome,
  _actor?: unknown,
  calledContact: CalledContact | null = null,
): Promise<ParentNotificationAttempt> {
  return http.post(`/incidents/${encodeURIComponent(incidentId)}/parent-notifications`, {
    outcome,
    calledContact,
  })
}

export function listApprovedIncidentReportIds(): Promise<string[]> {
  return http.get('/incidents/approved-ids')
}

export function getIncidentTrail(incidentId: string): Promise<IncidentTrail> {
  return http.get(`/incidents/${encodeURIComponent(incidentId)}/trail`)
}

export async function approveIncidentReport(incidentId: string): Promise<void> {
  await http.post(`/incidents/${encodeURIComponent(incidentId)}/approve`)
}
