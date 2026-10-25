# ADR-042: The Admin can add, edit and delete calendar events

**Date:** Sunday, October 25, 2026 — 23:55 PHT
**Status:** Accepted (Zean, Sunday, October 25, 2026 — 23:55 PHT). Built the same day ([2026-10-25-admin-calendar-past-expiry-stock-align](../08-Logs/Agent-Sessions/2026-10-25-admin-calendar-past-expiry-stock-align.md)). Amends ADR-019 item 2.

## Context
ADR-019 let Staff maintain school events on the calendar and kept the Admin/Principal view-only ("Admin still has no write permission anywhere"). ADR-032 moved the calendar to its own Calendar screen for both roles. Zean asked that the Admin also manage the calendar: add and edit events.

## Decision
1. **On the Calendar screen, the Admin works like Staff:** open any day (past, today or future), add, edit and delete its events, and page into future periods.
2. **The day panel's "View visits" link stays Staff-only**, because the Visit Log is a Staff screen. The Admin sees the day's counts without it.
3. Create, edit and delete stay audit-logged under the signed-in user, as for Staff.
4. National holidays stay read-only for everyone (ADR-020).

## Alternatives Considered
- **Keep the Admin view-only (ADR-019).** Replaced by Zean's request.

## Consequences
- ADR-019's "Admin still has no write permission anywhere" no longer holds for calendar events. ADR-038 already gives the Admin read-only access elsewhere; this is the Admin's only write outside account management.
- The backend's calendar-event endpoints must allow both roles.
- Module 9 in `Module-Overview.md` is updated; the canonical Modules & Features and Project Plan need the same note where they describe calendar access.
