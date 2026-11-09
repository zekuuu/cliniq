# CLINIQ Backend Readiness Checklist

Verified Friday, October 09, 2026 — 00:11 PHT. Based on `main` at commit `4c3c8c9`. No repo files were changed before this checklist was integrated. Refreshed against the code on Saturday, October 31, 2026 (commit `9b4861db`). **Refreshed Saturday, November 07, 2026 — 13:35 PHT against `main` `cfd4bd84` by the counter-check ([`Backend-Counter-Check-Nov7.md`](./Backend-Counter-Check-Nov7.md)).**

## Summary

The backend foundation is built: no tables or feature endpoints yet. The [ERD and data dictionary](../02-Architecture/Database/ERD.md) are approved (ADR-057), and migrations are built from them in phase B1. The frontend has already written much of the spec: the mock API, the entity types, the access matrix, and the ADRs.

**Suggested order of work**

1. ERD and data dictionary
2. API contract
3. Sanctum, foreign-key, and audit-log decisions
4. Clinic-PC deployment checks (section 4)
5. Client items

---

## 1. Where things stand today

| Area | Current state |
|---|---|
| `backend/` | Laravel 13 foundation: Sanctum SPA mode, CORS, middleware, error format, audit contract, helpers, 79 tests. Two routes, no tables. |
| `ERD.md` | Approved by Zean, Sunday, November 1, 2026 — 01:39 PHT (ADR-057), with a data dictionary, reference schema and constraint tests. Since then changed through ADR-063, 064, 071, 072, 073 and 075: 47 tables, 247 constraint tests passing on MariaDB 10.11.16 (November 7, 2026). |
| Mock API (`api.ts`) | 126 exported functions, 15 exported constants and 19 error classes, about 3,840 lines (November 7, 2026; 104 and 10 on October 31). It holds real business rules: stock integrity, excused-period checks, duplicate-student detection, LRN validation and uniqueness, incident stage rules. It is a working but unwritten API contract. |
| Auth and roles | The access matrix in `Module-Overview.md` covers 11 rows (Modules 1 to 5 and 7 to 11, plus 2a) × 2 roles. ADR-015 sets a 7-day session lifetime and lockout after 5 failed attempts for 30 minutes; each role is signed out after its own idle minutes, Staff 60 and Admin 30, both settings (ADR-048, amended by ADR-078 on main, pending merge; Sunday, November 08, 2026 — 18:35 PHT); ADR-056 chose SPA cookie mode. |

---

## 2. Blockers: do these before any migration

- [x] **ERD and data dictionary review/approval.** Approved by Zean, Sunday, November 1, 2026 — 01:39 PHT (ADR-057): the schema loads and 191 of 191 constraint tests pass (247 of 247 on November 7, 2026, after ADR-063 to ADR-075). Every provisional field below is settled in `02-Architecture/Database/ERD-Review.md`:
  - excuse-letter draft and approval fields (excused period, teacher note)
  - `Visit.referredTo`
  - `Incident.generalNotes` (optional Stage 1 notes)
  - `itemsGiven` lines (own table with the name and unit snapshot, not a JSON blob)
  - inventory adjustment type, its reason, and its note
  - calendar events
  - issue reports
  - PE referrals
  - record reviews
  - vitals (an open key/value shape, so decide which fields exist)
