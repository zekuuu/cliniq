# Backend counter-check: the frontend against the backend documents (before B1)

**Run:** Saturday, November 07, 2026 — 13:35 PHT (local clock, UTC+8). On `backend` at `385beb7b` plus the uncommitted consultation documents of the same day. The frontend read is `main` at `cfd4bd84`; `frontend/` on `backend` is identical to it.
**Method:** the code first (`frontend/src/lib/mock-db/`, `types/`, `routes/`, the features), then each backend document. Mechanical checks were scripted; findings were then opened and read by hand.
**Previous audit:** `Backend-Readiness-Checklist.md`, refreshed October 31, 2026 at `9b4861db`: 104 functions, 10 constants, ERD provisional.

## Summary

| Severity | Count | Fixed here | Logged |
|---|---|---|---|
| **BLOCKER** (B1 would build the wrong thing) | 2 | 1 | 1 `DECIDE` |
| **MISMATCH** (a document is wrong or silent) | 4 | 3 | 1 `DOC` for `main` |
| **DRIFT** (stale wording or number) | 5 | 3 | 1 `LATER`, 1 noted only (C-14) |
| **NOTE** | 8 | — | 1 `DOC` (C-8), 2 `FIX-FRONTEND` (C-15, C-19) |

**Safe to start B1?** **Not yet: one item first.** C-1 must be decided: where staff record reviews live (ADR-067). Everything else B1 builds (the 47 tables) matches the code and the ADRs after the fixes below. The two `DECIDE` entries from the consultation documents (key custody, the username check) do not change a table, so they do not block B1.

## The numbers

| Item | Count | Source |
|---|---|---|
| Exported functions in `api.ts` | **126** (104 on October 31) | `^export (async )?function` |
| Exported constants in `api.ts` | **15** (10 on October 31) | `^export const` |
| Exported error classes in `api.ts` | 19 | `^export class` |
| Other runtime exports through `index.ts` | 16 (14 functions, 2 constants) | session (7 functions plus `ROLE_LABELS`), selectors (`missingStaffFields`, `auditTargetTypes`), store (5), devToggles (`queryParam`) |
| Functions with no contract entry before this check | 8 | see C-5; now 7 entries and 1 "not an endpoint" |
| Contract entries with no function | 0 | removed earlier the same day: the email reset, the backup-location edit |
| Entity interfaces / fields | 42 / about 335 to 337 (two counting methods) | `types/entities.ts`, `lib/mock-db/types.ts` |
| Schema tables / columns | 47 / 227 | `Reference-Schema.sql` |
| Fields with no column of the same name | all explained, except staff reviews (C-1) | child tables (`allergies`, `itemsGiven`, `usedFor` and others), derived (`fullName`, `recordComplete`, `currentStock`), renames documented in the dictionary (`contactInfo` → `contact_number`, `dateTime` → `visited_at`) |
| Audit writer call sites / action-target pairs | 63 / 41 literal pairs plus 3 computed (logout, print, view) | `audit(` in `api.ts`, the definition excluded |
| Literal audit summaries checked against `Audit-Coverage.md` | 21 | all present; 2 strings were printout text, not audit |
| Routes | 47: 44 in `APP_ROUTES` (26 `paths.*`, 18 literal with ids) plus login, force password change and the catch-all | `routes/` |
| Screen Inventory entries | 44 numbered | `Screen-Inventory.md` |
| ADRs | 75, no gaps, no duplicates | `06-Decisions/` |
| Constraint tests | 247 of 247 pass (MariaDB 10.11.16) | after C-2 |
| Seed records checked against column limits | 272 (52 students, 12 staff, 14 items, 191 visits, 3 users) | 0 violations; the notice says SYNTHETIC |

## Findings by audit section

### 1. API surface

