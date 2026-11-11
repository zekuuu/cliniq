# Backend Loop Engineering — Prepare, Build the Foundation, Then Cross-Check Everything

This is the **operating manual an agent keeps open while building the backend**, the counterpart of [`Frontend-Loop-Engineering.md`](./Frontend-Loop-Engineering.md). [`Development-Phases.md`](./Development-Phases.md) says *what* to build and in what order (B0 to B10); this file says *how*, and gives a resumable checklist so a fresh agent can pick up exactly where the last one stopped, even mid-item.

Written Saturday, October 31, 2026 — 18:15 PHT, with [ADR-056](../06-Decisions/ADR-056-Backend-Preparation-Sanctum-SPA-Cookie-Mode-Own-Branch-Nothing-Wired-No-Migrations-Before-ERD-Approval.md).

**Backend only.** This covers B0 to B10. Switching a frontend module from the mock layer to the real API is a separate, later step (see "Integration is not part of this loop" below).

---

## The ground rules (from ADR-056)

1. **All backend work happens on a branch named `backend`.** Create it from the newest branch (at last check `main`) and keep using it; a later session switches to it, never makes a second one. Nothing is committed, pushed, merged, rebased or reset unless Zean asks.
2. **Only the backend side changes.** Code goes in `backend/` and nowhere else. Do not touch `frontend/`: no `.env` change, no API-client change, no `VITE_*` flag, no proxy setting, no test. The knowledge base may change only for what this file and `AGENTS.md` require: logs, the new backend documents, and the READMEs and checklists that describe the backend. If a backend task seems to need a frontend change, stop and write it down as an `Frontend-Issues-and-TODOs.md` entry instead.
3. **Nothing is connected yet, and the mock data layer stays.** The backend is prepared (routes, middleware, CORS, error format, audit service, tests) and proven with its own tests. The frontend keeps running on the mock data layer, and `frontend/src/lib/mock-db/` is **never removed, emptied, renamed or edited** by backend work: it is the executable spec (rule 5), the source of the future development seeder, and the fallback behind the per-module switch when integration happens (ADR-006). It stays as the reference for every backend phase, **even after the backend is integrated**. Deleting it is not part of any backend phase or of the integration; only Zean can decide that, later, with an ADR, once he is sure everything in the backend is good.
4. **The ERD is approved** (Zean, Sunday, November 1, 2026 — 01:39 PHT, ADR-057), and changed since only through ADR-063, 064, 071, 072, 073, 075, 076 and 078: **48 tables, 462 columns** (loaded and counted Monday, November 09, 2026 — 20:08 PHT). Migrations, seeders and models with columns may be written in phase B1, in the order of `ERD.md` section 13, with the checks this file sets. Later changes to the approved design go through a new decision, and `02-Architecture/Database/Checks/` is run again. Before B1, code that needs a table is written against an interface and tested with in-memory fakes.
5. **The mock API is the executable spec** (`frontend/src/lib/mock-db/api.ts`, with its types in `frontend/src/types/` and its tests in `frontend/src/lib/mock-db/`). It has **132 exported functions, 20 exported constants and 20 error classes** (Monday, November 09, 2026 — 20:08 PHT; 126, 15 and 19 at the counter-check of November 7), and `API-Contract.md` names all 132. The backend must copy its rules exactly, function by function. If you think a rule is wrong, say so and ask; do not "fix" it on one side only, or the two drift apart.
6. **Auth mode is Sanctum SPA cookie** (ADR-056). Session lifetime and lockout follow ADR-015: a session ends 7 days after sign-in (ADR-057); 5 wrong passwords, counted across sign-in and password recovery, lock the account for **5 minutes** (5 since Sunday, November 8, 2026; it was 30). The idle sign-out follows ADR-048, made per role (Staff 60, Admin 30, both settings) by ADR-078. B0.3 and B0.5 were reworked for this on Monday, November 9, 2026 (`session.idle`, `session_expired`, the keep-alive); B2 adds what needs the users and `system_settings` tables (`API-Contract.md`, "Idle sign-out").
7. **Backend has its own logs.** Backend issues and TODOs go in [`08-Logs/Backend-Issues-and-TODOs.md`](../08-Logs/Backend-Issues-and-TODOs.md) and backend changelog rows in [`08-Logs/Backend-Changelog.md`](../08-Logs/Backend-Changelog.md), never in the main `Frontend-Issues-and-TODOs.md` and `Frontend-Changelog.md`, so the `backend` branch and `main` never edit the same file. Same tags, counting rule and real timestamps as the main files. An entry that touches both sides goes in the main file and names the backend entry. Name backend session logs in `Agent-Sessions/` with `-backend-` in the file name.
8. **The ADRs are the authority.** A later dated note on an ADR wins over its original text, and a newer ADR over an older one. `API-Contract.md`, `ERD.md`, `Data-Dictionary.md` and `Reference-Schema.sql` follow the ADRs; when they disagree, fix the document from the ADR, or ask if the ADR itself looks wrong.

