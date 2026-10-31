# Backend Loop Engineering — Prepare, Build the Foundation, Then Cross-Check Everything

This is the **operating manual an agent keeps open while building the backend**, the counterpart of [`Frontend-Loop-Engineering.md`](./Frontend-Loop-Engineering.md). [`Development-Phases.md`](./Development-Phases.md) says *what* to build and in what order (B0 to B10); this file says *how*, and gives a resumable checklist so a fresh agent can pick up exactly where the last one stopped, even mid-item.

Written Saturday, October 31, 2026 — 18:15 PHT, with [ADR-056](../06-Decisions/ADR-056-Backend-Preparation-Sanctum-SPA-Cookie-Mode-Own-Branch-Nothing-Wired-No-Migrations-Before-ERD-Approval.md).

**Backend only.** This covers B0 to B10. Switching a frontend module from the mock layer to the real API is a separate, later step (see "Integration is not part of this loop" below).

---

## The ground rules (from ADR-056)

1. **All backend work happens on a branch named `backend`.** Create it from the newest branch (at last check `main`) and keep using it; a later session switches to it, never makes a second one. Nothing is committed, pushed, merged, rebased or reset unless Zean asks.
2. **Only the backend side changes.** Code goes in `backend/` and nowhere else. Do not touch `frontend/`: no `.env` change, no API-client change, no `VITE_*` flag, no proxy setting, no test. The knowledge base may change only for what this file and `AGENTS.md` require: logs, the new backend documents, and the READMEs and checklists that describe the backend. If a backend task seems to need a frontend change, stop and write it down as an `Issues-and-TODOs.md` entry instead.
3. **Nothing is connected yet, and the mock data layer stays.** The backend is prepared (routes, middleware, CORS, error format, audit service, tests) and proven with its own tests. The frontend keeps running on the mock data layer, and `frontend/src/lib/mock-db/` is **never removed, emptied, renamed or edited** by backend work: it is the executable spec (rule 5), the source of the future development seeder, and the fallback behind the per-module switch when integration happens (ADR-006). It stays as the reference for every backend phase, **even after the backend is integrated**. Deleting it is not part of any backend phase or of the integration; only Zean can decide that, later, with an ADR, once he is sure everything in the backend is good.
4. **No migration, seeder or model with columns before the ERD is approved.** The ERD is a proposed draft (`02-Architecture/Database/ERD.md`). Until Zean says it is approved, the work around the database is review, not creation. Code that needs a table (the users table for sign-in, the audit log table) is written against an interface and tested with in-memory fakes, and the real table waits.
5. **The mock API is the executable spec** (`frontend/src/lib/mock-db/api.ts`, with its types in `frontend/src/types/` and its tests in `frontend/src/lib/mock-db/`). The backend must copy its rules exactly, function by function. If you think a rule is wrong, say so and ask; do not "fix" it on one side only, or the two drift apart.
6. **Auth mode is Sanctum SPA cookie** (ADR-056). Session lifetime and lockout follow ADR-015; the Admin idle sign-out follows ADR-048.
7. **Backend has its own logs.** Backend issues and TODOs go in [`08-Logs/Backend-Issues-and-TODOs.md`](../08-Logs/Backend-Issues-and-TODOs.md) and backend changelog rows in [`08-Logs/Backend-Changelog.md`](../08-Logs/Backend-Changelog.md), never in the main `Issues-and-TODOs.md` and `Changelog.md`, so the `backend` branch and `main` never edit the same file. Same tags, counting rule and real timestamps as the main files. An entry that touches both sides goes in the main file and names the backend entry. Name backend session logs in `Agent-Sessions/` with `-backend-` in the file name.

---

## Phase 0 — Read What's Changed, Before Building Anything

Once per continuous session, not per item.

1. Read `08-Logs/Backend-Changelog.md` and `08-Logs/Backend-Issues-and-TODOs.md` in full, then `08-Logs/Changelog.md` (the main one, for anything that changed the mock API, an ADR or the access matrix), `06-Decisions/` (every ADR, especially ADR-009, 015, 016, 017, 028, 029, 033, 038, 039, 043, 047, 048, 051, 052, 056), and the open items in the main `08-Logs/Issues-and-TODOs.md` that name the database, the audit trail or the integration.
2. Read `04-Development/Backend-Readiness-Checklist.md`, `02-Architecture/Database/ERD.md` and `Data-Dictionary.md` (drafts), and `backend/README.md`.
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

A ticked box is not permanent. If `Changelog.md` shows an ADR, the mock API or the access matrix changed after an item was ticked, the item needs re-checking.

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

- [ ] Build / [ ] Audit — **P1. Environment check**: PHP version and extensions in the target XAMPP, Composer, MariaDB version, the Laravel version that fits, all pinned in `Environment-Setup.md`
  Build note: · Audit note:
