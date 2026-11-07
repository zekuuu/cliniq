# ADR-069: Staff can be imported from a CSV, adding and updating only

**Date:** Thursday, November 05, 2026 — 22:34 PHT
**Status:** Accepted (Zean, in chat, Thursday, November 05, 2026 — 22:34 PHT: "add import in staff similar to student"; the three choices below picked from the agent's recommended options). Amends ADR-043 item 7 ("no Registrar import" for staff).

## Context
The Student List imports the Registrar's yearly CSV (ADR-047). Zean asked for the same on the Staff List. Staff have no LRN, and the Staff No. is assigned by CLINIQ, so a row needs another way to find its record.

## Decision
1. **Import Staff List** (`/staff/import`, School Clinician only): choose a CSV, match its columns, review a preview, apply. The same three steps and drop zone as the student import.
2. **Matching:** a row with a Staff No. updates that record (an archived one is restored). Without one, it updates the staff member with the same full name and type, or adds a new record with the next Staff No. A Staff No. CLINIQ doesn't have, a name and type shared by two records, or two rows for one person is flagged and left out.
3. **Staff missing from the file are left alone.** There is no archive step; archiving stays a manual action on the profile.
4. **Columns:** required first name, last name (or one full-name column, split as for students, ADR-064), sex and type (one of the staff types); optional Staff No., middle name, department or role, contact number, and an emergency contact (name, relationship and phone together, a Philippine number).
5. **Blank cells keep what CLINIQ has.** A contact from the file is added only when the record has none, so a contact the clinician entered is never replaced. Completing a record this way resolves it on the staff Incomplete Records page (ADR-067), credited to the importer.
6. **Audit:** one entry with counts only ("1 added, 2 updated, 4 flagged"), never names. A file that changes nothing writes nothing.

## Alternatives Considered
- **Match by name only:** not chosen; two staff with one name collide.
- **Add only:** not chosen; a yearly file couldn't update anyone.
- **Archive staff missing from the file, as for students:** not chosen; a staff file may not be the full roster.
- **Core columns only, contacts later:** not chosen.

## Consequences
- The canonical Modules & Features document still says staff have no import (DOC entry).
- Backend: an import endpoint like the student one, with the matching above; the batch record (file name, counts) is not kept in the mock yet.
- Session: [2026-11-05-staff-import](../08-Logs/Agent-Sessions/2026-11-05-staff-import.md)
