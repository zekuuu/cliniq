# backend

Last checked against the code on Sunday, November 22, 2026 — 00:52 PHT for the docs sync of `main` at `b9fd646` (ADR-084, the realistic five-year demo school to February 28, 2027); on Friday, November 20, 2026 — 01:54 PHT for the docs sync of `main` at `533df61` (ADR-082, ADR-083, the emergency-contact check, the demo seeder) and the Overview's frequent-visitor pager; on Thursday, November 19, 2026 for the paged lists and the speed run only (ADR-082); on Wednesday, November 18, 2026 for where the code lives only (the merge into `main`, ADR-081); on Tuesday, November 17, 2026 for the changes of the follow-ups and load run (`feat/connect-frontend` at `759781e`, committed Tuesday, November 17, 2026 — 05:27 PHT; see `08-Logs/Load-Test-Nov16/NOTES.md`); otherwise as on Sunday, November 15, 2026 (the `backend` branch at `397e000`). This code is on `main` since Wednesday, November 18, 2026 (ADR-081); before that it lived on the `backend` branch (ADR-056). Numbers: [Facts sheet](../CLINIQ-Knowledge-Base/00-Project-Core/Facts-Sheet.md).

## Purpose

The Laravel API for CLINIQ, with Sanctum for sign-in (ADR-007, ADR-056) and MariaDB (XAMPP) for the database.

## Current state

**B0 to B10 built and audited; the frontend can call it behind a mock/API switch (ADR-080).** Laravel 13.42 with Sanctum in SPA cookie mode. 133 routes: every endpoint of `API-Contract.md`, plus the health check and Sanctum's CSRF cookie. `composer check`: Pest 255 passed (1,648 assertions) and Pint passes (Saturday, November 21, 2026, on `cliniq_check_pest`, `08-Logs/Agent-Sessions/2026-11-21-backend-realistic-demo-school.md`; 251 on Thursday, November 19, 2026; first 231 on Monday, November 16, 2026). Larastan now fails on one pre-existing line, `BackupService.php:171`, logged as a FIX in `Backend-Issues-and-TODOs.md`. The 48 table migrations match `Reference-Schema.sql` (`php tools/db-checks.php`: parity plus the 260 constraint tests, all pass); two more migrations ship product data (the default settings, and the symptom lists with their first-aid steps). `tests/Feature/HealthAndRoutesTest.php` fails on any undocumented route; `tests/Feature/Audit/AccessAndRecordsTest.php` checks sign-in, both session checks and a role on every route. Counts: [Facts sheet](../CLINIQ-Knowledge-Base/00-Project-Core/Facts-Sheet.md).

## Modules and what each exposes

| Module | Endpoints (under `/api`) | Phase |
|---|---|---|
| `UserManagement` | sign-in, sign-out, `me`, password change, password recovery and the authenticator app (`auth/*`); own profile; accounts (`users`) | B2, B10 |
| `StudentRecords` | students (list, search, duplicate check, save, archive, import, incomplete queue); school years started and ended by hand; the Archive page (`archive/*`) | B4 |
| `StaffPatients` | staff patients (`personnel`: list, search, save, archive, import, incomplete queue); the one patient search box (`patients/*`) | B4 |
| `ClinicVisits` | visits, excuse letters, PE referrals, a student's excuse letters | B5 |
| `EmergencyResponse` | incidents in two stages, parent calls, approval and trail; a student's or staff patient's history | B7 |
| `InventoryTracker` | items, batches, history, movements, Dispense, Restock, Adjust; the stock service that visits and incidents call | B5, B8 |
| `Dashboard` | summary, cluster alerts, the activity calendar (events, holidays, days) | B9 |
| `ReportsGeneration` | monthly reports (Staff and Admin), the latest month, Sports Reports | B9 |
| `BackupVerification` | backup status, Back up now, verify latest, locations and the folder picker | B10 |
| `FirstAidChecklist` | no routes; holds the first-aid tables' migrations | B1 |
| `AuditLogViewer` | no code; the Audit Log API lives in `Shared/AuditLog` | B3 |
| `Shared/AuditLog` | `audit-log` (read, paged), `audit/views`, `audit/prints` | B3 |
| `Shared/FollowUps` | follow-ups list and update | B5 |
| `Shared/Settings` | idle sign-out settings; the reference lists (`reference/*`) | B2, B10 |
| `Shared/Feedback` | issue reports | B10 |
| `Shared/Http` | `health`, `session/keepalive` | B0 |

## Scheduled jobs and console commands

