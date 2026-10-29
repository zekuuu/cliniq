# CLINIQ

Last checked against the code on Thursday, October 29, 2026 (commit dde64408).

CLINIQ is an intelligent clinic tracking and monitoring system for Mendez Christian Academy. The Project Plan and related documents in this repository were prepared as working reference material during planning, not as the team's official deliverable. The formal Software Requirements Specification is being written separately; this repository supports that work.

For the longer overview with the feature list, team and documentation links, see [README_ORIGINAL.md](./README_ORIGINAL.md).

## What CLINIQ is and who it is for

CLINIQ replaces the school clinic's paper logbooks and Excel sheets. It is built for a clinic of more than 900 students with one nurse, one shared workstation, a limited budget and no internet-facing hosting (source: [Overview](./CLINIQ-Knowledge-Base/00-Project-Core/Overview.md), Project Plan Section 1).

**Roles.** In the app the two roles are named **School Clinician** and **Admin / Principal**. Older documents call the School Clinician role "Staff". In the app, "Staff" means teachers and other school employees who are seen at the clinic as patients (ADR-043). PE/Sports Instructors have no account (ADR-029).

**Words used on the screens.** A student is identified by the **LRN** (Learner Reference Number, ADR-028), not a Student Number, which was dropped (ADR-027). A staff patient is identified by the **Staff No.** (for example `STF-0001`). Lists that show several patients show the LRN masked or the Staff No., never a name (ADR-004). The screens use **Visit**, **Incident** (a two-stage emergency record), **Follow-Up**, **Excuse Letter**, **Inventory**, **Calendar**, **Reports**, **Audit Log**, **Accounts** and **Backup**.

## Current state

- **Frontend: Built (on sample data).** The browser app (frontend) is built and runs on sample (mock) data in [`frontend/src/lib/mock-db/`](./frontend/src/lib/mock-db/README.md). No real student data is used.
- **Backend: Not started.** The server side (backend) is not built. [`backend/`](./backend/README.md) holds only a README and an `.env.example`.
- **Database: Decided, not built.** The database design is a proposed draft awaiting team approval ([ERD](./CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md)). No migrations exist.
- **Stack.** React, TypeScript, Vite and Tailwind CSS for the frontend; Laravel with Sanctum for the backend (planned); MariaDB (XAMPP), MySQL-compatible, for the database (planned). See [Tech Stack](./CLINIQ-Knowledge-Base/02-Architecture/Tech-Stack.md) and ADR-007.
- **Deployment: Decided, not built.** CLINIQ is planned to run locally on the clinic computer over the school's local network (LAN). The Admin / Principal signs in at the clinic computer (ADR-029). Remote or cloud hosting is out of scope. Backups stay on the internal and external drives, with no cloud copy (ADR-039).

### Built (on sample data)

Every screen below was opened in the running app on Thursday, October 29, 2026.

| Area | Screens | Who can use them |
|---|---|---|
| Sign-in | Login, Force Password Change | Both roles |
| Dashboard | Overview and Trends views, Clinic Overview Report printout | Both roles |
| Calendar | School events and national holidays | Both roles (both can manage events, ADR-042) |
| Students | Student List, Student Profile | Both roles (the Admin / Principal reads only, ADR-038) |
| Students | Add / Edit Student, Incomplete Records | School Clinician |
| Staff patients | Staff List, Staff Profile, Add / Edit Staff | School Clinician (ADR-043) |
| Visits | New Visit with the first-aid checklist, Visit Log, Visit Details, Excuse Letter, PE/Sports Injury Referral | School Clinician |
| Incidents | Incident Log, Incident Report | Both roles (the Admin / Principal reads only, ADR-038) |
| Incidents | Report Incident (two stages), Emergency Contact Notification Log | School Clinician |
| Follow-Ups | Follow-Ups list | School Clinician |
| Inventory | Inventory, Add / Edit Item, Dispense, Restock, batches and expired stock (ADR-030) | School Clinician |
| Reports | Monthly Clinic Report, Incident register, Complaint summary | Both roles (the Admin / Principal reads only) |
| Reports | Sports Reports for the PE instructor (ADR-034) | School Clinician |
| Audit Log | Read-only, filterable audit log | Both roles (ADR-016, ADR-037) |
| Accounts | User Management | Admin / Principal (ADR-033) |
| Backup | Backup Verification with a guided recovery checklist | Both roles (ADR-037). It shows sample backup records; no real backup runs yet. |
| Other | Privacy Policy (draft), Report an Issue (opens an email) | Both roles |

