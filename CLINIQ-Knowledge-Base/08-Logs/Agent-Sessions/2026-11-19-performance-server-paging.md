Date/Day/Time: Thursday, November 19, 2026 — 13:00 PHT (started 05:49 PHT; clock read with PowerShell `Get-Date`)
Agent: Claude Code (Opus 5.5)
Task: Make the system fast: server-side pagination with lazy page fetching on the long lists, the missing and wasted requests, and the speed gains measurement justifies (ADR-082)
Status: Completed (left-overs with reasons below and in both backlog files)

## Prompt/Request

Zean's prompt "Make the system fast: server-side pagination with lazy page fetching on every list, the requests that are missing or wasted, and every other speed gain that measurement justifies". In short:

- Measure a baseline on the loaded school, then audit and ask before any code.
- Implement the paged-list contract in both layers and one shared list hook.
- Remove the waste, fix the backend and the delivery.
- Write the docs.
- Measure again and report.

No commit, no branch; every change is left uncommitted for Zean.

**Zean's answers, Thursday, November 19, 2026:**

1. **Where to measure:** rebuild `cliniq_testing` with five years and 100,000 audit entries, then reseed the one-year demo school at the end.
2. **The address:** page, search and sort go in it; the page size stays out (his November 17 rule).
3. **The data layer:** TanStack Query.
4. **Which lists:** only the large ones.
5. **The audit log's total:** keep the exact total.
6. **The findings:** all confirmed.

## Before the work

- **A second session changed the tree.** Within minutes of a clean preflight, another session (emergency-contact verify) left uncommitted changes in `StudentService`, `StudentController`, `PersonnelService`, `PersonnelController`, `routes/api.php` and their tests. That session also emptied `cliniq_testing` mid-build: `Table 'cliniq_testing.students' doesn't exist`, from `RefreshDatabase`. I stopped and reported. Zean said "continue" once its last write was 11 minutes old. Its changes were kept and worked around.
- **`bench.php` could not sign in** (419 `csrf_mismatch`). XAMPP's libcurl 8.23 does not write the cookie jar when `CURLOPT_COOKIEJAR` is set again. It now flushes with `CURLOPT_COOKIELIST 'FLUSH'`.

## Baseline (five-year school: 1,201 students, 23,717 visits, 100,083 audit entries; Apache on 127.0.0.1:8081)

| Endpoint or screen | Before | After | Budget |
|---|---|---|---|
| Visit Log: page 1 of 10, All range (was `GET /visits`, 23,482 rows) | 2,054–2,175 ms, 14.3 MB | `visits/log` 105–148 ms, 3.5 KB | 300 ms |
| `GET /visits?page=1&perPage=25` | 2,104 ms | 364 ms (bench) | — |
| Incident Log: All (was 662 rows) | 696–790 ms, 392 KB | `incidents/log` 51–89 ms, 2.3 KB | 300 ms |
| Audit log: page 1 of 10 | 9,528 ms | 96–140 ms, 3.6 KB | 300 ms |
| Audit log: page 9,000 | (above) | 341–368 ms | 300 ms (missed) |
| Audit log: page 1 with a search | (above) | 268–280 ms | 300 ms |
| Audit log: whole list (the printout) | 9,879 ms, 28 MB | 9,862 ms, 29 MB (unchanged by design) | — |
| Follow-ups | 177–191 ms, 732 KB, 368 SQL queries | page 96–117 ms, 4.1 KB, 2–3 queries; whole 84–92 ms, 1 query | 300 ms |
| Inventory movements: All | 724 ms, 3.0 MB | page 50 ms, 3.0 KB | 300 ms |
| Student List | 608–790 ms, 153 KB, 905 rows | page 154–197 ms, 1.8 KB | 300 ms |
| Incomplete Records | 617 ms, 349 KB, 885 rows | page 196–234 ms, 3.9 KB; count 0.5 KB | 300 ms |
| `archive/years` | 2,664–2,844 ms | 96–238 ms | 300 ms |
| `backups/status` (sidebar, every page) | 106 KB | summary 34–75 ms, 0.2 KB | — |
| `dashboard/summary` (this month) | 1,159–1,266 ms | 730–1,016 ms | 1.5 s |
| Student List screen, direct load | 23 requests, 689 KB API, 5.0 s | 12 requests, 5 KB API, 1.9 s | — |
| Student List, route change | 18 requests, 582 KB | 7 requests, 6 KB | — |
| Visit Log screen | 10 requests, 343 KB | 8 requests (one is the page-2 prefetch), 6 KB | — |
| Incident Log screen | 9 requests, 339 KB | 7 requests, 1 KB | — |
| Dashboard screen | 9 requests, 180 KB | 9 requests, 74 KB | — |
| New Visit screen | 13 requests (complaint types twice), 154 KB | 12 requests, 47 KB | — |
| Student Profile screen | 10 requests, 117 KB | 10 requests, 18 KB | — |
| Inventory screen | 8 requests, 150 KB | 8 requests, 45 KB | — |
| Login, first load at 4x CPU (median of 3) | 1.66 s, 842 KB JS | 1.70 s, 867 KB JS | 3 s |
| Dashboard, first load at 4x CPU (median of 3) | 2.28 s (1.83–3.00) | 2.60 s (2.47–2.73) | 3 s |
| Typing 10 characters in the Student List search | no long task (filtered in memory) | no long task (server search, 250 ms debounce) | 100 ms |
| Crowd, 5 people, 10 min | first failure after 36 s (500) | first failure after 0.3 s (500) | — |

