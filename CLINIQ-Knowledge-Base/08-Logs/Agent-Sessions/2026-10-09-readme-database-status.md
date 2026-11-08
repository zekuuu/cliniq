Date/Day/Time: Friday, October 09, 2026 — 03:48 PHT
Agent: Codex
Task: Bring the root READMEs up to date with the proposed database design.
Status: Completed
Prompt/Request: “Bring the root READMEs up to date with the proposed database design. The proposed database design was integrated in commit `7d6a2a5` and the task covers only the two root READMEs, plus a check that nothing else in the live docs still says the database is ‘TBA’.”
Files Modified:
- `README.md`
- `README_ORIGINAL.md`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`
- This session log
Changes Made:
- Added root README links to the proposed 34-table ERD, its data dictionary, and its review-only reference DDL; stated that the draft is not final or approved and that migrations remain blocked until approval.
- Replaced the historical README roadmap’s stale B1 “TBA — not yet designed” parenthetical with a link to the proposed ERD and its pending-approval status.
Reason: Keep the root repository documentation accurate without presenting the proposed database design as an approved schema.
Testing Performed:
- Ran `git fetch --all --prune` and confirmed local `main` matches `origin/main` at `7d6a2a5`.
- Verified the ERD’s 34-table count and 18 open decisions directly from `ERD.md` and `Reference-Schema.sql`.
- Searched all tracked `README*.md` files and eligible non-log knowledge-base Markdown documents for stale database-status wording; the only live stale statement was the updated B1 roadmap entry.
- Verified every relative link added to `README.md` and `README_ORIGINAL.md` resolves to an existing file.
Known Issues:
- The MariaDB (XAMPP) versus MySQL wording remains an open approval item and was deliberately left unchanged.
Next Steps:
- Team review must resolve ERD.md section 11 decisions D-01 through D-18 and formally approve the design before migrations begin.
