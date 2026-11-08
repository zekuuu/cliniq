# ADR-065: Everything on Incident Stage 2 is optional; the "Nothing further was needed or done" tick is removed

**Date:** Thursday, November 05, 2026 — 03:46 PHT
**Status:** Accepted (Zean, in chat and in the question pop-up, Thursday, November 05, 2026). Reverses panel review IN-3 (October 22, 2026) and review round 2's R24.

## Context
Panel review IN-3 made Stage 2 refuse to complete, and the report refuse approval, unless the record had treatment notes, a medicine line, a notification attempt or a hospital referral. The fallback was a "Nothing further was needed or done" tick with a one-line reason. Zean found it confusing: "fields are options but cant save and have to tick that."

## Decision
1. **Every Stage 2 field is optional.** Complete Incident is always available on a saved Stage 1 record. The tick and its reason field are removed from the screen.
2. **Approval needs only a completed (Stage 2) record.** An empty one shows "No treatment recorded. Check this is correct before approving." and can be approved.
3. **Older data is kept.** A record that already has a `noFurtherActionReason` keeps it on save, and the report still prints it. No new reason is written.
4. The data layer's `incidentCompletionBlocker` is removed; `completeIncidentStageTwo` and `approveIncidentReport` no longer check for care.

## Alternatives Considered (offered in the question pop-up)
- **Treatment notes required** (recommended at the time): one rule, and a completed record always says what was done. Not chosen.
- **A "none" tick per topic** ("No medicine given", "Parent not called"): explicit, but more clicks. Not chosen.

## Consequences
- An incident can be completed and approved with nothing recorded beyond Stage 1; the approval note asks the approver to check it.
- Canonical documents still describe IN-3 (Frontend Context Brief, screens 16b and 18, and the Frontend Design Reference); they need the same change (Frontend-Issues-and-TODOs, DOC).
- Backend: `incidents.no_further_action_reason` stays for older rows; the completion and approval rules in the API contract drop the care check (log on the `backend` branch).
- Session: [2026-11-05-stay-home-stage-two-pager-backup-report](../08-Logs/Agent-Sessions/2026-11-05-stay-home-stage-two-pager-backup-report.md)
