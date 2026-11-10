Date/Day/Time: Saturday, November 07, 2026 — 16:16 PHT (local clock, UTC+8)
Agent: Claude Code (Opus 5.5)
Task: Add the staff record-reviews table to the backend documents (settles counter-check BLOCKER C-1); documents only, on `backend`
Status: Completed
Prompt/Request: "Prompt — Backend documents: add the staff record-reviews table (settles the counter-check BLOCKER, documents only, on `backend`)". Zean's decision, in chat, Saturday, November 7, 2026: "a separate staff table that mirrors the student one", not a shared polymorphic table. The prompt asked for a new ADR, the table in the schema, ERD, dictionary and constraint tests, the regenerated diagrams, the contract endpoints, and the logs. In the question pop-up Zean chose "Mirror, minus import" for the columns and answered "use staff name to keep consistent" for the naming.

Files Modified:
- New: CLINIQ-Knowledge-Base/06-Decisions/ADR-076-Staff-Record-Reviews-In-Their-Own-Table.md
- CLINIQ-Knowledge-Base/06-Decisions/Decisions-Summary.md, ADR-057 (note at the top), ADR-067 (note at the top)
- CLINIQ-Knowledge-Base/02-Architecture/Database/Reference-Schema.sql
- CLINIQ-Knowledge-Base/02-Architecture/Database/Checks/constraint-tests.sql
- CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md
- CLINIQ-Knowledge-Base/02-Architecture/Database/Data-Dictionary.md
- CLINIQ-Knowledge-Base/02-Architecture/Database/Diagrams/ERD-Overview.dot, .svg, .png
- CLINIQ-Knowledge-Base/04-Development/API-Contract.md
- CLINIQ-Knowledge-Base/04-Development/Backend-Counter-Check-Nov7.md
- CLINIQ-Knowledge-Base/04-Development/Backend-Readiness-Checklist.md
- CLINIQ-Knowledge-Base/08-Logs/Backend-Issues-and-TODOs.md
- CLINIQ-Knowledge-Base/08-Logs/Backend-Changelog.md

Changes Made:
- **ADR-076** (Accepted). Staff record reviews live in `staff_record_reviews`. Its columns:
  - `id`
  - `staff_id`, a foreign key to `personnel.id`, ON DELETE CASCADE
  - `opened_at`, `resolved_by_user_id` and `resolved_at`
  - the generated `open_staff_id`, with UNIQUE `uq_staff_reviews_one_open`
  - index `idx_staff_reviews_staff` and CHECK `chk_staff_reviews_resolved`
  - it has no `source` and no `import_batch_id`
- **Mock compared with the table:**
  - The mock's `PersonnelReview` has `personnelId`, `resolvedByUserId` and `resolvedAt` only.
  - The mock derives "open" from the missing fields and writes a row only when a record is resolved.
  - The mock has no flag or resolve function. Resolving happens inside `savePersonnel` (`resolveIfCompleted`).
  - So the contract adds no flag or resolve endpoint. It describes the opening and resolving on `POST`/`PUT /api/personnel` and `POST /api/personnel/import`, and `GET /api/personnel/incomplete` serves from the table.
- **Schema:** the table was placed after `personnel_emergency_contacts`. Tests added:
  - 2 cases for `chk_staff_reviews_resolved`
  - the unique open review
  - both bad foreign keys
  - one accept: a resolved review stays and a new one opens
  - the purge now inserts a staff review and counts it gone
- **ERD:**
  - a new banner
  - 48 tables
  - F-1 and the delete table
  - Mermaid blocks 3.1, 3.2 and 3.5
  - the inventory row
  - purge step 7
  - a scenario row
  - the 3.2 image marked as also lacking the new table
  - **Fixed a stale line:** the section 13 migration order lacked `recovery_codes`, `school_years` and `inventory_item_symptom_tags`. It is now rebuilt from `Reference-Schema.sql`'s table order.
- **Contract:**
  - a banner
  - the review-queue lines on the staff create, update and import entries
  - `GET /api/personnel/incomplete` rewritten: Staff only, the Admin gets 403 and nothing about these reviews
  - on `GET /api/audit-log`, staff-record entries carry the Staff No., never a name, and the Admin cannot open them (C-8)
- **Logs:**
  - The `DECIDE` (C-1) moved to Done, with the resolution.
  - The C-8 `DOC` notes that the contract part is done; `User-Roles-and-Permissions.md` stays for `main`.
  - Counts: FIX 2, AUDIT 0, DOC 4, DECIDE 2, LATER 14, FIX-FRONTEND 2; NOTE 6, VERIFY 0; Done 9.
  - The report's "Safe to start B1?" now reads Yes, and the checklist's C-1 box is ticked. No other finding changed.

Reason: the counter-check's only open BLOCKER. B1 must not build migrations without a home for the staff Incomplete Records queue (ADR-067), and the approved ERD changes only through a new decision (ADR-057).

Testing Performed:
- MariaDB 10.11.16 (XAMPP): loaded `Reference-Schema.sql` into a scratch database, then ran all of `Checks/constraint-tests.sql`.
  - Result: 254 of 254 pass (rejects 173, accepts 37, counts 44; it was 247).
  - The scratch database was dropped and the server shut down.
- Overview diagram: regenerated from `ERD-Overview.dot` with Graphviz compiled to WebAssembly and headless Chrome, outside the repository (2479 × 3603).
- No frontend change, so no frontend checks were run.

Known Issues:
- `ERD-3.2-Students.png` still cannot be regenerated: it has no source file. It is marked in `ERD.md`.
- `staff_id` is the only staff-named foreign key in the schema; the models must map it explicitly (ADR-076 consequences).

Next Steps: B1 may start. The "For the main branch" list in the counter-check report still stands: Screen Inventory (C-6), the Admin's staff audit line in `User-Roles-and-Permissions.md` (C-8), closing the email reset (C-15), and the three old failing tests (C-19).