---

## Phase 0 — Read What's Changed, Before Building Anything

Once per continuous session, not per item.

1. Read `08-Logs/Backend-Changelog.md` and `08-Logs/Backend-Issues-and-TODOs.md` in full, then `08-Logs/Frontend-Changelog.md` (the main one, for anything that changed the mock API, an ADR or the access matrix), `06-Decisions/` (every ADR, especially ADR-009, 015, 016, 017, 028, 029, 033, 038, 039, 043, 047, 048, 051, 052, 056), and the open items in the main `08-Logs/Frontend-Issues-and-TODOs.md` that name the database, the audit trail or the integration.
2. Read `04-Development/Backend-Readiness-Checklist.md`, `02-Architecture/Database/ERD.md` and `Data-Dictionary.md`, and `backend/README.md`.
3. Read the cross-cutting skills in `.claude/skills/` (`cliniq-audit-trail`, `cliniq-display-privacy`, and any other the current `Skills-Setup.md` lists as cross-cutting). Component skills are frontend-only; skip them.
4. Run the frontend's own checks once for a baseline (the frontend must still pass; you never change it), and note the commit you are building on.

---

## Phase 1 — Build (Every Item, In Order)

For each checklist item below:

1. **Read.** Its entry in `Development-Phases.md`, the matching mock functions and tests, the ADRs it touches, and the API contract entry (`04-Development/API-Contract.md`, once written in item P2).
2. **Test first.** Write the Pest test that states the rule: the permission (one test per role), the success, each rejection with its error code, and the audit entry. A rule you cannot test is a rule you do not understand yet.
3. **Build.** Smallest change that passes. Business logic in `app/Modules/<Module>/Services/`, shared plumbing in `app/Shared/`. No new package without asking.
4. **Log and check off (Build).** Tick the item's Build box, write its one-line Build Resume Note (what exists, and what comes next if you stopped now), and add an `08-Logs/Agent-Sessions/` entry at a natural stopping point.

Do not Countercheck, Audit or Simulate in this phase. That is Phase 2, for every item at once.

---

## Phase 2 — Cross-Check and Audit (Only After Phase 1 Is Done For The Round)

For each item, in the order it was built:

1. **Countercheck against the mock API.** Go back to the mock function and its tests. Does the endpoint apply the same validation, the same order of checks, the same rejection messages and the same side effects (stock lowered, excuse letter prepared, follow-up created, counts changed)? Treat it as grading against a rubric, not "looks about right".
2. **Audit.**
   - **Permissions.** The access matrix in `Module-Overview.md` (Access Summary) against the route middleware, for Staff, Admin / Principal and no sign-in. An Admin never writes; a missing sign-in is 401; a wrong role is 403.
   - **Audit trail.** Every create, update, approve, print, archive, sign-in and opened profile or incident report records who, what, which record and when. The summary names fields, never values (ADR-017); no LRN, name or birthdate ever reaches the audit log, a log file or an error message.
   - **Display privacy.** A response that lists several students carries the masked LRN and never a birthdate or age (ADR-004, ADR-040, ADR-054). A URL never carries an LRN (ADR-028).
   - **Error format.** One shape for every error: validation, business rejection, 401, 403, 404, 419, 429 and 500. A 500 never leaks a stack trace, a query or a record.
   - **Records are never deleted.** Archive and soft semantics only (see the data retention note).
   - **Time.** Stored and returned in one agreed form; shown in `Asia/Manila`; never read from the client.
   - **Security basics.** Debug off in the production example, no registration route, throttled sign-in, hashed passwords, strict models (no mass-assignment holes), CORS with an explicit origin list (never `*` with credentials).
