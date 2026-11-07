# ADR-076: Staff record reviews live in their own table

**Date:** Saturday, November 07, 2026 — 16:15 PHT
**Status:** Accepted (Zean, in chat, Saturday, November 7, 2026 — 16:15 PHT). Zean chose a separate staff table that mirrors the student one, then in the question pop-up chose "Mirror, minus import" for the columns and "use staff name to keep consistent" for the naming. Follows the approved ERD (ADR-057) and settles counter-check C-1 ([`Backend-Counter-Check-Nov7.md`](../04-Development/Backend-Counter-Check-Nov7.md)).

## Context
The staff Incomplete Records page (ADR-067) records which staff record was resolved, by whom and when (`frontendOnly.personnelReviews`: `personnelId`, `resolvedByUserId`, `resolvedAt`). The approved schema has a review table only for students, `student_record_reviews`. The counter-check before B1 found this gap and marked it a BLOCKER. The ERD is approved, so the change needs a new decision.

## Decision
1. **A new table, `staff_record_reviews`,** holds the staff review queue. It mirrors `student_record_reviews` column for column, except for the import columns:
   - `id`
   - `staff_id`, a foreign key to `personnel.id`, `ON DELETE CASCADE` like the student table
   - `opened_at`, `resolved_by_user_id` and `resolved_at`
   - the generated `open_staff_id`, kept UNIQUE so a staff record has at most one open review
   - the both-or-neither CHECK on the resolved pair, `chk_staff_reviews_resolved`
2. **There is no `source` and no `import_batch_id`.** Staff have no import batch table, and ADR-067 gives the staff page no Imported column.
3. **The backend opens a row** when a save or the staff import leaves a staff record incomplete (ADR-067 item 1), unless one is already open. **It resolves the row** on the save that completes the record. A resolved row stays as history. The mock instead derives "open" from the missing fields and writes a row only at resolution; the backend result on screen is the same.
4. **The table and column use the word "staff"** (`staff_record_reviews`, `staff_id`), the screen's word. The parent table stays `personnel`, and its other child tables keep `personnel_id`.
5. **No flag or resolve endpoint.** The frontend has none: rows open and resolve inside `POST`/`PUT /api/personnel` and `POST /api/personnel/import`. `GET /api/personnel/incomplete` serves the page from this table. The page is Staff only; the Admin gets nothing about it (ADR-038, ADR-043).
6. **The retention purge** removes the rows with their staff record (step 7, CASCADE), as it does the staff health entries and contacts.

## Alternatives Considered
- **One shared review table with a student-or-staff pointer:** rejected. It cannot hold a real foreign key on both sides, and the purge order gets harder.
- **Reusing `student_record_reviews` for staff:** rejected. Its `student_id` is a required foreign key to `students`.
- **Exactly the mock's three fields, one row per staff record overwritten on each resolve:** rejected. It keeps no history and cannot keep one open review per record.
- **A full mirror with `source` and `import_batch_id`:** rejected. It would need a staff import batch table that no decision or mock has.
- **`personnel_record_reviews` with `personnel_id`:** the counter-check's suggestion, not chosen. Zean preferred the screen's word.

## Consequences
- The schema has 48 tables. `Reference-Schema.sql`, `ERD.md`, `Data-Dictionary.md`, the overview diagram and the constraint tests (254 of 254 on MariaDB 10.11.16) are updated.
- B1 writes a migration for this table, in the StaffPatients module, after `personnel_emergency_contacts`.
- `staff_id` is the one staff-named foreign key in a schema that otherwise says `personnel_id`. Models and queries must map it explicitly.
- Counter-check C-1 no longer blocks B1.
- No canonical document names the review tables, so none needs updating.