**Where the numbers come from:**
- "Before" rows: `lists.php`, `bench.php journey`, `browser.mjs` and `cpu4.mjs`, run 06:00 to 06:55.
- "After" rows: the same scripts, 12:10 to 12:50.
- The throwaway scripts live in the session's scratchpad, outside the repository.
- Ranges show the p50 of separate runs.

**A regression found and fixed during Step 4.** My first `FollowUpService::shape()` read the auto-close setting once per row. Over Apache each read went to the cache store, so the whole follow-up list took 3,802 ms. Settings are now read once per HTTP request; it takes 84 ms.

**Not fixed: the Dashboard's first load at 4x CPU is 0.3 s slower in the median.** That is inside the before-runs' noise (1.83–3.00 s) and under budget. The shared chunk grew by 25 KB raw (+7.7 KB gzip): TanStack Query.

**The crowd run is limited by the development server, not the code.** Under parallel requests, Apache's threaded PHP sometimes reads no `.env`. The run logged 25 `ConfigurationCheck` (`APP_ENV` read as `production`) and `MissingAppKeyException` errors over the day, before and after the change. `php artisan optimize` ends this. It goes on the clinic PC, not this machine, because cached config would ignore the load vhost's `SetEnv DB_DATABASE`. The bench also stops at its first failure.

## Files Modified

**Backend**
- `app/Shared/Http/Paging.php`: `sql`, `sqlRows`, `sort`, `meta`, `lastPage`.
- `app/Shared/Http/PatientLog.php` (new).
- `app/Modules/ClinicVisits/Services/VisitService.php`: `logQuery`, `logRow`, `listQuery`, `shapeRows`; the bounded complaint lookup.
- `app/Modules/ClinicVisits/Controllers/VisitController.php`: `log`; `index` pages in SQL.
- `app/Modules/EmergencyResponse/Services/IncidentService.php` and `Controllers/IncidentController.php`: the log query and action.
- `app/Shared/FollowUps/FollowUpService.php` and `FollowUpController.php`: one query, paged.
- `app/Modules/InventoryTracker/Services/InventoryService.php` and `Controllers/InventoryController.php`: movements paged in SQL.
- `app/Shared/AuditLog/AuditLogController.php`: SQL paging, search and sort; the Module filter in SQL.
- `app/Modules/StudentRecords/Controllers/StudentController.php`: paged `query` and `incomplete`, with counts.
- `app/Modules/StudentRecords/Services/StudentService.php`: `records()` groups by student once.
- `app/Modules/StudentRecords/Controllers/ArchiveController.php`: one school-year lookup per year.
- `app/Modules/BackupVerification/Services/BackupService.php` and `Controllers/BackupController.php`: `?summary=1`.
- `app/Shared/Settings/SettingsService.php` and `SettingsCopy.php` (new): one read per HTTP request.
- `routes/api.php`: `visits/log`, `incidents/log`.
- `tools/load/bench.php`: cookie flush; audit-log rows with dates; paged routes.
- Tests: `tests/Feature/PagedListsTest.php` (new, 11 tests). `HealthAndRoutesTest.php` and `Audit/AccessAndRecordsTest.php` gain the two routes. `VisitsTest.php`: the Q19 meta gains `lastPage`.

**Frontend**
- New: `src/lib/paging.ts`, `src/lib/queryClient.ts`, `src/hooks/usePagedList.ts` and its test, `src/features/archive/archiveCount.ts`.
- `package.json` and `package-lock.json`: `@tanstack/react-query` ^5.108.0.
- `src/lib/api/client.ts`: `requestPage` takes `method`; `PageMeta` gains `lastPage` and `counts`.
- `src/lib/api/http/admin.ts` and `inventory.ts`: one shared, briefly cached read of the complaint types.
- Paged loaders in `features/*/api/`: `visitLogApi.ts`, `incidentLogApi.ts`, `followUpApi.ts`, `inventoryApi.ts`, `auditLogApi.ts`, `studentListApi.ts`, `incompleteRecordsApi.ts`; `backupApi.ts` and `dashboardApi.ts` for the backup indicator.
- Screens on `usePagedList`: `VisitLogListPage`, `IncidentLogListPage`, `FollowUpListPage`, `AuditLogPage` (Print button prints every entry), `InventoryHistoryPage`, `StudentListPage` (router link for View Profile), `IncompleteRecordsQueuePage` (now paged).
- `StaffListPage`: Archive count only. `Sidebar`: backup summary.
- `src/test/setup.ts`: the query cache is cleared after each test.
- Tests:
  - `VisitLogListLoading`, `StudentListLoading` and `IncompleteRecordsQueueLoading`: their mocks name the new loaders.
  - `print-documents.test.tsx`: the every-entry test clicks the Print button, with the same assertions; a new Ctrl+P test.