3. **Simulate.** Trace one whole flow through HTTP tests, not one endpoint (for example: record a visit with medicines, check the stock lowered, check the audit entry, check the Dashboard count). Only possible once the modules in the chain exist.
4. **Confirm.** Explicit pass or fail. If anything fails, fix it and re-run that item's steps before ticking the box. Never tick a box with a known issue "to fix later".
5. **Log and check off (Audit).** A full `08-Logs/Agent-Sessions/` entry with a real timestamp, the Audit box ticked, and the Audit Resume Note filled in.

A ticked box is not permanent. If `Frontend-Changelog.md` shows an ADR, the mock API or the access matrix changed after an item was ticked, the item needs re-checking.

---

## Deterministic checks to prefer over an AI reasoning pass

Run these first; they are cheap and exact. The exact commands are recorded in `backend/README.md` once item B0.1 sets them up.

- Tests (Pest), code style (Pint), static analysis (Larastan), `composer audit`, `php artisan route:list` (compare it to the API contract), `php artisan config:show` for the cors, session and sanctum files.
- A search of the code and logs for `lrn`, `birth`, `password` and `token` to confirm none is written to a log or an audit summary.

---

## Integration is not part of this loop

Wiring a frontend module to the real backend (the 21 feature `api/` files, one HTTP client, a `VITE_USE_MOCK` flag per module as ADR-006 intends) is a later, separate step. It needs its own branch, its own decision (ADR) and Zean's go-ahead. Until then the backend is checked only by its own tests.

---

## Checklist

Each item has a **Build** and an **Audit** box, each with its own Resume Note. Leave notes blank until you start the item.

### Prepare (documents and checks only, no backend code)

- [x] Build / [x] Audit — **P1. Environment check**: PHP version and extensions in the target XAMPP, Composer, MariaDB version, the Laravel version that fits, all pinned in `Environment-Setup.md`
  Build note: pinned from the development machine's XAMPP. The clinic computer's check and HTTPS are deferred to deployment (ADR-057, `LATER`); MariaDB hardening is a checklist in `Environment-Setup.md`. · Audit note: Versions re-read from the install; the scaffold ran on them. The commands were corrected to what ran.
- [x] Build / [x] Audit — **P2. API contract** (`04-Development/API-Contract.md`): every mock function mapped to an endpoint with URL, method, allowed roles, request and response shape, errors, audit event and the mock behaviour it copies; the single error format
  Build note: 102 entries, 94 of 104 functions mapped, coverage proved by script. All questions closed by ADR-057, Q7b included. B0.5 gains the fixed-session middleware. · Audit note: All 98 mock line citations point at their function, 104 of 104 functions accounted for, every entry has roles or a stated reason. *Update (Monday, November 09, 2026 — 20:08 PHT): 126 endpoint entries; all 132 functions named, after mapping the seven that `main` added on November 8 and 9 (idle settings, school-year history and reminder, latest report month).*
- [x] Build / [x] Audit — **P3. ERD review** (`02-Architecture/Database/ERD-Review.md`): the draft checked against the mock functions, the entity types and the ADRs; gaps, provisional fields and the approval checklist. The ERD, Data Dictionary and Reference Schema are not edited until Zean approves the changes
  Build note: 30 of 30 gaps closed in the drafts (ADR-057), schema loaded, 191 of 191 constraint tests pass (`Checks/`), ERD approved. D-01 amends ADR-017 (ADR-057 item 12). · Audit note: Schema reloaded, 191 of 191 tests, dictionary against the loaded schema: 431 columns, no drift. *Update (Monday, November 09, 2026 — 20:08 PHT): 48 tables, 462 columns, **260 of 260** constraint tests (accepts 38, count 46, rejects 176) on MariaDB 10.11.16, scratch database dropped.*
