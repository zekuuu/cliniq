# ADR-015: Session Lifetime — One Week Until Token Expiry, No Idle Timeout

**Date:** Monday, September 28, 2026 — actual time not available (no system clock access in this environment)
**Status:** Accepted. **Amended by ADR-048, built Friday, October 30, 2026 — 00:17 PHT** ([Part 3 session](../08-Logs/Agent-Sessions/2026-10-30-decisions-build-part-3-admin-audit-and-dashboard.md)): the Admin account is signed out after `config.adminIdleMinutes` (30) without pointer, key or scroll activity, with a notice a minute before; the clinician still has no idle timeout.
**Note (Wednesday, October 21, 2026 — 01:47):** the PE/Sports Instructor role, the phone-only screens and the `?student=` parameter this ADR may mention were removed (ADR-029, ADR-033, [2026-10-21-remove-phone-screens-and-instructor](../08-Logs/Agent-Sessions/2026-10-21-remove-phone-screens-and-instructor.md)); the rest of the decision stands.
**Note (Thursday, October 29, 2026 — 12:33 PHT):** the Admin is now signed out after 30 idle minutes (a `config` value); the clinician still has no idle timeout (ADR-048, Zean). Not built yet.

**Numbering note:** this record was first written as ADR-010, which collided with the already-used ADR-010 record for reason visibility in list rows. It was renumbered ADR-015 on Monday, September 28, 2026 — 22:29 PHT. The obsolete duplicate has now been removed.

## Context
Module 1 originally specified an automatic session timeout after 15 minutes idle, for every account. Earlier in planning, the (since-retired) QR Viewer role had a session lasting up to 1 week — changed from per-shift specifically so an emergency scan would never be blocked by a login step (Project Plan Rev 1.5, `ADR-002`). The team decided to drop the idle timeout and give every role that same 1-week lifetime.

## Decision
- **Remove the 15-minute idle timeout.**
- **One session lifetime for every role** (Staff, Admin/Principal, PE/Sports Instructor): 1 week, until the login token expires. After 7 days the user logs in again.
- **Frontend:** no inactivity timer or auto-logout logic. An expired token simply returns the user to Login.
- **Unchanged:** account lockout (5 failed attempts, 30-minute lock), Force Password Change, password rules, and the audit trail.
- **Written as a fixed lifetime from login.** If the team instead wants the session to renew with activity (a sliding expiry), that's a separate rule and would need its own decision.

## Alternatives Considered
- **Keep the 15-minute idle timeout** — the original design; removed at the team's direction.
- **Idle timeout for Staff/Admin, 1 week only for the Instructor role** — closest to the original Rev 1.5 reasoning (only the emergency-scan path needed to avoid login friction). Not chosen; the request was to replace the idle timeout outright.

## Consequences
- **The trade-off, stated plainly.** The clinic workstation is shared and the system holds minors' health records (RA 10173). The idle timeout was the control against a session left open on an unattended machine. With it gone, an unattended logged-in session stays usable for up to a week. Controls that remain: the audit trail (every action attributable to an account), lockout on repeated failed logins, manual log-out, and the display-privacy rule (limits what a glance at a list screen reveals). None of these stops a passer-by from acting as the logged-in user. Worth confirming with the client, since RA 10173 alignment is a stated goal of the project.
- **Simpler frontend.** No inactivity-detection code to build, test, or explain.
- **Backend (Phase B2) must set the expiry to 7 days.** Sanctum API tokens and SPA cookie sessions are configured separately (token `expiration` vs. the session lifetime) — confirm which mechanism the app actually uses during that phase.
- **Docs updated to match:** Project Plan Rev 2.5 (Section 5.1), Modules & Features (Module 1), `Module-Overview.md`, `Non-Functional-Requirements.md`, `Screen-Inventory.md` (#1 Login), the Frontend Context Brief (Auth model + Login entry), and `Development-Phases.md` (Phase B2).
- **Not done:** a matching row in the Project Plan's risk table (Section 5.4). `ADR-003` set the precedent of recording access-model risks there; add one if wanted.
