# Test Strategy

- **Backend:** Pest (Laravel's modern default test framework). Feature tests drive the HTTP layer: one file per module (sign-in, students, staff patients, imports, school years, the Archive, visits, follow-ups, incidents, inventory, the Dashboard and reports, accounts and backups), plus routes, CORS, the error envelope, the session and idle middleware and logging. `tests/Feature/Audit/AccessAndRecordsTest.php` checks every route's access and that nothing is deleted; `tests/Feature/Flows/ClinicFlowsTest.php` walks nine whole clinic flows. Unit tests cover the shared helpers and the audit contract. The tests run against the MariaDB test database `cliniq_testing`, never `cliniq`, with the account in `.env.testing`. The schema's own rules are proven separately: `php tools/db-checks.php` builds scratch databases (`cliniq_check_ref`, `cliniq_check_mig`), checks the migrations against `Reference-Schema.sql` and runs the constraint tests in `02-Architecture/Database/Checks/` (see `04-Development/Backend-Loop-Engineering.md`). `composer check` runs Pint, Larastan and Pest together.
- **Documentation:** `npm run docs:check` from the repository root (links, anchors, numbers against the Facts sheet, removed features); `npm run docs:trace -- --check` (requirement traceability).
- **Frontend:** Vitest + React Testing Library.
- Test what applies to the change being made — this isn't a full test-everything mandate at this stage, but new logic (especially the stock-flow decrement/threshold logic, the two-stage incident flow, and Follow-Up status transitions) should get coverage given how easy off-by-one and state-transition bugs are to introduce there.

## Performance and load

*Added Tuesday, November 17, 2026 — 05:20 PHT (load run, [`08-Logs/Load-Test-Nov16/`](../08-Logs/Load-Test-Nov16/NOTES.md)); the measured figures and the pass or fail per budget come with that run's report.*

- **The data:** `php tools/load/build.php --students=900 --staff=60 --years=1` (or `--years=5`, `--audit=100000`) from `backend/` builds a fictional school deterministically on `cliniq_testing` through the services and the real import and school-year routes; `php tools/load/checks.php` proves it sound (foreign keys, the stock ledger, gapless reference numbers, the reserved LRN range). How-to: [`backend/tools/load/README.md`](https://github.com/zekuuu/cliniq/blob/759781e/backend/tools/load/README.md).
- **Where it is measured:** Apache with PHP, as on the clinic PC (a second virtual host on `127.0.0.1:8081`), never `php artisan serve`; as the least-privilege account `cliniq_app`; every number read next to the machine line in the run notes.
- **With what:** `php tools/load/bench.php` (plain PHP and curl, so it runs on the clinic PC too): a nurse's journey screen by screen, and a crowd of 5 and 10 people with and without pauses. It signs in for real and never weakens a limit (120 requests a minute per person, 10 sign-ins a minute per address).
- **Budgets (proposed, on Zean's machine):** a common screen's API answer at p95 300 ms; Dashboard, reports and calendar 1.5 s; a 900-row import preview 15 s; a backup 60 s; archiving 900 students 60 s in one transaction; first page load with the CPU slowed 4x 3 s; no typing stall over 100 ms; one PHP request under 128 MB.
- **Rerun:** build, check, then the bench commands of the tools README. `composer test` empties `cliniq_testing`; rebuild afterwards.

Bugs found and fixed get logged in `08-Logs/Frontend-Issues-and-TODOs.md` and referenced from the relevant `08-Logs/Agent-Sessions/` entry, not tracked separately.
