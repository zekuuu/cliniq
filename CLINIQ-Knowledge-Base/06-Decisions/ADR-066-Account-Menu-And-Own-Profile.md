# ADR-066: Account menu in the header; users change their own name, picture and password

**Date:** Thursday, November 05, 2026 — 04:49 PHT
**Status:** Accepted (Zean, in chat, Thursday, November 5, 2026 — 03:50 PHT). Questions 1 and 2 below were decided by default during an unattended run (Zean asleep, 03:51 PHT): the recommended answers were taken.

## Context
The header showed the user's avatar, name and role, then a Shortcuts button, a padlock (Change password) and a red sign-out icon. Zean wanted the profile to be a clickable drop-down holding the account actions, including the ones a user might forget, and no separate profile page (03:52 PHT).

## Decision
1. **The avatar, name and role are one button** that opens an account menu (ARIA menu button): the account details (name, role, username, last sign-in), then Edit profile, Change password, Keyboard shortcuts (desktop widths only), Report an issue, Privacy Policy, a separator and Sign out (still confirmed). The header's Shortcuts button, padlock and sign-out icon are removed.
2. **Every role gets the same menu.** These are the user's own account actions, never clinical data; the Admin stays read-only for clinical records (ADR-038).
3. **Edit profile is a dialog, not a page** (no route). The signed-in user changes their own **display name** (decided by default, question 1) and **profile picture**; the username and role stay Admin-only; the password keeps its page (`/account/password`).
4. **The own-account operations act only on the signed-in account** (never a user id from the caller), refuse a disabled account, and audit by field name only: "Changed own name" and "Changed own profile picture" (ADR-016, ADR-017).
5. **Keyboard shortcuts and Report an issue are in the menu too** (decided by default, question 2); the sidebar footer keeps its links.

## Alternatives Considered
- Only the Admin changes names (the dialog's name read-only): not chosen by default; safer for record identity, less convenient.
- A menu with only Edit profile, Change password and Sign out: not chosen by default.
- A profile page at `/account/profile`: rejected by Zean.
- A lock screen: not built; Sign out is how to leave the desk.

## Consequences
- Audit entries keep only the user id, and the Audit Log reads the name live, so after a rename older entries show the new name. Kept as it was; listed for Zean's review.
- Backend: `GET`/`PATCH /me` and a picture endpoint for the contract; check `users.name` (VARCHAR(120)) and the picture storage in the ERD (hand-off in the session log).
- Session: [2026-11-05-account-menu](../08-Logs/Agent-Sessions/2026-11-05-account-menu.md)