- **C-5 MISMATCH, fixed.** Eight functions had no contract entry:
  - `getOwnAccount` (`api.ts:637`) and `updateOwnProfile` (`api.ts:649`), ADR-066;
  - `previewStaffImport` (`api.ts:1401`) and `applyStaffImport` (`api.ts:1415`), ADR-069;
  - `getStaffIncompleteQueue` (`api.ts:1452`), ADR-067;
  - `getLargeWriteOffPercent` (`api.ts:733`) and `isLargeWriteOff` (`api.ts:2683`), ADR-061;
  - `listBackupFolders` (`api.ts:3256`), ADR-052.

  The contract (`API-Contract.md`) now has `GET`/`PUT /api/auth/profile`, `POST /api/personnel/import/preview`, `POST /api/personnel/import`, `GET /api/personnel/incomplete`, `GET /api/reference/large-write-off-percent` and `GET /api/backups/folders`, plus `isLargeWriteOff` under "Not endpoints". Request, response, role, error text and audit were copied from the code.
- **C-3 MISMATCH, fixed.** `PUT /api/incidents/{id}/stage-two` and `POST /api/incidents/{id}/approve` still listed "the completion blocker text". ADR-065 removed the blocker, and the code (`completeIncidentStageTwo`, `approveIncidentReport`) checks no care. The contract now says every Stage 2 field is optional and an empty completed record can be approved.
- **C-4 MISMATCH, fixed.** `POST /api/inventory/{id}/adjust` left out two things:
  - the "· Large write-off" audit marker (`api.ts:2741`, ADR-061);
  - that the note is optional for every reason (ADR-068).

  Both are now stated.
- **C-16 DRIFT, fixed.** The contract's dated header said "12 new mock functions" for the consultation. The file has 126 functions against 104 on October 31: the consultation's 12 plus the 8 of C-5 plus 2 earlier ones. The header now gives the counts at `cfd4bd84`.
- **C-10 DRIFT, logged `LATER`.** The contract cites 157 `api.ts:NNNN` line numbers from commit `b0a0fed7`. `api.ts` has grown from about 2,990 to 3,840 lines, so most no longer point at the right line. The function names are right. Refresh the numbers when B3 ports the rules, or drop them.
- **C-17 NOTE.** `GET /api/audit-log` without `fullLrn` returns the masked LRN in the contract, while the mock sends the full LRN and masks on screen (`AuditLogPage.tsx`, `<Lrn>`). This is the contract's general, documented choice ("Display privacy"); nothing to change.

### 2. Entities and fields

- **C-1 BLOCKER, logged `DECIDE`.** Staff record reviews (ADR-067) have no table. The code keeps `frontendOnly.personnelReviews` (`types.ts:436`, `PersonnelReview` at `types.ts:285`; written at `api.ts:1288`, read by `staffIncompleteQueue`, `selectors.ts:318`): a staff id, who resolved it and when. `Reference-Schema.sql` has only `student_record_reviews` (`student_id NOT NULL`, `source`). B1 would build no home for the staff Incomplete Records page. Two shapes:
  - **(a) Recommended:** a `personnel_record_reviews` table mirroring `student_record_reviews` (one open review per staff member, CASCADE from `personnel`).
  - **(b)** Make `student_record_reviews` take `student_id` or `personnel_id`, exactly one.

  Not fixed: it is a design choice.
- **C-18 NOTE.** The first audit's missing user fields are all in the schema: `password_hash`, `must_change_password`, `failed_login_count` (the first audit called it `failed_attempts`) and `locked_until`. So are the session rules (ADR-056/057), the TOTP columns and `recovery_codes` (ADR-073).
- Checked and matching: name parts and `fullName` derived (ADR-064); staff `sex` (ADR-063); staff record status derived from missing fields (ADR-067, `missingStaffFields`); `birth_date` (ADR-054); `usedFor` (`inventory_item_symptom_tags`); the three archive fields; the school-year starts and the four settings; `collectedBy` with the "Other" text; `profilePicture` (`MEDIUMTEXT`); backup `locationNames` (the join, no column).

### 3. Rules that live only in code

