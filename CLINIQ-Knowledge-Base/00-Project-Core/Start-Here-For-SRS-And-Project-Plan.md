# Start Here for the SRS and Project Plan

Last checked against the staging code on Thursday, November 26, 2026 — 22:20 PHT for the documentation sync at `9400024d` and the current working tree.

Last checked against the code on Thursday, November 26, 2026 — 14:40 PHT (ADR-088 through ADR-094, including incident event timing).

Earlier checked against the code on Monday, November 23, 2026 — 18:07 PHT for the docs-only sync of `main` at `0a178b0` (9 documentation commits committed; no product behavior, ADR, route, or number changes); on Sunday, November 22, 2026 — 14:29 PHT for the docs-only sync of `main` at `9da38fa` (the generated Project Plan and SRS copies now live in their section folders; no product behavior or Facts-sheet number changed); on Sunday, November 22, 2026 — 02:22 PHT for the docs sync of `main` at `1c41f73` (ADR-085, ADR-086, ADR-087: Undo and restore, the top-bar search, the LRN last-4 search); on Sunday, November 22, 2026 — 00:52 PHT for the docs sync of `main` at `b9fd646` (ADR-084, the realistic five-year demo school to February 28, 2027); on Friday, November 20, 2026 — 01:54 PHT for the docs sync of `main` at `533df61` (ADR-082, ADR-083, the emergency-contact check, the demo seeder) and the Overview's frequent-visitor pager; on Thursday, November 19, 2026 for the paged lists and the speed run only (ADR-082); on Wednesday, November 18, 2026 for where the code lives only (the merge into `main`, ADR-081); on Tuesday, November 17, 2026 for the changes of the follow-ups and load run (`feat/connect-frontend` at `759781e`, committed Tuesday, November 17, 2026 — 05:27 PHT; see `08-Logs/Load-Test-Nov16/NOTES.md`); otherwise as on Sunday, November 15, 2026 (the `backend` branch at `397e000`). All of that code is on `main` since Wednesday, November 18, 2026 (ADR-081). For a groupmate writing the Software Requirements Specification (SRS) or the final Project Plan who has not followed the project day to day. Every link works on GitHub.

## CLINIQ in five lines

1. CLINIQ replaces the paper logbooks and Excel sheets of the Mendez Christian Academy school clinic (more than 900 students, one nurse, one shared computer).
2. It records student and staff health profiles, clinic visits, emergencies (in two stages), follow-ups, medicines and supplies, and backups, and produces monthly reports.
3. Two roles: **Staff** (the School Clinician) does the clinic work; the **Admin** (the Principal) reads, manages accounts and never prints.
4. It runs on the clinic PC only, at `http://localhost`; the Principal gets the Monthly Report as a PDF.
5. Today the screens are built and run on sample data by default; the backend is built and tested (phases B0 to B10) and saves to MariaDB, and the screens can run on it behind a mock/API switch (ADR-080). All of it is on `main` (table below).

## Where things live