**Documents**
- ADR-082 (new); a dated note at the top of ADR-013; `ADR-Index.md` (`npm run docs:adrs`).
- `API-Contract.md` ("Filtering and pagination", Q19 row), `URL-Parameters.md` (`page`, `q`, `sort`), `Screen-Inventory.md` (#9, #35).
- `Environment-Setup.md` (new section "Speed and reliability settings for the clinic PC"), `COMMANDS.md`, `frontend/README.md`, `backend/README.md`.
- Number and "Last checked" lines in `README.md`, `README_ORIGINAL.md`, `CLINIQ-Knowledge-Base/README.md` and Start Here. `Facts-Sheet.md` (`npm run docs:facts`).
- Both changelogs and both backlog files.

## Changes Made

See ADR-082 for the decision and the API contract for the shape. In short:
- **Contract:** one paged-list contract.
- **Endpoints:** two new log endpoints; SQL paging, filtering, search and sort on the lists that grow with history.
- **Client:** the `usePagedList` hook on TanStack Query, with page, search and sort in the address, keep-previous, idle prefetch, cancellation, the search debounce and 429 retry. Mock mode pages the mock in memory.
- **Waste:** removed (full-LRN student downloads on the logs, the whole Archive for a count, the backup history on every page, duplicate complaint types, an N+1 of 368 queries, per-day school-year lookups, per-row settings reads, per-student scans of health entries, `SELECT DISTINCT complaint`).
- **Deployment:** settings documented for the clinic PC.

## Reason

Every list fetched every row and paged in the browser. Five years of records made the Visit Log 14 MB and the audit log 9.5 s per page. The busiest screen made 23 requests on one load.

## Testing Performed

- **Frontend, from `D:\` (PowerShell):**
  - `npm run lint`: 0 errors, 1 warning that predates this run (`ErrorSummary.tsx`).
  - `npx tsc -b`: clean. `npm run build`: built.
  - `npm test`: 1,262 passed (150 files). The last recorded count was 1,185 (Facts-Sheet, November 15); the other session and this run added tests. None was deleted, and none loosened (the print test changed only how it triggers printing).
- **Backend:** `composer check` with `DB_DATABASE=cliniq_check_pest`: Pint passed, Larastan no errors, Pest 251 passed (1,623 assertions).
- **Docs:** `npm run docs:check`: every check passes.
- **Walk (Playwright from the capture tool, outside the repository):**
  - API mode, as `demo.nurse` and `demo.principal`: every paged list shows "Showing 1–10 of N"; Next, Previous and 20 rows per page work. The page is in the address and survives a reload. Searching a name from page 40 finds it on page 1. No duplicate request, no 429.
  - Intermittent 500s came from the `.env` race above: the Incident Log in one nurse run, and a Student List page-2 prefetch.
  - Mock mode, both roles: the same, with no console or HTTP error.
- **Data:** the one-year demo school was reseeded into `cliniq_testing` at 12:58 (`migrate:fresh --seeder=DemoSchoolSeeder --env=testing --force`). `cliniq` was never touched. Pest ran only on `cliniq_check_pest`.

## Known Issues

- Deep audit-log pages (368 ms) and a search with a computed sort (about 700 ms) miss 300 ms (Backend LATER).
- The mock layer is still in the API-mode build (ADR-080 point 6; Frontend LATER).
- Detail prefetch on hover was not built (audit "view" entries; Frontend LATER).
- The Incident Report still reads every incident (Frontend LATER).
- The crowd bench can't run past the development server's `.env` race (Backend LATER: `php artisan optimize` on the clinic PC).
- My failed `npm ci` (EPERM on the rolldown binary held by running Vite servers) left `node_modules` half-removed until `npm install` restored it. One of Zean's two dev servers on 5173 (PID 58188, started November 16, 21:50) is no longer running, probably because of that; the other (PID 45852) is.
- On this machine, the frontend tests must run from `D:\` with a capital D (memory and COMMANDS.md).
- A stale `node_modules/.vite` was also cleared.

## Next Steps

- Zean reviews and commits.
- Apply Environment-Setup "Speed and reliability settings" on the clinic PC.
- Re-run the crowd with config cached on a training copy.
- Decide whether the mock may load lazily (an ADR-080 change).
- Flag the canonical documents (DOC entry).