- [ ] Build / [ ] Audit — **P2. API contract** (`04-Development/API-Contract.md`): every mock function mapped to an endpoint with URL, method, allowed roles, request and response shape, errors, audit event and the mock behaviour it copies; the single error format
  Build note: · Audit note:
- [ ] Build / [ ] Audit — **P3. ERD review** (`02-Architecture/Database/ERD-Review.md`): the draft checked against the mock functions, the entity types and the ADRs; gaps, provisional fields and the approval checklist. The ERD, Data Dictionary and Reference Schema are not edited until Zean approves the changes
  Build note: · Audit note:

### Phase B0 — Scaffold and foundation (code in `backend/`)

- [ ] Build / [ ] Audit — **B0.1 Scaffold**: Laravel installed into `backend/` without overwriting the README or `.env.example`; Pest, Pint, Larastan; composer scripts for test, lint and analyse
  Build note: · Audit note:
- [ ] Build / [ ] Audit — **B0.2 Modular structure** (ADR-009): `App\Modules\` and `App\Shared\` PSR-4 mapping, one folder per module, the module list reconciled with ADR-009 and the ERD rule M-1 (questions asked, not guessed)
  Build note: · Audit note:
- [ ] Build / [ ] Audit — **B0.3 Configuration**: timezone `Asia/Manila`; `config/cliniq.php` holding the business numbers (7-day session, 5 failed attempts then a 30-minute lock, Admin idle 30 minutes, LRN length 12) with their ADR named beside each; a complete `.env.example`
  Build note: · Audit note:
- [ ] Build / [ ] Audit — **B0.4 CORS and Sanctum SPA** (ADR-056): explicit allowed origin from the environment, credentials on, CSRF cookie route, stateful domains, session cookie settings, session lifetime from ADR-015
  Build note: · Audit note:
- [ ] Build / [ ] Audit — **B0.5 Middleware**: JSON-only API, request id, security headers, no-store cache headers on API responses, role middleware, Admin idle middleware, throttles
  Build note: · Audit note:
- [ ] Build / [ ] Audit — **B0.6 Error format**: one JSON envelope and a handler that maps every failure to it without leaking anything
  Build note: · Audit note:
- [ ] Build / [ ] Audit — **B0.7 Audit contract** (`app/Shared/AuditLog/`): the interface, the event names, the field-names-only rule, an in-memory implementation for tests; no table yet
  Build note: · Audit note:
- [ ] Build / [ ] Audit — **B0.8 Shared helpers**: masked LRN (identical output to the frontend helper), `Asia/Manila` date helpers, the age helper (ADR-054, calculated, never stored)
  Build note: · Audit note:
- [ ] Build / [ ] Audit — **B0.9 Health route and route surface test**: `GET /api/health`; a test that fails when an undocumented route appears
  Build note: · Audit note:
- [ ] Build / [ ] Audit — **B0.10 Backend documents**: `backend/README.md`, `Environment-Setup.md`, `Backend-Readiness-Checklist.md` ticks, session log, Changelog row, Issues entries
  Build note: · Audit note:

### Phases B1 to B10 (not started; each waits for the item named)

- [ ] Build / [ ] Audit — **B1. Database schema** — waits for the ERD approval (ADR-056 rule 4)
- [ ] Build / [ ] Audit — **B2. Sign-in and roles** — waits for the users table (B1); lockout, forced password change, Admin idle sign-out
- [ ] Build / [ ] Audit — **B3. Audit trail table and viewer API** — waits for B1
- [ ] Build / [ ] Audit — **B4. Student Records API** (including staff patients, ADR-043, and the optional birthdate, ADR-054)
- [ ] Build / [ ] Audit — **B5. Clinic Visit API** (excuse letters, follow-ups)
- [ ] Build / [ ] Audit — **B7. Emergency Response API** (two stages, incident report)
- [ ] Build / [ ] Audit — **B8. Inventory API** (batches, stock flow, write-off notes)
- [ ] Build / [ ] Audit — **B9. Dashboard, Activity calendar, Reports and Sports Report API**, and the holiday sync job (ADR-020)
- [ ] Build / [ ] Audit — **B10. User Management and Backup API** (ADR-039, ADR-052)

(B6 was removed with the QR feature, ADR-027; its number is kept.)

---

## Definition of done, every backend item

A migration (once approved), the endpoint, a Pest test per role for its permission, a test per rejection, an audit entry, a contract entry, the box ticked with its note, a session log entry, and a row in `Backend-Changelog.md` (and any issue in `Backend-Issues-and-TODOs.md`). The frontend is not changed and not switched over.
