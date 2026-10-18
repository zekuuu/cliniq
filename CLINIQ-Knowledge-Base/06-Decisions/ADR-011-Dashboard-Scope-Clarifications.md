# ADR-011: Clinic Overview Dashboard — View-Only for Both Roles, Five Stat Cards

**Date:** Saturday, September 26, 2026 — 20:43
**Status:** Accepted — amended by ADR-032 (Sunday, October 18, 2026 — 13:17 PHT)

## Context
Building the Clinic Overview Dashboard (Screen Inventory #31) turned up two places where the canonical documents disagree:

1. **Actions.** `03-Design/Reference-Screens.md` (Reference 1) says Admin/Principal's dashboard is "fully view-only — same layout, **no clickable resolve/complete actions**", which implies Staff *does* get resolve/complete actions (e.g. marking a follow-up done from the alert list). `01-Requirements/Features/Module-Overview.md` (Module 9) and its Access Summary table say the dashboard is **view-only for both Staff and Admin/Principal**.
2. **Stat cards.** Reference 1 lists 3–4 cards (visits, incidents, pending/incomplete records, low-stock items). Module 9 also asks for total **active students**.

## Decision
1. **View-only for both roles.** The dashboard has no create/update/delete actions for anyone. Staff change follow-up statuses on the Follow-Up List (#18c). Consequence: the screen writes no audit-log entries (`.claude/skills/cliniq-audit-trail/`), since it only reads, filters, and prints.
2. **Five stat cards:** clinic visits, incidents, incomplete records, low-stock items, active students. This satisfies both documents, one card above Reference 1's "3–4" guidance.

Both chosen by the project owner when asked directly during the Dashboard build (Saturday, September 26, 2026).

## Alternatives Considered
- Staff-only "mark Completed/Missed/Cancelled" buttons on dashboard follow-up rows: faster for the nurse, but it contradicts Module 9, adds a mutation (and audit logging) to a screen meant for Admin too, and duplicates #18c.
- Reference 1's four cards only (drops Module 9's active-students count), or four cards with low-stock moved to the alert list header only.

## Consequences
- Staff and Admin render the identical Dashboard component. There's no role-conditional code on this screen. *(Amended below.)*
- **Amendment, Wednesday, September 30, 2026 — 22:52 (project owner):** Staff additionally get a strip under the header with a quick "New Visit" action and a minimal backup-status indicator linking to the Backup screen (Screen #4's content). It is the one role-conditional part of this screen, shown to Staff only because Admin/Principal can open neither destination. Both are navigation, so decision 1 is unchanged: the Dashboard remains view-only for both roles and still writes no audit entries.
- **Canonical documents need a matching update**: *Frontend Design Reference* Reference 1 should drop the implication that Staff has resolve/complete actions and list five cards. `03-Design/Reference-Screens.md` should change in the same edit, since it mirrors that document.
- **Amendment, Wednesday, October 07, 2026 — 23:05 PHT (project owner asked to close the "forgotten draft" gap):** Staff also get an "Excuse letters awaiting approval" list below the alert groups, shown only while drafts exist. Like the shortcuts strip it is navigation only (each row links to its letter page) and Admin/Principal can't open that page, so it isn't rendered for them. Decision 1 is unchanged: no mutations, no audit entries. Rows show the Student Number (ADR-004). Session: `08-Logs/Agent-Sessions/2026-10-07-pending-excuse-letters-dashboard-and-profile.md`.
