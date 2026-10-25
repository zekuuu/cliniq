# ADR-041: No password re-entry before sensitive actions

**Date:** Sunday, October 25, 2026 — 23:18 PHT
**Status:** Accepted (Zean, Sunday, October 25, 2026 — 23:18 PHT). Built the same day ([2026-10-25-remove-confirm-its-you](../08-Logs/Agent-Sessions/2026-10-25-remove-confirm-its-you.md)). Supersedes item 5 of ADR-037.

## Context
ADR-037 item 5 added a "Confirm it's you" dialog: the signed-in user typed their password again before archiving a student record, disabling or enabling an account, resetting a password, changing a role, or approving an incident report. Zean had answered "Yes" to the panel review's AC-7 without naming the actions, so the list was a default. In use, Zean asked why approving an incident report asked for a password, and then asked for the dialog to be removed everywhere.

## Decision
1. **No action asks for the password again.** The "Confirm it's you" dialog is removed from every screen.
2. **The plain confirmation dialogs stay** where `cliniq-modal-patterns` asks for one: archiving a student ("Archive this student record?") and approving an incident report ("Approve this incident report?").
3. Disabling or enabling an account and changing a role apply at once (they can be undone from the same screen). Reset Password opens its own dialog directly.
4. The actions themselves are still audit-logged. The "Confirmed with password: …" audit entry no longer exists. Sign-in lockouts are unchanged.

## Alternatives Considered
- **Remove it only from incident approval.** Offered; Zean chose everywhere.
- **Keep it for account changes only.** Not chosen.

## Consequences
- A person who walks up to an unlocked, signed-in workstation can do these actions without knowing the password. ADR-015 already gives every role a 1-week session with no idle timeout, so the shared workstation must be signed out or locked by habit.
- The backend no longer needs a re-authentication step for these endpoints; the `LATER` entry for it is closed.
- The canonical Modules & Features document is updated in the same change.