- [x] Build / [x] Audit — **P4. Counter-check of the frontend against the backend documents** ([`Backend-Counter-Check-Nov7.md`](./Backend-Counter-Check-Nov7.md), Saturday, November 07, 2026 — 13:35 PHT): the code first, then each backend document, before B1
  Build note: 2 BLOCKER, 4 MISMATCH, 5 DRIFT, 8 NOTE. Fixed: `chk_txn_other_note` removed (ADR-068), the contract's Stage 2 and adjust entries, 7 new contract entries, the checklist refreshed. Counted then: 126 functions, 15 constants, 19 error classes, 47 tables. · Audit note: Constraint tests 247 of 247. "Safe to start B1? Yes" once C-1 was settled by ADR-076 (16:15 PHT the same day).
- [x] Build / [x] Audit — **P5. Staff record reviews table** (ADR-076): `staff_record_reviews`, the 48th table
  Build note: `staff_id` to `personnel`, CASCADE; `opened_at`, the resolved pair, one open review per record; mirrors `student_record_reviews` without the import columns. ERD, dictionary, schema, contract and the migration order updated. · Audit note: Constraint tests 254 of 254. Settles counter-check C-1, so B1 may start.
- [x] Build / [x] Audit — **P6. Decisions of November 8 and 9** (ADR-077, ADR-078, ADR-079) carried into the backend documents
  Build note: ADR-077: the Admin reads the monthly report on screen only; `GET /api/reports/latest-month` and the school-year history feed the month drop-down; no print endpoint; every Sports Report endpoint stays 403 for the Admin. ADR-078: `system_settings` gets `idle_signout_minutes_staff` (60) and `idle_signout_minutes_admin` (30), 10 to 240 by `chk_settings_idle_signout`; the contract gets per-role idle, `POST /api/session/keepalive` and 401 `session_expired`. ADR-079: `http://localhost` on the clinic PC only, the "HTTPS on the LAN" item closed, the cookie and CORS values in `Environment-Setup.md`. · Audit note: 260 of 260 constraint tests after ADR-078 (November 8); after the merge of `main`, the documents were rechecked against the ADRs as written and matched (November 9, 18:08 PHT). Middleware rework built the same day: 85 tests.

### Phase B0 — Scaffold and foundation (code in `backend/`)

- [x] Build / [x] Audit — **B0.1 Scaffold**: Laravel installed into `backend/` without overwriting the README or `.env.example`; Pest, Pint, Larastan; composer scripts for test, lint and analyse
  Build note: Laravel 13.39, Sanctum 4.3.3, Pest 5.3.4, Pint, Larastan; scripts test, lint, analyse, check. The skeleton's migrations, factory, seeder, `User` model and web assets left out (ADR-056). · Audit note: Lock file matches the pins; `composer audit` clean; root `.gitignore` covers the real folders, and the nested ignores keep `storage/` in a fresh clone. No fix needed.
