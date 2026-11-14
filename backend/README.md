# backend

Last checked against the code on Tuesday, November 10, 2026 (the `backend` branch at `b51166a`). On `main` this folder holds only this README and `.env.example`; the code lives on this `backend` branch (ADR-056). Numbers: [Facts sheet](../CLINIQ-Knowledge-Base/00-Project-Core/Facts-Sheet.md).

## Purpose

The Laravel API for CLINIQ, with Sanctum for sign-in (ADR-007, ADR-056) and MariaDB (XAMPP) for the database.

## Current state

**B0 to B9 built (Phase 1); B10 next.** Laravel 13.39 with Sanctum in SPA cookie mode. The 48 migrations match `Reference-Schema.sql` (`php tools/db-checks.php`: parity plus the 260 constraint tests). Built: the audit trail (B3); sign-in, lockout, password recovery and the own profile (B2); students, staff patients, imports, school years and the Archive (B4); visits, excuse letters, follow-ups and the stock core (B5); incidents and patient history (B7); inventory (B8); the Dashboard, calendar, monthly reports and Sports Reports (B9). Every module's Phase 2 audit comes after B10. Routes: see `routes/api.php`; `tests/Feature/HealthAndRoutesTest.php` fails on any undocumented route. Nothing is connected to the frontend (ADR-056).

