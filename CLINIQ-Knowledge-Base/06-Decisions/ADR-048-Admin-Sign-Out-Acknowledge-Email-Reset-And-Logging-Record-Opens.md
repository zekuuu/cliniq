# ADR-048: Admin sign-out, Acknowledge on an incident report, email password reset, and logging who opens a record

**Date:** Thursday, October 29, 2026 — 12:33 PHT
**Status:** Accepted (Zean, in the "CLINIQ Decisions to Answer" sheet, recorded Thursday, October 29, 2026 — 12:33 PHT). Not built yet.

## Context
The Principal signs in on the clinic computer (ADR-029) and now reads profiles and incident reports (ADR-038). ADR-015 has no idle timeout for anyone. The Issues file also asked about password recovery, an acknowledgement step for the Principal, ending the sessions of a disabled account, and whether opening a health record is logged.

## Decision
1. **The Admin is signed out after 30 idle minutes** (a `config` value, with a notice about a minute before). The clinician still has no idle timeout. This amends ADR-015 for the Admin only.
2. **The Admin can Acknowledge a completed incident report.** It records who and when, shows on the report and is audit-logged. The printed signature line stays. This amends ADR-038: the Admin is read-only except for Acknowledge.
3. **Password recovery by an email reset link when the computer is online,** with the Admin's reset as the fallback. It needs an email address on each account, a mail service and the backend (a `LATER`). This replaces the earlier suggestion of no email reset.
4. **Disabling an account ends its open sessions** (a backend rule).
5. **Opening a student or staff profile or an incident report by the clinician is audit-logged,** once per record per session, as the Admin's views already are. Lists and searches are not logged.

## Alternatives Considered
- **No idle timeout for the Admin (ADR-015).** Replaced: the Admin shares a clinic computer, so a forgotten session is a risk.
- **Admin password reset only.** Zean preferred an email link when there is internet.

## Consequences
- The Admin is no longer purely read-only; the only write is the acknowledgement, which does not change the report.
- More audit rows; the privacy officer is to confirm that logging the clinician's views is wanted (the Data Privacy Act favours logging access to health records).
- `Audit-Coverage.md` and the Audit Log filter wording change when this is built.
- Session: [2026-10-29-decisions-sheet-answers-applied](../08-Logs/Agent-Sessions/2026-10-29-decisions-sheet-answers-applied.md)