- [x] Build / [x] Audit — **B0.2 Modular structure** (ADR-009): `App\Modules\` and `App\Shared\` PSR-4 mapping, one folder per module, the module list reconciled with ADR-009 and the ERD rule M-1 (questions asked, not guessed)
  Build note: 11 modules from ERD rule M-1 plus `Shared`, PSR-4 mapped. · Audit note: Differs from ADR-009 only as M-1 says (QR gone; checklist, staff patients, audit viewer added). `Shared` also gained `Auth`, `Http`, `Logging`, `Support`. Logged as a NOTE for Zean.
- [x] Build / [x] Audit — **B0.3 Configuration**: timezone `Asia/Manila`; `config/cliniq.php` holding the business numbers (7-day session, 5 failed attempts then a 5-minute lock, idle minutes per role, LRN length 12) with their ADR named beside each; a complete `.env.example`
  Build note: `config/cliniq.php`, timezone, complete `.env.example` with no secret. · Audit note: Numbers match ADR-015, ADR-028, ADR-048. `.env.example` uses `cliniq_app`, never root. *Update (Monday, November 09, 2026 — 20:08 PHT): `lock_minutes` is 5 and the idle numbers are `idle_signout_minutes_staff` 60 and `idle_signout_minutes_admin` 30 (ADR-015 as amended November 8, ADR-078). The lockout rule, as `main` codes it (`api.ts` `recordFailure`, `features/auth/lockMessage.ts`, `56cb91b`): sign-in and password recovery share one count of 5 failures; a wrong attempt answers "Unable to sign in with those credentials." and, from 3 left, "Your account will be locked after N more failed attempt(s)."; the fifth locks for 5 minutes with "This account is temporarily locked after repeated failed attempts. Try again at HH:MM." and the audit entry "Account locked for 5 minutes after 5 wrong passwords (sign-in)" or "(password recovery)"; an expired lock clears the count.*
- [x] Build / [x] Audit — **B0.4 CORS and Sanctum SPA** (ADR-056): explicit allowed origin from the environment, credentials on, CSRF cookie route, stateful domains, session cookie settings, session lifetime from ADR-015
  Build note: CORS, stateful API, cookie settings. · Audit note: Found: with one allowed origin the CORS library named it to strangers. Fixed with `DropForeignCorsHeaders`. A wildcard in the environment is dropped. Checked with `config:show` and live curl.
- [x] Build / [x] Audit — **B0.5 Middleware**: JSON-only API, request id, security headers, no-store cache headers on API responses, role middleware, Admin idle middleware, fixed 7-day session middleware (ADR-057), throttles
  Build note: Force JSON, request id, headers, role, Admin idle, fixed session, throttles. · Audit note: Request id is pattern-checked, so it cannot forge a log line. Permissions: 401, 403 and each role tested. `session.fixed` and `admin.idle` wait for routes in B2. *Update (Monday, November 09, 2026 — 18:38 PHT): `admin.idle` became `session.idle`, per role (Staff 60, Admin 30 from config until B1's `system_settings`), with the audit entry "Signed out (idle)"; `session.fixed` answers 401 `session_expired`; `POST /api/session/keepalive` is the first route behind both (ADR-078). 85 tests.*
- [x] Build / [x] Audit — **B0.6 Error format**: one JSON envelope and a handler that maps every failure to it without leaking anything
  Build note: One envelope for every failure. · Audit note: Found: messages differed from the screens. Sign-in, lock and idle wording now match `LoginPage.tsx`. `405` and `bad_request` added to the contract. A 500 leaks nothing, debug on or off.
- [x] Build / [x] Audit — **B0.7 Audit contract** (`app/Shared/AuditLog/`): the interface, the event names, the field-names-only rule, an in-memory implementation for tests; no table yet
  Build note: Interface, event, action and target names, validator, in-memory logger. · Audit note: All 10 actions and 20 target types match the mock. Two limits go to B3: no state summary yet, and one lowercase word passes as a field (`LATER`).
- [x] Build / [x] Audit — **B0.8 Shared helpers**: masked LRN (identical output to the frontend helper), `Asia/Manila` date helpers, the age helper (ADR-054, calculated, never stored)
  Build note: `Lrn`, `Age`, `ClinicTime`. · Audit note: Ported with the frontend's own cases; output identical. Age is never stored.
- [x] Build / [x] Audit — **B0.9 Health route and route surface test**: `GET /api/health`; a test that fails when an undocumented route appears
  Build note: `GET /api/health`, route surface test. · Audit note: `route:list` shows exactly 2 routes. Health works with no database and says nothing about one. *Update (Monday, November 09, 2026 — 20:08 PHT): 3 routes since `POST /api/session/keepalive` (ADR-078); the route surface test lists it.*
- [x] Build / [x] Audit — **B0.10 Backend documents**: `backend/README.md`, `Environment-Setup.md`, `Backend-Readiness-Checklist.md` ticks, session log, Changelog row, Issues entries
  Build note: README, Environment-Setup, checklist, logs. · Audit note: Readiness boxes ticked only where truly done. Scaffold commands corrected to the ones that ran.

### Phases B1 to B10 (not started; each waits for the item named)

- [ ] Build / [ ] Audit — **B1. Database schema** — the ERD is approved (ADR-057)
  **Before B1** (each true on the development machine, or B1 does not start):
  - [ ] MariaDB hardened per `Environment-Setup.md`, "MariaDB hardening": a root password; `bind-address="127.0.0.1"`, checked with `netstat -an | findstr 3306` (it must show `127.0.0.1:3306`; on November 9, 2026 it still showed `0.0.0.0:3306`); the `cliniq` database.
  - [ ] Two accounts: `cliniq_app` (SELECT, INSERT, UPDATE, DELETE on `cliniq.*`) and `cliniq_migrate`, the separate migration account with schema rights (`ERD.md` section 13).
  - [ ] `.env` points at `cliniq_app`. The migration account is used only for the migration command and is never written to `.env` or run by the application.
  **The build:**
  - [x] Migrations in the order of `ERD.md` section 13, one per module (a small group of tables) in that module's folder, loaded with `loadMigrationsFrom`; each with its models, factories and a Pest test. CHECKs copied from `Reference-Schema.sql` with `DB::statement`.
  - [x] The migrations are the schema; `Reference-Schema.sql` is the reference they must match. `php tools/db-checks.php` (in `backend/`) migrates a scratch database, loads `Reference-Schema.sql` into another, compares tables, columns, indexes, CHECKs and foreign keys (48 tables, 462 columns), then runs `Checks/constraint-tests.sql` against the migrated one: 260 of 260 (Tuesday, November 10, 2026 — 13:52 PHT).
  - [ ] **`audit_logs` is append-only:** after its migration, `cliniq_app` keeps only SELECT and INSERT on it (`ERD.md` section 13), with a test that an UPDATE and a DELETE as `cliniq_app` are refused.
  - [ ] The development seeder loads the mock seed (`frontend/src/lib/mock-db/mock-db.json`), which holds no real data, built per module as each lands its models (Zean, November 10, 2026). The product defaults (`grade_levels`, `system_settings`, `reference_settings`, verbatim from the reference seed) ship as the migration `insert_product_defaults`, not a seeder (Zean, Tuesday, November 10, 2026 — 13:58 PHT).
  - [x] Checks: `composer check` (Pint, Larastan, Pest) and `composer audit` (`backend/README.md`). 96 passed, 1 skipped; no advisories (Tuesday, November 10, 2026 — 14:00 PHT).
- [x] Build / [ ] Audit — **B2. Sign-in and roles** — waits for the users table (B1); lockout, forced password change, per-role idle sign-out and the keep-alive (ADR-078)
  - Lockout: as B0.3's note states (5 failures across sign-in and recovery, 5 minutes); 401 `invalid_credentials` and the recovery 422 carry `attempts_left`, 423 `account_locked` carries `locked_until`.
  - Built already (November 9): `session.idle` per role, 401 `session_idle` with "You were signed out after N minutes of inactivity. Sign in again.", 401 `session_expired` at 7 days, `POST /api/session/keepalive` (200 `{ idleSecondsLeft }`, nothing written within 60 seconds of the last counted call).
  Build note (Tuesday, November 10, 2026 — 16:30 PHT, partial, box open): group 1 done: `POST /api/auth/login` (lockout shared via `LoginLockout`), `logout`, `GET /api/auth/me`, `POST /api/auth/password` (history of 5), `account.active` (disabled refused, forced change), `GET`/`PUT /api/settings/idle-signout` through `SettingsService` (60-second cache); `AuthTest` 9 tests. Next: recovery, authenticator, profile, start-up configuration check.
  Build note (Wednesday, November 11, 2026 — 03:08 PHT): group 2 done: recovery check, verify, reset (one-time 10-minute token, per-username limiter); authenticator status, setup, confirm, replace, turn off (RFC 6238 in `Totp`, secret encrypted, codes bcrypt-hashed and single-use, used steps refused); `GET`/`PUT /api/auth/profile`; `ConfigurationCheck` at boot. `AuthenticatorTest` 9 tests; suite 114 passed, 1 skipped. Next: B2 Phase 2 after the other modules; B4 now.
  - Still to do: write the sign-in time at sign-in; refuse a disabled account and enforce `password_change_required`; read the idle minutes per request from `system_settings` through a settings service with a 60-second cache cleared on save (config defaults until then); `GET` and `PUT /api/settings/idle-signout`.
  - `backend/.env.example`: replace `CLINIQ_ADMIN_IDLE_MINUTES` with `CLINIQ_IDLE_SIGNOUT_MINUTES_STAFF=60` and `CLINIQ_IDLE_SIGNOUT_MINUTES_ADMIN=30` (open `FIX` in `Backend-Issues-and-TODOs.md`).
  - The secure cookie on plain `http://localhost` (checked Monday, November 09, 2026 — 20:08 PHT against MDN's `Set-Cookie` and the Sanctum and session config): MDN says a `Secure` cookie is sent over `https:` only, "except on localhost", and that `http:` sites cannot set one, a requirement "ignored when the `Secure` attribute is set by localhost". So `true` would work on `http://localhost` only through that exception, and on any other plain-HTTP address the browser would drop the cookie with no error. Keep `SESSION_SECURE_COOKIE=false` on `http://localhost` (`config/session.php` reads it, default false) and `true` once HTTPS exists; the start-up check refuses a flag that does not match `APP_URL`. Sanctum needs the port in `SANCTUM_STATEFUL_DOMAINS` only when the address has one.
