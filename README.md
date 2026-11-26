# CLINIQ

Last checked against the current `main` working tree on Friday, November 27, 2026 — 07:22 PHT for Visit and Incident list navigation, the letter-status API contract, focused tests and the Facts sheet.

Earlier checked against the code on Thursday, November 26, 2026 — 14:40 PHT (ADR-088 through ADR-094, including incident event timing).

**Last synced:** Friday, November 27, 2026 — 07:22 PHT, describing `main` at `aae7dd72` and the current working tree.

**Everything is on `main`** since Wednesday, November 18, 2026 — 10:07 PHT: the documents, the frontend and the backend ([where things live](#where-things-live), ADR-081).

Earlier checked against the staging code on Thursday, November 26, 2026 — 20:31 PHT for the integration of ADR-088 through ADR-095.

Earlier checked against the code on Monday, November 23, 2026 — 18:07 PHT for the docs-only sync of `main` at `0a178b0` (9 documentation commits committed; no product behavior, ADR, route, or number changes); on Sunday, November 22, 2026 — 14:29 PHT for the docs-only sync of `main` at `9da38fa` (the generated Project Plan and SRS copies now live in their section folders; no product behavior or Facts-sheet number changed); on Sunday, November 22, 2026 — 02:22 PHT for the docs sync of `main` at `1c41f73` (ADR-085 to ADR-087: Undo and restore, the top-bar search, the LRN last-4 search); on Sunday, November 22, 2026 — 00:52 PHT for the docs sync of `main` at `b9fd646` (ADR-084, the realistic five-year demo school to February 28, 2027); on Friday, November 20, 2026 — 01:54 PHT for the docs sync of `main` at `533df61` (ADR-082, ADR-083, the emergency-contact check, the demo seeder) and the Overview's frequent-visitor pager; on Thursday, November 19, 2026 for the paged lists and the speed run only (ADR-082); on Wednesday, November 18, 2026 for where the code lives only (the merge into `main`, ADR-081); on Tuesday, November 17, 2026 for the changes of the follow-ups and load run (`feat/connect-frontend` at `759781e`, committed Tuesday, November 17, 2026 — 05:27 PHT; see `08-Logs/Load-Test-Nov16/NOTES.md`); otherwise as on Sunday, November 15, 2026 (the `backend` branch at `397e000`). That code was merged into `main` on Wednesday, November 18, 2026 (ADR-081).

CLINIQ is an intelligent clinic tracking and monitoring system for Mendez Christian Academy. The Project Plan and related documents in this repository were prepared as working reference material during planning, not as the team's official deliverable. The formal Software Requirements Specification is being written separately; this repository supports that work.

- **Writing the SRS or the Project Plan?** Start with [Start Here for the SRS and Project Plan](./CLINIQ-Knowledge-Base/00-Project-Core/Start-Here-For-SRS-And-Project-Plan.md).
- **Need a number** (tables, screens, routes, tests, versions)? Quote the [Facts sheet](./CLINIQ-Knowledge-Base/00-Project-Core/Facts-Sheet.md); it is computed from the repository.
- **Need a diagram?** See the [diagram index](./CLINIQ-Knowledge-Base/02-Architecture/Database/Diagrams/README.md).
- The longer overview with the feature list, team and documentation links is [README_ORIGINAL.md](./README_ORIGINAL.md).

## Where things live

`main` holds the whole system and is the branch to read (ADR-081). The backend and the connected frontend were merged into it on Wednesday, November 18, 2026 — 10:07 PHT ([`bc654dd`](https://github.com/zekuuu/cliniq/commit/bc654dd)).

| Folder | What it holds | How to run or read it |
|---|---|---|
| [`.claude/`](./.claude/) | Project agent skills and commands | [Skills setup](./CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md) |
| [`.github/`](./.github/) | Repository and GitHub configuration | [Repository guidance](./AGENTS.md) |
| [`frontend/`](./frontend) | The React app: every screen, on sample data by default ([`src/lib/mock-db`](./frontend/src/lib/mock-db/README.md)) or on the real API behind a mock/API switch ([`src/lib/data`](./frontend/src/lib/data), [`src/lib/api`](./frontend/src/lib/api), ADR-080) | `cd frontend`, `npm ci`, `npm run dev` ([frontend/README.md](./frontend/README.md)) |
| [`backend/`](./backend) | The Laravel API: [`app/Modules`](./backend/app/Modules), [`routes/api.php`](./backend/routes/api.php), the migrations, the backend tests | XAMPP's MariaDB and PHP, then `composer install`, `php artisan serve` ([backend/README.md](./backend/README.md)) |
| [`backend/tools/load/`](./backend/tools/load/README.md) | The demo-school generator and the load and speed tools | [its README](./backend/tools/load/README.md), [COMMANDS.md](./COMMANDS.md) |
| [`screenshots/`](./screenshots/INDEX.md) | 34 screenshots of the major screens | [INDEX.md](./screenshots/INDEX.md) |
| [`CLINIQ-Knowledge-Base/`](./CLINIQ-Knowledge-Base/README.md) | Requirements, architecture, design, decisions (ADRs), testing, logs | [Start Here for the SRS and Project Plan](./CLINIQ-Knowledge-Base/00-Project-Core/Start-Here-For-SRS-And-Project-Plan.md) |

Inside `CLINIQ-Knowledge-Base/`:

| Folder | What it holds |
|---|---|
| [`.obsidian/`](./CLINIQ-Knowledge-Base/.obsidian/) | Vault configuration |
| [`00-Project-Core/`](./CLINIQ-Knowledge-Base/00-Project-Core/) | Overview, scope and facts |
| [`01-Requirements/`](./CLINIQ-Knowledge-Base/01-Requirements/) | Requirements and modules |
| [`02-Architecture/`](./CLINIQ-Knowledge-Base/02-Architecture/) | Architecture and database design |
| [`03-Design/`](./CLINIQ-Knowledge-Base/03-Design/) | Design system and screens |
| [`04-Development/`](./CLINIQ-Knowledge-Base/04-Development/) | Development guides and API contract |
| [`05-Testing/`](./CLINIQ-Knowledge-Base/05-Testing/) | Test strategy and cases |
| [`06-Decisions/`](./CLINIQ-Knowledge-Base/06-Decisions/) | Decision records |
| [`07-AI-Agents/`](./CLINIQ-Knowledge-Base/07-AI-Agents/) | Agent workflow |
| [`08-Logs/`](./CLINIQ-Knowledge-Base/08-Logs/) | Session, issue and test history |
| [`09-References/`](./CLINIQ-Knowledge-Base/09-References/) | Canonical documents and references |
| [`10-Project-Documents/`](./CLINIQ-Knowledge-Base/10-Project-Documents/) | Markdown Plan and SRS copies |

The branches `backend`, `feat/connect-frontend` and `feat/build-backend` are kept for history only and hold nothing that `main` lacks; the last frontend-only `main`, on sample data, is the tag [`checkpoint-frontend-only-2026-11-18`](https://github.com/zekuuu/cliniq/tree/checkpoint-frontend-only-2026-11-18) (`f250ab6`). New work goes on short `feat/*` branches merged into `main`.

## What CLINIQ is and who it is for

CLINIQ replaces the school clinic's paper logbooks and Excel sheets. It is built for a clinic of more than 900 students with one nurse, one shared workstation, a limited budget and no internet-facing hosting (source: [Overview](./CLINIQ-Knowledge-Base/00-Project-Core/Overview.md), Project Plan Section 1).

**Roles.** There are two: **Staff** (shown in the app as **School Clinician**) and **Admin** (shown as **Admin / Principal**). The Admin reads but never prints, never sees health detail in lists, and reads the monthly reports on screen only (ADR-038, ADR-077). In the app, "Staff" on the Staff List means teachers and other school employees who are seen at the clinic as patients (ADR-043). PE/Sports Instructors have no account (ADR-029).

**Words used on the screens.** A student is identified by the **LRN** (Learner Reference Number, 12 digits, ADR-028). A staff patient is identified by the **Staff No.** (for example `STF-0001`). Lists that show several patients show the LRN masked or the Staff No., never a name (ADR-004). The screens use **Visit**, **Symptoms** and **Released to** (ADR-070), **Incident** (a two-stage emergency record), **Follow-Up**, **Excuse Letter**, **Inventory**, **Activity calendar**, **Reports**, **Audit Log**, **Archive** (by school year, ADR-072), **Accounts**, **Backup** and **Settings**.

## Current state

- **Frontend: built, on sample data by default.** Every screen runs on sample (mock) data in [`frontend/src/lib/mock-db/`](./frontend/src/lib/mock-db/README.md), and that stays the default. No real student data is used. The connection to the backend is on `main` too (next line). Since Thursday, November 19, 2026 the seven long lists (Visit Log, Incident Log, Follow-Ups, Student List, Incomplete Records, Audit Log, Usage History) ask the server for one page at a time (ADR-082); every action's result is a bottom-right toast and a successful form clears and returns to the top (ADR-083). Since Friday, November 20, 2026 a medicine or supply cannot be given beyond the stock on hand, an item at 0 shows "Out of stock", and each action gets its own toast (ADR-084).
- **Frontend on the real API: connected behind a switch (ADR-080), in [`frontend/src/lib/api`](./frontend/src/lib/api), on `main` since Wednesday, November 18, 2026 (ADR-081).** Each module can run on the Laravel API (`VITE_API_MODE=api` for all, or one module at a time); the mock data layer stays the default and is kept unchanged. Every module was checked in a real browser against the running API ([run report](./CLINIQ-Knowledge-Base/08-Logs/Connect-Frontend-Nov15/REPORT.md)). How to run it: [`frontend/README.md`](./frontend/README.md#run-on-the-real-api-adr-080).
- **Backend: phases B0 to B10 built and tested, connected to the frontend.** The backend code is in [`backend/`](./backend) on `main` (ADR-081). Laravel with Sanctum in SPA cookie mode serves 139 routes: every endpoint of the [API Contract](./CLINIQ-Knowledge-Base/04-Development/API-Contract.md), plus the health check and the CSRF cookie. Sign-in with lock-out and password recovery, students and staff patients with imports, visits, excuse letters, follow-ups, incidents, inventory, the Dashboard and calendar, reports, the audit log, accounts and backups all save to MariaDB. 262 backend tests pass (1,786 assertions; run Thursday, November 26, 2026 on `cliniq_check_pest`; Larastan has one pre-existing `cast.string` failure at `BackupService.php:171`, logged in `Backend-Issues-and-TODOs.md`); three scheduled jobs (missed follow-ups, the nightly backup, the holiday sync) need Windows Task Scheduler on the clinic PC.
- **Database: approved (47 tables, ADR-057 as amended by ADR-088 and ADR-094), migrated and checked.** The migrations run on MariaDB and match the [Reference Schema](./CLINIQ-Knowledge-Base/02-Architecture/Database/Reference-Schema.sql) table for table, column for column (`php tools/db-checks.php`); its 259 constraint test cases cover the remaining constraints. The [ERD](./CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md) and [Data Dictionary](./CLINIQ-Knowledge-Base/02-Architecture/Database/Data-Dictionary.md) describe it. A development seeder loads the frontend's fictional sample data.
- **Deployment: decided, not done.** CLINIQ will run on the clinic PC only, at `http://localhost`: no LAN access, no hostname, no HTTPS, inbound connections blocked. The Admin account is used on the clinic PC; the clinician sends the Principal the Monthly Report as a PDF (ADR-029, ADR-079). Backups stay local with no cloud copy, and must not stay only on the clinic PC's own disk (ADR-039, ADR-052, ADR-079).
- **Stack.** React 19, TypeScript 6, Vite 8 and Tailwind CSS 4 for the frontend, with TanStack Query for the paged lists (ADR-082) and Sonner for the toasts (ADR-083); Laravel 13 with Sanctum 4 and Pest 5 for the backend; MariaDB from XAMPP for the database. Exact versions: [Facts sheet](./CLINIQ-Knowledge-Base/00-Project-Core/Facts-Sheet.md#stack-installed-versions); reasons: [Tech Stack](./CLINIQ-Knowledge-Base/02-Architecture/Tech-Stack.md) and ADR-007.

### Built (frontend, on sample data)

Checked against the router (`frontend/src/routes/AppRoutes.tsx`) on Sunday, November 15, 2026. "Both" means Staff and Admin; the Admin reads only.

| Area | Screens | Who can use them |
|---|---|---|
| Sign-in | Login, Force Password Change, Forgot password with an authenticator app (ADR-073), idle sign-out warning (ADR-078) | Both |
| Account menu | Edit profile, Change password, authenticator app set-up, Keyboard shortcuts, Report an issue, Privacy Policy, Sign out (ADR-066) | Both |
| Dashboard | Overview and Trends views, school-year reminder banner (Staff) | Both |
| Activity calendar | School events and national holidays | Both (both manage events, ADR-042) |
| Students | Student List, Student Profile | Both |
| Students | Add / Edit Student, Incomplete Records, Import Student List | Staff |
| Staff patients | Staff List, Staff Profile, Add / Edit Staff, Incomplete Staff Records, Import Staff List (ADR-043, ADR-067, ADR-069) | Staff |
| Visits | New Visit with the first-aid checklist, Visit Log, Visit Details, Excuse Letter, PE/Sports Referrals | Staff |
| Incidents | Incident Log, Incident Report | Both |
| Incidents | Report Incident (two stages), Complete Incident, Parent Notifications | Staff |
| Follow-Ups | Follow-Ups list | Staff |
| Inventory | Inventory, Add / Edit Item, Dispense, Restock, Adjust Stock, batches, Usage History (ADR-018, ADR-030) | Staff |
| Reports | Monthly Report with its weekly breakdown, Incident register, Symptom summary, Inventory sheet; each prints as A4 or Save as PDF | Staff |
| Reports | The same four monthly reports, chosen by month, view only (ADR-077) | Admin |
| Reports | Sports Reports (ADR-034) | Staff |
| Archive | Archived students, staff, reports and audit entries by school year; End and Start school year (ADR-072, ADR-075) | Both (Staff act, Admin reads) |
| Audit Log | Read-only, filterable | Both (ADR-016, ADR-037) |
| Accounts | User List, Add / Edit User | Admin (ADR-033) |
| Backup | Backup status, guided recovery checklist, Back up now, backup locations (add and disable) | Both (ADR-037). On sample data the screen shows sample records; on the API (ADR-080) it shows and runs the backend's real backups. |
| Settings | Idle sign-out minutes per role, upcoming follow-up days, approaching inventory-expiry days | Both (Staff edit, Admin reads, ADR-078, ADR-091) |

The Admin does not print (ADR-038). Every printout is a purpose-built A4 document (ADR-026). The Dashboard prints nothing (ADR-074).

The keyboard shortcuts (Alt+N, Alt+I, Alt+K, Alt+D, / for the top-bar search and the rest, listed under Keyboard shortcuts in the account menu) are written for Windows, the clinic PC's system (ADR-079). They have not been tried on a Mac, where Option+letter types a symbol, so they may not work there (Sir Rey, October 25, 2026).

### Decided, not built

- **The clinic PC set-up** of ADR-079: Windows password and screen lock, BitLocker on Windows Pro, Windows Firewall rule, backups kept away from the room, one Staff account per person.

### Deferred

- Canteen Staff access ([Module Overview](./CLINIQ-Knowledge-Base/01-Requirements/Features/Module-Overview.md), "Future Development").
- Remote or off-campus access, parent portals, automated messaging and billing ([Scope](./CLINIQ-Knowledge-Base/00-Project-Core/Scope.md)). Putting the PC on the school network would be a new decision (ADR-079).

## Screenshots of the system

[`screenshots/INDEX.md`](./screenshots/INDEX.md) lists 34 screenshots of the major screens: the login, 27 of the Staff (School Clinician) role and 6 of the Admin (Principal) role, each with its route and the state it shows. They were taken from the frontend connected to the real Laravel API (`feat/connect-frontend`) on the fictional load-test school in `cliniq_testing`, so every person on screen is generated, at a laptop screen size: 1536 × 960 CSS px, device scale factor 2, PNG 3072 px wide, long pages captured whole.

Caution: the generated school ends on Tuesday, November 17, 2026, so the browser clock and the API's clock both start at Tuesday, November 17, 2026, 13:00, and the dates and times on the screens follow that clock; the two accounts' display names (Jennesse Baas and Gilan Avelida) were set in `cliniq_testing` for this set.

## How to run it

Windows with XAMPP first. Git and Node.js 22.22.2 or a later 22.x, 24.15 or a later 24.x, or 26 or later are needed for the frontend; PHP 8.3 or later (XAMPP's) and Composer for the backend. Every command below was run on Sunday, November 15, 2026 (on the `backend` branch then; the backend is on `main` since Wednesday, November 18, 2026).

**Frontend** (runs on its own, on sample data; no PHP or database needed):

```bash
git clone https://github.com/zekuuu/cliniq.git
cd cliniq/frontend
npm ci
npm run dev        # http://localhost:5173
npm test           # Vitest + React Testing Library
npm run lint       # ESLint
npm run build      # type-check and production build
```

**Backend** (needs MariaDB from XAMPP running, the `cliniq` and `cliniq_testing` databases, the two accounts `cliniq_migrate` and `cliniq_app`, and a `.env`; see [Environment Setup](./CLINIQ-Knowledge-Base/04-Development/Environment-Setup.md) and [backend/README.md](./backend/README.md)):

```bash
cd backend
composer install
php artisan migrate         # with cliniq_migrate in .env, then switch back to cliniq_app
php artisan db:seed --class="App\Shared\Database\DevelopmentSeeder"   # development only, empty database
php artisan serve           # http://127.0.0.1:8000/api/health
composer check              # Pint, Larastan and Pest (needs the cliniq_testing database)
php tools/db-checks.php     # schema parity with Reference-Schema.sql and the 259 constraint tests
php artisan route:list      # the 139 live routes
```

**Documentation checks** (from the repository root):

```bash
npm run docs:facts          # regenerate the Facts sheet
npm run docs:check          # links, anchors, numbers, dates, removed features; changes nothing
```

First-time Windows setup, step by step: [setup-step.md](./setup-step.md). Sign-in accounts for the sample data: [frontend/src/lib/mock-db/README.md](./frontend/src/lib/mock-db/README.md). Preview switches such as `?mock=slow`: [URL-Parameters.md](./URL-Parameters.md).

## Where to find what (for the Project Plan and the SRS)

The section-by-section guide is [Start Here for the SRS and Project Plan](./CLINIQ-Knowledge-Base/00-Project-Core/Start-Here-For-SRS-And-Project-Plan.md). In short: the canonical documents in [`09-References/Canonical-Documents/`](./CLINIQ-Knowledge-Base/09-References/Canonical-Documents/) say what the system must do; the [ADRs](./CLINIQ-Knowledge-Base/06-Decisions/ADR-Index.md) say what was decided (a later dated note wins); the Facts sheet gives the numbers.

| Part of the paper | Current facts |
|---|---|
| Problem, objectives, scope | [Overview](./CLINIQ-Knowledge-Base/00-Project-Core/Overview.md), [Problem Statement](./CLINIQ-Knowledge-Base/00-Project-Core/Problem-Statement.md), [Objectives](./CLINIQ-Knowledge-Base/00-Project-Core/Objectives.md), [Scope](./CLINIQ-Knowledge-Base/00-Project-Core/Scope.md) |
| Users and roles | [User Roles and Permissions](./CLINIQ-Knowledge-Base/01-Requirements/User-Roles-and-Permissions.md) |
| Functional and non-functional requirements | [Functional Requirements](./CLINIQ-Knowledge-Base/01-Requirements/Functional-Requirements.md) (with the traceability table), [Non-Functional Requirements](./CLINIQ-Knowledge-Base/01-Requirements/Non-Functional-Requirements.md), [Module Overview](./CLINIQ-Knowledge-Base/01-Requirements/Features/Module-Overview.md) |
| Screens | [Screen Inventory](./CLINIQ-Knowledge-Base/03-Design/Screen-Inventory.md), [Design System](./CLINIQ-Knowledge-Base/03-Design/Design-System.md) |
| Architecture and deployment | [System Architecture](./CLINIQ-Knowledge-Base/02-Architecture/System-Architecture.md), [Tech Stack](./CLINIQ-Knowledge-Base/02-Architecture/Tech-Stack.md), [diagram index](./CLINIQ-Knowledge-Base/02-Architecture/Database/Diagrams/README.md) |
| Data and API | [ERD](./CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md), [Data Dictionary](./CLINIQ-Knowledge-Base/02-Architecture/Database/Data-Dictionary.md), [API Contract](./CLINIQ-Knowledge-Base/04-Development/API-Contract.md) |
| Privacy | [Privacy Policy](./CLINIQ-Knowledge-Base/09-References/Privacy-Policy.md), ADR-004, ADR-028, ADR-040, ADR-079 |
| Team, schedule, testing | [Team and Roles](./CLINIQ-Knowledge-Base/00-Project-Core/Team-and-Roles.md), [Development Phases](./CLINIQ-Knowledge-Base/04-Development/Development-Phases.md), [Test Strategy](./CLINIQ-Knowledge-Base/05-Testing/Test-Strategy.md) |
| Decisions | [ADR index](./CLINIQ-Knowledge-Base/06-Decisions/ADR-Index.md), [plain-language summary](./CLINIQ-Knowledge-Base/06-Decisions/Decisions-Summary.md), [what changed since Project Plan revision 2.8](./CLINIQ-Knowledge-Base/06-Decisions/Changes-Since-Project-Plan-2.8.md) |
| What changed and what is open | [Frontend Changelog](./CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md), [Backend Changelog](./CLINIQ-Knowledge-Base/08-Logs/Backend-Changelog.md), [Frontend Issues](./CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md), [Backend Issues](./CLINIQ-Knowledge-Base/08-Logs/Backend-Issues-and-TODOs.md) |

## For developers and AI agents

- Read [AGENTS.md](./AGENTS.md) (the same as [CLAUDE.md](./CLAUDE.md)) before changing anything, and [CONTRIBUTING.md](./CONTRIBUTING.md) for branches and checks.
- Frontend: [frontend/README.md](./frontend/README.md), [Frontend Loop Engineering](./CLINIQ-Knowledge-Base/04-Development/Frontend-Loop-Engineering.md). Backend: [backend/README.md](./backend/README.md), [Backend Loop Engineering](./CLINIQ-Knowledge-Base/04-Development/Backend-Loop-Engineering.md); new work goes on `feat/*` branches merged into `main` (ADR-081).
- CLINIQ's own agent skills are in `.claude/skills/`; the list is in [Skills Setup](./CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md).
- The knowledge base: [CLINIQ-Knowledge-Base/README.md](./CLINIQ-Knowledge-Base/README.md).
