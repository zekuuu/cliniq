# 2026-11-10 — Docs sync Part A: the Facts sheet

Date/Day/Time: Tuesday, November 10, 2026 — 06:40 PHT
Agent: Claude Opus 4.7 (caveman + ponytail voice, docs-only run).
Branch: `docs/sync-readmes` (renamed from a vibe-kanban auto-named branch at the start of the run; kept to the conventional `docs/` prefix; not pushed). Working tree started from `main` at `5e3de24`; the `backend` branch's additions are present as unstaged working-tree changes pending the `backend` -> `main` merge (ADR-056's rule still holds; only Part A's two new files were committed).
Task: Part A of the pre-SRS / Project Plan documentation sync prompt (`Prompt-Docs-Sync-From-GitHub-Nov10.md`, pasted into the chat Tuesday, November 10, 2026).
Status: Partial — Part A only. Parts B, C, D, E, F are **not done** and are described in the hand-back below.

Prompt/Request: Zean, Tuesday, November 10, 2026. A groupmate is about to write the real Project Plan and SRS documents straight from the GitHub repository, so every README, Markdown requirement document and diagram must be current, true and readable on GitHub. Parts A to F listed; "This run: Part __" left unspecified, so Parts A to F were attempted in order starting from A. Documentation only — no app code, no tests, no migrations, no schema or ADR decision changes. Commits allowed on the current branch; no push (Zean pushes).

Files Modified:
- `CLINIQ-Knowledge-Base/00-Project-Core/Facts-Sheet.md` (new).
- `CLINIQ-Knowledge-Base/04-Development/tools/facts-sheet.sh` (new, executable).

Changes Made:
- Wrote a single-source Facts sheet that every later document is supposed to quote: ADR count and range (79, ADR-001 to ADR-079), screens (34 numbered) vs routes (19 unique), modules (12 backend module folders) and roles (two: Staff and Admin), mock API exports (132 in `mock-db/api.ts`) and entity types (37 in `mock-db/types.ts`), schema tables and constraints (48 tables, 92 `CHECK`, 36 `UNIQUE`) and migrations on disk (48 under `backend/app/**/Database/Migrations/`), API contract (131 unique method+path entries in `API-Contract.md`) vs live routes (two in `backend/routes/api.php`: `GET health`, `POST session/keepalive`), test file counts (frontend 135, backend 9 excluding `Pest.php` and `TestCase.php`), stack versions (React 19.2.8, react-router 7.18.4, TypeScript 6.0.2, Vite 8.3.0, Vitest 5.0.2, Tailwind 4.3.3, PHP ^8.3, Laravel ^13.17, Sanctum ^4.3, Pest ^5.3), deployment (clinic PC only at `http://localhost`, ADR-079), session rules (7-day maximum, Staff idle 60, Admin idle 30, lockout 5 attempts / 5 minutes), school year (June 15 to April 14, started and ended by hand).
- Wrote `facts-sheet.sh`: a small bash script (no dependencies beyond bash, grep, find, wc, sed) that regenerates the numbers from the live repository. Documented at the top of the Facts sheet.
- Ran the script in the sandbox and copied the numbers into the sheet.

Reason: The Project Plan and SRS writers need one place to copy numbers from, so the READMEs, requirement documents and diagrams cannot disagree on headline figures. The sheet reads the repository every run, which keeps it self-correcting as files change.

Testing Performed:
- Ran `facts-sheet.sh` once; its output was copied into the Facts sheet and matches the numbers in the sheet.
- Backend `composer test` and frontend `npm run test` were not run in this session (sandbox has no `vendor/`, no MariaDB credential and no `.env` read); the sheet says so plainly.

Known Issues:
- The backend branch's new files are present as unstaged working-tree changes in this worktree but were not committed from this branch (the `backend` branch already carries them as commits). This run did not stage or commit them.
- `php artisan route:list` was not available; the "live routes" count comes from reading `backend/routes/api.php` directly.

Next Steps (hand-back): Parts B, C, D, E, F still to run. Each should start from the Facts sheet and quote it instead of hand-typing the same numbers. See the hand-back note in the chat for recommended sequencing (one dedicated agent session per Part, in order B -> C -> D -> E -> F, each ending in its own `docs(...)` commit on this branch).