- [x] **Frontend-only data needs a real home.** *Done in the approved schema (checked Saturday, November 07, 2026 — 13:35 PHT): `users` has `password_hash`, `must_change_password`, `failed_login_count` and `locked_until`, and the authenticator columns with `recovery_codes` (ADR-073); `complaint_types` and `triage_steps` hold the checklist. One gap: staff record reviews (ADR-067) have no table, counter-check C-1. Closed Saturday, November 07, 2026 — 16:15 PHT: `staff_record_reviews` (ADR-076).* `devAccounts` becomes the users table, which also needs `password_hash`, `must_change_password`, `failed_attempts`, and `locked_until`. None of these are in the `User` type today. The complaint types with first-aid checklist steps are clinical content, so they need a table and a nurse's sign-off.
- [x] **Foreign-key decision.** Settled by ADR-028 and built in the mock: records link by the internal student id; the LRN is a unique attribute, set once (ADR-028 note), that never appears in a URL or an audit entry.
- [x] **API contract.** Written as a proposal in `API-Contract.md` (Saturday, October 31, 2026, Part 1); its 20 questions are open. Turn the 104 mock functions into endpoint specs: URL, method, allowed role, request and response shape, error cases. Use one error format (for example 422 with field errors, plus a separate shape for business rejections such as "Medicines on a completed incident can't be changed"). This is the cheapest document to produce, because the code is already the draft.
- [x] **Sanctum mode.** Development-Phases B2 says to confirm which mechanism applies. ADR-015 requires a 7-day lifetime but explicitly leaves API-token versus SPA-cookie configuration to B2; `.env.example` currently contains SPA-cookie settings. Choose with project approval before implementation; this checklist does not create or amend an ADR. **Settled Saturday, October 31, 2026 — 18:20 PHT: SPA cookie mode ([ADR-056](../06-Decisions/ADR-056-Backend-Preparation-Sanctum-SPA-Cookie-Mode-Own-Branch-Nothing-Wired-No-Migrations-Before-ERD-Approval.md)).**
- [x] **Audit-log design.** *Done (checked Saturday, November 07, 2026 — 13:35 PHT): `audit_logs` in the approved schema, summaries by field name (ADR-017), the actor's role stored (ADR-057 item 12), 10 years (ADR-057), and every event listed in `Audit-Coverage.md`.* Define the table, which events are logged, how `summary` is produced (field names only, never values, per ADR-017), and a retention number. Retention is 10 years (ADR-037, ADR-051), not yet confirmed by the school. No role can edit or delete an entry (ADR-016).

---

- [x] **Staff record reviews need a table** (counter-check C-1, Saturday, November 07, 2026 — 13:35 PHT): the staff Incomplete Records page (ADR-067) has no home in the schema. Decide the shape before B1 (`DECIDE` in `Backend-Issues-and-TODOs.md`). *Done Saturday, November 07, 2026 — 16:15 PHT: `staff_record_reviews`, ADR-076; 48 tables, 254 constraint tests passing. Safe to start B1.*
- [x] **The adjustment note CHECK contradicted ADR-068** (counter-check C-2): removed Saturday, November 07, 2026 — 13:35 PHT.

## 3. Open decisions that affect the schema

- [x] **Incident Stage 2:** can medicines be edited after completion? No (ADR-049); rejected, with a `ponytail:` marker in `completeIncidentStageTwo`.
- [x] **Sign-off:** should a Stage 1 incident be signable? No: only a completed (Stage 2) record is signed off (Zean, Thursday, October 22, 2026).
- [ ] **Printed documents:** the Excuse Letter and Incident Report need a human-facing reference number, since internal ids must never be shown.
- [x] **Stored letters:** should an approved Excuse Letter keep its final wording? Yes (ADR-049); stored with the approval.
- [x] **Reports:** computed live, with no Finalize month (ADR-050): store only the request (type, range, who) and generate the data on demand, as the mock does.
- [ ] **School year and grade promotion:** decided (ADR-047, ADR-051): one yearly import of the registrar's list. The import is not built and waits for the school's data privacy agreement and the file format.

---

## 4. Environment and deployment (not documented anywhere)

