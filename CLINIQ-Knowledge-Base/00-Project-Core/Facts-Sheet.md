# Facts sheet

**Last regenerated:** Tuesday, November 10, 2026 — 06:47 PHT
**From commit:** `d2fefc9` on `docs/sync-readmes`. This branch carries only documentation (knowledge base, READMEs, diagrams); backend application code, migrations, config and tests live on the `backend` branch and are intentionally not merged here. The docs will flow `docs/sync-readmes` → `main` → `backend`, never `backend` → `main`.
**Regenerate with:** `bash CLINIQ-Knowledge-Base/04-Development/tools/facts-sheet.sh`

This is the one place every README, requirement document, diagram caption and future Project Plan / SRS section quotes for a number. If a document disagrees with this sheet, the sheet wins and the document is wrong. If this sheet disagrees with the repository, run the script again — it reads the repository, nothing else.

## Decisions

- ADRs: **79** (ADR-001 to ADR-079; the template is not counted).
- The index is `CLINIQ-Knowledge-Base/06-Decisions/Decisions-Summary.md`; a later dated note at the top of an ADR replaces earlier wording in the same ADR.

## Screens and routes

- Screen inventory: **34** numbered screens in `03-Design/Screen-Inventory.md`, kept in step with `09-References/Canonical-Documents/CLINIQ_Frontend_Context_Brief.md` section 4.
- Router `path="…"` entries in `frontend/src/**/*.tsx`: **19** unique paths (some screens share a route — profile view and edit, new-record and detail — and three internal paths `/fallback`, `/fixed`, `/previous` support back-navigation tests).

## Modules, roles and mock data

- Modules (backend module folders in `backend/app/Modules/`): **12** — AuditLogViewer, BackupVerification, ClinicVisits, Dashboard, EmergencyResponse, FirstAidChecklist, InventoryTracker, ReportsGeneration, StaffPatients, StudentRecords, UserManagement; shared services (`backend/app/Shared/`) cover AuditLog, Auth, Database, Feedback, FollowUps, Http, Logging, Sequences, Settings and Support.
- Roles: **two** — Staff (the School Clinician) and Admin (the Principal, view-only, no print, no health detail; ADR-038 and ADR-077).
- Mock API functions: **132** exports in `frontend/src/lib/mock-db/api.ts`.
- Mock entity types: **37** exports in `frontend/src/lib/mock-db/types.ts`.

## Database

- Tables in `02-Architecture/Database/Reference-Schema.sql` (the approved schema, ADR-057): **48**.
- `CHECK` constraints in the reference schema: **92**.
- `UNIQUE` constraints in the reference schema: **36**.
- Backend migrations on disk under `backend/app/**/Database/Migrations/`: **0** on this branch by design (this is the docs branch, not `backend`); the `backend` branch carries **48** migrations (one per table, built in the overnight B1 run, Sunday / Monday November 8 to 9, 2026), not yet DB-verified against MariaDB — see `08-Logs/Overnight-Run-Nov9/MORNING-REPORT.md`.
- Constraint tests: `02-Architecture/Database/Checks/constraint-tests.sql`, run against a scratch database per `02-Architecture/Database/Checks/README.md`. MariaDB was not available to this run, so the pass count is reported by the person who runs it, not by this sheet.

## API

- API contract: **131** unique method + path entries in `04-Development/API-Contract.md` (count of distinct `GET|POST|PATCH|PUT|DELETE /…` lines).
- Live routes in `backend/routes/api.php` (on the `backend` branch): **2** (`GET health`, `POST session/keepalive`); B1 is DB-only, so no module routes are wired yet. `php artisan route:list` was not available to this run (no vendor install, and `backend/` is not on this docs branch); re-run it after `composer install` on the `backend` branch and add the real count here.

## Tests

- Frontend test files (`frontend/src/**/*.test.*`): **135**. Pass/skip/fail count not run in this session (sandboxed); refresh with `cd frontend && npm run test` and quote the summary line here.
- Backend test files (`backend/tests/**`, excluding `Pest.php` and `TestCase.php`) on this branch: **0** by design; the `backend` branch carries **9**. Pass/skip/fail not run (no vendor install and no `.env` read); refresh with `cd backend && composer test` on the `backend` branch.

## Stack

- Frontend: React **19.2.8**, react-router **7.18.4**, TypeScript **6.0.2**, Vite **8.3.0**, Vitest **5.0.2**, Tailwind **4.3.3** (`frontend/package.json`).
- Backend: PHP **^8.3**, Laravel **^13.17**, Sanctum **^4.3**, Pest **^5.3** (`backend/composer.json`).

## Deployment

- Clinic PC only at `http://localhost`. No LAN, no HTTPS, no other device reaches CLINIQ. The Principal receives the monthly reports as a PDF emailed or handed over separately; the Admin view in CLINIQ exists only for the clinician's workstation (ADR-029, ADR-079).

## Session, lock-out and idle sign-out

- A session ends **7 days** after sign-in, however active the user is (both roles; ADR-015, ADR-057; `backend/config/cliniq.php` `session_days = 7`).
- Lock-out: **5** wrong passwords in a row locks the account for **5 minutes** (ADR-015, tightened Sunday, November 8, 2026; `failed_attempts = 5`, `lock_minutes = 5`).
- Idle sign-out (ADR-048, ADR-078), kept in `system_settings` once B1 reads them, falling back to `.env`:
  - Staff: **60 minutes** (`CLINIQ_IDLE_SIGNOUT_MINUTES_STAFF`, default 60).
  - Admin: **30 minutes** (`CLINIQ_IDLE_SIGNOUT_MINUTES_ADMIN`, default 30).
  - Settable range: **10 to 240 minutes** per role.
- LRN length: **12** digits (ADR-028; `lrn_length = 12`).

## School year

- Runs **June 15 to April 14**. A school year is started and ended by hand on the clinician's Settings page (ADR-070, ADR-072). Archive is per school year.

## What this sheet does not carry

- Lines of code per package, bundle size, and page-load numbers: optional, add once the real hardware deployment produces them.
- Any screenshot or diagram file counts: see Part D's diagram index (`02-Architecture/Database/Diagrams/README.md` once Part D lands).
