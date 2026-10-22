# ADR-037: Backup and the Audit Log are open to both Staff and Admin, the audit log is kept 10 years, and sensitive actions ask for the password again

**Date:** Thursday, October 22, 2026 — 15:51 PHT
**Status:** Accepted (Zean, Thursday, October 22, 2026 — 15:44). Not built yet: part 6 of `Prompt-Build-Panel-Review-Fixes-Oct22.md`. The 10-year retention is Zean's answer and has **not been confirmed by the school or its privacy officer**.

## Context
ADR-033 moved account management to the Admin/Principal and left open whether the Admin also gets Backup. The panel-style review (AC-1) advised that the clinician should not see the Audit Log or Backup, because an audit log reviewed by the audited person is not an audit. It also asked for a stated audit-log retention (AU-6), a "Back up now" button and an alert when the last backup is old (BK-2), and a re-check of the user's identity before sensitive actions (AC-7). Zean answered "both ok principal and clinician" for access, "10 years" for retention, and "Yes" to the other two.

## Decision
1. **Audit Log and Backup are open to both the Principal (Admin) and the clinician (Staff).** The Audit Log already was; Backup now opens to the Admin with the same abilities as Staff (see the status and history, mark a backup verified), all audit-logged. This resolves the open question in ADR-033.
2. **The review's separation-of-duties concern is accepted, not solved.** The clinician can read and print the log of her own actions. It is mitigated by the Principal reading it too, every print being audit-logged, and the log being append-only once the backend exists.
3. **The audit log is kept 10 years.** Provisional until the school confirms. In the frontend phase this is documentation only: no purge job, and the Privacy Policy page does not state it yet. The backend must not delete audit rows earlier.
4. **A "Back up now" button on the Backup page and a Dashboard alert for both roles when the last successful backup is more than 48 hours old** (a config value). The real job is a backend-phase matter.
5. **A "Confirm it's you" password re-entry before sensitive actions.** Default list: archive a student record, disable or enable an account, reset a password, change a role, approve an incident report. Stock adjustments are not on it, because how large a write-off needs extra care is an open question for the clinician. Each use is audit-logged. Zean answered "Yes" without naming the actions, so the list is a default he can change.

## Alternatives Considered
- **Audit Log and Backup for the Admin only (the review's advice).** Rejected by Zean: the clinic computer is where the Principal signs in (ADR-029), and the clinician needs Backup on the day the Principal is away.
- **Idle timeout instead of re-entering the password.** Not chosen here; ADR-015 decided against an idle timeout.

## Consequences
- ADR-033's open "Admin also gets Backup" question is closed (note added there). ADR-016 (Audit Log Viewer) is unchanged.
- `Data-Dictionary.md`, `ERD.md` and `Non-Functional-Requirements.md` carry the 10-year retention note (part 6); the school's confirmation is an open `DECIDE`.
- The Admin sidebar gains a Backup entry; the role matrix document lists both roles on both screens.
- Session: [2026-10-22-panel-review-triage-and-build-prompt](../08-Logs/Agent-Sessions/2026-10-22-panel-review-triage-and-build-prompt.md)