**Scheduled jobs.** `routes/console.php` schedules `cliniq:close-missed-follow-ups` (daily, 00:15) and `cliniq:sync-holidays` (hourly from 7:00 to 18:00; it fetches only when the last good sync is 30 or more days old, so a day without internet simply tries again later). On the clinic PC, Windows Task Scheduler must run `php artisan schedule:run` every minute. A backup also runs after each sign-out when a backup location is enabled (ADR-037, ADR-052); the sign-out does not wait for it. The holiday source is `CLINIQ_HOLIDAY_SOURCE_URL` (default: the repo's `holidays-ph.json` on GitHub); `php artisan cliniq:sync-holidays --file=path\to\holidays-ph.json` imports a copy offline, and `--force` fetches now.

## Install, configure and migrate

On Windows with XAMPP. The full steps, with reasons, are in [Environment Setup](../CLINIQ-Knowledge-Base/04-Development/Environment-Setup.md).

1. Set up PHP and harden MariaDB once (Environment Setup, "Set up a machine" and "MariaDB hardening"): a root password, `bind-address=127.0.0.1`, the `cliniq` database and two accounts, `cliniq_app` (data only) and a separate migration account with schema rights. `cliniq_app` keeps only `SELECT` and `INSERT` on `audit_logs`.
2. `composer install`.
3. Copy `.env.example` to `.env`, fill in the database account and run `php artisan key:generate` once. Never commit `.env`, and never regenerate the key on the clinic PC once accounts exist (it breaks every authenticator).
4. `php artisan migrate` with the migration account, then switch `.env` back to `cliniq_app`.
5. Optional, development only: `php artisan db:seed --class="App\Shared\Database\DevelopmentSeeder"` on a freshly migrated, empty database loads the frontend's fictional mock seed (`frontend/src/lib/mock-db/mock-db.json`) through the services. It refuses production and a database that already has data. The symptom lists and first-aid steps ship with the migrations (`insert_complaint_types`).

Settings: the session limit, lock-out and idle defaults are in `config/cliniq.php` (7 days; 5 wrong passwords lock for 5 minutes; Staff 60 and Admin 30 idle minutes, overridable with `CLINIQ_IDLE_SIGNOUT_MINUTES_STAFF` and `CLINIQ_IDLE_SIGNOUT_MINUTES_ADMIN`, then stored in `system_settings`). There are no custom console commands yet.

## Run the checks

Use XAMPP's PHP (`C:\xampp\php\php.exe`). Copy `.env.example` to `.env` and run `php artisan key:generate` to run the app; the tests need neither, a database, or `zip` and `intl`.

```bash
composer test      # Pest
composer lint      # Pint, read-only (run vendor/bin/pint to fix)
composer analyse   # Larastan at level max
composer check     # all three
composer audit
php artisan route:list
php tools/db-checks.php   # B1: schema parity with Reference-Schema.sql, then the 260 constraint tests
```

Tests read `.env.testing` (the `cliniq_testing` database, migration account) when it exists, else `.env.example`. `db-checks.php` uses the same file and creates, then drops, the scratch databases `cliniq_check_ref` and `cliniq_check_mig`.

## Structure

```
app/
├── Modules/<Module>/{Controllers,Models,Requests,Services,Database/Migrations}/
│     UserManagement, StudentRecords, ClinicVisits, EmergencyResponse, FirstAidChecklist,
│     StaffPatients, InventoryTracker, Dashboard, ReportsGeneration, BackupVerification, AuditLogViewer
└── Shared/
    ├── AuditLog/    the logger interface, the event, its names, an in-memory logger until B3, its migration
    ├── Auth/        ClinicUser, what middleware needs from a signed-in user
    ├── Http/        error envelope, BusinessRuleViolation, ApiError, middleware, health
    ├── Logging/     keeps data out of the log files
    ├── Support/     Lrn, Age, ClinicTime
    ├── Database/    shared tables (school years, grade levels)
    └── Settings, Sequences, FollowUps, Feedback    their migrations only, until their phase
```

The module list is ERD rule M-1, which extends ADR-009 (the QR module is gone; the first-aid checklist, staff patients and the audit viewer are added). Controllers and models go in their module, never in `app/Http` or `app/Models`. Plain PSR-4 in `composer.json`, no modules package.

`tests/Feature/HealthAndRoutesTest.php` fails when a route appears that is not on its list. Add a route to that list and to `API-Contract.md` together.

Middleware for later routes: `auth:sanctum`, then `session.fixed` (ends the session 7 days after sign-in, 401 `session_expired`), `session.idle` (each role's idle minutes, ADR-048 and ADR-078; 401 `session_idle`) and `role:staff,admin`. B2 stores the sign-in time at sign-in, under `FixedSessionLifetime::KEY`.

## What the frontend will one day do

Nothing here is done in the frontend yet.

1. Call `GET /sanctum/csrf-cookie` once before signing in.
2. Send every request with credentials (`credentials: 'include'`).
3. Echo the `XSRF-TOKEN` cookie's value in an `X-XSRF-TOKEN` header on every write.
4. Run from an origin listed in `CORS_ALLOWED_ORIGINS` and `SANCTUM_STATEFUL_DOMAINS`.

## Production notes

The clinic PC only (ADR-079): `APP_ENV=production`, `APP_DEBUG=false`, a generated `APP_KEY` that is never committed, `APP_URL` and `CORS_ALLOWED_ORIGINS` set to `http://localhost`, `SANCTUM_STATEFUL_DOMAINS=localhost`, `SESSION_DOMAIN` empty and `SESSION_SECURE_COOKIE=false` (plain HTTP on `localhost`; no HTTPS). Details: Environment Setup, "Clinic PC only".

**Start-up check.** Outside the tests the app refuses to start when `SESSION_SECURE_COOKIE` does not match the scheme of `APP_URL` (true only for `https://`), or, outside `APP_ENV=local`, when `APP_DEBUG` is true or `DB_USERNAME` is `root` (`app/Shared/Support/ConfigurationCheck.php`). The idle sign-out minutes live in `system_settings` and are changed from the app; `CLINIQ_IDLE_SIGNOUT_MINUTES_STAFF` and `CLINIQ_IDLE_SIGNOUT_MINUTES_ADMIN` in `.env` are only the config defaults.

## If you are copying a zip export

If this folder is empty or skeleton-only in a chat-generated zip export, that is expected: exports are made without real backend code. If you're copying a zip export into your actual project folder, never let this folder overwrite a `backend/` that already has real code in it — that would destroy working code. See `AGENTS.md`, "Before you start any task," Step 0a, for the full rule.
