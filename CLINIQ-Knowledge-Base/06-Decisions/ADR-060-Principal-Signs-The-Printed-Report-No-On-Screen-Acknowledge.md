# ADR-060: The Principal signs the printed report; no on-screen Acknowledge

**Date:** Sunday, November 1, 2026 — 12:09 PHT
**Status:** Accepted (Zean, in chat, Sunday, November 1, 2026). Reverses item 2 of ADR-048 and restores ADR-038's read-only Admin on the Incident Report. The rest of ADR-048 stands.

## Context
ADR-048 gave the Admin/Principal an Acknowledge button on an approved incident report. Zean said the Principal's acknowledgement only happens once the clinician has printed the report, so it happens on paper.

## Decision
The system has no Principal acknowledgement or approval of reports. The clinician approves and prints (ADR-038); the Principal signs the printed copy on its existing signature line ("Noted by" on the Incident Report, "Reviewed by" on the printed reports). The system does not record that signature.

## Alternatives Considered
- **Keep the button alongside the signature:** not chosen. It records the same act twice, and the screen record could disagree with the paper.

## Consequences
- The Admin has no write on the Incident Report. `POST /api/incidents/{id}/acknowledge`, the `acknowledge` rule and `AcknowledgeError` are gone from the API contract.
- `incident_report_approvals` loses `acknowledged_by_user_id`, `acknowledged_at`, `chk_report_acknowledged` and `fk_report_approvals_ack_by`. This changes the ERD approved in ADR-057; no migration existed yet, so nothing needs rolling back.
- The clinician's Approve Report and every printed signature line are unchanged.
- The Markdown copies of the canonical documents are updated; any Word or PDF master needs the same change.
- Session: [2026-11-01-remove-principal-acknowledge](../08-Logs/Agent-Sessions/2026-11-01-remove-principal-acknowledge.md)