The Admin / Principal does not print (ADR-038). Every printout is a purpose-built A4 document (ADR-026).

### Decided, not built

These were decided on Thursday, October 29, 2026. None of them is in the app yet.

- "Save and approve now" on an Excuse Letter, and a warning when a letter covers more than 3 days (ADR-049).
- Allergies and medical conditions read "None recorded" when empty (ADR-049, ADR-051). Some views already show "None recorded"; the student form still offers "None".
- The student's own phone field renamed "Student's mobile number" (ADR-051).
- Each visit and incident keeps the grade and section it had when saved; grade and section come from a yearly import of the registrar's list; students missing from it are archived after a review list, and records are kept 5 years from the archive date (ADR-047, ADR-051).
- The Admin / Principal is signed out after 30 idle minutes, can Acknowledge an incident report, and passwords can be reset by email when online (ADR-048).
- The School Clinician opening a profile or an incident report is written to the audit log (ADR-048). Today only the Admin / Principal's opens are logged.
- A cluster alert for the School Clinician (3 students, same complaint and grade, within 3 days) (ADR-050).
- A weekly breakdown in the Monthly Report and a monthly inventory printout (ADR-050).
- The Calendar renamed "Activity calendar" (ADR-050).
- Starting values: a frequent visitor is 3 visits in 14 days, and follow-ups are overdue after 3 days and closed after 7 (ADR-051).
- Common vitals ranges shown as warnings, and the required mark shown only where saving is blocked (ADR-051).
- A Backup locations screen where the School Clinician chooses the internal and external backup folders (ADR-052).
- Up to 3 extra complaint tags on a visit, the staff type "Other", "Returned to work" for staff, and the Admin / Principal's totals leaving staff incidents out (ADR-053).

### Not started

- The Laravel backend, the database, Sanctum sign-in and real backups (Phases B0 to B10 in [Development Phases](./CLINIQ-Knowledge-Base/04-Development/Development-Phases.md)).

### Deferred

- Canteen Staff access ([Module Overview](./CLINIQ-Knowledge-Base/01-Requirements/Features/Module-Overview.md), "Future Development").
- Remote or off-campus access, parent portals, automated messaging and billing ([Scope](./CLINIQ-Knowledge-Base/00-Project-Core/Scope.md)).

## How to run it

Only the frontend runs. It needs Git and Node.js 22.22.2 or a later 22.x, 24.15 or a later 24.x, or 26 or later (the oldest versions the test tools accept). It does not need PHP, XAMPP or a database.

```bash
git clone https://github.com/zekuuu/cliniq.git
cd cliniq/frontend
npm ci
npm run dev        # http://localhost:5173
npm test           # Vitest + React Testing Library
npm run build      # type-check and production build
```

First-time Windows setup, step by step: [setup-step.md](./setup-step.md). Sign-in accounts for the sample data: [frontend/src/lib/mock-db/README.md](./frontend/src/lib/mock-db/README.md). Preview switches such as `?mock=slow`: [URL-Parameters.md](./URL-Parameters.md).

## Where to find what (for the Project Plan and the SRS)

The canonical documents in [`09-References/Canonical-Documents/`](./CLINIQ-Knowledge-Base/09-References/Canonical-Documents/) are the source of truth for what the system must do. Several of them predate later decisions; check the ADRs and the [plain-language guide to the canonical documents](./CLINIQ-Knowledge-Base/09-References/Canonical-Documents-Summary.md).

