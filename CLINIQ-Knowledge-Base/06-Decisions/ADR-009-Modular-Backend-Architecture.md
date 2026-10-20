# ADR-009: Modular Backend Architecture

**Date:** Saturday, September 26, 2026 — actual time not available (no system clock access in this environment)
**Status:** Accepted
**Note (Wednesday, October 21, 2026 — 01:09):** the QR feature this ADR mentions was removed (ADR-027, [2026-10-21-remove-qr-feature](../08-Logs/Agent-Sessions/2026-10-21-remove-qr-feature.md)); the rest of the decision stands.

**Update (Monday, September 28, 2026 — 19:19):** the top-level folder is `backend/`. Paths in this record use that name; the decision itself is unchanged.

## Context
ADR-008 committed the frontend to a feature-based folder structure (`src/features/<module>/`), specifically for scalability and maintainability across ~35 screens and 10 modules. The backend had no equivalent commitment — Development-Phases.md's B0–B10 phases organize *build sequencing* by module, but nothing decided whether that translates into actual code boundaries. Left alone, the default Laravel convention (everything in flat `app/Models/`, `app/Http/Controllers/`) would mean a "modular" project on paper with a monolithic, tightly-coupled backend underneath — the exact gap this ADR closes.

## Decision
Organize backend code by module, mirroring the frontend's structure directly rather than inventing a separate convention:

```
backend/
└── app/
    ├── Modules/
    │   ├── StudentRecords/
    │   │   ├── Controllers/
    │   │   ├── Models/
    │   │   ├── Requests/       (form validation)
    │   │   └── Services/       (business logic — Student Number generation, duplicate detection)
    │   ├── ClinicVisits/
    │   ├── EmergencyResponse/
    │   ├── QrDigitalHealthId/
    │   ├── InventoryTracker/
    │   ├── Dashboard/
    │   ├── ReportsGeneration/
    │   ├── UserManagement/
    │   └── BackupVerification/
    └── Shared/
        ├── AuditLog/            (cross-cutting — every module writes here, per .claude/skills/cliniq-audit-trail/)
        └── ...                  (base Model classes, global middleware, anything genuinely cross-module)
```

Each module folder is self-contained: its own controllers, models, request validation, and service classes. A developer or agent working on Inventory shouldn't need to touch anything inside `StudentRecords/` to do their job, and vice versa.

**Mechanism, not a new dependency:** this is a plain PSR-4 namespace mapping in `composer.json` (`"App\\Modules\\": "app/Modules/"`), which Laravel and Composer support natively — no package like `nwidart/laravel-modules` required. That package was considered and deliberately not chosen: it adds its own service providers, `module.json` manifests, and artisan commands, which is real complexity a 3-person capstone team building one deployment doesn't need. The benefit (enforced module boundaries, easy module-level testing/handoff) is achievable with a folder convention alone.

**Audit Trail stays shared, not per-module** — it's cross-cutting by definition (every module writes to it), so it lives in `app/Shared/AuditLog/` rather than being duplicated or arbitrarily owned by one module. This matches Phase B3 in `Development-Phases.md`, which already sequences it as foundational infrastructure built before the per-module phases.

## Alternatives Considered
- **Default flat Laravel structure** (`app/Models/`, `app/Http/Controllers/` with everything together) — the path of least resistance, and what happens by default if nobody decides otherwise. Rejected because it's exactly the gap this ADR exists to close: modular on paper, monolithic in practice.
- **`nwidart/laravel-modules` package** — a real, popular option for this exact goal. Not chosen for this project specifically due to team size and deployment scope (see Decision above) — worth reconsidering if the team ever grows or the project scope expands significantly.
- **Domain-Driven Design with full bounded contexts** — more rigorous than what's proposed here, but a heavier methodology than a capstone project with a 14-week timeline and a single eventual deployment target needs. The module-folder convention gets most of the practical benefit (loose coupling, independent testability) without DDD's full ceremony.

## Consequences
- Every backend phase in `Development-Phases.md` (B4 onward) now has a concrete home for its code — Phase B4 (Student Records API) means literally building inside `app/Modules/StudentRecords/`, not just "the Student Records feature, organized however."
- `04-Development/Coding-Conventions.md` and `backend/README.md` are updated to reflect this structure so it's discoverable before the first migration or controller gets written.
- This is a real constraint an agent must respect: don't create a new top-level `app/` folder for a module's code, and don't reach into another module's folder to reuse its logic directly — if two modules genuinely need to share logic, it belongs in `app/Shared/`, not copy-pasted or cross-imported.
