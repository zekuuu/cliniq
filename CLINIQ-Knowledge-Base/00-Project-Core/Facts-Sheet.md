# Facts sheet

**Last regenerated:** Tuesday, November 10, 2026 — 18:39 PHT
**From commit:** `8f70297` on `main`; backend numbers from the `backend` branch at `b51166a` (read through git; `main` holds no backend code, ADR-056)
**Regenerate with:** `npm run docs:facts` from the repository root (add `-- --tests` to rerun both test suites). The script is [`docs-facts.mjs`](../04-Development/tools/docs-facts.mjs).

Every README, requirement document, diagram caption, and the Project Plan and SRS quote their numbers from this sheet. If a document disagrees with this sheet, the document is wrong. If this sheet disagrees with the repository, regenerate it: the script reads the repository and nothing else. Do not edit the numbers by hand.

## Numbers

| Fact | Value | Source |
|---|---|---|
| Decision records (ADRs) | **79** (ADR-001 to ADR-079) | [`06-Decisions/`](../06-Decisions/), template not counted |
| Screens in the inventory | **34** numbered entries (numbers 1 to 42; removed numbers are not reused) | [Screen Inventory](../03-Design/Screen-Inventory.md) |
| Frontend routes | **47** (45 signed-in routes plus Login and Force Password Change): 28 Staff only, 3 Admin only, 14 both | [`AppRoutes.tsx`](../../frontend/src/routes/AppRoutes.tsx) |
| Roles | **2**: Staff (the School Clinician), Admin (the Principal) | `chk_users_role` in the schema; ADR-029, ADR-038 |
| Backend modules | **11**: AuditLogViewer, BackupVerification, ClinicVisits, Dashboard, EmergencyResponse, FirstAidChecklist, InventoryTracker, ReportsGeneration, StaffPatients, StudentRecords, UserManagement | [`backend/app/Modules/`](https://github.com/zekuuu/cliniq/tree/backend/backend/app/Modules) |
| Backend shared services | **10**: AuditLog, Auth, Database, Feedback, FollowUps, Http, Logging, Sequences, Settings, Support | [`backend/app/Shared/`](https://github.com/zekuuu/cliniq/tree/backend/backend/app/Shared) |
| Mock API (sample data layer) | **132** functions, **20** constants, **20** error classes | [`mock-db/api.ts`](../../frontend/src/lib/mock-db/api.ts) |
| Mock entity types | **37** | [`mock-db/types.ts`](../../frontend/src/lib/mock-db/types.ts) |
| Database tables (approved schema) | **48** | [`Reference-Schema.sql`](../02-Architecture/Database/Reference-Schema.sql); ADR-057 |
| Database columns | **462** | same |
| `CHECK` / `UNIQUE` / foreign keys | **92** / **36** / **96** | same |
| Constraint test cases | **260** | [`Checks/constraint-tests.sql`](../02-Architecture/Database/Checks/constraint-tests.sql) |
| Laravel migrations on disk | **48** (one per table) | `backend/app/**/Database/Migrations/` |
| API contract entries | **126** | [API Contract](../04-Development/API-Contract.md) (`####` endpoint headings) |
| API routes live in the backend | **3**: `GET /api/health`, `GET /sanctum/csrf-cookie`, `POST /api/session/keepalive` | `backend/routes/api.php` plus Sanctum's CSRF route |
| Frontend test files | **135** | `frontend/src/**/*.test.ts(x)` |
| Backend test files | **8** | `backend/tests/**/*Test.php` |
| Lines of code (non-blank) | frontend **64393** (`src`, tests included); backend **4450** (`app`, `config`, `routes`, `database`, `tests`, `bootstrap`) | counted by the script |

## Test runs

Recorded Tuesday, November 10, 2026 — 18:39 PHT at `8f70297` by `docs-facts.mjs --tests`.

| Suite | Command | Result |
|---|---|---|
| Frontend (Vitest) | `cd frontend && npm test` | 1185 passed (1185) |
| Backend (Pest) | `cd backend && composer test` | not run here: no backend code on this branch; run `composer test` on `backend` |

A frontend count that moves between runs comes from 5-second timeouts under full-suite load; the failing files pass when run alone. See the VERIFY entry "The full test suite fails more under CPU load" in [Frontend-Issues-and-TODOs](../08-Logs/Frontend-Issues-and-TODOs.md).

## Stack (installed versions)

| Frontend | Version | Backend | Version |
|---|---|---|---|
| react | 19.3.0 | php | ^8.3 |
| react-router | 7.18.4 | laravel/framework | 13.39.0 |
| typescript | 6.0.3 | laravel/sanctum | 4.3.3 |
| vite | 8.3.1 | pestphp/pest | 5.3.4 |
| tailwindcss | 4.3.3 | larastan/larastan | 3.13.2 |
| vitest | 5.0.2 | laravel/pint | 1.32.1 |
| chart.js | 4.5.1 |  |  |
| qrcode | 1.5.4 |  |  |

Database: MariaDB 10.4 or later, as shipped with XAMPP (the schema's stated target). Node.js for development: 22.22.2 or a later 22.x, 24.15 or a later 24.x, or 26 or later ([setup-step.md](../../setup-step.md)). Versions are read from `package-lock.json` and `composer.lock`.

## Deployment

CLINIQ runs on the clinic PC only, at `http://localhost`: no LAN access, no hostname, no HTTPS, inbound connections blocked by Windows Firewall. The Admin account is used on the clinic PC. The clinician sends the Principal the Monthly Report as a PDF (printed, or saved with the browser's Save as PDF). Backups must not stay only on the clinic PC's own disk: a second drive or a USB drive kept elsewhere. Source: ADR-029, ADR-039, ADR-079.

## Session, lock-out and idle sign-out

Values from [`backend/config/cliniq.php`](https://github.com/zekuuu/cliniq/blob/backend/backend/config/cliniq.php); the idle minutes are settings stored in `system_settings` with these as defaults.

| Rule | Value | Decision |
|---|---|---|
| Session maximum, however active | **7 days** after sign-in, both roles | ADR-015, ADR-057 |
| Lock-out | **5** wrong passwords in a row lock the account for **5 minutes** | ADR-015 (5 minutes since Sunday, November 8, 2026) |
| Idle sign-out, Staff | **60 minutes** (setting, 10 to 240) | ADR-078 |
| Idle sign-out, Admin | **30 minutes** (setting, 10 to 240) | ADR-048, ADR-078 |
| Idle warning | 2 minutes before, with a live countdown | ADR-078 |
| Password recovery | authenticator app (6-digit code) or one of 8 recovery codes; no email on accounts | ADR-073 |
| LRN length | **12** digits | ADR-028 |

## School year

Runs **June 15 to April 14** by default (dates are a Staff setting). Staff end a school year and start the next **by hand**; nothing changes by itself, and a Dashboard banner reminds them 7 days before each due day. Archive is per school year. Source: ADR-072, ADR-075.

## Signed-in routes by role

| Path | Screen title | Who |
|---|---|---|
| `/` | Clinic Overview | Both |
| `/calendar` | Activity calendar | Both |
| `/students` | Student List | Both |
| `/students/new` | Add Student | Staff |
| `/students/incomplete` | Incomplete Records | Staff |
| `/students/:studentId` | Student Profile | Both |
| `/students/:studentId/edit` | Edit Student | Staff |
| `/staff` | Staff List | Staff |
| `/staff/new` | Add Staff | Staff |
| `/staff/import` | Import Staff List | Staff |
| `/staff/incomplete` | Incomplete Staff Records | Staff |
| `/staff/:personnelId` | Staff Profile | Staff |
| `/staff/:personnelId/edit` | Edit Staff | Staff |
| `/visits` | Visit Log | Staff |
| `/visits/new` | New Visit | Staff |
| `/visits/pe-referral` | PE/Sports Referrals | Staff |
| `/visits/:visitId` | Visit Details | Staff |
| `/visits/:visitId/excuse-letter` | Excuse Letter | Staff |
| `/incidents` | Incident Log | Both |
| `/incidents/new` | Report Incident | Staff |
| `/incidents/:incidentId/complete` | Complete Incident | Staff |
| `/incidents/notifications` | Parent Notifications | Staff |
| `/incidents/:incidentId/notifications` | Parent Notifications | Staff |
| `/incidents/report` | Incident Report | Both |
| `/incidents/:incidentId/report` | Incident Report | Both |
| `/students/import` | Import Student List | Staff |
| `/inventory` | Inventory | Staff |
| `/inventory/new` | Add Inventory Item | Staff |
| `/inventory/history` | Inventory Usage History | Staff |
| `/inventory/dispense` | Dispense Item | Staff |
| `/follow-ups` | Follow-Ups | Staff |
| `/reports` | Reports | Both |
| `/reports/sports` | Sports Reports | Staff |
| `/reports/sports/new` | New Sports Report | Staff |
| `/reports/sports/:reportId` | Sports Report | Staff |
| `/reports/sports/:reportId/edit` | Edit Sports Report | Staff |
| `/audit-log` | Audit Log | Both |
| `/archive` | Archive | Both |
| `/account/password` | Change Password | Both |
| `/privacy-policy` | Privacy Policy | Both |
| `/users` | User Accounts | Admin |
| `/users/new` | Add User | Admin |
| `/users/:userId/edit` | Edit User | Admin |
| `/backup` | Backup | Both |
| `/settings` | Settings | Both |
