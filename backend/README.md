# backend

Last checked against the code on Sunday, November 1, 2026 — 02:44 PHT (uncommitted, on top of `f33fd71d`).

## Purpose

The Laravel API for CLINIQ, with Sanctum for sign-in (ADR-007, ADR-056) and MariaDB (XAMPP) for the database.

## Current state

**The foundation only.** Laravel 13.39 with Sanctum in SPA cookie mode, the modular folders, configuration, CORS, middleware, one error format, the audit contract, shared helpers and tests. The only routes are `GET /api/health` and `GET /sanctum/csrf-cookie`. There are no tables, migrations, seeders, factories or models yet, so nothing can sign in. Nothing is connected to the frontend (ADR-056). The ERD is approved (ADR-057), so phase B1 builds the migrations next.

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
├── Modules/<Module>/{Controllers,Models,Requests,Services}/
│     UserManagement, StudentRecords, ClinicVisits, EmergencyResponse, FirstAidChecklist,
│     StaffPatients, InventoryTracker, Dashboard, ReportsGeneration, BackupVerification, AuditLogViewer
└── Shared/
    ├── AuditLog/    the logger interface, the event, its names, an in-memory logger until B3
    ├── Auth/        ClinicUser, what middleware needs from a signed-in user
    ├── Http/        error envelope, BusinessRuleViolation, ApiError, middleware, health
    ├── Logging/     keeps data out of the log files
    ├── Support/     Lrn, Age, ClinicTime
    └── Settings, Sequences, FollowUps, Feedback    empty until their phase
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

`APP_ENV=production`, `APP_DEBUG=false`, a generated `APP_KEY` that is never committed, `SESSION_SECURE_COOKIE=true` once HTTPS exists (ADR-057), and the clinic's LAN address in the two lists above and in `SESSION_DOMAIN`.

## If you are copying a zip export

If this folder is empty or skeleton-only in a chat-generated zip export, that is expected: exports are made without real backend code. If you're copying a zip export into your actual project folder, never let this folder overwrite a `backend/` that already has real code in it — that would destroy working code. See `AGENTS.md`, "Before you start any task," Step 0a, for the full rule.
