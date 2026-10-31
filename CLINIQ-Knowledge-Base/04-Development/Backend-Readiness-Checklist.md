# CLINIQ Backend Readiness Checklist

Verified Friday, October 09, 2026 — 00:11 PHT. Based on `main` at commit `4c3c8c9`. No repo files were changed before this checklist was integrated. Refreshed against the code on Saturday, October 31, 2026 (commit `9b4861db`).

## Summary

The backend is a blank slate. A [proposed ERD and data dictionary](../02-Architecture/Database/ERD.md) now exist, but they are not final or approved and must not be used for migrations. The frontend has already written much of the spec: the mock API, the entity types, the access matrix, and the ADRs.

**Suggested order of work**

1. ERD and data dictionary
2. API contract
3. Sanctum, foreign-key, and audit-log decisions
4. Phone HTTPS test
5. Client items

---

## 1. Where things stand today

| Area | Current state |
|---|---|
| `backend/` | Only a README and `.env.example`. Laravel is not scaffolded, and `Environment-Setup.md` still says "not yet executed". |
| `ERD.md` | Proposed draft with a data dictionary and reference schema; it is not final or approved. Development-Phases B1 still prohibits migrations until team approval. |
| Mock API (`api.ts`) | 104 exported functions and 10 exported constants, about 2,990 lines. It holds real business rules: stock integrity, excused-period checks, duplicate-student detection, LRN validation and uniqueness, incident stage rules. It is a working but unwritten API contract. |
| Auth and roles | The access matrix in `Module-Overview.md` covers 11 rows (Modules 1 to 5 and 7 to 11, plus 2a) × 2 roles. ADR-015 sets a 7-day session lifetime and lockout after 5 failed attempts for 30 minutes; ADR-048 signs the Admin out after 30 idle minutes; ADR-056 chose SPA cookie mode. |

---

## 2. Blockers: do these before any migration

- [ ] **ERD and data dictionary review/approval.** A proposed draft now exists; do not tick this item or build migrations until the team reviews and approves it. Before approval, settle every provisional field in one pass:
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
- [ ] **Frontend-only data needs a real home.** `devAccounts` becomes the users table, which also needs `password_hash`, `must_change_password`, `failed_attempts`, and `locked_until`. None of these are in the `User` type today. The complaint types with first-aid checklist steps are clinical content, so they need a table and a nurse's sign-off.
- [x] **Foreign-key decision.** Settled by ADR-028 and built in the mock: records link by the internal student id; the LRN is a unique, editable attribute that never appears in a URL or an audit entry.
- [ ] **API contract.** Turn the 104 mock functions into endpoint specs: URL, method, allowed role, request and response shape, error cases. Use one error format (for example 422 with field errors, plus a separate shape for business rejections such as "Medicines on a completed incident can't be changed"). This is the cheapest document to produce, because the code is already the draft.
- [x] **Sanctum mode.** Development-Phases B2 says to confirm which mechanism applies. ADR-015 requires a 7-day lifetime but explicitly leaves API-token versus SPA-cookie configuration to B2; `.env.example` currently contains SPA-cookie settings. Choose with project approval before implementation; this checklist does not create or amend an ADR. **Settled Saturday, October 31, 2026 — 18:20 PHT: SPA cookie mode ([ADR-056](../06-Decisions/ADR-056-Backend-Preparation-Sanctum-SPA-Cookie-Mode-Own-Branch-Nothing-Wired-No-Migrations-Before-ERD-Approval.md)).**
- [ ] **Audit-log design.** Define the table, which events are logged, how `summary` is produced (field names only, never values, per ADR-017), and a retention number. Retention is 10 years (ADR-037, ADR-051), not yet confirmed by the school. No role can edit or delete an entry (ADR-016).

---

## 3. Open decisions that affect the schema

- [x] **Incident Stage 2:** can medicines be edited after completion? No (ADR-049); rejected, with a `ponytail:` marker in `completeIncidentStageTwo`.
- [x] **Sign-off:** should a Stage 1 incident be signable? No: only a completed (Stage 2) record is signed off (Zean, Thursday, October 22, 2026).
- [ ] **Printed documents:** the Excuse Letter and Incident Report need a human-facing reference number, since internal ids must never be shown.
- [x] **Stored letters:** should an approved Excuse Letter keep its final wording? Yes (ADR-049); stored with the approval.
- [x] **Reports:** computed live, with no Finalize month (ADR-050): store only the request (type, range, who) and generate the data on demand, as the mock does.
- [ ] **School year and grade promotion:** decided (ADR-047, ADR-051): one yearly import of the registrar's list. The import is not built and waits for the school's data privacy agreement and the file format.

---

## 4. Environment and deployment (not documented anywhere)

- [ ] **HTTPS on the LAN.** No feature needs camera access since the QR feature was removed (ADR-027), but sign-ins and health records now cross the LAN (ADR-029 note). Decide whether the LAN needs a local certificate.
- [ ] **PHP version.** Check the XAMPP PHP version before picking Laravel (Laravel 11 needs PHP 8.2 or newer).
- [ ] **Pinned versions** for XAMPP, PHP, MariaDB, and Laravel, so every dev machine matches.
- [ ] **Backup plan.** Locations, folders and the 60-per-location limit are decided (ADR-052). The `mysqldump` plus Task Scheduler design is not agreed with the client yet. Also decide how a backup run reports back to Laravel (a log row or a status file), since the Backup screen reads it.
- [ ] **Holiday source.** Still unvalidated (ADR-020). Lowest priority.

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
4. **Don't approve the ERD by inspection alone.** Review the proposed Mermaid diagrams in `ERD.md` against the 104 mock functions to catch missing columns.

---

## Next step

Team review of the proposed ERD and a full endpoint table from the repo are the next documentation steps before migrations.
