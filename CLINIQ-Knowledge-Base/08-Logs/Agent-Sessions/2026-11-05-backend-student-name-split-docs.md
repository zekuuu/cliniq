Date/Day/Time: Thursday, November 05, 2026 — 01:35 PHT
Agent: Claude Code (Opus 5.5)
Task: Backend documents for the student-name split (ADR-064), documents only, on `backend`
Status: Completed (one diagram not regenerated, see Known Issues)
Prompt/Request: "push, then checkout to backend, then proceed to this prompt": `Prompt — Backend documents for the student-name split (documents only, on backend)`. Replace `students.full_name` with `last_name`, `first_name` and `middle_name` in the ERD, Data Dictionary and Reference Schema; add constraint tests and run them; regenerate the diagrams; update the API contract; log it. Run after Zean merged `main` into `backend` (merge commit `90d20109`).
Files Modified:
- CLINIQ-Knowledge-Base/02-Architecture/Database/Reference-Schema.sql
- CLINIQ-Knowledge-Base/02-Architecture/Database/Checks/constraint-tests.sql
- CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md
- CLINIQ-Knowledge-Base/02-Architecture/Database/ERD-Review.md
- CLINIQ-Knowledge-Base/02-Architecture/Database/Data-Dictionary.md
- CLINIQ-Knowledge-Base/04-Development/API-Contract.md
- CLINIQ-Knowledge-Base/08-Logs/Backend-Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Backend-Issues-and-TODOs.md
Changes Made:
- Schema: `students` and `personnel` lose `full_name` and gain `first_name VARCHAR(50) NOT NULL`, `last_name VARCHAR(50) NOT NULL` and `middle_name VARCHAR(40) NULL`, copied from the "For the backend branch" note of `2026-11-04-pager-history-scroll-report-link-name-split.md`. Each table has CHECKs `chk_*_first_name`, `chk_*_last_name` (non-blank) and `chk_*_middle_name` (NULL or non-blank); these replace `chk_*_name`. `idx_*_name` is now (`last_name`, `first_name`, `middle_name`), which serves the ADR-064 sort. No generated `full_name` column was added: ADR-064 says the full name is never stored, and the index on the parts already serves the list order. The full name is `CONCAT_WS(' ', first_name, middle_name, last_name)` on read. Staff are split too, because ADR-064 item 2 says so, so the prompt's staff `LATER` item was not written.
- Constraint tests: fixtures and inserts now use the three parts. The new cases are: blank first name refused, blank last name refused, blank (spaces only) middle name refused, NULL middle name accepted, and first, middle or last name over its limit refused ("Data too long"). Values at the limits are accepted. Staff get the same blank and length cases. The accent test now matches on the parts, and the joined name is shown to skip a NULL middle name and to ignore accents.
- Two cases that were already failing on `backend` before this change were fixed: `chk_personnel_name` and `uq_personnel_staff_number` inserted staff without `sex`, which ADR-063 made `NOT NULL`. The baseline run before any edit was 192 cases with 2 failed.
- ERD.md: a dated banner says the change follows the approved ERD through ADR-064 (the "approved" banner stays). The Mermaid 3.2 block shows the three columns, the test count is now 204, D-15 is closed by ADR-064, and the ADR-063 banner no longer says "Not yet loaded into MariaDB". ERD-Review.md: a note on D-15.
- Data-Dictionary.md: the column rows, index and checks for both tables; a "Name" paragraph (built on read, sort, search by every word, duplicates on the joined name); the frontend mappings.
- API-Contract.md: a "Names (ADR-064)" convention, plus the student query, search, duplicate check, create and update entries (three fields in requests, `fullName` built on read in responses, validation messages, audit wording by field), the staff list, create and update entries, the import column mapping and single-column split rule, and the rules table.
Reason: ADR-064 (accepted on `main`, Wednesday, November 4, 2026 — 22:25 PHT) settles ERD decision D-15. The approved drafts must follow it before phase B1 builds migrations.
Testing Performed: XAMPP's MariaDB 10.11.16 was started for the run and the schema was loaded into scratch database `cliniq_check_scratch`. All constraint tests: 204 cases, 204 passed, 0 failed (rejects 139, accepts 27, count 38). No CHECK or UNIQUE is untested. The scratch database was dropped.
Known Issues:
- `Diagrams/ERD-3.2-Students.png` and `.svg` were not regenerated: downloading and running the Mermaid CLI was refused in this session, and Graphviz is not installed. They still show `full_name`; `ERD.md` marks them "not yet regenerated", and the Mermaid block is current. `ERD-Overview.dot` lists only tables and foreign keys, so it needs no change.
- The canonical documents (Modules & Features, Frontend Context Brief §5) still say "full name"; ADR-064 already flags this on `main`.
- `TZ=Asia/Manila` is not understood by this Git Bash, which gave UTC. The timestamps come from the local clock, which is set to UTC+8.
Next Steps: Regenerate `ERD-3.2-Students` with the Mermaid CLI from the 3.2 block (`mmdc -i <block>.mmd -o Diagrams/ERD-3.2-Students.svg -b white`, and the PNG the same way). Phase B1 migrations use the three columns.
