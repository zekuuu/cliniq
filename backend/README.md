# backend

Last checked against the code on Tuesday, November 10, 2026 (the `backend` branch at `b51166a`). **On `main` this folder holds only this README and `.env.example`; the code below lives on the `backend` branch (ADR-056).** Numbers: [Facts sheet](../CLINIQ-Knowledge-Base/00-Project-Core/Facts-Sheet.md).

## Purpose

The Laravel API for CLINIQ, with Sanctum for sign-in (ADR-007, ADR-056) and MariaDB (XAMPP) for the database.

## Current state

**The foundation (B0) and the migrations (B1).** Laravel 13.39 with Sanctum in SPA cookie mode, the modular folders, configuration, CORS, middleware, one error format, the audit contract, shared helpers, the 7-day session limit, the per-role idle sign-out (Staff 60, Admin 30 minutes, ADR-078) and its keep-alive, and tests (85 pass). B1 added 48 migrations, one per table of the approved schema (ADR-057), and one service provider per module that loads them; they have **not yet been run against MariaDB**. There are no models, seeders, factories or module endpoints, so nothing can sign in. The routes are `GET /api/health`, `GET /sanctum/csrf-cookie` and `POST /api/session/keepalive`. Nothing is connected to the frontend (ADR-056). Next: verify B1 on MariaDB (see [MORNING-REPORT](../CLINIQ-Knowledge-Base/08-Logs/Overnight-Run-Nov9/MORNING-REPORT.md), "ONLY YOU CAN DO"), then B2.

## Install, configure and migrate

On Windows with XAMPP. The full steps, with reasons, are in [Environment Setup](../CLINIQ-Knowledge-Base/04-Development/Environment-Setup.md).

1. Set up PHP and harden MariaDB once (Environment Setup, "Set up a machine" and "MariaDB hardening"): a root password, `bind-address=127.0.0.1`, the `cliniq` database and two accounts, `cliniq_app` (data only) and a separate migration account with schema rights. `cliniq_app` keeps only `SELECT` and `INSERT` on `audit_logs`.
2. `composer install`.
3. Copy `.env.example` to `.env`, fill in the database account and run `php artisan key:generate` once. Never commit `.env`, and never regenerate the key on the clinic PC once accounts exist (it breaks every authenticator).
4. `php artisan migrate` with the migration account, then switch `.env` back to `cliniq_app`.
5. There is no seeder yet; the sample data lives only in the frontend.

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
```

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

## If you are copying a zip export

If this folder is empty or skeleton-only in a chat-generated zip export, that is expected: exports are made without real backend code. If you're copying a zip export into your actual project folder, never let this folder overwrite a `backend/` that already has real code in it — that would destroy working code. See `AGENTS.md`, "Before you start any task," Step 0a, for the full rule.