`routes/console.php` schedules three jobs: `cliniq:close-missed-follow-ups` (daily, 00:15), `cliniq:backup` (daily, 18:00, while the clinic PC is still on) and `cliniq:sync-holidays` (hourly from 7:00 to 18:00; it fetches only when the last good sync is 30 or more days old, so a day without internet simply tries again later). On the clinic PC, Windows Task Scheduler must run `php artisan schedule:run` every minute. A backup also runs after each sign-out when a backup location is enabled (ADR-037, ADR-052); the sign-out does not wait for it. The holiday source is `CLINIQ_HOLIDAY_SOURCE_URL` (default: the repo's `holidays-ph.json` on GitHub); `php artisan cliniq:sync-holidays --file=path\to\holidays-ph.json` imports a copy offline, and `--force` fetches now.

Two commands are run by hand: `php artisan cliniq:create-admin <username>` creates the first Admin on a new install, and `php artisan cliniq:reset-admin-password` is the break-glass reset when no Admin can sign in ([Environment Setup](../CLINIQ-Knowledge-Base/04-Development/Environment-Setup.md)).

## Install, configure and migrate

On Windows with XAMPP. The full steps, with reasons, are in [Environment Setup](../CLINIQ-Knowledge-Base/04-Development/Environment-Setup.md).

1. Set up PHP and harden MariaDB once (Environment Setup, "Set up a machine" and "MariaDB hardening"): a root password, `bind-address=127.0.0.1`, the `cliniq` database and two accounts, `cliniq_app` (data only) and `cliniq_migrate`, the separate migration account with schema rights on `cliniq`, `cliniq_testing` and the `cliniq_check_%` scratch databases. `cliniq_app` keeps only `SELECT` and `INSERT` on `audit_logs`.
2. `composer install`.
3. Copy `.env.example` to `.env`, fill in the database account and run `php artisan key:generate` once. Never commit `.env`, and never regenerate the key on the clinic PC once accounts exist (it breaks every authenticator).
4. `php artisan migrate` with `cliniq_migrate`, then switch `.env` back to `cliniq_app`.
5. Optional, development only: `php artisan db:seed --class="App\Shared\Database\DevelopmentSeeder"` on a freshly migrated, empty database loads the frontend's fictional mock seed (`frontend/src/lib/mock-db/mock-db.json`) through the services (313 records on Sunday, November 15, 2026). It refuses production and a database that already has data. `cliniq_app` cannot run `migrate:fresh` (it has no DROP on `audit_logs`, by design), so migrate a fresh development database with `cliniq_migrate` first. The symptom lists and first-aid steps ship with the migrations (`insert_complaint_types`).
   Or the larger fictional demo school (900+ students, 60 staff, five school years up to February 28, 2027, realistic by rule; added Wednesday, November 18, 2026 — 21:55 PHT, end date and realism Saturday, November 21, 2026 — 18:36 PHT; rows after the real date are demo data, so do user-acceptance writes on a copy): `php artisan migrate:fresh --seeder="App\Shared\Database\DemoSchoolSeeder" --env=testing --force`, on `cliniq_testing` (or `DB_DATABASE=cliniq_load` or a `cliniq_check_*` scratch database). About 5.5 min. It refuses production, `cliniq`, other databases and a database that is not freshly migrated and empty. Options and details: [`tools/load/README.md`](tools/load/README.md).
6. `php artisan serve` starts the API at `http://127.0.0.1:8000`; `GET /api/health` answers `{"data":{"status":"ok"}}`.

Settings: the session limit, lock-out and idle defaults are in `config/cliniq.php` (7 days; 5 wrong passwords lock for 5 minutes; Staff 60 and Admin 30 idle minutes, overridable with `CLINIQ_IDLE_SIGNOUT_MINUTES_STAFF` and `CLINIQ_IDLE_SIGNOUT_MINUTES_ADMIN`, then stored in `system_settings`).

## Run the checks

Use XAMPP's PHP (`C:\xampp\php\php.exe`) with the `zip` extension enabled (backups are `.zip`, ADR-052). The tests need MariaDB running and the test database `cliniq_testing`.

```bash
composer test      # Pest
composer lint      # Pint, read-only (run vendor/bin/pint to fix)
composer analyse   # Larastan at level max
composer check     # all three
composer audit
php artisan route:list
php tools/db-checks.php   # schema parity with Reference-Schema.sql, then the 260 constraint tests
```

Tests read `.env.testing` (the `cliniq_testing` database, migration account) when it exists, else `.env.example`. `db-checks.php` uses the same file and creates, then drops, the scratch databases `cliniq_check_ref` and `cliniq_check_mig`.

**Load testing** (added Tuesday, November 17, 2026 — 05:20 PHT): `tools/load/` builds a fictional 900-student school with up to five years of history in one deterministic command, checks it, and measures the API on Apache. See [`tools/load/README.md`](tools/load/README.md). `composer test` empties `cliniq_testing`, so reseed it afterwards (`php artisan migrate:fresh --seeder="App\Shared\Database\DemoSchoolSeeder" --env=testing --force`) or run Pest with `DB_DATABASE=cliniq_check_pest`. *Update Wednesday, November 18, 2026 — 21:55 PHT:* the school's code is `app/Shared/Database/DemoSchool/` (excluded from Larastan, development only), shared by `DemoSchoolSeeder` and `tools/load/build.php`.

## Structure

```
app/
├── Modules/<Module>/{Controllers,Models,Requests,Services,Database/Migrations}/
│     UserManagement, StudentRecords, ClinicVisits, EmergencyResponse, FirstAidChecklist,
│     StaffPatients, InventoryTracker, Dashboard, ReportsGeneration, BackupVerification, AuditLogViewer
└── Shared/
    ├── AuditLog/    the logger interface, the event, its names, the database logger, the Audit Log API, its migration
    ├── Auth/        ClinicUser, what middleware needs from a signed-in user
    ├── Http/        error envelope, BusinessRuleViolation, ApiError, middleware, paging, health, keep-alive
    ├── Logging/     keeps data out of the log files
    ├── Support/     Lrn, Age, ClinicTime, PersonName, PatientFields, SchoolYears, the start-up check
    ├── Database/    shared tables (school years, grade levels), product data, the development seeder
    ├── Settings/    system settings, idle sign-out settings, the reference lists
    ├── FollowUps/   follow-ups and the daily missed-follow-up job
    ├── Feedback/    issue reports
    └── Sequences/   reference numbers (STF-, EL-, IR-)
```

The module list is ERD rule M-1, which extends ADR-009 (the QR module is gone; the first-aid checklist, staff patients and the audit viewer are added). Controllers and models go in their module, never in `app/Http` or `app/Models`. Plain PSR-4 in `composer.json`, no modules package.

`tests/Feature/HealthAndRoutesTest.php` fails when a route appears that is not on its list. Add a route to that list and to `API-Contract.md` together.

Middleware on every signed-in route: `auth:sanctum`, then `session.fixed` (ends the session 7 days after sign-in, 401 `session_expired`), `session.idle` (each role's idle minutes, ADR-048 and ADR-078; 401 `session_idle`) and `role:staff,admin`. Sign-in stores the sign-in time under `FixedSessionLifetime::KEY` and starts a fresh idle clock.

## What the frontend will one day do

Nothing here is done in the frontend yet.

1. Call `GET /sanctum/csrf-cookie` once before signing in.
2. Send every request with credentials (`credentials: 'include'`).
3. Echo the `XSRF-TOKEN` cookie's value in an `X-XSRF-TOKEN` header on every write.
4. Run from an origin listed in `CORS_ALLOWED_ORIGINS` and `SANCTUM_STATEFUL_DOMAINS`.

## Production notes

The clinic PC only (ADR-079): run `php artisan optimize` after every update and set OPcache, compression and MariaDB's buffer pool as Environment Setup, "Speed and reliability settings for the clinic PC" (ADR-082) says; then `APP_ENV=production`, `APP_DEBUG=false`, a generated `APP_KEY` that is never committed, `APP_URL` and `CORS_ALLOWED_ORIGINS` set to `http://localhost`, `SANCTUM_STATEFUL_DOMAINS=localhost`, `SESSION_DOMAIN` empty and `SESSION_SECURE_COOKIE=false` (plain HTTP on `localhost`; no HTTPS). Details: Environment Setup, "Clinic PC only".

**Start-up check.** Outside the tests the app refuses to start when `SESSION_SECURE_COOKIE` does not match the scheme of `APP_URL` (true only for `https://`), or, outside `APP_ENV=local`, when `APP_DEBUG` is true or `DB_USERNAME` is `root` (`app/Shared/Support/ConfigurationCheck.php`). The idle sign-out minutes live in `system_settings` and are changed from the app; `CLINIQ_IDLE_SIGNOUT_MINUTES_STAFF` and `CLINIQ_IDLE_SIGNOUT_MINUTES_ADMIN` in `.env` are only the config defaults.

## If you are copying a zip export

If this folder is empty or skeleton-only in a chat-generated zip export, that is expected: exports are made without real backend code. If you're copying a zip export into your actual project folder, never let this folder overwrite a `backend/` that already has real code in it — that would destroy working code. See `AGENTS.md`, "Before you start any task," Step 0a, for the full rule.
