# backend

> ⚠️ **If this folder is empty/skeleton-only, that's expected — this is what a chat-generated zip export produces before any real backend code exists.** If you're copying a zip export into your actual project folder, never let this folder overwrite a `backend/` that already has real code in it — that would destroy working code. See `AGENTS.md`, "Before you start any task," Step 0a, for the full rule.

Laravel API backend. Not yet scaffolded — `composer create-project laravel/laravel .` will generate the standard `app/`, `database/`, `routes/`, `config/` structure here once environment setup is approved and executed (CLINIQ-Knowledge-Base/04-Development/Environment-Setup.md).

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

A plain PSR-4 mapping in `composer.json` (`"App\\Modules\\": "app/Modules/"`) is all this needs — no `nwidart/laravel-modules` package, deliberately (see the ADR for why).

Mapped to what's already designed:
- Entity shapes (Student, User, Visit, Incident, FollowUp, InventoryItem, AuditLogEntry, etc.) — Frontend Context Brief, Section 5, has the authoritative shapes to match; land the `Models/` for each in its owning module's folder
- Controllers — one per feature, inside `app/Modules/<Module>/Controllers/`, mirroring `frontend/src/features/`
- `database/migrations/` — schema, only after team approval of the [proposed ERD](../CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md); the draft is not final or approved, so do not build migrations from it yet
- `routes/api.php` — all API routes, consumed by the frontend's `src/features/*/api/` folders
- Auth via Sanctum (CLINIQ-Knowledge-Base/06-Decisions/ADR-007-Stack-Finalization.md)
