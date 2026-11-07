Date/Day/Time: Saturday, November 07, 2026 — 13:28 PHT (local clock, UTC+8; `TZ=Asia/Manila date` printed UTC in this shell, so the local clock was used)
Agent: Claude Code (Opus 5.5)
Task: Backend documents for the consultation changes (ADR-070 to ADR-075), documents only, on `backend`
Status: Completed (two module diagrams not regenerated, see Known Issues)
Prompt/Request: "Prompt — Backend documents for the consultation changes (documents only, on `backend`)": bring the professor's consultation (November 6) and Zean's November 7 answers and amendments into the backend drafts. Covers labels versus data, item tags, school years started and ended by hand, archive details and endpoints, add-only backup locations, authenticator recovery with the username check, dropping the email reset, the Admin break-glass procedure, constraint tests, diagrams and logs. The later amendments win (ADR-074, the ADR-075 amendment, the ADR-073 amendment, the masked Audit Log LRN).

Files Modified:
- CLINIQ-Knowledge-Base/02-Architecture/Database/Reference-Schema.sql
- CLINIQ-Knowledge-Base/02-Architecture/Database/Checks/constraint-tests.sql
- CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md
- CLINIQ-Knowledge-Base/02-Architecture/Database/Data-Dictionary.md
- CLINIQ-Knowledge-Base/02-Architecture/Database/Diagrams/ERD-Overview.dot, ERD-Overview.svg, ERD-Overview.png
- CLINIQ-Knowledge-Base/04-Development/API-Contract.md
- CLINIQ-Knowledge-Base/04-Development/Environment-Setup.md
- CLINIQ-Knowledge-Base/08-Logs/Backend-Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Backend-Issues-and-TODOs.md

Changes Made:
- **Set up:** on `backend` at `385beb7b` (Merge branch 'main' into backend), clean tree. ADR-070 to ADR-075 and the Part 4 note are present. ADR-001 to ADR-075 have no gaps and no duplicates, so ADR-065 to ADR-069 arrived with the merge.
- **Labels (ADR-070):** one paragraph in the Data Dictionary, plus column notes on `complaint` and `collected_by_relationship`. One line on `POST /api/visits` (and the edit): "Symptom(s)" and "Released to" are labels only, and "Other" sends who it was, never "Other". No rename.
- **Item tags (ADR-071):** new child table `inventory_item_symptom_tags` with `item_id` (CASCADE), `complaint_type_id` (RESTRICT, to the existing lookup) and `uq_item_symptom_tag`. The order comes from `complaint_types.sort_order`, so there is no order column. The item endpoints gain `usedFor`: omitted keeps the tags, unknown or repeated values give 422, audited "Updated commonly used for".
- **School years (ADR-072, ADR-075 with its amendment):**
  - Five `system_settings` rows (start 6/15, end 4/14, notice 7). Per-row month and day range CHECKs. Day-for-month and end-not-start span two rows, so they are the service's (stated).
  - New `school_years` table: label, started on and by, ended on and by. The CHECKs cover the label format and sequence, ended on or after started, and ended on and ended by together. Uniques cover the label, the start day, and a generated `in_session` column, so only one year is in session. The cross-row order goes to `db:verify` (section 8), since the ERD allows no triggers.
  - Seed rows are documented for the B1 seeder (accounts are not seeded) and used as test fixtures.
  - `students` and `personnel` gain `archive_reason` (80) and `archived_school_year`, with an all-or-none CHECK, a non-blank reason, a label format and an index for the Archive filter.
  - The Sports Report window starts from the recorded start.