- [x] Build / [ ] Audit — **B3. Audit trail table and viewer API** — waits for B1
  Build note (Tuesday, November 10, 2026 — 14:02 PHT): `DatabaseAuditLogger` bound; `GET /api/audit-log`, `POST /api/audit/views`, `POST /api/audit/prints`; 10 tests. Next: Phase 2, re-run once B2's real sign-in exists.
- [ ] Build / [ ] Audit — **B4. Student Records API** (including staff patients, ADR-043, the optional birthdate, ADR-054, and the staff Incomplete Records queue on `staff_record_reviews`, ADR-067 and ADR-076)
  Build note (Wednesday, November 11, 2026 — 07:26 PHT, partial, box open): group 1 done: `POST /api/students/query`, `search`, `check-duplicates`, `POST /api/students`, `GET /api/students/incomplete`, `GET`/`PUT /api/students/{id}`, `POST /api/students/{id}/archive` in `StudentService` (`StudentRecord` value object, shared `PersonName`, `SchoolYears::labelOn`, `Row`). `StudentRecordsTest` 14 tests. Next: staff patients (personnel, ADR-043, `staff_record_reviews`), patients search, imports, school years, the Archive page API; history and excuse letters wait for B5.
- [ ] Build / [ ] Audit — **B5. Clinic Visit API** (excuse letters, follow-ups)
- [ ] Build / [ ] Audit — **B7. Emergency Response API** (two stages, incident report)
- [ ] Build / [ ] Audit — **B8. Inventory API** (batches, stock flow, write-offs; the adjustment note is optional for every reason, ADR-068; "Commonly used for" is required, ADR-071)
- [ ] Build / [ ] Audit — **B9. Dashboard, Activity calendar, Reports and Sports Report API**, and the holiday sync job (ADR-020); the school-year reminder (ADR-075) and the Admin's view-only monthly reports with `GET /api/reports/latest-month` (ADR-077)
- [ ] Build / [ ] Audit — **B10. User Management and Backup API** (ADR-039, ADR-052)
  - Clinic PC only (ADR-079): a backup stored only on the clinic PC's own disk is not enough; at least one enabled location must be a second drive or a USB drive kept away from the room.

(B6 was removed with the QR feature, ADR-027; its number is kept.)

---

## Definition of done, every backend item

A migration, the endpoint, a Pest test per role for its permission, a test per rejection, an audit entry, a contract entry, the box ticked with its note, a session log entry, and a row in `Backend-Changelog.md` (and any issue in `Backend-Issues-and-TODOs.md`). The frontend is not changed and not switched over. Run the docs check (`npm run docs:check` at the repository root); fix what it flags in the READMEs you touched (added Tuesday, November 10, 2026).
