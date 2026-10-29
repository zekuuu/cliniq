# ADR-053: Extra complaint tags, staff wording, Admin counts, two patient tables and the PE wording

**Date:** Thursday, October 29, 2026 — 22:18 PHT
**Status:** Accepted (Zean, in chat, Thursday, October 29, 2026 — 22:15 PHT). Not built yet.

## Context
Zean answered the remaining open decisions. Most of them were small choices about visits, staff patients and the Admin's view.

## Decision
1. **Extra complaints.** A visit keeps one required main complaint and can carry up to 3 extra complaints as tags. Reports and the Dashboard count the main complaint only, so one visit is counted once.
2. **Staff types** are Teacher, Non-teaching staff, Utility worker and **Other**; department or role stays free text with suggestions (ADR-043).
3. **A staff visit says "Returned to work"** where a student's says "Returned to class". The stored value is the same.
4. **The Admin's Dashboard totals leave staff incidents out,** matching the Admin's Incident Log (ADR-043 item 9). The clinician's totals count everyone.
5. **Two patient tables** (students and staff), each with its own foreign key on visits, incidents, follow-ups and stock transactions, exactly one set. This is what the mock does; it goes into the ERD at its next review.
6. **The PE referral wording** stays as editable starting text, marked "to confirm" on screen.
7. **The printable Monthly Report is enough for now;** the monthly inventory print (ADR-050) is a separate document.
8. **Stale-backup warning:** shown in the system; no named contact.
9. **No incident severity levels,** no change to the incident fields, and no real-emergency walk-through; staff keep a Staff No. assigned by CLINIQ.

## Alternatives Considered
- **One patient table with a type column.** Rejected: a student and a staff member have different keys and fields, and a polymorphic id cannot be a real foreign key.
- **Counting every complaint tag in reports.** Rejected: one visit would count several times.

## Consequences
- Six small changes to the app (`FIX` entries) and one ERD note (`DOC`).
- Session: [2026-10-29-open-decisions-answered](../08-Logs/Agent-Sessions/2026-10-29-open-decisions-answered.md)