- **API:** new entries for `GET /api/school-years`, `PUT /api/school-years/settings`, `POST /api/school-years/end` and `/start`, `GET /api/archive/years`, and `GET /api/archive/students` and `/staff`, with search, reason filter, sort, pages and the "N of M" count.
  - The archive endpoints now take a required reason.
  - The Dashboard summary carries `schoolYearReminder` (Staff only) and no longer takes `fullLrn=1`, since there is no Clinic Overview printout (ADR-074).
  - `PUT /api/backups/locations/{id}` is removed: locations are add-only. Run names come from `backup_location_results` joined to the unchanged label, so no column was added.
  - The Audit Log is masked, with `fullLrn=1` for its printout.
- **Authenticator recovery (ADR-073, amended):**
  - `users.totp_secret` (encrypted text), `totp_confirmed_at` and `last_totp_step`, with CHECKs pairing them.
  - New `recovery_codes` table: slow hash, unique, `used_at` rule, CASCADE.
  - Seven endpoints: check account with the three exact messages, verify, reset, status, setup, confirm, and turn off. CSRF and throttles are noted; failures share the lockout; the accepted risk is written.
  - The email reset is dropped: `users.email` and `uq_users_email` are removed, `password_reset_tokens` is marked not needed, Q17 is closed, and the backend-needs row is struck.
  - Key custody and an offline break-glass command for the Administrator are added to `Environment-Setup.md`.
- **ERD.md:** a dated banner (the approval banner stays), the table count 44 to 47, the Mermaid blocks 3.1, 3.2, 3.5 and 3.6, the table inventory, the delete rules, the lifecycles (archive details, user recovery, school year), the `db:verify` checks and the scenario rows.
- **Logs:** Backend-Changelog row. Backend-Issues: a section with 2 `DECIDE` (key custody, the username-check risk), 3 `LATER` (item tags for the nurse, the 7-day notice, sign-in two-factor) and 1 `DOC` (two diagrams). Counts recomputed: FIX 2, AUDIT 0, DOC 2, DECIDE 2, LATER 13; NOTE 5, VERIFY 0; Done 8.

Reason: ADR-070 to ADR-075 (accepted on `main`, Saturday, November 7, 2026) change the approved ERD through new decisions; the backend drafts must follow before phase B1.

Testing Performed:
- XAMPP's MariaDB 10.11.16 was started for the run. Before the change, the schema loaded and the constraint tests gave 204 of 204.
- After the change, the schema loads with 47 tables. All constraint tests: **247 cases, 247 passed, 0 failed** (rejects 169, accepts 35, counts 43). No CHECK or UNIQUE is left untested.
- The scratch database `cliniq_check_scratch` was dropped after the run.
- `ERD-Overview.svg` and `.png` were regenerated from the updated `.dot` with `@hpcc-js/wasm-graphviz` 1.6.1 and headless Chrome, both in the session scratchpad, not the repository: 48 nodes (47 tables and the note).

Known Issues:
- `Diagrams/ERD-3.5-Inventory` and `ERD-3.6-Access-and-Operations` have no source file and were not regenerated; `ERD.md` marks them, and a `DOC` entry is logged. `ERD-3.2-Students` was already marked.
- **Not matching the prompt:**
  - The "Backend: email password reset" entry is not in `Backend-Issues-and-TODOs.md`. It is in the main `Issues-and-TODOs.md` (line 470), which the `backend` branch does not edit (ADR-056). It should be closed on `main`.
  - The settings CHECKs for "a day valid for the month" and "end not equal to start" cannot be row CHECKs, because they span two settings rows. They are the settings service's.
  - "Every year but the latest ended before the next starts" is cross-row too. The unique `in_session` enforces the core of it, and `db:verify` the rest.
  - No `school_years` seed is in `Reference-Schema.sql`, because accounts are not seeded there; the B1 seeder adds both rows.
- No Clinic Overview print or dashboard print table existed in the drafts. The only assumption was `fullLrn=1` on the Dashboard summary, now removed.

Next Steps:
- Close "Backend: email password reset" on `main`.
- The team decides the two `DECIDE` entries.
- Phase B1 builds the migrations, including the `school_years` seeder and the break-glass command (B2).
