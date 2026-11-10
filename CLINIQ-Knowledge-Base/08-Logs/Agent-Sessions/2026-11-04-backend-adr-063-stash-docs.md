Date/Day/Time: Wednesday, November 04, 2026 — 20:20 PHT
Agent: Claude Code (Opus 5.5)
Task: Recover the backend-only ADR-063 doc changes left in a git stash
Status: Completed
Prompt/Request: "let's clean all the available stashed, if those stash is still applicable and not outdated in this branch or in its respective branch then apply them. confirm first before proceeding" — then, after the per-line comparison, the user chose option 1: apply only the two backend doc files from the stash to the `backend` branch and commit.
Files Modified:
- CLINIQ-Knowledge-Base/02-Architecture/Database/Checks/constraint-tests.sql
- CLINIQ-Knowledge-Base/04-Development/API-Contract.md
- CLINIQ-Knowledge-Base/08-Logs/Backend-Changelog.md
Changes Made:
- `stash@{0}` ("review round 2 part 1", made on `backend` on November 2, 2026) was compared line by line with `main` and `backend`. Everything in it was already committed (on `main`, or on both branches for the shared knowledge-base docs) or since superseded, except two files that exist only on `backend`.
- constraint-tests.sql: the personnel seed rows now give `sex`, and two ADR-063 cases were added (`chk_personnel_sex` rejects `other`; `female` is accepted). `Reference-Schema.sql` on `backend` already makes `personnel.sex` NOT NULL, so the old seed insert would have failed.
- API-Contract.md: `PersonnelInput` requires `sex`; "Choose the sex." added to the 422 errors; `visitsBySex` and `demographics.sex` carry the students/staff split (ADR-063).
Reason: ADR-063 reached the schema and the Data Dictionary on `backend`, but these two files were left in the stash and never committed.
Testing Performed: `git apply --3way` applied the patch cleanly. The SQL was not run against MariaDB.
Known Issues: The two new constraint cases have not been run yet; the ERD note still says so.
Next Steps: Run `Checks/constraint-tests.sql` on MariaDB 10.11 and update the test count in `ERD.md`. The stashes can be dropped.