- **C-2 BLOCKER, fixed.** `chk_txn_other_note` (`Reference-Schema.sql`) refused an adjustment with reason Other and no note. ADR-068 makes the note optional for every reason, and the code has no such check (`adjustInventoryStock`; `LARGE_WRITE_OFF_NOTE_MIN` removed). B1 would have built a CHECK that refuses valid saves.
  - Removed the CHECK.
  - The test now accepts "other with no note".
  - Changed the dictionary row and check list, and the ERD scenario row.
  - Constraint tests: 247 of 247 (rejects 168, accepts 36, counts 43).
- **C-11 DRIFT, fixed.** The `large_write_off_percent` seed description said a large removal "needs a written note". It now says it is marked "Large write-off" and the note is optional (ADR-061, ADR-068).
- Checked and matching:
  - The duplicate LRN text, `DUPLICATE_LRN_MESSAGE`, uses the `duplicate_lrn` 409.
  - The name-correction reason minimum is 3; at most 3 extra complaints; a late entry is 30 minutes; instructions are at most 120 characters; Sports Report text is at most 120.
  - The password history is 5; the lockout is 5 failures for 30 minutes, shared by recovery.
  - The Admin is signed out after 30 idle minutes; the last enabled backup location cannot be disabled (R32).
  - The school-year start and end order (ADR-075) is in the contract, the service and `db:verify`; the schema enforces one open year.
- Left to the application although a database could enforce it: none new. Cross-row rules (two settings rows, the school-year order) cannot be row CHECKs, and the ERD forbids triggers.

### 4. Roles and privacy

- **C-7 NOTE.** For the Admin, `getArchive` returns an empty staff list (`api.ts`, `viewer?.role === 'admin' ? []`); the contract answers 403 on `GET /api/archive/staff`. The contract is stricter and the screen never asks (no Staff tab for the Admin). No change.
- **C-8 NOTE, logged `DOC`.** The Audit Log shows the Admin entries about staff records, labelled by Staff No., without opening them (`AuditLogPage.tsx:104`, `targetPath`). Neither `User-Roles-and-Permissions.md` nor the contract says so. It shows no name or health detail, so it fits ADR-043; one line should say it.
- Checked and matching: Admin read-only (ADR-038); no Admin printing; staff patients Staff only (ADR-043); the LRN masked on lists and the Audit Log screen and full on single-student screens and printouts (ADR-040/044, the November 7 note); no LRN in a URL (the `POST` lookups).

### 5. Audit log

- All 21 literal summaries in the audit writer appear in `Audit-Coverage.md`, including "Updated commonly used for", "Started/Ended school year …", the authenticator actions and "(password recovery)". No call passes a code, secret, password or LRN value; the authenticator tests assert it.
- **C-13 NOTE.** The mock gives some audit targets synthetic string ids (`staff-import-1`, `school-year`), while `audit_logs.target_id` is `BIGINT`. The backend writes these with `target_label` and a NULL id, which `chk_audit_target` allows. Stated in the staff import entry.

### 6. Counts and derived data

- Matching:
  - Reports has four monthly reports only (ADR-074), computed on demand.
  - The Dashboard has no print and no `fullLrn`.
  - Active totals leave archived students out (`dashboard.ts:92`).
  - The Sports Report `school_year` window starts at the recorded start (`sportsReportWindowStart` through `currentSchoolYear`); the contract and dictionary say so since the same day.
  - Sex and grade groupings follow ADR-063 (staff in sex, students only in grade).

### 7. Flows end to end

All the flows the prompt lists can be served with the contract's endpoints in order, now that C-5's entries exist. The staff Incomplete Records page waits for C-1's table.

### 8. Seed and fixtures

- The mock's integrity check runs in the test suite (`integrity.test.ts`, passing).
- The seed's `meta.notice` says the data is synthetic.
- 272 seed records were checked against the schema's lengths, the LRN format and the username minimum: no violations.
- The seed can serve as the development seeder. The `school_years` rows are written by the B1 seeder after the first account, as the dictionary says.

### 9. Document drift