| Part of the paper | Current facts |
|---|---|
| Problem, objectives, scope | [Overview](./CLINIQ-Knowledge-Base/00-Project-Core/Overview.md), [Problem Statement](./CLINIQ-Knowledge-Base/00-Project-Core/Problem-Statement.md), [Objectives](./CLINIQ-Knowledge-Base/00-Project-Core/Objectives.md), [Scope](./CLINIQ-Knowledge-Base/00-Project-Core/Scope.md) |
| Users and roles | [User Roles and Permissions](./CLINIQ-Knowledge-Base/01-Requirements/User-Roles-and-Permissions.md), ADR-029, ADR-033, ADR-038, ADR-043 |
| Functional requirements | [Functional Requirements](./CLINIQ-Knowledge-Base/01-Requirements/Functional-Requirements.md), [Module Overview](./CLINIQ-Knowledge-Base/01-Requirements/Features/Module-Overview.md) |
| Non-functional requirements | [Non-Functional Requirements](./CLINIQ-Knowledge-Base/01-Requirements/Non-Functional-Requirements.md), ADR-015 (sessions), ADR-048 (Admin sign-out, decided) |
| Screens | [Screen Inventory](./CLINIQ-Knowledge-Base/03-Design/Screen-Inventory.md), [Design System](./CLINIQ-Knowledge-Base/03-Design/Design-System.md), [Reference Screens](./CLINIQ-Knowledge-Base/03-Design/Reference-Screens.md) |
| Architecture and deployment | [Tech Stack Summary](./CLINIQ-Knowledge-Base/02-Architecture/Tech-Stack-Summary.md), [Tech Stack](./CLINIQ-Knowledge-Base/02-Architecture/Tech-Stack.md), [System Architecture](./CLINIQ-Knowledge-Base/02-Architecture/System-Architecture.md), [Development Methodology](./CLINIQ-Knowledge-Base/02-Architecture/Development-Methodology.md), ADR-029, ADR-039, ADR-052 |
| Data | [ERD](./CLINIQ-Knowledge-Base/02-Architecture/Database/ERD.md), [Data Dictionary](./CLINIQ-Knowledge-Base/02-Architecture/Database/Data-Dictionary.md), [Reference Schema](./CLINIQ-Knowledge-Base/02-Architecture/Database/Reference-Schema.sql): a proposed draft, not final or approved |
| Privacy and constraints | [Privacy Policy](./CLINIQ-Knowledge-Base/09-References/Privacy-Policy.md), ADR-004, ADR-028, ADR-040 |
| Team and schedule | [Team and Roles](./CLINIQ-Knowledge-Base/00-Project-Core/Team-and-Roles.md); timeline and budget in the [Project Plan](./CLINIQ-Knowledge-Base/09-References/Canonical-Documents/CLINIQ_Project_Plan.md), Sections 6 and 7 |
| Decisions | [Plain-language decisions summary](./CLINIQ-Knowledge-Base/06-Decisions/Decisions-Summary.md) (one short entry per accepted ADR) and the full records in [`06-Decisions/`](./CLINIQ-Knowledge-Base/06-Decisions/) |
| What changed and what is open | [Changelog](./CLINIQ-Knowledge-Base/08-Logs/Changelog.md), [Issues and TODOs](./CLINIQ-Knowledge-Base/08-Logs/Issues-and-TODOs.md) |

## For developers and AI agents

- Read [AGENTS.md](./AGENTS.md) (the same as [CLAUDE.md](./CLAUDE.md)) before changing anything.
- Frontend structure and build process: [frontend/README.md](./frontend/README.md), ADR-008, [Frontend Loop Engineering](./CLINIQ-Knowledge-Base/04-Development/Frontend-Loop-Engineering.md).
- Planned backend layout: [backend/README.md](./backend/README.md), ADR-009.
- CLINIQ's own agent skills are in `.claude/skills/`; the list is in [Skills Setup](./CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md).
- The knowledge base: [CLINIQ-Knowledge-Base/README.md](./CLINIQ-Knowledge-Base/README.md).
