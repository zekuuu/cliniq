# ADR-017: Audit Log entries gain an optional "what changed" summary; the viewer shows the actor's role

**Date:** Friday, October 2, 2026 — 00:28 PHT
**Status:** Accepted
**Note (Wednesday, October 21, 2026 — 01:47):** the PE/Sports Instructor role, the phone-only screens and the `?student=` parameter this ADR may mention were removed (ADR-029, ADR-033, [2026-10-21-remove-phone-screens-and-instructor](../08-Logs/Agent-Sessions/2026-10-21-remove-phone-screens-and-instructor.md)); the rest of the decision stands.
**Note (Wednesday, October 21, 2026 — 07:00):** the CLINIQ Student Number this ADR mentions was replaced by the LRN (ADR-028, [2026-10-21-lrn-replaces-student-number](../08-Logs/Agent-Sessions/2026-10-21-lrn-replaces-student-number.md)); lists show it masked. The rest of the decision stands.

## Context
The Audit Log Viewer (ADR-016) showed timestamp, who, action, and target record. Reviewing it, the user felt information was missing but couldn't name it. Two gaps came out of that:
1. **Which record** — briefly lost when target labels were replaced by a bare "View" link. Restored in short form ("Incident · 2022-00001 ›").
2. **What actually changed** on an `update` — "Jennesse Baas · Update · Student 2023-00002" doesn't say whether allergies, a contact number, or the grade level changed.
3. **The actor's role** — names alone don't say whether an action was Staff, Admin/Principal, or the PE/Sports Instructor, which is the accountability question the log exists for (RA 10173).

The user approved adding both the role and a "what changed" line (Friday, October 2, 2026).

## Decision
- `AuditLogEntry` gains an **optional** `summary?: string`. It names **fields or states only, never their values** ("Updated allergies", "Marked completed", "Changed password"). Values stay off the multi-record list so it doesn't become a second place where health details are shown (`cliniq-display-privacy`). It is omitted when the action and target already say everything (login, logout, scan, submit, approve).
- The viewer shows the actor's **role** (from the existing `User.role`, via `ROLE_LABELS`) under their name. This is derived at read time, not stored on the entry.
- The target cell shows the record **kind** plus a short identifier (Student Number, item, user, or report name), with only the identifier linked. The visit/incident time is no longer repeated there, since the Timestamp column already covers it.

## Alternatives Considered
- **Store before/after values** — rejected: it would put allergies, conditions, and contact details into a glanceable list, which breaks the display-privacy rule.
- **Derive a sentence for every action ("Submitted visit")** — rejected: it repeats the Action and Target columns. The summary only appears when it adds something.
- **A separate Details column** — rejected for now. The summary sits under the action badge, so the table keeps four columns.

## Consequences
- **Canonical doc needs updating:** `CLINIQ_Frontend_Context_Brief.md` §5's AuditLogEntry line (and `02-Architecture/Database/ERD.md`) should list the optional `summary`. ERD.md was updated here; the canonical brief is flagged in Issues-and-TODOs.md for its owner.
- **Backend B3 audit infrastructure** must accept an optional summary from each mutation and build it from changed field *names*. The mock `changedSummary()` in `frontend/src/lib/mock-db/api.ts` is the reference behavior.
- The mock-data validator (`integrity.ts`) now allows `summary` as an optional, non-empty string on audit entries.
