# ADR-033: Phone-Only Screens Are Removed, Account Management Moves to the Admin/Principal, and the QR Removal Goes Ahead (Reversible)

**Date:** Tuesday, October 20, 2026 — 23:25
**Status:** Accepted (requested by Zean). The QR removal (item 3) is built (Wednesday, October 21, 2026 — 01:09, [2026-10-21-remove-qr-feature](../08-Logs/Agent-Sessions/2026-10-21-remove-qr-feature.md)); the phone-only screens (item 1) were removed Wednesday, October 21, 2026 — 01:47 ([2026-10-21-remove-phone-screens-and-instructor](../08-Logs/Agent-Sessions/2026-10-21-remove-phone-screens-and-instructor.md)); the account-management move (item 2) was built Wednesday, October 21, 2026 — 06:35 ([2026-10-21-account-management-to-admin](../08-Logs/Agent-Sessions/2026-10-21-account-management-to-admin.md)). All three items are built. **Amended Tuesday, October 20, 2026 — 23:36:** Zean decided to remove QR now with the others; the earlier hold on the QR removal is kept only as a note (item 3).

## Context
ADR-027 dropped the QR feature and the CLINIQ Student Number, ADR-028 made the LRN the identifier, and ADR-029 removed the PE/Sports Instructor's direct access and settled that CLINIQ runs locally, with the Principal signing in at the clinic computer. Two things were left open: what happens to the phone-only pieces (the phone Emergency screen and the phone menu entry), and who manages accounts. Today the Users routes are Staff-only, so the nurse manages accounts, and the Admin sidebar has only Overview and Reporting.

Zean, Tuesday, October 20, 2026 — 23:23: asked for one prompt that removes the QR feature ("note it as on hold until confirmed client will not agree with online hosting"), replaces the Student Number with the LRN, removes the mobile screens and the PE Instructor account, and moves account or user management to the Admin/Principal account.

## Decision
1. **The phone-only screens are removed:** the phone Emergency screen (`/emergency/mobile`) and the phone-only navigation mechanism. The QR hub is removed with the QR feature. Responsive layouts of the normal screens and the narrow-window menu are not phone-only screens and stay.
2. **Account management moves to the Admin/Principal.** The Admin/Principal creates, edits, disables and resets accounts. Staff no longer sees or opens them.
3. **The QR removal goes ahead now, with a note that it was on hold.** It had been held until the client was confirmed not to agree to online hosting (QR needs phones to reach the system, which a local-only deployment cannot do). Zean decided to remove it now, together with the others. It is **reversible**: the last commit that still has QR is tagged before the deletion, so if the client later agrees to online hosting QR can be restored from the tag. ADR-027 is unchanged.
4. The other removals (Student Number to LRN, the PE Instructor role, the phone-only screens) are not on hold.

**Not decided here** (open `DECIDE` entries): whether the Admin also gets Backup; who manages accounts when the Admin is absent or has left, and how a replacement Admin is made; the LRN display, format and key rules (still open, see ADR-028).

## Alternatives Considered
- **Keep account management with Staff** (today). Rejected by Zean's request: the Principal is the one who should decide who has access.
- **Both Staff and Admin manage accounts.** Not asked for; it would keep the nurse able to create accounts, which is what the move is meant to end.
- **Put the phone screens (and QR) on hold until the client's hosting answer.** Not chosen: Zean decided to remove QR now with the others.

## Consequences
- **ADR-022 (shell navigation on phones) and ADR-023 (QR mobile-only, already superseded) need a read-through** when the removals are built. ADR-029 gains a consequence: the Admin/Principal, who signs in at the clinic computer, also manages accounts, so the shared-computer risks it lists (sign-out, session timeout, audit trail) matter more.
- **The last Admin is a single point of failure.** Accounts can no longer be managed by Staff, so the app must never let the last active Admin be disabled or demoted, and the way a lost Admin password or a replacement Admin is handled must be decided.
- **Until it is built the app is unchanged:** Staff manage accounts, the phone Emergency screen exists, and QR and Student Numbers are still there. Agents do not start these removals unless Zean pastes the prompt `Prompt-Build-Removals-QR-LRN-Mobile-Instructor-UserMgmt.md` (five parts, run one at a time: QR, phone screens, PE Instructor, accounts, LRN).
- **Records:** the `FIX` entries "Remove the phone-only screens" and "Move account management to the Admin/Principal account" are in `Issues-and-TODOs.md`; the two phone `DECIDE`s are resolved.
