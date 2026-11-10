# CLINIQ

Last checked against the code on Tuesday, November 10, 2026 (`main` at 8f70297; backend code on the `backend` branch at b51166a, which has `main` merged in).

CLINIQ is an intelligent clinic tracking and monitoring system for Mendez Christian Academy. The Project Plan and related documents in this repository were prepared as working reference material during planning, not as the team's official deliverable. The formal Software Requirements Specification is being written separately; this repository supports that work.

- **Writing the SRS or the Project Plan?** Start with [Start Here for the SRS and Project Plan](./CLINIQ-Knowledge-Base/00-Project-Core/Start-Here-For-SRS-And-Project-Plan.md).
- **Need a number** (tables, screens, routes, tests, versions)? Quote the [Facts sheet](./CLINIQ-Knowledge-Base/00-Project-Core/Facts-Sheet.md); it is computed from the repository.
- **Need a diagram?** See the [diagram index](./CLINIQ-Knowledge-Base/02-Architecture/Database/Diagrams/README.md).
- The longer overview with the feature list, team and documentation links is [README_ORIGINAL.md](./README_ORIGINAL.md).

## What CLINIQ is and who it is for

CLINIQ replaces the school clinic's paper logbooks and Excel sheets. It is built for a clinic of more than 900 students with one nurse, one shared workstation, a limited budget and no internet-facing hosting (source: [Overview](./CLINIQ-Knowledge-Base/00-Project-Core/Overview.md), Project Plan Section 1).

**Roles.** There are two: **Staff** (shown in the app as **School Clinician**) and **Admin** (shown as **Admin / Principal**). The Admin reads but never prints, never sees health detail in lists, and reads the monthly reports on screen only (ADR-038, ADR-077). In the app, "Staff" on the Staff List means teachers and other school employees who are seen at the clinic as patients (ADR-043). PE/Sports Instructors have no account (ADR-029).

**Words used on the screens.** A student is identified by the **LRN** (Learner Reference Number, 12 digits, ADR-028). A staff patient is identified by the **Staff No.** (for example `STF-0001`). Lists that show several patients show the LRN masked or the Staff No., never a name (ADR-004). The screens use **Visit**, **Symptoms** and **Released to** (ADR-070), **Incident** (a two-stage emergency record), **Follow-Up**, **Excuse Letter**, **Inventory**, **Activity calendar**, **Reports**, **Audit Log**, **Archive** (by school year, ADR-072), **Accounts**, **Backup** and **Settings**.

## Current state

- **Frontend: built, on sample data.** Every screen runs on sample (mock) data in [`frontend/src/lib/mock-db/`](./frontend/src/lib/mock-db/README.md). No real student data is used, and nothing is connected to the backend yet (ADR-056).
- **Backend: foundation built and tested; database tables written, not yet run.** All backend code is on the `backend` branch (ADR-056); `main` holds only `backend/README.md` and `.env.example`. Laravel with Sanctum in SPA cookie mode, the 11 module folders, configuration, CORS, middleware, one error format, the audit-log contract, the 7-day session limit, the per-role idle sign-out and its keep-alive (phase B0, 85 backend tests pass). Phase B1 wrote 48 Laravel migrations, one per table, but they have not yet been run against MariaDB. There are no models, seeders or module endpoints yet, so nobody can sign in to the backend. Live routes: `GET /api/health`, `GET /sanctum/csrf-cookie`, `POST /api/session/keepalive`.
- **Database: designed and approved (48 tables, ADR-057), not yet created.** The [ERD](./CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md), [Data Dictionary](./CLINIQ-Knowledge-Base/02-Architecture/Database/Data-Dictionary.md) and [Reference Schema](./CLINIQ-Knowledge-Base/02-Architecture/Database/Reference-Schema.sql) are approved; 260 constraint test cases check the schema.
- **Deployment: decided, not done.** CLINIQ will run on the clinic PC only, at `http://localhost`: no LAN access, no hostname, no HTTPS, inbound connections blocked. The Admin account is used on the clinic PC; the clinician sends the Principal the Monthly Report as a PDF (ADR-029, ADR-079). Backups stay local with no cloud copy, and must not stay only on the clinic PC's own disk (ADR-039, ADR-052, ADR-079).
- **Stack.** React 19, TypeScript 6, Vite 8 and Tailwind CSS 4 for the frontend; Laravel 13 with Sanctum 4 and Pest 5 for the backend; MariaDB from XAMPP for the database. Exact versions: [Facts sheet](./CLINIQ-Knowledge-Base/00-Project-Core/Facts-Sheet.md#stack-installed-versions); reasons: [Tech Stack](./CLINIQ-Knowledge-Base/02-Architecture/Tech-Stack.md) and ADR-007.

### Built (frontend, on sample data)

Checked against the router (`frontend/src/routes/AppRoutes.tsx`) on Tuesday, November 10, 2026. "Both" means Staff and Admin; the Admin reads only.

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
| Backup | Backup status, guided recovery checklist, Back up now, backup locations (add and disable) | Both (ADR-037). Sample records only; no real backup runs yet. |
| Settings | Idle sign-out minutes per role | Both (Staff edit, Admin reads, ADR-078) |

The Admin does not print (ADR-038). Every printout is a purpose-built A4 document (ADR-026). The Dashboard prints nothing (ADR-074).

### Decided, not built

- **Everything behind the screens:** real sign-in, saving to the database, the audit log in the database, real backups and the scheduler. These are backend phases B2 to B10 in [Development Phases](./CLINIQ-Knowledge-Base/04-Development/Development-Phases.md#backend-phases).
- **Connecting the frontend to the backend** (after the backend phases; ADR-056).
- **The clinic PC set-up** of ADR-079: Windows password and screen lock, BitLocker on Windows Pro, Windows Firewall rule, backups kept away from the room, one Staff account per person.

### Deferred

- Canteen Staff access ([Module Overview](./CLINIQ-Knowledge-Base/01-Requirements/Features/Module-Overview.md), "Future Development").
- Remote or off-campus access, parent portals, automated messaging and billing ([Scope](./CLINIQ-Knowledge-Base/00-Project-Core/Scope.md)). Putting the PC on the school network would be a new decision (ADR-079).

## How to run it

Windows with XAMPP first. Git and Node.js 22.22.2 or a later 22.x, 24.15 or a later 24.x, or 26 or later are needed for the frontend; PHP 8.3 or later (XAMPP's) and Composer for the backend. Every command below was run on Tuesday, November 10, 2026.

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

**Backend** (on the `backend` branch; tests need no database):

```bash
git switch backend
cd backend
composer install
composer test               # Pest
composer check              # Pint, Larastan and Pest
php artisan route:list      # the 3 live routes
```

Creating the database, its two accounts, `.env` and running the migrations: [Environment Setup](./CLINIQ-Knowledge-Base/04-Development/Environment-Setup.md) and [backend/README.md](./backend/README.md). There is no seeder yet; the sample data lives only in the frontend.

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
- Frontend: [frontend/README.md](./frontend/README.md), [Frontend Loop Engineering](./CLINIQ-Knowledge-Base/04-Development/Frontend-Loop-Engineering.md). Backend: [backend/README.md](./backend/README.md), [Backend Loop Engineering](./CLINIQ-Knowledge-Base/04-Development/Backend-Loop-Engineering.md); backend work happens on the `backend` branch (ADR-056).
- CLINIQ's own agent skills are in `.claude/skills/`; the list is in [Skills Setup](./CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md).
- The knowledge base: [CLINIQ-Knowledge-Base/README.md](./CLINIQ-Knowledge-Base/README.md).
