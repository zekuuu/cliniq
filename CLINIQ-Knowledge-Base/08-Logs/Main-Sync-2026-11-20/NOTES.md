# Main sync, Friday, November 20, 2026

Run: Friday, November 20, 2026 — 01:52 to 02:00 PHT (clock read with PowerShell `Get-Date`). This was the first sync run after the merge (ADR-081). It describes `main` at `533df61`, which equals `origin/main`.

**Since:** `6ab8d95` (Wednesday, November 18, 2026 — 10:13 PHT). That is the last row of `Main-Sync-Log.md` that was a sync, the merge sync. The row after it (Thursday, November 19, 22:46) was a frontend run, not a sync. The run covers 62 commits on `main`'s own line (`git rev-list --first-parent 6ab8d95..533df61`). The backend history that the merge brought in is not counted.

**Working tree at the start.** The tree was not clean. It held the uncommitted Frequent-visitor pager work of the same night (`2026-11-20-frequent-visitors-pager.md`). Zean chose in the pop-up: "Sync on top, exclude". Those paths were left as they were and are listed under "Not part of this run" below. One number includes them: the Facts sheet's frontend line count, 70710, is 10 lines more than the committed 70700.

## Other branches

`git rev-list --count origin/main..origin/<branch>` gives 0 for all 17 remote branches (`backend`, `feat/connect-frontend`, `feat/build-backend`, `docs/main-sync-2026-11-17` and 13 older ones). None has a commit in the last 14 days that `main` lacks. Nothing was copied.

## Drift table

| Path | What it said | What the code says | Action |
|---|---|---|---|
| `README.md` | No "Last synced" line; a per-branch "Where the code lives" table; 127 routes; 231 backend tests; `git switch backend` before the backend commands; "the 127 live routes" | `main` holds everything (ADR-081); 131 routes (`routes/api.php` plus Sanctum); 251 tests (`2026-11-19-performance-server-paging.md`) | Fixed: "Last synced" line; a "Where things live" folder table with one sentence for the kept branches and the tag; numbers; `git switch backend` removed; one line on ADR-082, ADR-083 and the emergency-contact check |
| `CLINIQ-Knowledge-Base/00-Project-Core/Start-Here-For-SRS-And-Project-Plan.md` | A per-branch table; no digest after November 18 | as above | Fixed: folder table; new digest "Changes since the last sync (Wednesday, November 18, 2026)" above the older ones |
| `README_ORIGINAL.md`, `CLINIQ-Knowledge-Base/README.md` | 127 routes, 231 tests, "all 79 decisions", the old anchor | 131, 251, 83 | Fixed |
| `backend/README.md` | 127 routes; `composer test` 231 | 131; Pest 251 (1,623 assertions) | Fixed |
| `04-Development/Backend-Readiness-Checklist.md` | 127 routes, 231 tests, "on `feat/connect-frontend`" | 131, 251, on `main` | Fixed |
| `02-Architecture/System-Architecture.md` | The backend "on the `backend` branch (only a README and `.env.example` on `main`)" | On `main` (ADR-081) | Fixed. The merge sync missed this line |
| `02-Architecture/Deployment-Diagram.md` | "Neither the backend nor the connection is merged into `main` yet" | Both on `main` | Fixed; the Mermaid block is still true, so it was not changed |
| `02-Architecture/Tech-Stack.md` | Data fetching: plain `useAsyncData` only | TanStack Query for the paged lists (ADR-082, `hooks/usePagedList.ts`) | Fixed |
| `04-Development/Development-Phases.md` | Dated status at `397e000` with a November 17 update | Everything on `main`; 131 routes; 251 tests | Added a dated update; the history is kept |
| `05-Testing/Test-Cases.md` | Newest runs from November 16 | 1277 frontend and 251 backend tests, November 19 | Added the newest runs |
| `00-Project-Core/Facts-Sheet.md` | Stack without TanStack Query or Sonner; newest runs to November 18 | Both installed (`package-lock.json`) | Regenerated; runs added by hand to the carried-over paragraph |
| `04-Development/tools/docs-facts.mjs` | Each side read from "the newest remote branch tip that holds its folder", through git | ADR-081: read the working tree | Fixed: reads only this working tree and never another branch; adds `@tanstack/react-query` and `sonner` to the stack table |
| `URL-Parameters.md`, `COMMANDS.md`, `frontend/README.md`, `backend/tools/load/README.md`, `Screen-Inventory.md`, `API-Contract.md` | Updated by the sessions that changed the code (commits after `6ab8d95`) | Same | Left |
| `screenshots/INDEX.md` | 34 files | 34 PNGs on disk, the same names | Left |

## Numbers (before is the last sync, `6ab8d95`)

ADRs 81 to 83; API routes 127 to 131; contract entries 126/127 to 128/129; frontend test files 148 to 152; backend test files 25 to 27; frontend lines 69270 to 70710 (70700 committed); backend lines 14562 to 16359. Tests, from logs and not re-run: frontend 1254 to 1277; backend 236 to 251.

**Checked by hand:**
- Routes: 130 `Route::` calls in `backend/routes` and `backend/app`, plus Sanctum's CSRF cookie route, make 131.
- Tables: 48 of the 50 migrations hold a `CREATE TABLE`; `Reference-Schema.sql` also has 48.
- Frontend routes: 45 `path:` entries in `AppRoutes.tsx`, plus Login and Force Password Change, make 47.

All three equal the Facts sheet.

## Diagrams

No diagram source changed since the last sync. The schema and the migrations are unchanged, so there was no ERD export. `docs:diagrams` was not run.

## Checks

- `npm run docs:check`: all checks pass. The first run flagged two digest lines that quote "before" numbers; they were reworded the way the older digest words them.
- `npm run docs:adrs`: 83 ADRs.
- `npm run docs:trace`: 24 requirements, 0 missing links. The script reads files only. The table now counts the emergency-contact verify routes: FR-02 `/api/students` 12 to 13; FR-03 and FR-21 `/api/personnel` 10 to 11.
- Stale-phrase search over 186 Markdown files outside `08-Logs`: the remaining hits are dated history.
- Issue counts recomputed: DOC 19, DECIDE 2, LATER 14, NOTE 82, VERIFY (boxed) 1. They equal the header.
- `COMMANDS.md`: every `npm run` and `composer` line exists in `package.json`, `frontend/package.json` or `backend/composer.json`.
- Screenshots: 34 listed, 34 on disk.
- No database command was run, and no `.env` file was opened.

## Not part of this run (uncommitted, from the pager session)

- `frontend/src/components/ui/ListCard.tsx`
- `frontend/src/features/dashboard/components/AlertLists.tsx`
- `frontend/src/features/dashboard/DashboardPage.tsx`
- `frontend/src/features/dashboard/DashboardPage.test.tsx`
- `frontend/src/lib/mock-db/types.ts` (a comment)
- `frontend/src/features/dashboard/README.md`
- `frontend/src/lib/mock-db/README.md`
- `08-Logs/Frontend-Changelog.md` (its pager row)
- `08-Logs/Agent-Sessions/2026-11-20-frequent-visitors-pager.md`

## Needs Zean's call

- None for this sync.
