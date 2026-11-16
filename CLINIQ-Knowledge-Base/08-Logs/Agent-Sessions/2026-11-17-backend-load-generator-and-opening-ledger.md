Date/Day/Time: Tuesday, November 17, 2026 — 05:20 (PHT, from the system clock; the work ran Monday, November 16, 2026 from 22:14 to 23:00 PHT and resumed 05:18)
Agent: Claude Code (Opus 5.5)
Task: Load run, Job 2 steps 1 to 4: the fictional test school (one deterministic command), its soundness checks, and defect D1 found by them
Status: Partial (paused by Zean before the measurements, step 5 onward)
Prompt/Request: Zean, Monday, November 16, 2026 — 09:13 PHT: "migrate and test data to simulate around 900 students list and for staffs I'm not sure. then other modules too. Then do some tests like stress test, would the system slow if there's many data do we need caching or no". Pop-up answers 09:35 PHT: data in `cliniq_testing`; "half, migrate and import list"; 60 staff (and 150 once); one school year plus a five-year worst case. D1: "Fix backend + frontend label". Monday 23:00 PHT: "pause for now, then send me what to do". Tuesday about 05:20 PHT: "wait pause for now, we need to update the docs".
Files Modified:
- `backend/tools/load/build.php`, `Generator.php`, `checks.php`, `app-grants.php`, `bench.php` (new; `bench.php` written, not yet run)
- `backend/.gitignore` (`/storage/load`)
- `backend/app/Modules/InventoryTracker/Services/InventoryService.php` (D1: the `opening` ledger row)
- `backend/tests/Feature/InventoryTest.php`
- `frontend/src/features/inventory/InventoryHistoryPage.tsx`, `StockModals.tsx` ("Opening stock"), `InventoryOpeningRow.test.tsx` (new)
- `CLINIQ-Knowledge-Base/04-Development/API-Contract.md` (inventory history note)
- `CLINIQ-Knowledge-Base/08-Logs/Load-Test-Nov16/NOTES.md`, `Backend-Issues-and-TODOs.md`, `Backend-Changelog.md`, `Frontend-Changelog.md`
Changes Made:
- `php tools/load/build.php --students=900 --staff=60 --years=1|5` rebuilds the school from nothing on `cliniq_testing` (or `cliniq_load`): `migrate:fresh`, accounts (Admin, nurse, three covering Staff, one deactivated, 20 bench Staff; test password `Load-Test-Only-2026`), the bundled holidays, 60 items, then each school year day by day with the clock set: the yearly student list and the staff list through the real import routes in-process, school-year start and end through their routes, visits, incidents, follow-ups, excuse letters, stock, transfers, calendar events and issue reports through the services and routes, audit sign-ins, views and prints through the audit logger. It refuses production, any other database, and a database holding accounts or students it did not make. Labelled shortcuts: daily backup rows inserted directly; `--audit=N` padding.
- `checks.php`: every foreign key (composite keys joined on every column), the stock ledger chain and parity, batch allocations, the opening rows, EL- and IR- numbers unique and gapless per year, Staff No. gapless, no orphan in the audit log, every LRN in the reserved range 999900000001 to 999900999999, no surname shared with the project's real people (read at run time, never printed).
- D1: `InventoryService::save` now writes the `opening` ledger row and its batch allocation in the item's create transaction, as the ERD says; the screens label it "Opening stock".
- The generator lives in `backend/tools/load/`, not `app/Shared/Database/` as the prompt suggested: development-only code stays out of the shipped app and out of Larastan level max.
Reason: Job 2 of the follow-ups and load run (`Load-Test-Nov16/NOTES.md`, "JOB 2 PLAN").
Testing Performed: One-year build 63 s, 48 MB peak, all 12 checks pass. Backend Pest on the scratch database `cliniq_check_pest` (so `cliniq_testing` keeps the load data): 231 passed; Pint and Larastan pass. Frontend: the inventory tests (37) and the new test pass; `tsc -b` passes. Apache on `127.0.0.1:8081` answers `/api/health` (Zean added the vhost).
Known Issues: The measurements (steps 5 to 10), the five-year build, the live checks of item 1.6 and the report are not done yet. The Facts sheet's test counts (1185 and 228) are stale until the final gate reruns them; `docs:facts --tests` would empty the load database.
Next Steps: Resume at step 5 when Zean says: confirm 8081 reads `cliniq_testing`, run `bench.php`, then the five-year build and the rest of the prompt.
