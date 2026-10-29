# ADR-047: The yearly list drives grade and section, a visit keeps the grade it had, and archiving is yearly

**Date:** Thursday, October 29, 2026 — 12:33 PHT
**Status:** Accepted (Zean, in the "CLINIQ Decisions to Answer" sheet, recorded Thursday, October 29, 2026 — 12:33 PHT). Not built yet. Amended Thursday, October 29, 2026 — 13:46 PHT: point 3 is now decided and the retention period is 5 years from the archive date (see [ADR-051](ADR-051-Starting-Values-Follow-Up-Closing-Vitals-Ranges-Automatic-Archive-And-Required-Marks.md)).

## Context
The registrar sends a new student list each year; sections are reshuffled and students move up. The Issues file had seven open questions on promotion, sections, the yearly sync, grade accuracy in old records, returning students, why a student left and archive timing. Zean answered them in the decisions sheet.

## Decision
1. **No bulk promotion.** Grade level and section come from the yearly list import, not from a button.
2. **One yearly import:** add new students, update continuing ones, and flag students missing from the new list. The import itself is still blocked until the data privacy agreement is signed (open `DECIDE`).
3. **Archive yearly,** in one batch from the new list, plus a single archive by the clinician whenever she needs it. A student missing from the new list is taken as having left or graduated, whatever the reason. **Decided later the same day (ADR-051):** the import archives them automatically, after showing the list that would be archived.
4. **A returning student is restored,** not re-created (ERD D-11). No reason for leaving is kept; a generic archived flag is enough.
5. **A visit and an incident keep the grade and section the student had when it was saved,** so reports by grade stay correct after promotion. This is the part to build now.
6. Assumed: transferees and Kinder students have an LRN (to check against the registrar's sample list).

## Alternatives Considered
- **Read the grade live from the student record.** Rejected: an old Grade 7 visit would show Grade 8.
- **A bulk "promote all" button.** Rejected: the school's list already carries grade and section; one source avoids conflicts.

## Consequences
- Visits and incidents gain a stored grade (and section, if the record has one); a migration fills existing records from the student's current grade as a best effort.
- Retention is 5 years from the archive date (ADR-051).
- Staff patients (ADR-043) have no grade and are not part of this.
- Session: [2026-10-29-decisions-sheet-answers-applied](../08-Logs/Agent-Sessions/2026-10-29-decisions-sheet-answers-applied.md)
