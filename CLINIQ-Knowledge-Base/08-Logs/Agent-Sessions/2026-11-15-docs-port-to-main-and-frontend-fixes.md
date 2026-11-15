Date/Day/Time: Sunday, November 15, 2026 — 09:22 PHT (PowerShell `Get-Date`)
Agent: Claude Opus 5.5 (Claude Code)
Task: Put the documentation refresh of this morning on `main`, and fix the `main` and frontend items it left open
Status: Completed
Prompt/Request: Zean, Sunday, November 15, 2026 (chat), after the backend docs refresh ([session](2026-11-15-backend-docs-refresh-after-build.md)): "wait all docs should be in main, now when you switch to main, also fix those for main or frontend". Asked how to handle the uncommitted files and what `main` should receive. Zean: "commit all docs to main /komit" and "No not get, I mean those uncommitted files goes to main".

Files Modified:
- The 28 files of the backend docs refresh, written onto `main` as they stood on `backend` (listed in that session's log), including `backend/README.md` (on `main` this folder holds only the README and `.env.example`, ADR-056)
- `CLINIQ-Knowledge-Base/04-Development/tools/docs-facts.mjs` (route split without PHP)
- `CLINIQ-Knowledge-Base/00-Project-Core/Facts-Sheet.md`, `01-Requirements/Functional-Requirements.md` (regenerated on `main`)
- `frontend/src/lib/mock-db/seed.ts` (lint), `frontend/src/lib/mock-db/README.md`, `frontend/src/features/staff-records/README.md`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`, this log

Changes Made:
- **Port.** The uncommitted refresh on `backend` was copied to the scratchpad, stashed on `backend` (`stash@{0}`, "docs refresh 2026-11-15 (ported to main)"; kept, not dropped), and the files written onto `main` after `git switch main`. Eight of them differed between the branches because `main` lacked the B4 to B10 documentation commits; their `backend` versions, with this morning's edits, now stand on `main`. No backend code (`backend/app`, tests, database, `composer.*`) was brought over.
- **Facts on `main`.** `main` has no PHP code to run `route:list`, so `docs-facts.mjs` now splits the routes by module from `backend/routes/api.php` read through git: each route's controller, mapped through its `use App\Modules\…` or `use App\Shared\…` line. The result equals the `route:list` split on `backend` (127 routes; the same 15 owners and counts). The sheet's backend numbers come from the `backend` branch at `397e000`; the test-run section is carried over from the 08:38 PHT run.
- **Lint.** `npm run lint` failed with `'_seedNote' is defined but never used` at `seed.ts:124`: Prettier had moved the destructuring onto the next line, so the `eslint-disable-next-line` above the `.map(` call pointed at the wrong line. The comment moved to the line above the destructuring. Lint now: 0 errors, 1 warning (fast refresh in `ErrorSummary.tsx`, unchanged).
- **READMEs under `frontend/src`.** `mock-db/README.md`: "Last checked" to today; the ERD is approved (ADR-057), not "a proposed draft"; the holiday file and the Laravel API described as built on `backend` but not connected (ADR-056). Dev accounts, `config` values and the load script checked against the code: unchanged. `staff-records/README.md`: the backend's staff endpoints are built, not yet called.

Reason: Zean wants the documents on `main`, where the groupmate writing the Project Plan and SRS reads them; the lint error and the two READMEs were the open frontend items of the refresh.

Testing Performed:
- `npm run lint`: 0 errors, 1 warning. `npx vitest run src/lib/mock-db` (from PowerShell): 14 files, 162 tests pass. From Git Bash the same run fails every suite with "Vitest failed to find the current suite", because Git Bash starts in `D:` and the config in `d:`; a shell artefact, not a code fault.
- `npm run docs:facts`, `npm run docs:trace` (24 requirements, 0 missing links), `npm run docs:check` on `main`: all checks pass.

Known Issues:
- `backend` still holds the same edits only in `stash@{0}`. Merging `main` into `backend` after these commits brings them back; then the stash can be dropped.
- The `php artisan serve` started earlier on port 8123 may still be running.

Next Steps: merge `main` into `backend` (documents only flow that way, ADR-056), then `git stash drop`.
