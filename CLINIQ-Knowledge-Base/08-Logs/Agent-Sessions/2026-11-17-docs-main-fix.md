Date/Day/Time: Tuesday, November 17, 2026 — 08:31 PHT (from the system clock via PowerShell `Get-Date`; the run started 08:13)
Agent: Claude Code (Opus 5.5)
Task: Fix the stale lines found on `main` after the November 17 sync, docs only
Status: Completed (left uncommitted on `docs/main-fix-2026-11-17` for Zean's review)
Prompt/Request: Zean, Tuesday, November 17, 2026 (chat): "Prompt — Fix the stale lines found on `main` (Tuesday, November 17, 2026), docs only": six fixes found by a check of `origin/main` `57c3cc8` (the ERD draft banner, the ERD constraint-test count, the checklist's "nothing connected", the README branch table and migration wording, regenerating the Facts sheet and removing `git pull` from the `dev` script, the Lucid ERD link); no commit, no push. One pop-up during the run: keep "254 constraint tests" in the two dated history notes (Zean chose "Keep as history").
Files Modified:
- `CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md`
- `CLINIQ-Knowledge-Base/02-Architecture/Database/Diagrams/README.md`
- `CLINIQ-Knowledge-Base/04-Development/Backend-Readiness-Checklist.md`
- `CLINIQ-Knowledge-Base/00-Project-Core/Start-Here-For-SRS-And-Project-Plan.md`
- `CLINIQ-Knowledge-Base/00-Project-Core/Facts-Sheet.md` (regenerated)
- `CLINIQ-Knowledge-Base/README.md`
- `README.md`
- `package.json` (the `dev` script line only)
- `CLINIQ-Knowledge-Base/08-Logs/Main-Sync-Log.md`, `08-Logs/Frontend-Changelog.md`, this log
Changes Made:
- `ERD.md`: the "Updated to the decisions up to ADR-056 … Still a proposed draft …" banner became "Draft history: … approved the next day (ADR-057)", keeping the `ERD-Review.md` link; "254 constraint tests" became 260 (Sunday, November 08, 2026 — 18:35 PHT, after ADR-078, the date of the ADR-078 banner) with 254, 247 and 204 as history; a Lucidchart line under the status line.
- Diagram index: a row for the editable Lucidchart overview (same 48 tables, 53 relationships), with `Reference-Schema.sql` named the source of truth.
- Checklist summary: "the 50 migrations (48 create a table, 2 ship product data) run on MariaDB; the frontend on `main` still runs on sample data only; the version connected to the API behind a mock/API switch is on `feat/connect-frontend` (ADR-080) and is not merged (ADR-056)"; line 24 says "48 table migrations".
- README and Start Here: branch-table tips `main` `57c3cc8` (06:20 PHT) and `feat/connect-frontend` `3a890f5` (06:22 PHT); "Last synced" lines updated to 08:15 PHT with those commits. Start Here's table was updated too, so the two tables agree (the prompt named the README only).
- "The 50 migrations (48 create a table, 2 ship product data) run on MariaDB" in the README, Start Here and the Knowledge Base README (the last one beyond the prompt's list, for the same reason).
- Facts sheet regenerated with `npm run docs:facts`: no number changed; its code links and source line now name `3a890f5`.
- `package.json`: `"dev": "cd frontend && npm run dev"`, as on `feat/connect-frontend`.
Reason: The groupmate writing the Project Plan and the SRS reads only `main`; these lines contradicted the rest of the documents.
Testing Performed: Counted 260 test cases by reading `Checks/constraint-tests.sql` (lines starting `CALL t_accepts`, `t_rejects` or `t_count`), not by running it. `npm run docs:facts` (no database); `npm run docs:check`: all six checks pass. Stale-phrase grep of the prompt: only the two dated history notes kept on Zean's answer. `Development-Phases.md` line 69 ("nothing connected to the frontend" in the B0 plan) and `Decisions-Summary.md` (ADR-056's summary) were read and left: both describe the past or a decision, not the present.
Known Issues: none new.
Next Steps: Zean reviews the diff, commits it to `main` and pushes.