- [x] **HTTPS on the LAN.** ~~Deferred to a deployment with real data (ADR-057, `LATER`).~~ *Closed Sunday, November 08, 2026 — 18:35 PHT as decided: not needed. CLINIQ runs on the clinic PC only at `http://localhost`, so no request crosses a network (ADR-079 on main, pending merge). If the PC ever joins the school network, HTTPS returns with a new decision (`Environment-Setup.md`, "Clinic PC only").*
- [ ] **Clinic PC only** (added Sunday, November 08, 2026 — 18:35 PHT, ADR-079 on main, pending merge): Apache on `127.0.0.1:80` with `Require local`; Windows Firewall blocks inbound; nothing forwarded from the router; no fixed IP, hostname or certificate; the clinic values of `APP_URL`, CORS, Sanctum stateful domain, session domain and `SESSION_SECURE_COOKIE=false`; the start-up check on the `secure` flag (B2). All in `Environment-Setup.md`.
- [ ] **The shared, unlocked room** (added Sunday, November 08, 2026 — 18:35 PHT): Windows sign-in password and screen lock after 5 to 10 minutes; BitLocker if Windows Pro; one Staff account per person; at least one backup drive kept out of the room, since a backup only on the PC's own disk is not enough.
- [ ] **PHP version.** The development XAMPP has PHP 8.5.12 and Laravel 13 fits it (`Environment-Setup.md`). The clinic computer's check is deferred to deployment (ADR-057, `LATER`), because development and testing stay on Zean's machine.
- [ ] **Pinned versions** for XAMPP, PHP, MariaDB, and Laravel. Pinned in `Environment-Setup.md`; the clinic computer is matched at deployment (ADR-057, `LATER`).
- [ ] **Backup plan.** Locations, folders and the 60-per-location limit are decided (ADR-052). The `mysqldump` plus Task Scheduler design is not agreed with the client yet. Also decide how a backup run reports back to Laravel (a log row or a status file), since the Backup screen reads it.
- [ ] **Holiday source.** Still unvalidated (ADR-020). Lowest priority.
- [ ] **Encryption-key custody** (added Saturday, November 07, 2026 — 13:35 PHT): `APP_KEY` encrypts the authenticator secrets (ADR-073); who holds it and where it is backed up (`DECIDE`, `Environment-Setup.md`).
- [ ] **Break-glass for the Administrator** (added Saturday, November 07, 2026 — 13:35 PHT): the offline `cliniq:reset-admin-password` command, built in B2 (`Environment-Setup.md`), and the Administrator sets up the authenticator at handover.
- [x] **School years table** (added Saturday, November 07, 2026 — 13:35 PHT): `school_years`, started and ended by hand (ADR-075), in the schema with its tests; the B1 seeder adds the two starting rows.

---

## 5. Seed and real data to collect

- [ ] Grade levels
- [ ] Real complaint types (with the nurse's sign-off)
- [ ] Medicine and supply list, with starting stock and expiry dates
- [ ] Initial accounts (Staff, Admin)
- [ ] Registrar masterlist file format, with column names and a sample, so the import is built to match
- [ ] Migration plan for the mock seed: keep it as the dev seeder, and keep separate real seed data for production

---

## 6. Integration process

- **Switch one module at a time.** The 22 feature `api/` TypeScript files are the swap point. Add one HTTP client and a `VITE_USE_MOCK` flag so each module moves to the real backend independently, as ADR-006 intends.
- **Tests.** Write Pest feature tests that port the mock's rules (the existing Vitest tests in `mock-db` are good cases to copy), plus one per role for the permission matrix.
- **Definition of done** for each backend phase: migration, endpoint, permission test, audit entry, and the frontend module switched over.

---

## 7. Where I'd push back

1. **The plan has slipped.** The phase table says auth (B2) and audit (B3) should land before F2 gets far, but F2 is nearly complete on mocks. The mock auth hides how much the screens assume real login state, so do B2 and B3 first, before any module API.
2. **Logic lives in two places for now.** `api.ts` has real business rules. The backend must copy them exactly, or the two will drift. Treat `api.ts` as the executable spec and port it function by function.
3. **Module list.** The backend README follows ADR-009: 8 feature modules plus a shared AuditLog. The ERD (rule M-1) adds the first-aid checklist and the Audit Log Viewer, and staff patients (ADR-043) have no module yet. The NFR no longer states a number. Settle the list before creating the folder structure.
4. **Changes to the approved ERD go through a new decision** (ADR-057), and `02-Architecture/Database/Checks/` is run again with them.

---

## Next step

Part 2 (the Laravel foundation), then the B1 migrations from the approved ERD.