- **C-6 MISMATCH, logged `DOC` for `main`.** `Screen-Inventory.md` has no entry for the staff list import (`/staff/import`, ADR-069) or the staff Incomplete Records page (`/staff/incomplete`, ADR-067); both are routes in `routes/paths.ts`. It is a shared document edited on `main`, so it is not edited here.
- **C-9 DRIFT, fixed.** `Backend-Readiness-Checklist.md` said 104 functions and 10 constants, about 2,990 lines, and 191 constraint tests. It left "Frontend-only data needs a real home" and "Audit-log design" unticked although both are settled in the approved schema. It is refreshed (deliverable 3).
- **C-14 DRIFT, noted.** `Decisions-Summary.md` mixes two heading styles ("## 001 …" for older entries, "### ADR-040: …" for later ones). Every ADR has a line.
- **C-15 NOTE, for `main`.** The main `Issues-and-TODOs.md` still has "Backend: email password reset" open (`LATER`, line 470); ADR-073 replaced it.

### 10. Quality gates (`frontend/`, at `cfd4bd84`)

| Gate | Result |
|---|---|
| Typecheck | 0 errors |
| Lint | 0 errors |
| Tests | **1137 passed, 3 failed (1140)** |
| Build | passes |

**C-19 NOTE.** The 3 failures are **old**: Student Health Record visit count (`print-documents.test.tsx`), and R9 holiday legend and table months (`review-round-2.test.tsx`). They have failed since calendar commit `1b50a113`. None is new.

## Fixes made in this run

| Finding | File | Change |
|---|---|---|
| C-2 | `Reference-Schema.sql`, `Checks/constraint-tests.sql`, `Data-Dictionary.md`, `ERD.md` | `chk_txn_other_note` removed; case flipped to accepts; dictionary and scenario rows |
| C-3 | `API-Contract.md` | Stage 2 and approve: no care blocker (ADR-065) |
| C-4 | `API-Contract.md` | Adjust: optional note, "Large write-off" marker |
| C-5 | `API-Contract.md` | 7 entries and 1 "not an endpoint" |
| C-9 | `Backend-Readiness-Checklist.md` | Refreshed line, counts, two boxes, new items |
| C-11 | `Reference-Schema.sql` | `large_write_off_percent` description |
| C-16 | `API-Contract.md` | Header counts at `cfd4bd84` |

## Self-check

**Re-verified by hand:** I reopened the code and the document for 12 findings: C-1, C-2, C-3, C-4, C-5 (all 8 functions), C-6, C-7, C-8, C-9, C-11, C-13 and C-17. Both BLOCKERs are among them, and they cover sections 1 to 5 and 9. Nothing changed: each finding stands as written. C-2 was confirmed again by the schema reload (247 of 247, the accepts case passing).

**Counts, re-derived independently:** a second agent, with none of these notes, re-derived the counts from the code alone.

- **Agreed:** 126 functions, 15 constants, 19 classes, 42 interfaces.
- **Corrected from its count:**
  - other runtime exports: 13 became 16, a miscount;
  - audit call sites: 64 became 63, since the definition had been counted;
  - audit pairs: 37 became 41 literal plus 3 computed, since a one-line regex missed multi-line calls;
  - routes: "26 + 3" became 47, since the 18 routes with ids were missed.

No finding changed: the audit-summary check went by summary text, not by pairs. The 47 routes against 44 Screen Inventory numbers fit C-6, as two of the missing screens are routes.

## For the main branch

Ordered by severity, ready to turn into a prompt:

1. **(MISMATCH, C-6)** `Screen-Inventory.md`: add the staff list import (`/staff/import`, ADR-069) and the staff Incomplete Records page (`/staff/incomplete`, ADR-067), with the canonical Frontend Context Brief.
2. **(NOTE, C-15)** `Issues-and-TODOs.md`: close "Backend: email password reset" (ADR-073 replaced it) and move it to the archive.
3. **(NOTE, C-8)** `User-Roles-and-Permissions.md`: one line saying the Admin's Audit Log lists entries about staff records by Staff No., without opening them.
4. **(NOTE, C-19)** Fix the three old failing tests from `1b50a113` (calendar legend and table months, Student Health Record visit count).
