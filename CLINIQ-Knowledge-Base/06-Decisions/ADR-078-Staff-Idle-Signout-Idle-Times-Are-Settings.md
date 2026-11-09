# ADR-078: Staff are signed out after idle time (default 60 minutes); idle times are settings

**Date:** Sunday, November 08, 2026 — 20:32 PHT
**Status:** Accepted (Zean, in chat, Sunday, November 8, 2026, about 18:03 to 18:10 PHT). It amends ADR-015 (one-week sessions with no idle timer) and ADR-048 (the Admin's fixed 30 minutes). ADR-057's fixed 7-day maximum (on the `backend` branch) stays as the outer limit. Zean chose a new Settings page for the fields with the pop-up. **Built** the same day ([session](../08-Logs/Agent-Sessions/2026-11-08-staff-idle-signout-part-1.md)).

## Context
The clinic room is not locked, and other people use the clinic PC when the clinician is away. Staff sessions lasted 7 days with no idle timer, so a session left open let anyone act as the clinician. Only the Admin had an idle sign-out (30 minutes, ADR-048).

## Decision
1. **Both roles are signed out after idle time, each with its own setting:** `idleSignoutMinutesStaff` (default **60**) and `idleSignoutMinutesAdmin` (default **30**). Each takes whole minutes from **10 to 240**.
2. **Staff edit the settings on a new Settings page** (`/settings`, under Administration in the sidebar for both roles). The Admin reads them. A change is audited by field name only ("Updated Staff idle sign-out minutes"), never with the minutes. It applies from each person's next idle countdown.
3. **Activity** restarts the count: keyboard, pointer, scroll, touch, and any API call.
4. **Two minutes before** the sign-out, a dialog appears: "You will be signed out in 2:00 because of inactivity".
   - The countdown is live and is announced politely every 30 seconds and in the last 10.
   - **Stay signed in** is the primary action and has focus; **Sign out now** is the secondary action.
   - Escape, the X and the backdrop all mean Stay signed in.
   - While the dialog is open, only those choices keep the session. Tab or a pointer move toward Sign out now must not close it.
   - When a form has unsaved changes, the dialog adds "Unsaved changes will be lost."
5. **At zero** the person is signed out and taken to Login, which says "You were signed out after N minutes of inactivity. Sign in again." The audit log records a `logout` with "Signed out (idle)": user and action only.
6. **Unsaved forms are discarded.** The sign-out does not save them, as with the Admin's sign-out before; the warning says so.
7. **The fixed 7-day maximum from sign-in stays** as the outer limit (ADR-057).
8. **Each covering person gets their own Staff account**, created by the Admin and never shared, so the audit log names who did what.

## Alternatives Considered
- **Windows screen lock only.** Rejected as the only control: the lock protects the PC, but the next person who unlocks it, or who uses it before the lock starts, still acts as the clinician. The clinic-PC-only deployment record (main Part 2) asks for both.
- **No change.** Rejected: an open 7-day session in an unlocked, shared room.

## Consequences
- Staff sign in again after a long pause, and each covering person needs their own account.
- Staff can raise the limit to 240 minutes, which weakens the control. The Windows screen lock carries the rest of the protection.
- `config.adminIdleMinutes` is replaced by the two settings; a saved browser state is migrated.
- The mock raises an activity event on every request. The real backend needs a cheap keep-alive call, because typing a long form may not reach the server for a while. See "For the backend branch" in the session log.
- Canonical documents that say the clinician has no idle timeout need updating (DOC).
