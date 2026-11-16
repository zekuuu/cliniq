# Follow-ups and load test run notes — Monday, November 16, 2026

Branch `feat/connect-frontend` (tip `47bba54`, not yet merged into `backend`). Zean chose to continue on this branch rather than branch off (pop-up answered between 12:06 and 12:26 PHT, Monday, November 16, 2026, not clocked to the minute: "continue on this branch"). Nothing committed. Prompt: Zean, Monday, November 16, 2026 — 09:13 and 09:35 PHT (fix next steps 3, 4 and 5; then a 900-student test school with five years of history, measured for speed, load and caching).

## THE MACHINE (read every number next to this)

Recorded Monday, November 16, 2026 — 12:26 PHT. This is Zean's development laptop, **much faster than the clinic PC** (NFR-01: an Intel Core i3 with 4 GB of RAM or similar).

| Item | Value |
|---|---|
| CPU | Intel Core i5-14500HX, 14 cores, 20 threads |
| RAM | 31.7 GB |
| Disk | NVMe SSD (Samsung MZVL2512HDJD 512 GB; ADATA Legend 710 1 TB, the repository's drive `D:`) |
| Windows | 11 Home Single Language, 10.0.26300 |
| PHP | 8.5.12 ZTS x64 (XAMPP, `C:\xampp\php\php.exe`); OPcache is built in (`php -m` lists Zend OPcache); `opcache.enable=1` (default, the `php.ini` line is commented out); `opcache.enable_cli=0` |
| PHP limits | `memory_limit=512M`, `post_max_size=40M`, `upload_max_filesize=40M` |
| Apache | 2.4.65 (Win64, XAMPP) |
| MariaDB | 10.11.16 (XAMPP), bound to `127.0.0.1:3306` |
| `innodb_buffer_pool_size` | 16,777,216 (16 MB, the XAMPP default) |
| `innodb_log_file_size` | 5,242,880 (5 MB) |
| `max_connections` | 151 |
| `innodb_flush_log_at_trx_commit` | 1 |
| Slow query log | off (`long_query_time` 10, `log_queries_not_using_indexes` off) |

**Found at the start (12:06 PHT):** port 3306 was held by a separate **MySQL 9.7 Windows service (`MySQL97`, automatic start)**, so XAMPP's MariaDB and Apache were not running and the test account was refused. Zean stopped `MySQL97` and started XAMPP MySQL and Apache (answered before 12:26 PHT). To undo after the run: stop XAMPP MySQL, then `Start-Service MySQL97`. Port 8080 belongs to PostgreSQL's `PEMHTTPD-x64` service, not to CLINIQ.

**Database accounts (read before 12:26 PHT).** `cliniq_migrate`: ALL on `cliniq`, `cliniq_testing`, `cliniq\_check\_%` (read through `SHOW GRANTS` under `.env.testing`). `cliniq_app`: SELECT, INSERT on `cliniq` and UPDATE, DELETE on its 47 tables (none on `audit_logs`), **no rights on `cliniq_testing`**. Root has a password, so the grants are Zean's to run (ONLY YOU CAN DO 1).

## ANSWERS AND DECISIONS

- **Before 12:26 PHT. Branch.** `feat/connect-frontend` is not merged into `backend`. Zean: continue on this branch (no new branch).
- **Before 12:26 PHT. Database server.** Zean stopped `MySQL97` and started XAMPP MySQL and Apache.
- **Before 12:26 PHT. Grants for `cliniq_app` on `cliniq_testing`.** Zean: "Later" (asked again before the measurements). `backend/tools/load/app-grants.php <database>` prints the 48 statements; the output for `cliniq_testing` is `backend/storage/load/grants-cliniq_testing.sql` (git-ignored, `/storage/load` added to `backend/.gitignore`).

- **Timestamps.** Entries from here on are read from the clock (PowerShell `Get-Date`) when written. Several hours passed during one open pop-up (12:29 to about 21:45 PHT), so times jump.
- **12:28 PHT. 1.1 holiday source.** `git ls-tree origin/main` lists `frontend/src/lib/mock-db/holidays-ph.json` (blob `b0a4544`). The default in `backend/config/cliniq.php` now points at `raw.githubusercontent.com/zekuuu/cliniq/main/...`; `CLINIQ_HOLIDAY_SOURCE_URL` still overrides it and an empty value still turns the sync off. The old handle appears nowhere else in the tracked files (repository-wide search, `.env*` excluded). `backend/.env.example` was not opened (rule): check it yourself (ONLY YOU CAN DO 3). The git remote `origin` still reads `https://github.com/xKurty06/cliniq.git`; GitHub redirects a renamed account, so it works, but you may want `git remote set-url origin https://github.com/zekuuu/cliniq.git`. The sync code (`CalendarService::sync`) catches every failure, records a `failed` row in `holiday_sync_runs` and returns a message, never throws; the command exits 0. A test already covered an HTTP 500; a new test covers an unreachable host (`ConnectionException`) and an empty URL: both recorded as failed, the command succeeds, and the feed answers with no holidays and `lastUpdated` null. The misplaced `mysqldump_path` comment in the same config was moved to its line.
- **12:28 PHT. 1.2 holidays in the development data.** `php artisan cliniq:sync-holidays --file=../frontend/src/lib/mock-db/holidays-ph.json` on `cliniq`: "40 holidays loaded.". The file covers 2026-01-01 to 2027-12-31 (40 entries, Proclamations 1006 s. 2025, 1189, 1264 and 1427 s. 2026; Eid'l Fitr and Eid'l Adha of 2027 are not proclaimed yet): renew it before 2028, as the clinic guide says. Browser check (Playwright Chromium, dev servers, `VITE_API_MODE=api`, signed in as `demo.nurse`): the Activity calendar for December 2026 shows Christmas Day and Rizal Day, and the "No holidays loaded" warning is gone.
- **12:29 PHT. 1.3 Frontend Context Brief.** Section 2 of `09-References/Canonical-Documents/CLINIQ_Frontend_Context_Brief.md`: the data-fetching line now says screens import `src/lib/data`, which runs on the mock by default and on the API per module or all at once with `VITE_API_MODE` (dated note, ADR-080); the auth line gains a dated note that the API sign-in is Sanctum's SPA cookie session (ADR-056), not a token, and the new "Your session has ended" line. Numbering and voice kept.
- **1.3 hand-off for the Project Plan and the SRS (the groupmate's, not edited).** A search of `CLINIQ_Project_Plan.md` finds no sentence that calls the data layer mock-only; the `DOC` entry over-stated that part. The SRS is not in the repository. The "two inconsistency logs of November 15" named by the prompt were not found in the repository (searched file names and texts for "inconsisten"), so this list stands on its own. Statements to check in both after the connect run (ADR-080): (1) the frontend now runs on the real Laravel API behind a switch (`VITE_API_MODE`, per-module values), with the mock data layer kept for demos and tests; (2) sign-in is Sanctum's SPA cookie session, not a token (ADR-056; the Plan's revision 2.5 says "until the login token expires"); (3) after the 7-day maximum the Login screen says "Your session has ended. Sign in again."; (4) on the Visit and Incident Logs an LRN search matches the last 4 digits of the masked LRN; (5) a printout carries the full LRN only through the Print button, Ctrl+P prints the masked copy (ADR-044 kept for the button); (6) a student with no recorded sex shows "Not recorded" and counts as incomplete (contract G4), and the Monthly report counts such visits as students.
- **21:49 PHT. 1.4 `Student.sex` can be null.** Asked in the pop-up: widening the type also widens the mock's `StudentInput` (`Pick<Student, … 'sex' …>`), which then no longer fits `SeedStudent.sex?: StudentSex`. Zean: "Allow one type-only line" (answered at about 21:45 PHT). Changes: `Student.sex` is `StudentSex | null` (`src/types/entities.ts`); `src/lib/mock-db/types.ts` `SeedStudent.sex?: StudentSex | null` (type only: no data, function or behaviour change; `toStudent` still fills in female); the student edit form starts with no choice for a null sex (`StudentFormPage.tsx`). The compiler found only those and one test. A search of every `sex` read found: the student list and the incomplete queue carry no sex (`StudentListRow` has none); the visit and incident screens show none; the profile and its Student Health Record printout already use `sexLabel` ("Not recorded"). **Defect found and fixed:** the Monthly report's "No sex recorded" row put every such visit under Staff (`parts: { students: 0, staff: n }`), true in the mock but wrong on the API, where `personnel.sex` is NOT NULL and only a student can lack a sex. The API now also sends `noSexRecordedParts: { students, staff }` (additive, `MonthlyReportService`; contract note); the row uses it when present and keeps the old reading for the mock. Tests: backend +1 (a no-sex student visit counts as a student); frontend +4 (`StudentSexNotRecorded.test.tsx`: profile and printout "Not recorded", edit form with no choice, list rows without the field, the Monthly row with and without the split). Mock mode unchanged.
- **22:10 PHT. 1.5 The flaky test.** `InventoryPanelReview.test.tsx`, "asks on the form before saving a blank expiry". Cause: the test typed about 40 characters one keystroke at a time (`user.type`), and each keystroke re-renders the whole Add Item form (the duplicate-name check, the unit suggestions); every click costs about 60 ms on that form too (timed step by step in a temporary copy, deleted). Fix: one `user.paste` per field after a click (still `userEvent`, the same input events React's `onChange` reads); the timeout is not raised and the assertions are unchanged. **Before:** 1,329 / 1,410 / 1,615 ms alone; under load (three full suites running in a second process) 1,629 to 3,412 ms, 10 of 10 passed. **After:** 30 runs in a row, 984 to 1,183 ms, 30 of 30 passed; under the same load 1,110 to 2,283 ms, 10 of 10 passed. The under-load runs of the original and the fix alternated in the same loop. The 5 s timeout seen on November 15 was a full suite at its busiest; the fix cuts about a third off the worst case.
- **22:10 PHT. Job 1 gates.** Backend `composer check`: Pint, Larastan, **231 passed** (229 + 2). Frontend: lint 0 errors (the 1 old warning), `tsc -b` passes, `npm test` **146 files, 1250 passed**, `npm run build` passes. Run before Job 2 starts, as the prompt says.

## JOB 2 PLAN (written Monday, November 16, 2026 — 22:14 PHT, before any load code)

**Anchor.** Today (the real clock) is the end of the history. The school year runs June 15 to April 14 (the product defaults). The current year is 2026–2027, started Monday 2026-06-15.

**Two sizes, one command** (`--years=N`): N school years, the current one up to today and the N−1 before it, each ended.
- `--years=1`: 2026–2027 only, June 15 to today.
- `--years=5`: 2022–2023, 2023–2024, 2024–2025 and 2025–2026 (ended), plus 2026–2027. The worst case of the prompt: the current year and four ended.

**School days.** Weekdays from June 15 to April 14, less the Christmas break (December 18 to January 4), less the nationwide holidays where the bundled list covers them (2026–2027), less about 20 no-class days a year (exam and event days, from the fixed seed), giving about 180 a year. The current year to today has about 100.

**Students.** 900 on each year's list: 13 grade levels (Kinder to Grade 12, from `grade_levels`), 69 or 70 a grade, two sections per grade (fictional section names), so about 35 a section.
- Each year's list goes in through the real import endpoints (`POST /api/students/import/preview` and `/import`), with the clock set to June 15 of that year. A later year's list promotes everyone one grade. Grade 12 graduates (about 69) and leavers drop off it and are archived by that import (ticked, the real flow); about 69 new Kinder pupils come in.
- Mid-year: about 6 transfers out a year are archived through the service ("Transferred"); about 6 transfers in are added through the service.
- **Archived at five years:** 4 year-end lists × 69 graduates = 276, plus 5 years × 6 mid-year transfers = 30, **about 306** (the prompt's "about 375" assumed five year-ends; this window holds four). At one year: about 6.
- **No sex recorded, about 3% (27):** their rows carry a blank sex, so the import flags them (it must: "Sex must be Male or Female"), and the nurse then adds them by hand through the service with no sex, as the API allows (contract G4). This also tests "an invalid row does not stop the good ones".
- **Incomplete, about 1.5% (14):** every imported student opens incomplete (no emergency contact yet, by design); the nurse completes 98.5% through the service in the first weeks; about 14 stay incomplete, plus the 27 with no sex.
- Name cases: ñ, accents, apostrophes, hyphens, names at the 50-character limit, shared guardian surnames (siblings), 3 same-name pairs and 3 same-birthday pairs (duplicate warnings).
- **LRNs:** the reserved range `999900000001` to `999900999999` (12 digits, passes `Lrn::isLrn`). The check in step 4 refuses any LRN outside it.

**Staff patients (personnel).** 60 active and 5 archived, through the staff import endpoints (`/api/personnel/import/preview` and `/import`) with the clock at the first year's start. One extra run with 150.

**Accounts** (through `UserService`, passwords set through `AuthService::setPassword` so no forced change): `load.principal` (Admin), `load.nurse` (the clinician), `load.cover1` to `load.cover3` (Staff covering), `load.former` (Staff, deactivated), and `load.bench01` to `load.bench20` (Staff, for the measurements: each person has their own 120 requests a minute). **Test passwords, for the test database only, never reused:** every `load.*` account uses `Load-Test-Only-2026`.

**Visits.** About 25 students and 3 staff a school day: about 4,500 + 540 a full year, **about 23,000 at five years** (4 × 5,040 + about 2,800 this year). Skewed: about 20% of students make about 60% of the visits. Clusters: a cough-and-colds week each October and a three-day fever outbreak each February (the Dashboard alerts should fire). Complaints from the 12 visit types (plus a few free-text ones); temperature on most; a medicine or supply on about 40% (stock moves through the service); dispositions about 60% back to class, 15% resting, 22% sent home, 3% referred; an excuse letter on about 30% of student visits (only Sent home and Referred may have one), most approved the next school day; follow-ups on about 8% (done, missed through the nightly job's rule, cancelled, open, and a few overdue); about 1% entered in error.

**Incidents.** About 150 a year through `IncidentService`: Stage 1 for all, Stage 2 for about 90% (with parent calls, some referrals), approved by the Admin for about 80% of those; about 10% involve staff.

**Inventory.** 60 items (medicines and supplies, with "commonly used for" tags) through `InventoryService`; restocked through the service when usable stock falls under twice the threshold, each restock a new batch with its expiry; stock is whatever the dispensing leaves (never typed). At the end: a low-stock group, an expiring-soon group and an expired, undisposed group (from the restock expiries chosen by the seed).

**Audit log.** From the services, plus a sign-in and sign-out of the nurse each school day, about 15 record views and about 1 print a day through the audit logger the controllers use. Size reported per year. `--audit=100000` pads it with views to a 100,000-row ceiling.

**Others.** About 30 calendar events a year (`CalendarService`), the bundled holiday list (`CalendarService::sync` from the file), about 5 issue reports a year (through the endpoint), 2 backup locations (`BackupService`), a backup run row per school day (**direct insert, labelled**: running `mysqldump` 900 times is not the point), the nightly follow-up job's effect (`FollowUpService::closeMissed` each night, as the scheduler).

**Determinism.** One fixed seed (`mt_srand(20261116)`) for every choice; the clock set to each record's time (`Carbon::setTestNow`) as the development seeder does; today used only as the anchor.

**Budgets** (proposed by the prompt; used unless Zean changes them):

| Measure | Budget on this machine |
|---|---|
| Common screen's API answer (list, search, detail), p95 | 300 ms |
| Dashboard, reports, calendar, p95 | 1.5 s |
| Import preview of 900 rows | 15 s |
| A backup run (dump and zip) | 60 s |
| End of a school year (archive 900 students), in one transaction | 60 s |
| First page load, CPU slowed 4x | 3 s |
| Typing in a search box with the largest list | no stall over 100 ms |
| Memory of one PHP request | under 128 MB |

**Found while planning (to measure, not yet a defect):** `VisitService::complaint()` reads `SELECT DISTINCT complaint FROM visits` on every visit save and every extra complaint, a cost that grows with the history. **Ending a school year archives nobody**: archiving happens at the next yearly import (students missing from the new list, ticked) or one by one. The "archive 900 students" scenario is therefore measured as an import that archives the whole missing list in one transaction. **The imports are Staff-only routes**, so they are driven as `load.nurse`, not as the Admin.

- **Before 22:35 PHT (one pop-up, not clocked to the minute). Grants.** Zean ran the 48 GRANT lines as root: `cliniq_app` now has SELECT, INSERT on `cliniq_testing` and UPDATE, DELETE on its 47 tables (none on `audit_logs`).
- **22:35 PHT. DEFECT D1, found by the stock parity check, fixed with Zean's word (same pop-up).** A new inventory item got its first batch but no `opening` ledger row, against the ERD ("Starting stock for a new item: an `opening` ledger row, so the ledger always sums to the stock"); every item on every database had none. Zean: "Fix backend + frontend label". `InventoryService::save` now writes the `opening` row and its batch allocation in the same transaction (no extra audit row: the item's create is audited); the Item History and the stock panel say "Opening stock" (a local `isOpening` check, so the mock's `InventoryTransactionType` is not edited); contract note. Tests: backend `InventoryTest` (one assertion block added, one expectation widened), frontend `InventoryOpeningRow.test.tsx` (+1). Items created before the fix keep no opening row (no backfill; the development database `cliniq` has 60 such items).
- **22:35 PHT. Pest without emptying the load data.** `cliniq_migrate` has every right on `cliniq\_check\_%`, so the backend tests ran against a scratch database: `DB_DATABASE=cliniq_check_pest` (created once; RefreshDatabase empties it, not `cliniq_testing`). **231 passed**, Pint and Larastan pass, and the loaded data was still there afterwards. This removes "the one trap" for the rest of the run; the final gate still runs `composer check` on `cliniq_testing` as the prompt asks.
- **23:00 PHT. Generator built (Job 2, steps 1 to 4).** Files: `backend/tools/load/build.php` (the one command), `Generator.php` (the school), `checks.php` (step 4, runs alone too), `app-grants.php`. **Deviation from the prompt:** the generator lives in `backend/tools/load/`, not as a seeder class in `app/Shared/Database/`: it is development-only code, so it stays out of the shipped `app/` and out of Larastan level max; nothing in the application depends on it. The yearly lists, the staff list, the school-year start and end and the issue reports go through the real routes in-process (routing, middleware, validation, controller; the Pest tests' `actingAs` path) with the clock set; every other record through its owner service. Labelled shortcuts: the daily backup rows are inserted directly; `--audit=N` pads with View events through `AuditLogger`.
- **23:00 PHT. One-year build** (`php tools/load/build.php --students=900 --staff=60 --years=1`): **63 s, 48 MB peak**. 899 active students (873 imported; 27 flagged by the import for a blank sex and added by hand without one; transfers in and out), 5 archived, 36 incomplete reviews open; 65 staff (60 active, 5 archived); 2,819 visits; 78 incidents (59 approved); 517 excuse-letter numbers; 60 items, 77 batches, 1,187 movements; 8,039 audit rows; 26 accounts. **All 12 checks pass**: foreign keys (composite ones joined on every column), the stock ledger chain and parity, batch allocations, the opening rows, EL- and IR- unique and gapless per year, Staff No. gapless, no orphan in the audit log, every LRN in 999900000001 to 999900999999, no surname shared with the project's real people (read from the Project Plan and the mock's non-demo account at run time, never printed; it caught one shared surname in the generator's pool, now replaced). Generated files: `backend/storage/load/students-2026.csv`, `staff-60.csv` (git-ignored, the Import screen's CSV format).
- **23:00 PHT. PAUSED at Zean's word** ("pause for now, then send me what to do"), before step 5 (Apache on 8081). Nothing is half-done: the one-year dataset is loaded and checked on `cliniq_testing`.
- **Tuesday, November 17, 2026 — 05:18 PHT. Resumed ("continue").** Zean had added the 8081 virtual host: Apache listens on `127.0.0.1:8081` and `/api/health` answers 200. `backend/tools/load/bench.php` written (journey and crowd modes, real sign-in, sessions kept in `storage/load/sessions/`, results to `storage/load/results.jsonl`); **not run yet**. Which database 8081 reads is not yet confirmed.
- **05:20 PHT. PAUSED again at Zean's word ("wait pause for now, we need to update the docs").** Docs brought up to date: session log `2026-11-17-backend-load-generator-and-opening-ledger.md`, rows in both changelogs, D1 in `Backend-Issues-and-TODOs.md` (Done, recounted 20 to 21), `backend/tools/load/README.md`, a pointer in `backend/README.md`, a dated "Performance and load" section in `05-Testing/Test-Strategy.md` (method and budgets; figures after the run). The Facts sheet's test counts stay as they are until the final gate: `docs:facts --tests` runs `composer test`, which would empty the load database.

## NEEDS YOUR CALL

## BLOCKED

## ONLY YOU CAN DO

1. ~~Grants for the app account on the test database~~ (done by Zean).
2. **After the run:** stop XAMPP MySQL and `Start-Service MySQL97` if you want MySQL 9.7 back.
3. **Check `backend/.env.example`** for the old `xKurty06` holiday URL (not opened by the agent) and, if you like, `git remote set-url origin https://github.com/zekuuu/cliniq.git`.
4. **To resume (step 5), Apache on 127.0.0.1:8081:** append `D:\zeank\Desktop\Projects\cliniq\backend\storage\load\vhost-8081.conf` to the end of `C:\xampp\apache\conf\extra\httpd-vhosts.conf` (no active lines there now) and restart Apache. Undo: delete those lines and restart. Port 80 is not changed.

## FOLLOW-UPS
