# Start Here for the SRS and Project Plan

Last checked against the code on Tuesday, November 10, 2026 (`main` at `8f70297`, backend read from the `backend` branch at `b51166a`). For a groupmate writing the Software Requirements Specification (SRS) or the final Project Plan who has not followed the project day to day. Every link works on GitHub.

## CLINIQ in five lines

1. CLINIQ replaces the paper logbooks and Excel sheets of the Mendez Christian Academy school clinic (more than 900 students, one nurse, one shared computer).
2. It records student and staff health profiles, clinic visits, emergencies (in two stages), follow-ups, medicines and supplies, and backups, and produces monthly reports.
3. Two roles: **Staff** (the School Clinician) does the clinic work; the **Admin** (the Principal) reads, manages accounts and never prints.
4. It runs on the clinic PC only, at `http://localhost`; the Principal gets the Monthly Report as a PDF.
5. Today the screens are built and run on sample data; the backend has its foundation and database migrations but is not connected yet.

## What is authoritative for what

| You need | Trust this | Not this |
|---|---|---|
| What the system must do | The five [canonical documents](../09-References/Canonical-Documents/) and [01-Requirements](../01-Requirements/) | Old exports, chat notes |
| What was decided, and why | The [ADRs](../06-Decisions/ADR-Index.md); a later ADR, or a later dated note at the top of an ADR, wins | An older document that disagrees |
| Any number (tables, screens, tests, versions) | The [Facts sheet](Facts-Sheet.md), computed from the repository | A number typed in any other document |
| Data and API | [ERD](../02-Architecture/Database/ERD.md), [Data Dictionary](../02-Architecture/Database/Data-Dictionary.md), [API Contract](../04-Development/API-Contract.md) | The sample data's shapes |
| What happened when | [08-Logs](../08-Logs/) (changelogs, session logs) | Logs are history, not current truth |

## Map of the repository

| Folder | What it is for |
|---|---|
| [`00-Project-Core`](./) | Overview, problem, objectives, scope, team, this page, the Facts sheet |
| [`01-Requirements`](../01-Requirements/) | Functional (FR-01 to FR-24) and non-functional (NFR-01 to NFR-12) requirements, roles, modules |
| [`02-Architecture`](../02-Architecture/) | Stack, architecture, database, every diagram ([index](../02-Architecture/Database/Diagrams/README.md)) |
| [`03-Design`](../03-Design/) | Design system, screen inventory, [screenshots](../03-Design/assets/screens/) |
| [`04-Development`](../04-Development/) | Phases, API contract, set-up, the build manuals |
| [`05-Testing`](../05-Testing/) | Test strategy and where the tests are |
| [`06-Decisions`](../06-Decisions/) | ADR-001 to ADR-079 and their indexes |
| [`09-References`](../09-References/) | Canonical documents, Privacy Policy |
| `frontend/`, `backend/` | The code (backend code is on the `backend` branch) |

## SRS sections and what to read

