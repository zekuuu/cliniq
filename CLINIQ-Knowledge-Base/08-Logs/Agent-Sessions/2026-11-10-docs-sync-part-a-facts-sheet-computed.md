# 2026-11-10 — Docs sync Part A (redo on `backend`): the Facts sheet, computed

Date/Day/Time: Tuesday, November 10, 2026 — 15:40 PHT
Agent: Claude Opus 5.5 (Claude Code), docs-only run.
Branch: first run on `backend` at `b51166a` (which has `main` merged in); moved uncommitted to `main` at `8f70297` the same afternoon on Zean's instruction. On `main` the script reads the backend through git from the `backend` branch.
Task: Part A of the pre-SRS / Project Plan documentation sync.
Status: Completed

Prompt/Request: Zean, Tuesday, November 10, 2026 (chat): a groupmate will write the real Project Plan and SRS from the Markdown on GitHub, so every README, requirement document and diagram must be current and true. Run on the branch holding the latest of everything (`backend` after `main` is merged). Part A: a script that computes every number the documents quote and writes `00-Project-Core/Facts-Sheet.md`, with the commit, a real timestamp and the regenerate command. Documentation only; commits allowed, no push.

Files Modified:
- `CLINIQ-Knowledge-Base/04-Development/tools/docs-facts.mjs` (new): computes the facts and writes the sheet.
- `CLINIQ-Knowledge-Base/04-Development/tools/docs-check.mjs` (new): the read-only freshness check used by Parts B, E and F.
- `CLINIQ-Knowledge-Base/04-Development/tools/facts-sheet.sh` (deleted): replaced by `docs-facts.mjs`.
- `CLINIQ-Knowledge-Base/00-Project-Core/Facts-Sheet.md` (regenerated).
- `package.json` (root): `docs:facts` and `docs:check` scripts.

Changes Made:
- The earlier Part A (session `2026-11-10-docs-sync-part-a-facts-sheet`) ran on a docs-only branch with no backend and no test runs. Its sheet had wrong numbers: 12 modules (there are 11), 19 routes (a `path="` grep; there are 47), 131 contract entries (prose matches; there are 126 `####` endpoint headings), 2 live routes (`route:list` shows 3), 92 CHECKs was right but by luck of the grep.
- `docs-facts.mjs` is Node with no dependencies, so it runs the same on Windows and in Git Bash (the bash version needed `TZ=` and GNU tools). It reads the router, `paths.ts`, the schema, the constraint tests, the contract, `config/cliniq.php`, `package-lock.json`, `composer.lock`, and runs `php artisan route:list --json` when PHP is present. `--tests` runs both suites and records their summary lines; without it the last recorded test section is kept.
- The sheet also carries the signed-in routes by role, which Part D's screen-flow map is built from.

Facts at `b51166a`: ADRs 79 (ADR-001 to ADR-079); screens 34 numbered (1 to 42); routes 47 (28 Staff only, 3 Admin only, 14 both, plus Login and Force Password Change); roles 2; backend modules 11, shared services 10; mock API 132 functions, 20 constants, 20 error classes, 37 types; tables 48, columns 462, CHECK 92, UNIQUE 36, foreign keys 96; constraint test cases 260; migrations 48; contract entries 126; live routes 3; test files frontend 135, backend 8; frontend 52,859 and backend 4,794 non-blank lines.

Reason: one computed source for every number, so the READMEs, the Project Plan and the SRS cannot disagree.

Testing Performed:
- Backend `composer test`: 85 passed (374 assertions).
- Frontend `npx vitest run`: 1185 tests; three full runs gave 12, 7 and 23 failures, all 5-second timeouts or load misses. The failing files run alone: 75 passed of 75. Already tracked as the VERIFY "The full test suite fails more under CPU load".
- `php artisan route:list`: 3 routes. `php artisan migrate:status`: "Migration table not found" (the dev database is not migrated).
- Constraint tests: not run. XAMPP's MariaDB root has a password and this run has no access to it or to `backend/.env`. The sheet reports the case count (260), not a pass count. The last recorded pass was 254 on MariaDB 10.11.16 (ERD.md, Saturday, November 07, 2026), before the six cases added since.
- `npm run docs:check` runs; its first findings are the worklist for Parts B and C.

Known Issues:
- Running the constraint tests and the migrations against MariaDB needs the root or `cliniq_migrate` password: see the morning report's "ONLY YOU CAN DO" (Backend-Issues-and-TODOs already holds it).

Next Steps: Part B (READMEs).
