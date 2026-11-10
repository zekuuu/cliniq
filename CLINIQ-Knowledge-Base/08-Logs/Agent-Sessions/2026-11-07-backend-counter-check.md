Date/Day/Time: Saturday, November 07, 2026 — 13:35 PHT (local clock, UTC+8)
Agent: Claude Code (Opus 5.5)
Task: Counter-check the frontend against the backend documents (audit before B1), documents only, on `backend`
Status: Completed (one BLOCKER left as a `DECIDE`)
Prompt/Request: "Prompt — Counter-check the frontend against the backend documents (audit before B1, on `backend`)", sent by Zean right after the consultation-documents prompt ("after you're done here's the next prompt"). The audit reads the frontend code, compares it with the backend documents in 10 sections, writes a report, fixes documentation errors only, refreshes the readiness checklist, logs findings and lists hand-offs for `main`.

Files Modified:
- New: CLINIQ-Knowledge-Base/04-Development/Backend-Counter-Check-Nov7.md
- CLINIQ-Knowledge-Base/04-Development/API-Contract.md
- CLINIQ-Knowledge-Base/04-Development/Backend-Readiness-Checklist.md
- CLINIQ-Knowledge-Base/02-Architecture/Database/Reference-Schema.sql
- CLINIQ-Knowledge-Base/02-Architecture/Database/Checks/constraint-tests.sql
- CLINIQ-Knowledge-Base/02-Architecture/Database/Data-Dictionary.md
- CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md
- CLINIQ-Knowledge-Base/08-Logs/Backend-Issues-and-TODOs.md
- CLINIQ-Knowledge-Base/08-Logs/Backend-Changelog.md

Changes Made:
- **Set up:** on `backend` at `385beb7b`, with this session's uncommitted consultation documents. `main` is `cfd4bd84`; `frontend/` is identical on both. ADR-075 is the newest on both, and `ERD.md` names ADR-071, 072, 073 and 075.
- **Numbers:** 126 functions, 15 constants and 19 classes in `api.ts`; 16 other runtime exports; 42 entity interfaces; 47 tables and 227 columns; 63 audit calls with 41 literal pairs plus 3 computed; 47 routes against 44 Screen Inventory numbers; 75 ADRs.
- **Findings:** 2 BLOCKER, 4 MISMATCH, 5 DRIFT, 8 NOTE (report sections C-1 to C-19).
  - BLOCKER C-1: staff record reviews (ADR-067) have no table. Logged as a `DECIDE`; the recommendation is a `personnel_record_reviews` table.
  - BLOCKER C-2: `chk_txn_other_note` contradicted ADR-068. Removed.
- **Fixed** (copied from the code or the settling ADR):
  - C-2: the CHECK, its test (now accepts), the dictionary and the ERD scenario.
  - C-3: the Stage 2 and approve entries no longer name a care blocker (ADR-065).
  - C-4: the adjust entry gains the optional note and the "Large write-off" marker (ADR-061, 068).
  - C-5: 7 contract entries plus 1 "not an endpoint", for 8 functions that had none.
  - C-9: the readiness checklist is refreshed (counts; two boxes now true; new items for staff reviews, key custody, break-glass and school years).
  - C-11: the write-off setting description.
  - C-16: the contract's counts at `cfd4bd84`.
- **Not fixed (need a decision, or owned by `main`):**
  - C-1 is a `DECIDE`.
  - C-6 (Screen Inventory) and C-8 (Admin's view of staff audit entries) are `DOC`.
  - C-10 (stale line numbers) is a `LATER`.
  - C-15 (close the email-reset entry on `main`) and C-19 (three old failing tests) are `FIX-FRONTEND`. `FIX-FRONTEND` was added to the file's legend, as the prompt asked.
  - Counts recomputed: FIX 2, AUDIT 0, DOC 4, DECIDE 3, LATER 14, FIX-FRONTEND 2; NOTE 6, VERIFY 0; Done 8.

Reason: before phase B1 builds migrations, the backend documents must match what the frontend actually does (Zean's request).

Testing Performed:
- Frontend at `cfd4bd84`: typecheck 0 errors, lint 0 errors, tests 1137 passed and 3 failed (1140), build passes. The three failures are the old ones from `1b50a113`.
- Schema reloaded on MariaDB 10.11.16 after C-2: constraint tests 247 of 247 (rejects 168, accepts 36, counts 43); scratch database dropped.
- Seed: 272 records checked against the column limits, the LRN format and the username minimum, with 0 violations; the notice says synthetic.
- Self-check:
  - 12 findings re-verified by opening the code and the document again, including both BLOCKERs. None changed.
  - A second agent re-derived the counts from the code alone and agreed on functions, constants, classes and interfaces.
  - It corrected four of mine, now in the report: other exports 13 became 16, audit calls 64 became 63, audit pairs 37 became 41 plus 3, routes 29 became 47.

Known Issues:
- B1 should not start until C-1 is decided.
- Not verified:
  - each of the 337 fields' type, length and default one by one: the names were checked mechanically, the lengths through the seed;
  - every rule's exact error text: the main ones were sampled;
  - each flow by running it: they were traced against the contract's entries.

Next Steps: Zean decides C-1; the "For the main branch" list in the report becomes a prompt on `main`.