| SRS section (IEEE-style) | Read and quote |
|---|---|
| 1 Introduction: purpose, scope, definitions | [Overview](Overview.md), [Scope](Scope.md), [Problem Statement](Problem-Statement.md), the glossary below |
| 2.1 Product perspective | [Context diagram](../02-Architecture/Context-Diagram.md), [Deployment diagram](../02-Architecture/Deployment-Diagram.md), [Data Flow Diagram](../02-Architecture/Database/Data-Flow-Diagram.md) |
| 2.2 Product functions | [Module Overview](../01-Requirements/Features/Module-Overview.md), [Module Linkage](../02-Architecture/Database/Module-Linkage-Diagram.md), [Use cases](../02-Architecture/Database/Use-Case-Diagram.md) |
| 2.3 User characteristics | [User Roles and Permissions](../01-Requirements/User-Roles-and-Permissions.md), [Role matrix](../02-Architecture/Role-Permission-Matrix.md) |
| 2.4 Constraints, assumptions | [Non-Functional Requirements](../01-Requirements/Non-Functional-Requirements.md), [ADR-079](../06-Decisions/ADR-079-Clinic-PC-Only-Principal-Gets-Monthly-PDF.md), [Privacy Policy](../09-References/Privacy-Policy.md) |
| 3.1 Functional requirements | [Functional Requirements](../01-Requirements/Functional-Requirements.md) with its [traceability table](../01-Requirements/Functional-Requirements.md#traceability), [Activity diagrams](../02-Architecture/Database/Activity-Diagram.md), [State diagrams](../02-Architecture/State-Diagrams.md) |
| 3.2 External interfaces: user | [Screen Inventory](../03-Design/Screen-Inventory.md), [Screen-flow map](../02-Architecture/Screen-Flow-Map.md), [Design System](../03-Design/Design-System.md), screenshots |
| 3.3 External interfaces: software and hardware | [Tech Stack](../02-Architecture/Tech-Stack.md), [API Contract](../04-Development/API-Contract.md), [Sequence diagrams](../02-Architecture/Sequence-Diagrams.md) |
| 3.4 Non-functional requirements | [Non-Functional Requirements](../01-Requirements/Non-Functional-Requirements.md), [Backup and recovery](../02-Architecture/Backup-And-Recovery-Flow.md) |
| 3.5 Data requirements | [ERD](../02-Architecture/Database/ERD.md), [Data Dictionary](../02-Architecture/Database/Data-Dictionary.md), [Data Retention Policy](../02-Architecture/Database/Data-Retention-Policy.md) |
| Appendices | [ADR index](../06-Decisions/ADR-Index.md), [Facts sheet](Facts-Sheet.md), [diagram index](../02-Architecture/Database/Diagrams/README.md) |

## Project Plan sections and what to read

| Project Plan part | Read and quote |
|---|---|
| Scope and objectives | [Scope](Scope.md), [Objectives](Objectives.md), [Project Plan](../09-References/Canonical-Documents/CLINIQ_Project_Plan.md) §1 |
| Schedule and phases | [Development Phases](../04-Development/Development-Phases.md) (status at the top of Backend Phases), Project Plan §6 (Gantt chart, work breakdown) |
| Team and roles | [Team and Roles](Team-and-Roles.md) |
| Risks | Project Plan §5.4 Risk Assessment and Mitigation, [ADR-079](../06-Decisions/ADR-079-Clinic-PC-Only-Principal-Gets-Monthly-PDF.md) for the shared-room risks |
| Deliverables | Project Plan §2.4, [Team and Roles](Team-and-Roles.md), this page's "built" list below |
| Cost and tools | Project Plan §7, [Tech Stack](../02-Architecture/Tech-Stack.md), [Facts sheet](Facts-Sheet.md#stack-installed-versions) |
| Testing | [Test Strategy](../05-Testing/Test-Strategy.md), [Test Cases](../05-Testing/Test-Cases.md), the Facts sheet's test runs |
| Deployment and maintenance | [Environment Setup](../04-Development/Environment-Setup.md) ("Clinic PC only", "Scheduler on Windows"), [Deployment diagram](../02-Architecture/Deployment-Diagram.md) |
| Changes since revision 2.8 | [Changes since Project Plan 2.8](../06-Decisions/Changes-Since-Project-Plan-2.8.md) |

## How to cite

- **A decision:** "ADR-073" with its title, linking the file in `06-Decisions/`. Check the top of the ADR for a later dated note.
- **A requirement:** its ID, for example FR-16 or NFR-09. IDs never change; new ones are added at the end.
- **A diagram:** its title and caption from the source file, and the PNG from `02-Architecture/Database/Diagrams/`.
- **A number:** from the Facts sheet, with its date.

## Glossary

| Word | Meaning |
|---|---|
| LRN | Learner Reference Number, the student's 12-digit national ID; lists show it masked (last 4 digits) |
| School Clinician | The Staff role in the app: the nurse or whoever covers, each with their own account |
| Admin / Principal | The second role: reads, manages accounts, never prints |
| Staff patient | A teacher or school employee seen at the clinic, identified by a Staff No. such as `STF-0001` |
| Excuse letter | A letter excusing a student from class, approved and printed by the clinician (not a medical certificate) |
| Follow-up | A reminder to see a patient again; Pending, then Completed, Missed or Cancelled |
| Incident, two stages | An emergency record: Stage 1 captured fast, Stage 2 completed later |
| School year | June 15 to April 14 by default; Staff end and start it by hand |
| Archive | Records of students and staff who left, shown by school year, kept 5 years |
| Authenticator recovery | Resetting a forgotten password with a 6-digit code from a phone app, or a recovery code |
| Idle sign-out | Signing a user out after a set number of minutes without activity (Staff 60, Admin 30 by default) |
| Clinic PC only | CLINIQ runs on one computer at `http://localhost` and no other computer reaches it |

## Decided but not built, and built but not tested on real hardware

**Built:** every screen, on sample data only ([screenshots](../03-Design/assets/screens/)); the backend foundation (85 tests pass); 48 database migrations (written, not yet run on MariaDB).

**Decided, not built:** the backend modules (B2 to B10): real sign-in, saving to the database, the audit log in the database, real backups and the scheduler; connecting the frontend to the backend; a written restore procedure.

**Never tried on the clinic PC:** no install, no real data, no performance measurement on the 4 GB workstation, no backup to a real drive. The non-functional numbers are targets until then.

## Still to ask the client

| Question | Kept in |
|---|---|
| Who manages the system when the nurse is absent | [Frontend Issues](../08-Logs/Frontend-Issues-and-TODOs.md) (DECIDE) |
| Which word the nurse uses for "symptoms"; confirm "Released to" | [Team Tasks and Questions](../08-Logs/Team-Tasks-and-Questions.md) |
| Whether the symptom list needs "LBM"; whether items need a brand name | Team Tasks and Questions |
| The school year's dates (June 15 to April 14) with the Principal | Team Tasks and Questions |
| Which archive reasons the clinic uses; whether 7 days' notice is right | Team Tasks and Questions |
| Who holds the encryption key (`APP_KEY`) and where it is backed up | [Backend Issues](../08-Logs/Backend-Issues-and-TODOs.md) (DECIDE) |

Do not write an unconfirmed answer into the SRS as fact; say it is to be confirmed.

## How to ask for a change

A change to what the system does needs a decision: tell Zean, who records it as a new ADR in `06-Decisions/` and updates the canonical document. Then the requirement, the traceability table (`npm run docs:trace`) and the Facts sheet (`npm run docs:facts`) follow.

## Keeping the documents true

| When this happens | Update |
|---|---|
| New ADR | `npm run docs:adrs`; Decisions-Summary; the canonical document it changes; Changes since 2.8 |
| New screen or route | Screen Inventory; Screen-flow map; `npm run docs:facts` |
| New or changed endpoint | API Contract; the traceability map in `docs-trace.mjs` |
| Schema change | Reference Schema, ERD, Data Dictionary, constraint tests; `npm run docs:diagrams` |
| Release or deployment | Root README "Current state"; this page's built list; the Facts sheet with `-- --tests` |
| Any of the above | `npm run docs:check` and fix what it flags |
