# ADR-002: QR Digital Health ID Redesigned as Staff Quick-Action Hub

**Date:** September 17, 2026
**Status:** Superseded by ADR-027 (decided Friday, October 16, 2026 — 18:54). **QR removal built Wednesday, October 21, 2026 — 01:09** ([2026-10-21-remove-qr-feature](../08-Logs/Agent-Sessions/2026-10-21-remove-qr-feature.md)); restore from git tag `pre-qr-removal` if the client later agrees to online hosting. Earlier: accepted, superseding the original "QR Viewer" external-role design.

## Context
Original design: a separate "QR Viewer" role with its own scoped sign-in (session lasting up to 1 week) for PE instructors to scan and view emergency info independently, outside the Staff login.

## Decision
Redesigned the QR feature around Staff's own workflow first: scan or type a Student Number from inside the existing Staff session, then jump straight into Record Visit / Log Emergency / View Profile, pre-filled.

## Alternatives Considered
Keeping the original external QR Viewer role as the primary design — rejected because it introduced a whole separate authentication/session model for what turned out to be a smaller slice of actual usage than Staff's own need for a fast lookup tool.

## Consequences
Simpler security story for this phase (no separate external access path to secure) — but PE/Sports Instructor access still needed a home, which is ADR-003/004 below.

Full detail: Project Plan, Section 5.3 (Revision 1.7 changelog entry).

## Security clarification — Wednesday, September 30, 2026 — 22:52
This clarifies the decision above; it isn't a new one. "From inside the existing Staff session" means a **real, authenticated login comes first, and the QR scan is a separate, later step** that only identifies the student. The Audit Trail requirement (every scan attributable to the account that performed it) holds only if that is enforced, so:

- **Every route requires Login**, including every QR route: the Staff hub and Instructor lookup (`/qr/scan`), the desktop hub (`/qr/desktop`), QR print, the Emergency button (`/emergency/mobile`), and Incident Stage 1 (`/incidents/new`). An unauthenticated visitor is redirected to Login and returned to the screen they asked for afterwards. Role gating (`roles` in `frontend/src/routes/AppRoutes.tsx`) then applies to the signed-in account.
- **Nothing but Login creates a session.** There is no default account, no `?role=` URL override, and no client-demo role picker. Log out ends the session.
- **A first-login account has no session until its password is changed**, and the account whose password is being changed comes from the verified Login step, never from the URL.

What this replaced: the frontend mock defaulted every visitor to the Staff account, honoured `?role=instructor` without credentials, kept working after Log out, and let `/force-password-change?user=<id>` set any account's password. All four were found and closed in the same session (`08-Logs/Agent-Sessions/2026-09-30-login-gate-and-group-b-fixes.md`). The backend (Phase B2, Sanctum) must enforce the same rule server-side; the frontend guard is not a substitute for it.