`main` holds the whole system and is the branch to read ([ADR-081](../06-Decisions/ADR-081-Backend-Merged-Into-Main-Main-Holds-The-Whole-System.md)). The backend and the connected frontend were merged into it on Wednesday, November 18, 2026 — 10:07 PHT ([`bc654dd`](https://github.com/zekuuu/cliniq/commit/bc654dd)).

| Folder | What it holds | How to run or read it |
|---|---|---|
| [`frontend/`](../../frontend) | The React app: every screen, on sample data by default ([`src/lib/mock-db`](../../frontend/src/lib/mock-db/README.md)) or on the real API behind a mock/API switch ([`src/lib/data`](../../frontend/src/lib/data), [`src/lib/api`](../../frontend/src/lib/api), ADR-080) | `cd frontend`, `npm ci`, `npm run dev` ([frontend/README.md](../../frontend/README.md)) |
| [`.claude/`](../../.claude/) | Project agent skills and commands | [Skills setup](../04-Development/Skills-Setup.md) |
| [`.github/`](../../.github/) | Repository and GitHub configuration | [Repository guidance](../../AGENTS.md) |
| [`backend/`](../../backend) | The Laravel API: [`app/Modules`](../../backend/app/Modules), [`routes/api.php`](../../backend/routes/api.php), the 54 migrations, the backend tests | XAMPP's MariaDB and PHP, then `composer install`, `php artisan serve` ([backend/README.md](../../backend/README.md)) |
| [`backend/tools/load/`](../../backend/tools/load/README.md) | The demo-school generator and the load and speed tools | [its README](../../backend/tools/load/README.md), [COMMANDS.md](../../COMMANDS.md) |
| [`screenshots/`](../../screenshots/INDEX.md) | 34 screenshots of the major screens | [INDEX.md](../../screenshots/INDEX.md) |
| [`CLINIQ-Knowledge-Base/`](../README.md) | Requirements, architecture, design, decisions (ADRs), testing, logs | this page, then the table [below](#srs-sections-and-what-to-read) |

Inside `CLINIQ-Knowledge-Base/`:

| Folder | What it holds |
|---|---|
| [`.obsidian/`](../.obsidian/) | Vault configuration |
| [`00-Project-Core/`](../00-Project-Core/) | Overview, scope and facts |
| [`01-Requirements/`](../01-Requirements/) | Requirements and modules |
| [`02-Architecture/`](../02-Architecture/) | Architecture and database design |
| [`03-Design/`](../03-Design/) | Design system and screens |
| [`04-Development/`](../04-Development/) | Development guides and API contract |
| [`05-Testing/`](../05-Testing/) | Test strategy and cases |
| [`06-Decisions/`](../06-Decisions/) | Decision records |
| [`07-AI-Agents/`](../07-AI-Agents/) | Agent workflow |
| [`08-Logs/`](../08-Logs/) | Session, issue and test history |
| [`09-References/`](../09-References/) | Canonical documents and references |
| [`10-Project-Documents/`](../10-Project-Documents/) | Markdown Plan and SRS copies |

The branches `backend`, `feat/connect-frontend` and `feat/build-backend` are kept for history only and hold nothing that `main` lacks; the old frontend-only `main`, on sample data with no backend, is the tag [`checkpoint-frontend-only-2026-11-18`](https://github.com/zekuuu/cliniq/tree/checkpoint-frontend-only-2026-11-18) (`f250ab6`).

## Changes since the last sync (Monday, November 23, 2026 — 18:28 PHT)

For the Project Plan and SRS: `staging` at `9400024d` contains 72 commits after `0a178b0`, including ADR-088 through ADR-095. Synced Thursday, November 26, 2026 — 22:20 PHT. The [Facts sheet](Facts-Sheet.md#numbers) supplies the current counts.

- **Newest decisions:** ADR-095 puts crowded secondary actions in an accessible ⋮ menu; ADR-094 separates incident event, reading and immutable entry times; ADR-093 streams the full filtered Audit Log print; ADR-092 makes a small fictional dataset the default disposable testing seed; ADR-091 exposes two operational warning periods on Settings; ADR-090 keeps labels from activating their controls; ADR-089 expands Undo to supported reversals; ADR-088 removes student and staff contact verification while keeping backup verification.
- **Numbers:** ADRs 87 → **95**; approved tables 48 → **47**; columns 462 → **453**; constraint cases 260 → **259**; migrations 50 → **54** (48 create, 4 alter, 2 data); API routes 133 → **139**; API contract headings/endpoints 130/131 → **135/137**; frontend/backend test files 154/27 → **157/28**. Frontend routes remain **47** and inventory screens remain **34**.
- **Feature impact:** Incident Stage 1 saves the patient, main symptom, event time and optional notes; entered readings belong in Stage 2. Safe Undo refuses stale changes; stock reversals add a compensating entry. School contacts no longer have verification controls or a re-verification flag. On the Incident Log, Complete Stage 2 stays visible while View Report moves into a ⋮ menu when both would stack.
- **Default local seed and Inventory table:** `migrate:fresh --seed --env=testing --force` now includes healthy, low, near-expiry, expired and no-expiry stock, mixed workflow statuses, school events across past and future dates, and the bundled Philippine holidays. The Inventory table gives Item room for names, fits the other columns to their contents and places the ⋮ menu at the right edge of Actions.
- **Project documents changed:** see [WHAT-CHANGED.md](../10-Project-Documents/WHAT-CHANGED.md) (Project Plan 1 edit; SRS 8 edits). The separate canonical documents still need the group's review of ADR-088 through ADR-095, as listed in the [frontend issues](../08-Logs/Frontend-Issues-and-TODOs.md).

## Changes since the last sync (Sunday, November 22, 2026 — 14:29 PHT)

For the Project Plan and the SRS. This covers `main` after `9da38fa` (Sunday, November 22, 2026 — 14:22 PHT) up to `0a178b0` (Sunday, November 22, 2026): 9 documentation commits only. These are the committed output of the November 22 sync run. Synced Monday, November 23, 2026 — 18:07 PHT.

- **Numbers, features and terms:** none changed. No new ADRs, no route changes, no schema changes, no frontend or backend product changes.
- **Project documents:** no content edits in this batch. The section files and combined copies are unchanged from the November 22 — 15:16 PHT pass.

## Changes since the last sync (Sunday, November 22, 2026 — 14:14 PHT)

For the Project Plan and the SRS. This covers `main` after `d4b66ff` (Sunday, November 22, 2026 — 14:14 PHT) up to `9da38fa` (Sunday, November 22, 2026 — 14:22 PHT): two documentation-tooling commits. Synced Sunday, November 22, 2026 — 14:29 PHT.

- **Project-document locations.** The generated, never-hand-edited combined copies moved to [Project-Plan/00-Combined-Project-Plan.md](../10-Project-Documents/Project-Plan/00-Combined-Project-Plan.md) and [SRS/00-Combined-SRS.md](../10-Project-Documents/SRS/00-Combined-SRS.md). The editable section files and their text did not change.
- **Numbers, features and terms:** none changed. The Facts sheet was regenerated from the working tree; only its generation time and source commit changed.
- **Project documents changed:** see [WHAT-CHANGED.md](../10-Project-Documents/WHAT-CHANGED.md) (0 content edits). *Update, Sunday, November 22, 2026 — 15:16 PHT:* 6 edits (Project Plan 1, SRS 5) bring FR-07, DR-015, DR-043, FR-014, FR-021 and FR-044 in line with ADR-068 and ADR-084 to ADR-087: dispensing beyond the usable stock is refused, an LRN search matches the shown last 4, a top-bar search opens a profile, and an archive can be undone for 8 seconds.

## Changes since the last sync (Sunday, November 22, 2026, 00:52)

For the Project Plan and the SRS. This covers `main` after `b9fd646` (Saturday, November 21, 2026 — 20:50 PHT) up to `1c41f73` (Sunday, November 22, 2026 — 02:16 PHT): 27 commits, of which 5 were the previous sync's own. Synced Sunday, November 22, 2026 — 02:22 PHT.

**Decisions added or amended**

- **ADR-085, added** (Sunday, November 22, 2026): [an Undo on the toast of a reversible action, and archived records can be restored](../06-Decisions/ADR-085-Undo-On-Action-Toasts-And-Restore-Of-Archived-Records.md). It amends ADR-083 and ADR-084 and fulfils the "can be restored" of ADR-047, ADR-051 and ADR-069.
- **ADR-086, added** (Sunday, November 22, 2026): [a search box in the top bar finds a student or staff member and opens the profile](../06-Decisions/ADR-086-Top-Bar-Search-For-Students-And-Staff.md), Staff only; "/" focuses it.
- **ADR-087, added** (Sunday, November 22, 2026): [a student search by LRN also matches the shown last 4 digits](../06-Decisions/ADR-087-LRN-Search-Also-Matches-The-Shown-Last-4.md). It amends ADR-028's "search by LRN prefix".

**Numbers that changed** (quote the [Facts sheet](Facts-Sheet.md) line named)

| What | Before | After | Facts-sheet line or source |
|---|---|---|---|
| Decision records | was 84 (ADR-001 to ADR-084) | **87** (ADR-001 to ADR-087) | "Decision records (ADRs)" |
| API routes | 131 | **133** (two restore routes, ADR-085) | "API routes live in the backend" |
| API contract entries | 128 headings naming 129 endpoints | **130** naming **131** | "API contract entries" |
| Frontend test files | 152 | **154** | "Frontend test files" |
| Backend tests passing | 255 (1,648 assertions) | **257** (1,673 assertions) | `08-Logs/Agent-Sessions/2026-11-22-lrn-search-last-4.md`, Sunday, November 22, 2026, not re-run |
| Frontend tests passing | 1278 | **1285** | `08-Logs/Agent-Sessions/2026-11-22-top-bar-search.md`, not re-run; 2 tests were added after it |
| Lines of code (non-blank) | frontend 70826, backend 17009 | frontend **71265**, backend **17106** | "Lines of code" |

Unchanged: 47 tables, 34 screens, 27 backend test files, 2 roles. The frontend router is unchanged too (the Facts-sheet line "Frontend routes").

**Features added or changed**

- **Undo (ADR-085).** For 8 seconds, the toast of a reversible action (account and backup-location enable/disable, Sports Report archive, contact verified/unverified, follow-up status, student and staff archive) has an Undo that sends the reverse request; the Audit Log keeps both entries.
- **Restore (ADR-085).** `POST /api/students/{id}/restore` and `POST /api/personnel/{id}/restore` (Staff only) bring an archived record back. A follow-up set back to Pending or Completed loses its old reason.
- **Top-bar search (ADR-086).** Staff get a box in the top bar (from 1280 px wide) that finds active students by LRN or name and staff by Staff No. or name, at most 8, with masked numbers and nothing medical; picking one opens the profile. "/" focuses it, and the Keyboard shortcuts list names it. The Admin gets no box.
- **Typing pause.** The student, patient and inventory pickers search only once typing pauses for 250 ms, as the list search boxes already did.
- **LRN search (ADR-087).** Typed digits find a student by the start of the LRN or, up to 4 digits, the last 4 shown on screen.

**Terms renamed:** none.

**Statements in the Project Plan or the SRS that are now wrong** (logged in `08-Logs/Frontend-Issues-and-TODOs.md`):

- Any line saying an archived student or staff record can't be restored, or that every action is final once saved: reversible actions have an Undo and archived records can be restored (ADR-085).
- Any line saying students are searched only by name or LRN prefix: the shown last 4 digits find them too (ADR-087).
- Any line describing the top bar as the clock and the account menu only: Staff also get the student and staff search (ADR-086).

## Changes since the last sync (Friday, November 20, 2026)

For the Project Plan and the SRS. This covers `main` after `533df61` (Thursday, November 19, 2026 — 23:57 PHT) up to `b9fd646` (Saturday, November 21, 2026 — 20:50 PHT): 23 commits, of which 7 were the previous sync's own commits and the frequent-visitor pager. Synced Sunday, November 22, 2026 — 00:52 PHT.

**Decisions added or amended**

- **ADR-084, added** (Friday, November 20, 2026): [nothing is given beyond the stock on hand, and every action gets its own toast](../06-Decisions/ADR-084-No-Dispensing-Beyond-Stock-And-One-Toast-Per-Action.md). It replaces ADR-018's "below zero warns, never blocks" and ADR-083's merging of toasts with the same text.

**Numbers that changed** (quote the [Facts sheet](Facts-Sheet.md) line named)

| What | Before | After | Facts-sheet line or source |
|---|---|---|---|
| Decision records | was 83 (ADR-001 to ADR-083) | **84** (ADR-001 to ADR-084) | "Decision records (ADRs)" |
| Backend tests passing | 251 (1,623 assertions) | **255** (1,648 assertions); Larastan fails on one pre-existing line (`BackupService.php:171`, logged as a FIX) | `08-Logs/Agent-Sessions/2026-11-21-backend-realistic-demo-school.md`, Saturday, November 21, 2026, not re-run |
| Frontend tests passing | 1277 | **1278** | same session log, not re-run |
| Lines of code (non-blank) | frontend 70710, backend 16359 | frontend **70826**, backend **17009** | "Lines of code" |

Unchanged at that historical sync: 47 tables, 462 columns, 257 schema constraint cases, 131 API routes, 34 screens, 152 frontend and 27 backend test files, 2 roles. The frontend router was unchanged too (the Facts-sheet line "Frontend routes").

**Features added or changed**

- **No dispensing beyond stock (ADR-084).** A visit, an incident or the Dispense page can no longer give more than the usable stock: the server refuses it (`409 stock_rule`), the quantity stepper stops at the stock with an error line, the item picker disables an out-of-stock item, and the Inventory list shows "Out of stock" instead of "Below zero" and a negative count.
- **One toast per action (ADR-084).** Two actions with the same result text show two toasts, each with its own timer.
- **Backup locations.** A backup location's folder path is checked by the server before it is saved; the error shows on the field.
- **Authenticator warning.** The account menu warns when the authenticator app for password recovery is not set up.
- **Demo school.** `DemoSchoolSeeder` now builds five school years, June 15, 2022 to Sunday, February 28, 2027, with realistic ages per grade, seasonal complaints, vitals in the settings' ranges, no medicine against a recorded allergy, and 17 realism checks (`backend/tools/load/README.md`). It is demo data for the screens, not a requirement; rows after the real date are invented.

**Terms renamed:** "Below zero" is now "Out of stock" on the Inventory screens.

**Statements in the Project Plan or the SRS that are now wrong** (logged in `08-Logs/Frontend-Issues-and-TODOs.md`):

- Any line saying dispensing below zero warns but never blocks the save (Module 8, Inventory, and ADR-018): it is now refused (ADR-084).
- Any line saying a repeated action shows one toast: each action shows its own (ADR-084).
- Any line saying the frontend's data layer is plain `fetch` with no library (from the previous sync, still open in the Project Plan): TanStack Query pages the long lists (ADR-082).
- Any backend test count before Saturday, November 21, 2026: quote 255 from the Facts sheet's "Newer recorded runs".

## Changes since the last sync (Wednesday, November 18, 2026)

For the Project Plan and the SRS. This covers `main` after `6ab8d95` (Wednesday, November 18, 2026 — 10:13 PHT, the merge sync) up to `533df61` (Thursday, November 19, 2026 — 23:57 PHT): 62 commits on `main`'s own line. Synced Friday, November 20, 2026 — 01:54 PHT.

**Decisions added or amended**

- **ADR-082, added** (Thursday, November 19, 2026): [the long lists are paged by the server, one page at a time, through TanStack Query](../06-Decisions/ADR-082-Server-Side-Pagination-Of-The-Long-Lists-And-TanStack-Query.md). The data layer is no longer "plain `fetch`, no library".
- **ADR-083, added** (Thursday, November 19, 2026, two dated notes the same night): [every action's result is a Sonner toast at the bottom right; a successful form resets and goes back to the top](../06-Decisions/ADR-083-Action-Feedback-In-Sonner-Toasts-Forms-Reset-And-Scroll-To-Top.md).
- **ADR-081**, a dated note (Wednesday, November 18, 2026): the Project Plan needs no change for the merge. **ADR-052**, a dated note (Thursday, November 19, 2026): clearer backup file names.

**Numbers that changed** (quote the [Facts sheet](Facts-Sheet.md) line named)

| What | Before | After | Facts-sheet line or source |
|---|---|---|---|
| Decision records | was 81 (ADR-001 to ADR-081) | **83** (ADR-001 to ADR-083) | "Decision records (ADRs)" |
| API routes live in the backend | 127 | **131** (two paged logs, the two emergency-contact verify routes) | "API routes live in the backend" |
| API contract entries | 126 headings naming 127 endpoints | **128** naming **129** | "API contract entries" |
| Frontend test files | 148 | **152** | "Frontend test files" |
| Backend test files | 25 | **27** | "Backend test files" |
| Frontend tests passing | 1254 (Wednesday, November 18) | **1277** | `08-Logs/Agent-Sessions/2026-11-19-toasts-follow-up-login-and-item-count.md`, Thursday, November 19, 2026 — 23:01 PHT, not re-run |
| Backend tests passing | 236 (Wednesday, November 18) | **251** (1,623 assertions) | `08-Logs/Agent-Sessions/2026-11-19-performance-server-paging.md`, Thursday, November 19, 2026, not re-run |
| Lines of code (non-blank) | frontend 69270, backend 14562 | frontend **70710**, backend **16359** | "Lines of code" |

Unchanged at that historical sync: 47 tables, 462 columns, 257 schema constraint cases, 34 screens, 11 backend modules, 3 scheduled jobs, 2 roles. The frontend router was unchanged too (47, the Facts-sheet line "Frontend routes").

**Features added or changed**

- **Server paging (ADR-082).** The Visit Log, Incident Log, Follow-Ups, Student List, Incomplete Records, Audit Log and Usage History fetch one page at a time; search, filters and sorting run on the server over every record. A printout still loads every matching record. Measured on the one-year demo school: the Visit Log's first page went from about 2.1 s to 105–148 ms and the Audit Log's from 9.5 s to 96–140 ms (`2026-11-19-performance-server-paging.md`).
- **Toasts and form reset (ADR-083).** Every save, status change, copy, backup and sign-out reports in one bottom-right toast with a shrinking time line; field errors stay beside the fields; a successful new-record form clears and scrolls to the top. Toasts carry no health detail.
- **Emergency contacts.** Student and staff emergency contacts record only the person, relationship and phone. Their former in-app verification state was removed by ADR-088; backup verification is unchanged.
- **Demo school seeder.** `DemoSchoolSeeder` rebuilds the fictional demo school up to the current day with one command, the same every time (`backend/tools/load/README.md`).
- **Smaller changes.** Dashboard chips with a count of 0 are hidden; the backup file names are clearer and "Back up now" works under `php artisan serve`; a larger school logo on Login; a contrast fix on the import steps and the shortcut tips.

**Terms renamed:** none.

**Statements in the Project Plan or the SRS that are now wrong** (logged in `08-Logs/Frontend-Issues-and-TODOs.md`):

- Any line saying the frontend's data layer is plain `fetch` with no library: TanStack Query now pages the long lists (ADR-082).
- Any line describing screen feedback as banners or messages on the page: an action's result is now a bottom-right toast (ADR-083).
- Any route, endpoint or test count from before Thursday, November 19, 2026: quote the Facts sheet.

## Changes on Wednesday, November 18, 2026: everything merged into `main`

- **Where the code is.** Everything is on `main` now: the frontend, the backend and the connection between them. Read `main`; the other branches are kept for history only.
- **Numbers at the November 18 sync.** Quote the [Facts sheet](Facts-Sheet.md) for current counts. At that sync: 47 tables, 462 columns, 257 schema constraint cases and 131 API routes. Counts changed then because they were taken from the connected frontend: frontend test files **148**, frontend lines **69270**; decision records **81**.
- **Decision added.** [ADR-081](../06-Decisions/ADR-081-Backend-Merged-Into-Main-Main-Holds-The-Whole-System.md): the backend is merged into `main`; it replaces only ADR-056's own-branch rule.
- **Statements that are now wrong:** any sentence saying the backend is not on `main`, or that the frontend and backend are not connected.
- **The old state.** The frontend-only `main` (sample data, no backend) is the tag [`checkpoint-frontend-only-2026-11-18`](https://github.com/zekuuu/cliniq/tree/checkpoint-frontend-only-2026-11-18).
- **Screenshots.** The 34 screenshots are in [`screenshots/`](../../screenshots/INDEX.md).

## Changes since the last sync (Tuesday, November 17, 2026)

For the Project Plan and the SRS. Newest sync first; each later sync adds its section above this one. This one covers everything after `main` at `dda26b2` (Sunday, November 15, 2026 — 09:22 PHT, the last docs refresh) up to `feat/connect-frontend` at `759781e` (Tuesday, November 17, 2026 — 05:27 PHT). All of the code below is on `main` since Wednesday, November 18, 2026 ([where the code lives](#where-things-live)).

**Decisions added or amended**

- **ADR-080, added** (Sunday, November 15, 2026; a dated note Monday, November 16): [the frontend connects to the API behind a global and per-module switch; the mock layer stays](../06-Decisions/ADR-080-Frontend-Connects-To-The-API-Behind-A-Mode-Switch-Mock-Stays.md). It is the separate step ADR-056 kept for later. No other ADR changed.

**Numbers that changed** (quote the [Facts sheet](Facts-Sheet.md) line named)

| What | Before | After | Facts-sheet line or source |
|---|---|---|---|
| Decision records | was 79 (ADR-001 to ADR-079) | **80** (ADR-001 to ADR-080) | "Decision records (ADRs)" |
| Frontend test files | 135 | **147** | "Frontend test files" |
| Frontend tests passing | 1185 | **1250** (146 files) | Recorded run, `08-Logs/Load-Test-Nov16/NOTES.md`, Monday, November 16, 2026 — 22:10 PHT, not re-run; the sheet's "Test runs" table still shows the November 15 run |
| Backend tests passing | 228 | **231** | Same notes, 22:35 PHT, not re-run |
| Lines of code (non-blank) | frontend 64596, backend 14515 | frontend **69235**, backend **14562** | "Lines of code" |

Unchanged then: 131 API routes, 128 contract entries naming 129 endpoints (counts as of Thursday, November 19, 2026, with the two paged logs of ADR-082 and the two contact-verify routes), 48 tables, 50 migrations, 260 constraint tests, 34 screens, 11 backend modules, 25 backend test files, 3 scheduled jobs. The frontend router is unchanged too (47, the Facts-sheet line "Frontend routes").

**Features added or changed** (all on `feat/connect-frontend`)

- Every module can run on the real API instead of the sample data, switched globally (`VITE_API_MODE`) or per module (`VITE_API_MODE_<MODULE>`, 15 modules); sample data stays the default and the tests' base. Each module was checked in a real browser against the running API.
- On the API, the Visit Log and Incident Log LRN search matches typed digits against the visible last 4 of the masked LRN (the sample data keeps the full-prefix match).
- On the API, the Print button of the Monthly Report and of the Audit Log first fetches the full-LRN copy (that fetch is the print's audit entry); Ctrl+P alone prints the masked copy (ADR-044 holds).
- A student's sex may be empty; the Monthly Report adds a students/staff split of "no sex recorded" (`noSexRecordedParts`, API only).
- A new inventory item now starts its history with an **Opening stock** row (API only; items created earlier have none).
- The holiday sync's default source is the holiday file on this repository's `main`; a failed or unreachable fetch is recorded, never shown as an error.
- Load testing: a deterministic fictional school of 900 students with up to five years of history, its soundness checks and a bench client (`backend/tools/load/`), with proposed performance budgets in [Test Strategy](../05-Testing/Test-Strategy.md#performance-and-load). The measurements are not finished.
- Removed: nothing.

**Terms:** new on screen, "Opening stock" (inventory history). No renames.

**Statements in the Project Plan and SRS this makes wrong:** any sentence saying the frontend runs only on mock data, or that the frontend and backend are not connected. ADR-080 flags the Project Plan for this note; the Frontend Context Brief already carries it (Monday, November 16, 2026). Say "connected behind a mock/API switch, not yet merged into `main`".

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
| [`06-Decisions`](../06-Decisions/) | ADR-001 to ADR-096 (96 records) and their indexes |
| [`09-References`](../09-References/) | Canonical documents, Privacy Policy |
| `frontend/`, `backend/` | The code: the frontend and the backend, both on `main` (see [Where things live](#where-things-live)) |

## SRS sections and what to read

| SRS section (IEEE-style) | Read and quote |
|---|---|
| 1 Introduction: purpose, scope, definitions | [Overview](Overview.md), [Scope](Scope.md), [Problem Statement](Problem-Statement.md), the glossary below |
| 2.1 Product perspective | [Context diagram](../02-Architecture/Context-Diagram.md), [Deployment diagram](../02-Architecture/Deployment-Diagram.md), [Data Flow Diagram](../02-Architecture/Database/Data-Flow-Diagram.md) |
| 2.2 Product functions | [Module Overview](../01-Requirements/Features/Module-Overview.md), [Module Linkage](../02-Architecture/Database/Module-Linkage-Diagram.md), [Use cases](../02-Architecture/Database/Use-Case-Diagram.md) |
| 2.3 User characteristics | [User Roles and Permissions](../01-Requirements/User-Roles-and-Permissions.md), [Role matrix](../02-Architecture/Role-Permission-Matrix.md) |
| 2.4 Constraints, assumptions | [Non-Functional Requirements](../01-Requirements/Non-Functional-Requirements.md), [ADR-079](../06-Decisions/ADR-079-Clinic-PC-Only-Principal-Gets-Monthly-PDF.md), [Privacy Policy](../09-References/Privacy-Policy.md) |
| 3.1 Functional requirements | [Functional Requirements](../01-Requirements/Functional-Requirements.md) with its [traceability table](../01-Requirements/Functional-Requirements.md#traceability), [Activity diagrams](../02-Architecture/Database/Activity-Diagram.md), [State diagrams](../02-Architecture/State-Diagrams.md) |
| 3.2 External interfaces: user | [Screen Inventory](../03-Design/Screen-Inventory.md), [Screen-flow map](../02-Architecture/Screen-Flow-Map.md), [Design System](../03-Design/Design-System.md), [screenshots](../../screenshots/INDEX.md) |
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
- **A screen:** the image from [`screenshots/`](../../screenshots/INDEX.md), with its file name and screen title from `INDEX.md`. These are real screenshots of every major screen (34: the login, 27 Staff, 6 Admin), taken on the fictional load-test school, so every person shown is generated. Caution: the dates and times on them follow a capture clock that starts at Tuesday, November 17, 2026, 13:00 (the last day of the generated school), and the two accounts' display names (Jennesse Baas and Gilan Avelida) were set for this set.

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

**Built:** every screen ([screenshots](../03-Design/assets/screens/)), on sample data by default and on the real API behind a mock/API switch (ADR-080; each module checked in a real browser). The backend, phases B0 to B10, on `main`: real sign-in with lock-out and password recovery, saving to the database, the audit log in the database, real backups and three scheduled jobs; 139 routes, 262 tests pass. A deterministic 900-student test school and a load bench (`backend/tools/load/`, on `feat/connect-frontend`); the measurements are in [the performance notes](../08-Logs/Load-Test-Nov25/NOTES.md). The migrations run on MariaDB and match the approved schema; its 259 remaining constraint tests pass. Numbers: [Facts sheet](Facts-Sheet.md).

**Decided, not built:** a written restore procedure.

**Never tried on the clinic PC:** no install, no real data, no performance measurement on the 4 GB workstation, no backup to a real drive. The non-functional numbers are targets until then.

## Still to ask the client

| Question | Kept in |
|---|---|
| Who manages the system when the nurse is absent | [Frontend Issues](../08-Logs/Frontend-Issues-and-TODOs.md) (DECIDE) |
| Which word the nurse uses for "symptoms"; confirm "Released to" | [Team Tasks and Questions](../08-Logs/Team-Tasks-and-Questions.md) |
| Whether the symptom list needs "LBM"; whether items need a brand name | Team Tasks and Questions |
| The school year's dates (June 15 to April 14) with the Principal | Team Tasks and Questions |
| Which archive reasons the clinic uses; whether 7 days' notice is right | Team Tasks and Questions |

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
