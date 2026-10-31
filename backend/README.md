# backend

Last checked against the code on Saturday, October 31, 2026 (commit 9b4861db).

## Purpose

The planned Laravel API for CLINIQ, with Sanctum for sign-in (ADR-007) and MariaDB (XAMPP), MySQL-compatible, for the database.

## Current state

**Not started.** This folder holds only this README and an `.env.example`. All backend work happens on a branch called `backend`, changes only this folder, and connects nothing to the frontend yet (ADR-056). `composer create-project laravel/laravel .` will generate the standard `app/`, `database/`, `routes/`, `config/` structure here once environment setup is approved and executed (CLINIQ-Knowledge-Base/04-Development/Environment-Setup.md). The database design is a proposed draft awaiting team approval, so no migrations exist.

## Planned structure

**Code organization is modular, mirroring the frontend directly** — see `CLINIQ-Knowledge-Base/06-Decisions/ADR-009-Modular-Backend-Architecture.md`. Once scaffolded, code doesn't go into Laravel's default flat `app/Models/`/`app/Http/Controllers/` — it goes into:

```
app/
├── Modules/
│   ├── StudentRecords/{Controllers,Models,Requests,Services}/
│   ├── ClinicVisits/
│   ├── EmergencyResponse/
│   ├── InventoryTracker/
│   ├── Dashboard/
│   ├── ReportsGeneration/
│   ├── UserManagement/
│   └── BackupVerification/
└── Shared/
    └── AuditLog/            ← cross-cutting, every module writes here
```

This is ADR-009's list. The proposed ERD adds the first-aid checklist and Audit Log Viewer modules (ERD rule M-1); the staff patients of ADR-043 have no module in the list yet.

A plain PSR-4 mapping in `composer.json` (`"App\\Modules\\": "app/Modules/"`) is all this needs — no `nwidart/laravel-modules` package, deliberately (see the ADR for why).

Mapped to what's already designed:
- Entity shapes (Student, User, Visit, Incident, FollowUp, InventoryItem, AuditLogEntry, etc.) — Frontend Context Brief, Section 5, has the authoritative shapes to match; land the `Models/` for each in its owning module's folder
- Controllers — one per feature, inside `app/Modules/<Module>/Controllers/`, mirroring `frontend/src/features/`
- `database/migrations/` — schema, only after team approval of the [proposed ERD](../CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md); the draft is not final or approved, so do not build migrations from it yet
- `routes/api.php` — all API routes, consumed by the frontend's `src/features/*/api/` folders
- Auth via Sanctum (CLINIQ-Knowledge-Base/06-Decisions/ADR-007-Stack-Finalization.md), in SPA cookie mode (ADR-056)

## If you are copying a zip export

If this folder is empty or skeleton-only in a chat-generated zip export, that is expected: exports are made without real backend code. If you're copying a zip export into your actual project folder, never let this folder overwrite a `backend/` that already has real code in it — that would destroy working code. See `AGENTS.md`, "Before you start any task," Step 0a, for the full rule.
