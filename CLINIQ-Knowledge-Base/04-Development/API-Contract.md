# API Contract

**Status: proposed, not built.** Written Saturday, October 31, 2026 — 22:05 PHT on the `backend` branch, from `frontend/src/lib/mock-db/api.ts` at commit `b0a0fed7`. No endpoint here exists yet except the two in the Foundation list (ADR-056). Line numbers are that commit's. The contract was generated against the file, and every exported function is either an entry or listed in [Not endpoints](#not-endpoints).

The mock API is the executable spec (ADR-056). This file adds the HTTP layer: URLs, roles, status codes. It adds no behaviour of its own: where the mock and a decision disagree, the point is listed under [Questions](#questions), and the entry says which one it follows until answered.

**Counts:** 104 exported functions: 95 map to endpoints, 9 are not endpoints. 103 entries: 99 from the mock and 4 additions (one entry holds the two email-reset routes). A function can back more than one entry (create and update), and two password functions share one.

## Conventions

### Sign-in

Sanctum SPA cookie mode (ADR-056). The browser first calls `GET /sanctum/csrf-cookie`, then sends `POST /api/auth/login` with its credentials and the `X-XSRF-TOKEN` header. Every later request sends the session cookie, and every write echoes the header. No API tokens are issued. The session lasts 7 days from sign-in, fixed, for both roles (ADR-015, ADR-056; see Q4). The Admin is also signed out after `adminIdleMinutes` (30) without a request (ADR-048; see Q5). Disabling an account ends its sessions (ADR-048): every authenticated request re-reads the account and refuses a disabled one, which needs no list of sessions and so works with the `file` driver. While `mustChangePassword` is true, every route except the password change, sign-out and `GET /api/auth/me` answers 403 `password_change_required`.

### Format

- JSON everywhere. A success is `{ "data": ... }`.
- **Keys are camelCase and shapes match `frontend/src/types/` and the mock's return types**, so a feature `api/` file can swap to HTTP without reshaping. The entries below name the type instead of repeating it.
- **Ids are opaque strings** ("internal ids only"). An LRN never goes in a URL, a query string or an audit entry (ADR-028, ADR-040). A lookup that can carry typed LRN digits is therefore a `POST` with the value in its body, even though it reads. Those are `POST /api/students/query`, `POST /api/students/search`, `POST /api/students/check-duplicates` and `POST /api/patients/search`. Request bodies are never logged (D10).
- **Time** (D6): timestamps are ISO 8601 with `+08:00`, calendar dates `YYYY-MM-DD`, months `YYYY-MM`, clock times `HH:MM`. "Now" and "today" come from the server, never the client.
- **Text limits.** Where the mock sets no length, the ERD draft's column size is the limit, answered as 422. These are not approved yet (`ERD-Review.md`).
- **Trimming.** Blank optional text is stored as null, as the mock does.
- **Writes are all-or-nothing.** Each write endpoint runs in one database transaction, audit entries included, like `write()` at `api.ts:144`.

### Filtering and pagination

The mock has no pagination: it returns whole lists and the screens page them. List endpoints do the same, with their filters as query parameters. Long lists also accept `page` and `perPage` and then add `meta: { page, perPage, total }` (Q19). These are visits, incidents, the audit log and inventory history.

### Display privacy

- **A response that lists several people carries the masked LRN and never a birthdate or an age** (ADR-004, ADR-040, ADR-054). The field stays `lrn` and holds `●●●●●●●●1234`. `maskLrn` gives the same text when applied again, so a screen needs no change. The mock sends the full LRN and masks on screen; this is a deliberate difference (Q1).
- A single-student response carries the full LRN (ADR-040).
- A staff patient appears on lists by Staff No., never by name (ADR-043).
- An internal id is never shown to a person; the printed reference number is an ERD question.

### Admin read-only (ADR-038)

The Admin writes only: accounts (ADR-033), calendar events (ADR-042), Backup (ADR-037), Acknowledge (ADR-048), own password, and issue reports. Any other write answers 403. The Admin never prints (ADR-038 item 3). Staff-patient incidents do not exist for the Admin: reading one answers 404, not 403, as the mock does (`visibleTo`, `api.ts:1543`). Most of these role rules are route rules in the mock's frontend, not checks in `api.ts`; the backend enforces all of them.

**Roles** in the entries: `S` Staff, `A` Admin/Principal, `—` no sign-in. They come from the Access Summary in `Module-Overview.md`, checked against `AppRoutes.tsx` and the mock's role checks.

### Audit events

Every write records who, the action, the target type and id, the time, and a summary naming fields, never values (ADR-017). The `Audit` line in each entry gives `action target` and the summary. `changed` means the `changedSummary` text (`api.ts:231`). Reading the Audit Log writes nothing (ADR-016). Lists and searches write nothing (ADR-048).

### Errors

One body for every failure:

```json
{ "code": "rule_violated", "message": "Medicines on a completed incident can't be changed.", "rule": "stock_rule", "errors": { "field": ["..."] }, "request_id": "..." }
```

`rule` appears only on 409 and `errors` only on 422. `message` is the mock's exact text, which the screens show. A 500 carries no trace, query or record.

This is D5 adjusted to the mock. Added: `invalid_credentials`, `account_locked`, `password_change_required`.

| Status | `code` | When | Mock equivalent |
|---|---|---|---|
| 401 | `unauthenticated` | No session, or it expired | `getMockSessionUser` |
| 401 | `session_idle` | Admin idle (ADR-048) | Frontend timer |
| 401 | `invalid_credentials` | Wrong password, unknown user, disabled account; one message for all three | `MockAuthError('invalid_credentials')` |
| 403 | `forbidden` | Wrong role | `AccountPermissionError`, `PersonnelPermissionError`, `SportsReportPermissionError`, `AcknowledgeError` (role case) |
| 403 | `password_change_required` | Must change the password first | Force Password Change route guard |
| 404 | `not_found` | Unknown id, or a record this role may not know of | `NotFoundError` |
| 409 | `rule_violated` | A valid request refused by stored state, with `rule` | Named errors below, and plain `Error` that depends on the record |
| 419 | `csrf_mismatch` | Missing or stale CSRF token | None |
| 422 | `validation_failed` | The request itself is wrong, whatever is stored | `CalendarEventValidationError`, `SportsReportValidationError`, and plain `Error` about a field's own value |
| 423 | `account_locked` | Locked; adds `locked_until` | `MockAuthError('locked', lockedUntil)` |
| 429 | `too_many_requests` | Throttled | None |
| 500 | `server_error` | Anything else | None |

**422 or 409.** If the answer can be decided from the request alone, it is 422. If it depends on a stored record, it is 409 with a `rule`.

Values of `rule`, each with its mock error:

| `rule` | Mock error | `rule` | Mock error |
|---|---|---|---|
| `last_admin` | `LastAdminError` | `incident_approved` | `IncidentApprovedError` |
| `duplicate_username` | `DuplicateUsernameError` | `acknowledge` | `AcknowledgeError` (state cases) |
| `duplicate_lrn` | `DuplicateLrnError` | `stock_rule` | `StockRuleError` |
| `lrn_locked` | `LrnLockedError` | `no_backup_location` | `NoBackupLocationError` |
| `visit_entered_in_error` | Plain `Error`, `api.ts:1265`, `:1329`, `:1482`, `:1582` | `excuse_letter` | Plain `Error`, letter state, `api.ts:1143`, `:1381`, `:1382`, `:1486`, `:1508` |
| `incident_stage` | Plain `Error`, `api.ts:1583`, `:1787`, and the completion blocker | `follow_up_state` | Plain `Error`, `api.ts:1836` |
| `password_reuse` | Plain `Error`, `api.ts:407` | `wrong_patient` | Plain `Error`, `api.ts:1205`, `:1481`, `:1581` |

`NameCorrectionReasonError` and `ExtraComplaintsError` are 422: the request alone shows them.

## Authentication and session (Module 1)

Marked **Addition** where the mock has no such function.

#### `GET /sanctum/csrf-cookie`
- **Addition.** Roles: —. Sets the XSRF cookie. Response 204. In the Foundation.

#### `GET /api/health`
- **Addition.** Roles: —. Response `{ "data": { "status": "ok" } }`. Never a database name, a version or a record. In the Foundation.

#### `POST /api/auth/login`
- Roles: —. Throttle `login`.
- Request: `username` (trimmed, lowercased to compare), `password`.
- Response: `{ user: SessionUser, mustChangePassword }`. Never a password or a token.
- Errors: 401 `invalid_credentials`, 423 `account_locked`, 429.
- Audit: `login user`; a lockout writes `login user` with "Account locked for 30 minutes after 5 wrong passwords (sign-in)". A single wrong password writes nothing. No entry for an unknown username.
- Copies: `authenticateMockUser` (`api.ts:355`); tests: `AccessAndBackup`, `ChangePasswordPage`, `accounts`, `auditCoverage` and 1 more. Five failures lock for 30 minutes and reset the count; an expired lock clears first; a disabled account counts as a failure. Sets `lastLogin` (Q13). Unknown usernames: Q6.

#### `POST /api/auth/logout`
- Roles: S, A.
- Request: optional `reason`, one of the summaries the frontend sends (idle sign-out).
- Response: 204.
- Audit: `logout`, target none, optional summary.
- Copies: `logoutMockSession` (`api.ts:249`); tests: `auditCoverage`.

#### `GET /api/auth/me`
- **Addition.** Roles: S, A. Allowed during a forced password change.
- Response: `{ user: SessionUser, mustChangePassword, adminIdleMinutes }`. Replaces the mock's `getAuthenticatedUser` in `session.ts`.

#### `POST /api/auth/password`
- Roles: S, A. Allowed during a forced password change.
- Request: `nextPassword`; `currentPassword`, required unless the account must change its password (Q14).
- Response: 204.
- Errors: 422 "Password must be at least 8 characters."; 422 "Your current password is incorrect."; 409 `password_reuse`.
- Audit: `update user`, "Changed password".
- Copies: `changeOwnPassword` (`api.ts:418`); tests: `ChangePasswordPage` and `changeMockPassword` (`api.ts:397`); tests: `auditCoverage`, `auth`. The new password is trimmed; the last 5 cannot be reused; the history holds at most 5.

#### `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- **Addition, not designed.** ADR-048 item 3: an email reset link when the computer is online. Needs `users.email`, a mail service and a token store (`LATER`). No fields are specified until then.

#### `GET /api/config/admin-idle-minutes`
- Roles: S, A. Response: number. Also on `GET /api/auth/me`.
- Copies: `getAdminIdleMinutes` (`api.ts:287`); tests: none.

## User Management (Module 1, ADR-033)

Only the Admin manages accounts. Staff read names only, because visit and letter screens print who logged a record.

#### `GET /api/users`
- Roles: A full `User`; S only `id`, `name`, `role`.
- Response: `User[]`, by name. Never a password hash, a lock count or a token.
- Copies: `listUsers` (`api.ts:491`); tests: none.

#### `POST /api/users`
- Roles: A.
- Request: `name`, `username`, `role`, `profilePicture?`, `temporaryPassword`; `email` once ADR-048 item 3 is built (Q17).
- Response: 201, `User`.
- Errors: 403 "Only the Admin/Principal can manage accounts."; 409 `duplicate_username`; 422 password under 8 characters.
- Audit: `create user`.
- Copies: `saveUser` (`api.ts:566`); tests: `accounts`, `auditCoverage`, `profilePicture`. Username compared case-insensitively; stored as typed, trimmed. The account must change its password at first sign-in.

#### `GET /api/users/{id}`
- Roles: A full `User`; S only `id`, `name`, `role`.
- Errors: 404.
- Copies: `getUser` (`api.ts:504`); tests: `accounts`, `profilePicture`.

#### `PUT /api/users/{id}`
- Roles: A.
- Request: `name`, `username`, `role`, `profilePicture?`.
- Response: `User`.
- Errors: 403, 404, 409 `duplicate_username`, 409 `last_admin`.
- Audit: `update user`, changed.
- Copies: `saveUser` (`api.ts:566`); tests: `accounts`, `auditCoverage`, `profilePicture`.

#### `PUT /api/users/{id}/active`
- Roles: A.
- Request: `active` (boolean).
- Response: `User`.
- Errors: 403, 404, 409 `last_admin`.
- Audit: `update user`, "Enabled account" or "Disabled account". Nothing when unchanged.
- Copies: `setUserActive` (`api.ts:600`); tests: `AssistedByAndGuardian`, `accounts`, `auditCoverage`. Disabling ends the account's sessions (ADR-048).

#### `POST /api/users/{id}/reset-password`
- Roles: A.
- Request: `temporaryPassword`.
- Response: 204.
- Errors: 403, 404, 422 under 8 characters.
- Audit: `update user`, "Reset password".
- Copies: `resetUserPassword` (`api.ts:614`); tests: `accounts`, `auditCoverage`. Clears the password history (`setTemporaryPassword`, `api.ts:546`).

#### `GET /api/users/principal-name`
- Roles: S, A. Response: string or null.
- Copies: `getPrincipalName` (`api.ts:500`); tests: none. The first active Admin, for a signature line.

## Reference data

All read-only, no audit. Text-only lists, safe for both roles.

#### `GET /api/reference/visit-complaint-types`
- Roles: S. Response: `ComplaintType[]` with first-aid steps. Copies: `getVisitComplaintTypes` (`api.ts:457`); tests: none.

#### `GET /api/reference/visit-complaint-suggestions`
- Roles: S. Response: `string[]`, ranked. Copies: `getVisitComplaintSuggestions` (`api.ts:462`); tests: `search`.

#### `GET /api/reference/incident-complaint-types`
- Roles: S. Response: `string[]`. Copies: `getIncidentComplaintTypes` (`api.ts:466`); tests: none.

#### `GET /api/reference/vitals-ranges`
- Roles: S. Response: `VitalsWarningRanges` with `usual`. Copies: `getVitalsWarningRanges` (`api.ts:471`); tests: `ClinicRulesDecisions`.

#### `GET /api/reference/medical-certificate-after-days`
- Roles: S. Response: number. Copies: `getMedicalCertificateAfterDays` (`api.ts:476`); tests: none.

#### `GET /api/reference/unusual-age-years`
- Roles: S. Response: number. Copies: `getUnusualAgeYears` (`api.ts:481`); tests: none.

#### `GET /api/reference/grade-levels`
- Roles: S, A. Response: `string[]` in school order. Copies: `getGradeLevels` (`api.ts:485`); tests: `ui-review-regressions`. The mock derives it from students; see `ERD-Review.md`.

#### `GET /api/reference/personnel-types`
- Roles: S. Response: `string[]`. Copies: `getPersonnelTypes` (`api.ts:890`); tests: `StaffComplaintsBackupDecisions`.

#### `GET /api/reference/personnel-departments`
- Roles: S. Response: `string[]`. Copies: `getPersonnelDepartments` (`api.ts:895`); tests: none.

## Student Records (Module 2)

#### `POST /api/students/query`
- Roles: S, A. A read, sent as `POST` because `search` can hold LRN digits.
- Request: `search`, `gradeLevel`, `includeArchived`, `limit`.
- Response: `StudentListRow[]`, by name; masked LRN; no birthdate (Q2).
- Copies: `listStudents` (`api.ts:633`); tests: `AppRoutes`, `AuditLogPage`, `Birthdate`, `ClinicRulesDecisions` and 2 more. Name contains, or an all-digit search matches the LRN prefix.

#### `POST /api/students/search`
- Roles: S.
- Request: `q`, `limit` (default 8).
- Response: `StudentSearchResult[]`, active students, no medical fields, masked LRN.
- Copies: `searchStudents` (`api.ts:653`); tests: `Birthdate`, `search`. LRN matches first, then by name; below 1 character, empty.

#### `POST /api/students/check-duplicates`
- Roles: S.
- Request: `lrn`, `fullName`.
- Response: `StudentDuplicateCheck`, with no word on who holds a taken LRN; `nameMatches` masked.
- Copies: `checkStudentDuplicates` (`api.ts:724`); tests: none.

#### `POST /api/students`
- Roles: S.
- Request: `StudentInput`, `confirmDuplicate?`.
- Response: 201 `{ status: "saved", student, action: "create" }`, or **200** `{ status: "duplicate", matches }`, which is not an error: the mock returns it as a value and the form asks.
- Errors: 422 "The LRN must be exactly 12 digits.", "Enter a real birthdate.", "The birthdate can't be in the future."; 409 `duplicate_lrn` (never names the other student).
- Audit: `create student`.
- Copies: `saveStudent` (`api.ts:765`); tests: `Birthdate`, `LettersAndVisitsDecisions`, `RecordsDecisions`, `StudentFormPage` and 2 more. A name and grade match on an active record asks once.

#### `GET /api/students/incomplete`
- Roles: S.
- Response: `IncompleteRecord[]`, masked.
- Copies: `getIncompleteRecordQueue` (`api.ts:841`); tests: `Birthdate`.

#### `GET /api/students/{id}`
- Roles: S, A.
- Response: `Student`, full LRN.
- Errors: 404.
- Copies: `getStudent` (`api.ts:658`); tests: `Birthdate`, `IncidentEntryPage`, `IncidentSafety`, `ItemsGiven` and 11 more. Opening the profile also calls `POST /api/audit/views`.

#### `PUT /api/students/{id}`
- Roles: S.
- Request: `StudentInput`, `nameCorrectionReason?`.
- Response: `{ status: "saved", student, action: "update" }`.
- Errors: 404; 409 `lrn_locked`; 422 name-correction reason under 3 characters; 409 `duplicate_lrn`; the birthdate 422s.
- Audit: `update student`, changed. A name correction adds "Name corrected"; the mock also adds the reason text (Q3).
- Copies: `saveStudent` (`api.ts:765`); tests: `Birthdate`, `LettersAndVisitsDecisions`, `RecordsDecisions`, `StudentFormPage` and 2 more. Completing a flagged record resolves its review, crediting the saver.

#### `POST /api/students/{id}/archive`
- Roles: S.
- Response: `Student`. Errors: 404. Audit: `archive student`.
- Copies: `archiveStudent` (`api.ts:830`); tests: `SportsReport`, `auditCoverage`. No reason is asked (ADR-047).

#### `GET /api/students/{id}/history`
- Roles: S, A.
- Query: `limit` (default 8).
- Response: `{ visits, incidents }`, newest first. The Admin sees visits as text (ADR-038 item 5).
- Copies: `getStudentHistory` (`api.ts:682`); tests: `personnel`.

#### `GET /api/students/{id}/excuse-letters`
- Roles: S.
- Response: `StudentExcuseLetter[]`, newest period first.
- Copies: `getStudentExcuseLetters` (`api.ts:1411`); tests: `ExcuseLettersAndFollowUps`, `ExcusedPeriod`, `LettersAndVisitsDecisions`.

## Staff Patients (Module 2a, ADR-043)

The Staff role only (ADR-043 item 9). Every endpoint answers 403 to the Admin, except `GET /api/patients/...` as noted.

#### `GET /api/personnel`
- Roles: S.
- Query: `search`, `type`, `includeArchived`.
- Response: `Personnel[]`, by name. A deliberate masterlist, so names show (D7).
- Copies: `listPersonnel` (`api.ts:857`); tests: `personnel`.

#### `GET /api/personnel/search`
- Roles: S. Query: `q`, `limit`. Response: `PersonnelSearchResult[]`.
- Copies: `searchPersonnel` (`api.ts:880`); tests: `personnel`.

#### `POST /api/personnel`
- Roles: S.
- Request: `PersonnelInput`.
- Response: 201 `{ personnel, action: "create" }`.
- Errors: 403 "Only the clinic staff can manage staff records."; 422 "Enter the full name.", "Choose the staff type.", department over 60.
- Audit: `create staff`.
- Copies: `savePersonnel` (`api.ts:950`); tests: `personnel`, `staff-counts`. The Staff No. is assigned, never reused.

#### `GET /api/personnel/{id}`
- Roles: S. Errors: 404. Copies: `getPersonnel` (`api.ts:868`); tests: `StaffPages`.

#### `PUT /api/personnel/{id}`
- Roles: S. Request: `PersonnelInput`. Response: `{ personnel, action: "update" }`. Errors: as create, plus 404. Audit: `update staff`, changed.
- Copies: `savePersonnel` (`api.ts:950`); tests: `personnel`, `staff-counts`.

#### `POST /api/personnel/{id}/archive`
- Roles: S. Errors: 403, 404. Audit: `archive staff`.
- Copies: `archivePersonnel` (`api.ts:987`); tests: `personnel`.

#### `GET /api/personnel/{id}/history`
- Roles: S. Query: `limit`. Response: `{ visits, incidents, followUps }`.
- Copies: `getPersonnelHistory` (`api.ts:904`); tests: `personnel`.

#### `POST /api/patients/search`
- Roles: S. Request: `q`, `limit`. Response: `PatientSearchResult[]`, each labelled by `kind`.
- Copies: `searchPatients` (`api.ts:885`); tests: `Birthdate`, `personnel`, `staff-patients`.

#### `GET /api/patients/{kind}/{id}`
- Roles: S; A for `student` only, 404 for `personnel`.
- Response: `Patient`, full LRN.
- Copies: `getPatient` (`api.ts:873`); tests: none.

## Clinic Visits (Module 3)

#### `GET /api/visits`
- Roles: S.
- Query: `from`, `to`, `includeEnteredInError`.
- Response: `Visit[]`, newest first. Entered-in-error visits are left out unless asked.
- Copies: `listVisits` (`api.ts:1001`); tests: `ClinicRulesDecisions`, `SportsReport`, `VisitLogic`, `countsAndSeed` and 4 more.

#### `POST /api/visits`
- Roles: S.
- Request: `RecordVisitInput`.
- Response: 201 `{ visit, followUp, belowZero }`.
- Errors: 422: patient not exactly one ("Choose one patient: a student or a staff member."); bad date or time; future time; "Time out can't be earlier than the time in."; more than 3 extra complaints; period errors; "Only a Sent home or Referred visit has an excuse letter."; 404 patient; 409 `wrong_patient` (a letter for staff); 409 `stock_rule`; 409 `excuse_letter` when approving with no draft.
- Audit: `submit visit` ("Late entry" if late), then `submit inventory-dispensation` per line, `create follow-up`, `approve excuse-letter`, in the same transaction.
- Copies: `recordVisit` (`api.ts:1197`); tests: `AdminAuditDashboardDecisions`, `ClinicRulesDecisions`, `LettersAndVisitsDecisions`, `RecordsDecisions` and 10 more. A bad line rejects the whole save. Dated more than 30 minutes before saving is a late entry; the reason is not audited.

#### `GET /api/visits/{id}`
- Roles: S. Includes one entered in error. Errors: 404.
- Copies: `getVisit` (`api.ts:1016`); tests: `ExcuseLettersAndFollowUps`, `ExcusedPeriod`, `LettersAndVisitsDecisions`, `LogbookFields` and 7 more.

#### `PUT /api/visits/{id}`
- Roles: S.
- Request: `VisitPatch`. Omitted optional fields stay.
- Response: `{ visit, belowZero }`.
- Errors: 404; 409 `visit_entered_in_error`; 409 `excuse_letter` "This visit already has an approved excuse letter. Its period is fixed."; 409 `stock_rule`; the 422s of `POST /api/visits`.
- Audit: `update visit`, changed; `submit inventory-adjustment` "Visit edited" per changed line.
- Copies: `updateVisit` (`api.ts:1257`); tests: `ExcusedPeriod`, `LettersAndVisitsDecisions`, `LogbookFields`, `VisitLogic` and 2 more. Changed lines move stock through `visit_edited` adjustments; dispenses are never rewritten.

#### `POST /api/visits/{id}/entered-in-error`
- Roles: S.
- Request: `reason`.
- Response: `Visit`.
- Errors: 404; 422 no reason; 409 `visit_entered_in_error` already marked.
- Audit: `update visit` "Marked entered in error"; `update excuse-letter` "Voided: visit entered in error"; `update follow-up` "Marked cancelled: visit entered in error"; `submit inventory-adjustment` per line. Never the reason.
- Copies: `markVisitEnteredInError` (`api.ts:1323`); tests: `ExcuseLetterPage`, `ExcuseLettersAndFollowUps`, `VisitLogic`, `auditCoverage`. Stock returns; the letter is voided; pending follow-ups are cancelled with `Visit entered in error: <reason>`.

#### `GET /api/visits/{id}/excuse-letter`
- Roles: S. Response: `ExcuseLetterApproval` or null; the current letter, never a superseded one.
- Copies: `getExcuseLetterApproval` (`api.ts:1358`); tests: `ExcuseLetterPage`, `ExcuseLettersAndFollowUps`, `ExcusedPeriod`, `LettersAndVisitsDecisions` and 2 more.

#### `POST /api/visits/{id}/excuse-letter/approve`
- Roles: S.
- Request: `ExcuseLetterApprovalInput`.
- Response: 201 `ExcuseLetterApproval`.
- Errors: 404; 409 `wrong_patient`; 409 `visit_entered_in_error`; 409 `excuse_letter`; 422 period errors.
- Audit: `approve excuse-letter`.
- Copies: `approveExcuseLetter` (`api.ts:1517`); tests: `ExcuseLetterLoading`, `ExcuseLettersAndFollowUps`, `ExcusedPeriod`, `LettersAndVisitsDecisions` and 2 more. The wording is stored at approval (ADR-049); the draft clears in the same write.

#### `POST /api/visits/{id}/excuse-letter/replacement`
- Roles: S.
- Request: `reason`.
- Response: 204.
- Errors: 404; 422 no reason; 409 `excuse_letter` not approved or voided.
- Audit: `update excuse-letter`, "Superseded; replacement draft opened".
- Copies: `issueReplacementExcuseLetter` (`api.ts:1374`); tests: `ExcuseLettersAndFollowUps`, `auditCoverage`.

#### `GET /api/excuse-letters/pending`
- Roles: S. Response: `PendingExcuseLetter[]`, oldest first, masked, never a name.
- Copies: `listPendingExcuseLetters` (`api.ts:1440`); tests: `ExcusedPeriod`.

#### `GET /api/excuse-letters/{id}`
- Roles: S. Any state. Errors: 404.
- Copies: `getExcuseLetterById` (`api.ts:1366`); tests: none.

#### `POST /api/pe-referrals`
- Roles: S.
- Request: `PeReferralInput`.
- Response: 201 `PeReferral`.
- Errors: 404 student.
- Audit: `submit pe-sports-referral`; `create incident-escalation` when referred to hospital.
- Copies: `submitPeReferral` (`api.ts:1523`); tests: `PeSportsReferralLoading`, `auditCoverage`. Students only (ADR-043 item 7).

## Follow-Ups

#### `GET /api/follow-ups`
- Roles: S.
- Query: `status`.
- Response: `FollowUpView[]`, by date; masked number; `dueState`.
- Copies: `listFollowUps` (`api.ts:1805`); tests: `Birthdate`, `ClinicRulesDecisions`, `ExcuseLettersAndFollowUps`, `FollowUpListPage` and 3 more. Past the auto-close limit reads as Missed (Q7).

#### `PUT /api/follow-ups/{id}/status`
- Roles: S.
- Request: `status`, `reason?`.
- Response: `FollowUp`.
- Errors: 404; 422 no reason on Missed or Cancelled.
- Audit: `update follow-up`, "Marked <status>"; no summary when unchanged.
- Copies: `setFollowUpStatus` (`api.ts:1819`); tests: `ExcuseLettersAndFollowUps`, `auditCoverage`. The reason stays on the record, not in the audit.

#### `POST /api/follow-ups/{id}/reschedule`
- Roles: S.
- Request: `followUpDate`.
- Response: 201 `FollowUp`.
- Errors: 404; 409 `follow_up_state`; 422 date in the past.
- Audit: `create follow-up`.
- Copies: `rescheduleFollowUp` (`api.ts:1833`); tests: `ExcuseLettersAndFollowUps`. Keeps patient, record, reason and notes, not the stay-home flag (Q7).

## Emergency Response (Module 4)

Every read applies `visibleTo`: staff patients' incidents do not exist for the Admin.

#### `GET /api/incidents`
- Roles: S, A.
- Query: `from`, `to`.
- Response: `Incident[]`, newest first.
- Copies: `listIncidents` (`api.ts:1545`); tests: `IncidentEntryPage`, `SportsReport`, `StaffComplaintsBackupDecisions`, `VisitLogic` and 3 more.

#### `POST /api/incidents`
- Roles: S.
- Request: `StageOneInput`.
- Response: 201 `Incident`.
- Errors: 422 patient, future time; 404 patient or visit; 409 `wrong_patient`; 409 `visit_entered_in_error`; 409 `incident_stage` already escalated.
- Audit: `submit incident-stage-1`, "Included additional notes" if any; `update visit`, "Escalated to incident".
- Copies: `saveIncidentStageOne` (`api.ts:1573`); tests: `RecordsDecisions`, `SportsReport`, `StaffComplaintsBackupDecisions`, `StudentSection` and 5 more. Saves with only a complaint plus the readings taken.

#### `GET /api/incidents/{id}`
- Roles: S, A. Errors: 404. Opening the report also calls `POST /api/audit/views`.
- Copies: `getIncident` (`api.ts:1554`); tests: `AdminAuditDashboardDecisions`, `IncidentEntryPage`, `IncidentSafety`, `RecordsDecisions` and 2 more.

#### `PUT /api/incidents/{id}/stage-two`
- Roles: S.
- Request: `StageTwoInput` without `incidentId`.
- Response: `{ incident, followUp, belowZero }`.
- Errors: 404; 409 `incident_stage` (the completion blocker text); 409 `incident_approved`; 409 `stock_rule` "Medicines on a completed incident can't be changed."
- Audit: `update incident-stage-2` "Completed Stage 2 details" with named fields; `create parent-notification` per attempt; `submit inventory-dispensation` per line; `create follow-up`.
- Copies: `completeIncidentStageTwo` (`api.ts:1641`); tests: `RecordsDecisions`, `auditCoverage`, `stock`. Medicines dispense only on the first completion. The blocker runs before stock moves.

#### `POST /api/incidents/{id}/parent-notifications`
- Roles: S.
- Request: `outcome`, `calledContact?`.
- Response: 201 `ParentNotificationAttempt`.
- Errors: 404; 422 unknown outcome.
- Audit: `create parent-notification`.
- Copies: `addParentNotification` (`api.ts:1703`); tests: `IncidentSafety`, `auditCoverage`.

#### `GET /api/incidents/approved-ids`
- Roles: S, A. Response: `string[]`. The Admin's list leaves out staff incidents (Q8).
- Copies: `listApprovedIncidentReportIds` (`api.ts:1725`); tests: none.

#### `GET /api/incidents/{id}/trail`
- Roles: S, A. Response: `IncidentTrail`. 404 for an incident the Admin may not see (Q8).
- Copies: `getIncidentTrail` (`api.ts:1745`); tests: none.

#### `POST /api/incidents/{id}/approve`
- Roles: S.
- Response: 204.
- Errors: 404; 409 `incident_stage` Stage 1, or the blocker text.
- Audit: `approve incident-report`.
- Copies: `approveIncidentReport` (`api.ts:1783`); tests: `AdminAuditDashboardDecisions`, `IncidentSafety`, `RecordsDecisions`, `auditCoverage`. A second approval: Q9.

#### `POST /api/incidents/{id}/acknowledge`
- Roles: A.
- Response: `Incident`.
- Errors: 403 "Only the Admin/Principal acknowledges an incident report."; 404; 409 `acknowledge` not approved or already acknowledged.
- Audit: `update incident-report`, "Acknowledged".
- Copies: `acknowledgeIncidentReport` (`api.ts:1770`); tests: `AdminAuditDashboardDecisions`. Never undone.

## Inventory (Module 8)

Every endpoint is Staff only. The database row lock of `ERD.md` section 9 replaces the mock's single-threaded store.

#### `GET /api/inventory`
- Roles: S.
- Query: `search`, `category`, `hasExpiredStock`, `attention`.
- Response: `InventoryItemView[]`, with derived flags.
- Copies: `listInventory` (`api.ts:1853`); tests: `BrandAndPaging`, `ClinicRulesDecisions`, `InventoryPanelReview`, `RecordsDecisions` and 3 more.

#### `POST /api/inventory`
- Roles: S.
- Request: `InventoryInput`.
- Response: 201 `InventoryItem`.
- Errors: 409 `stock_rule` for the expiry rules; 422 for `currentStock` not a whole number of 0 or more (the mock has no such check; a trust-boundary addition).
- Audit: `create inventory`.
- Copies: `saveInventoryItem` (`api.ts:1904`); tests: `ClinicRulesDecisions`, `InventoryPanelReview`, `RecordsDecisions`, `auditCoverage` and 1 more. The first batch is an expiry date or an explicit "no expiration".

#### `GET /api/inventory/{id}`
- Roles: S. Errors: 404. Copies: `getInventoryItem` (`api.ts:1865`); tests: `BrandAndPaging`, `InventoryPanelReview`, `ItemsGiven`, `StockActions` and 4 more.

#### `PUT /api/inventory/{id}`
- Roles: S.
- Request: `InventoryInput`; `currentStock` and `expirationDate` are ignored on an edit.
- Response: `InventoryItem`.
- Errors: 404.
- Audit: `update inventory`, changed.
- Copies: `saveInventoryItem` (`api.ts:1904`); tests: `ClinicRulesDecisions`, `InventoryPanelReview`, `RecordsDecisions`, `auditCoverage` and 1 more.

#### `GET /api/inventory/{id}/history`
- Roles: S. Response: `InventoryHistoryRow[]`, newest first.
- Copies: `listInventoryHistory` (`api.ts:1883`); tests: none.

#### `POST /api/inventory/{id}/dispense`
- Roles: S.
- Request: `quantity`, `studentId?`, `personnelId?`, `visitId?`.
- Response: `DispenseResult`.
- Errors: 404; 409 `stock_rule` (`QUANTITY_RULE`, both patients, unknown patient or visit, no usable batch).
- Audit: `submit inventory-dispensation`.
- Copies: `dispenseInventoryItem` (`api.ts:1942`); tests: `ReportsDecisions`, `auditCoverage`, `inventoryApi`, `personnel` and 1 more. Below zero warns, never blocks (ADR-018).

#### `POST /api/inventory/{id}/restock`
- Roles: S.
- Request: `quantity`, `expirationDate`, `noExpirationConfirmed?`.
- Response: `InventoryItemView`.
- Errors: 404; 409 `stock_rule`.
- Audit: `submit inventory-restock`.
- Copies: `restockInventoryItem` (`api.ts:1979`); tests: `InventoryPanelReview`, `ReportsDecisions`, `auditCoverage`, `stock`. Adds a batch; never overwrites one.

#### `POST /api/inventory/{id}/adjust`
- Roles: S.
- Request: `StockAdjustmentInput`.
- Response: `InventoryItemView`.
- Errors: 404; 409 `stock_rule`.
- Audit: `submit inventory-adjustment`, the reason's label.
- Copies: `adjustInventoryStock` (`api.ts:2041`); tests: `auditCoverage`, `stock`. Staff cannot choose `visit_edited`. A batch cannot go below 0.

## Reports (Module 5)

#### `GET /api/reports/monthly`
- Roles: S, A (view; no printing).
- Query: `month`, `YYYY-MM`; 422 otherwise.
- Response: `MonthlyReportData`, computed on each call, masked (Q1, Q8).
- Copies: `getMonthlyReport` (`api.ts:2358`); tests: `Birthdate`, `ClinicRulesDecisions`, `ReportsDecisions`, `ReportsPage` and 5 more.

#### `GET /api/reports`
- Roles: S, A.
- Response: `Report[]`, `data` regenerated.
- Copies: `listReports` (`api.ts:2399`); tests: none. No screen calls it today (`ERD-Review.md`).

## Sports Reports (ADR-034)

Staff only; the Admin gets 403 with "Only the clinic staff can open Sports Reports."

#### `GET /api/sports-reports`
- Roles: S. Response: `SportsReportSummary[]`, newest first.
- Copies: `listSportsReports` (`api.ts:2766`); tests: `SportsReport`.

#### `POST /api/sports-reports`
- Roles: S.
- Request: `SportsReportInput`.
- Response: 201 `SportsReport`.
- Errors: 403; 422 with field `errors`.
- Audit: `create sports-report`.
- Copies: `createSportsReport` (`api.ts:2882`); tests: `SportsReport`, `auditCoverage`.

#### `GET /api/sports-reports/{id}`
- Roles: S. Response: `SportsReportDetail`. Errors: 403, 404.
- Copies: `getSportsReport` (`api.ts:2798`); tests: `SportsReport`.

#### `PUT /api/sports-reports/{id}`
- Roles: S. Request: `SportsReportInput`. Errors: 403, 404, 422. Audit: `update sports-report`, changed.
- Copies: `updateSportsReport` (`api.ts:2901`); tests: `SportsReport`, `auditCoverage`.

#### `GET /api/sports-reports/{id}/content`
- Roles: S. Response: `SportsReportContent`, computed when asked. Never notes, vitals, medicines, contacts or letters.
- Copies: `getSportsReportContent` (`api.ts:2844`); tests: `SportsReport`.

#### `POST /api/sports-reports/{id}/duplicate`
- Roles: S. Response: 201 `SportsReport`. Audit: `create sports-report`, "Duplicated from another Sports Report".
- Copies: `duplicateSportsReport` (`api.ts:2915`); tests: `SportsReport`, `auditCoverage`.

#### `PUT /api/sports-reports/{id}/archived`
- Roles: S. Request: `archived`. Audit: `archive sports-report`, or `update sports-report` "Restored from the archive".
- Copies: `setSportsReportArchived` (`api.ts:2937`); tests: `SportsReport`, `auditCoverage`.

## Dashboard and Calendar (Module 9)

#### `GET /api/dashboard/summary`
- Roles: S, A.
- Query: `preset`, `from`, `to`, `sex?`, `gradeLevel?`.
- Response: `DashboardSummary`, masked. The Admin's totals leave staff incidents out (ADR-053 item 4).
- Copies: `getDashboardSummary` (`api.ts:2467`); tests: `AccessAndBackup`, `Birthdate`, `ClinicRulesDecisions`, `DashboardAndReports` and 5 more.

#### `GET /api/dashboard/cluster-alerts`
- Roles: S, A. Response: `ClusterAlert[]`; always empty for the Admin (ADR-050).
- Copies: `listClusterAlerts` (`api.ts:2557`); tests: `AdminAuditDashboardDecisions`.

#### `GET /api/calendar/days`
- Roles: S, A. Query: `from`, `to`. Response: `CalendarDay[]` (Q8).
- Copies: `getCalendarDays` (`api.ts:2561`); tests: `calendarEvents`, `countsAndSeed`, `staff-counts`.

#### `GET /api/calendar/holidays`
- Roles: S, A. Query: `from`, `to`. Response: `HolidayFeed`.
- Copies: `getHolidays` (`api.ts:2571`); tests: `holidays`.

#### `GET /api/calendar/events`
- Roles: S, A. Query: `from`, `to`. Response: `CalendarDayEvent[]`.
- Copies: `listCalendarEvents` (`api.ts:2586`); tests: none.

#### `POST /api/calendar/events`
- Roles: S, A (ADR-042).
- Request: `CalendarEventInput`.
- Response: 201 `CalendarEvent`.
- Errors: 422 with field `errors`.
- Audit: `create calendar-event`.
- Copies: `createCalendarEvent` (`api.ts:2638`); tests: `auditCoverage`, `calendarEvents`.

#### `PUT /api/calendar/events/{id}`
- Roles: S, A. Errors: 404, 422. Audit: `update calendar-event`, changed.
- Copies: `updateCalendarEvent` (`api.ts:2655`); tests: `auditCoverage`, `calendarEvents`.

#### `DELETE /api/calendar/events/{id}`
- Roles: S, A. Response: 204. Errors: 404. Audit: `delete calendar-event`.
- Copies: `deleteCalendarEvent` (`api.ts:2667`); tests: `auditCoverage`, `calendarEvents`. The one real delete in the system: an event is not a health record.

## Backup Verification (Module 10)

Both roles, the same abilities (ADR-037).

#### `GET /api/backups/status`
- Roles: S, A. Response: `BackupStatusView`.
- Copies: `getBackupStatus` (`api.ts:2418`); tests: none.

#### `POST /api/backups/verify-latest`
- Roles: S, A.
- Response: `BackupStatusView`.
- Errors: 404 no backup; a failed latest run: Q10.
- Audit: `update backup`, "Verified backup".
- Copies: `verifyLatestBackup` (`api.ts:2426`); tests: `auditCoverage`.

#### `POST /api/backups/run`
- Roles: S, A.
- Response: `BackupStatusView`.
- Errors: 409 `no_backup_location`.
- Audit: `create backup`, "Backup started from the Backup page (N locations)".
- Copies: `recordBackupNow` (`api.ts:2448`); tests: `AccessAndBackup`, `StaffComplaintsBackupDecisions`, `auditCoverage`. The real job replaces the mock's fake result (ADR-052).

#### `GET /api/backups/locations`
- Roles: S, A. Response: `BackupLocationSettings`.
- Copies: `listBackupLocations` (`api.ts:2502`); tests: `StaffComplaintsBackupDecisions`.

#### `POST /api/backups/locations`
- Roles: S, A.
- Request: `label`, `path`.
- Response: 201 `BackupLocation`.
- Errors: 422 "Enter a label for the location.", "Enter the folder or drive path."
- Audit: `create backup-location`.
- Copies: `saveBackupLocation` (`api.ts:2523`); tests: `StaffComplaintsBackupDecisions`. The backend checks the path itself; the mock's "found" is a stand-in.

#### `PUT /api/backups/locations/{id}`
- Roles: S, A. Errors: 404, 422. Audit: `update backup-location`, changed.
- Copies: `saveBackupLocation` (`api.ts:2523`); tests: `StaffComplaintsBackupDecisions`.

#### `PUT /api/backups/locations/{id}/enabled`
- Roles: S, A. Request: `enabled`. Audit: `update backup-location`, "Enabled" or "Disabled"; nothing when unchanged.
- Copies: `setBackupLocationEnabled` (`api.ts:2542`); tests: `StaffComplaintsBackupDecisions`. Never deleted.

## Audit and shared actions (Module 11)

#### `GET /api/audit-log`
- Roles: S, A.
- Query: `from`, `to`, `userId`, `actionTypes[]`, `targetTypes[]`.
- Response: `AuditLogList`, masked targets. Writes no entry (ADR-016). No route updates or deletes an entry.
- Copies: `listAuditLog` (`api.ts:2986`); tests: `print-documents`.

#### `POST /api/audit/views`
- Roles: S, A.
- Request: `type` (`student`, `staff`, `incident`), `id`.
- Response: 204.
- Audit: `view <type>`, "Opened student profile", "Opened staff profile" or "Opened incident report". Once per record per sign-in session.
- Copies: `recordView` (`api.ts:279`); tests: none.

#### `POST /api/audit/prints`
- Roles: S. The Admin gets 403 (ADR-038 item 3).
- Request: `documentTitle`; `record?` `{ type, id, summary? }`.
- Response: 204.
- Audit: `print`.
- Copies: `recordPrint` (`api.ts:265`); tests: `AuditLogPage`, `auditCoverage`. See Q18.

#### `POST /api/issue-reports`
- Roles: S, A.
- Request: `description`, `route`, `pageName`.
- Response: 201 `IssueReport`.
- Errors: 422 "Issue description is required."
- Audit: `create issue-report`.
- Copies: `createIssueReport` (`api.ts:2959`); tests: `auditCoverage`, `issueReportApi`.

#### `GET /api/issue-reports`
- Roles: to confirm, Q12.
- Response: `IssueReport[]`, newest first.
- Copies: `listIssueReports` (`api.ts:2979`); tests: `ReportIssueModal`, `issueReportApi`.

## Not endpoints

| Mock function | Why not |
|---|---|
| `resetMockAuth` (`api.ts:321`) | Test and demo reset of the in-memory lockout state. |
| `getDemoStudent` (`api.ts:666`) | Demo default for a screen opened with no id. Real navigation always carries one. |
| `getLatestVisit` (`api.ts:1021`) | Same demo default, for visit screens. |
| `excusedPeriodError` (`api.ts:1459`) | A form helper. The rule is in Rules to port and enforced on the letter endpoints. |
| `outcomeChangedSinceApproval` (`api.ts:1466`) | A helper. Its result is the `outcomeChanged` field of a student's letters. |
| `validateCalendarEvent` (`api.ts:2608`) | A form helper. The event endpoints enforce the same rules. |
| `validateSportsReport` (`api.ts:2715`) | A form helper. The Sports Report endpoints enforce the same rules. |
| `sportsReportWindowStart` (`api.ts:2697`) | A date helper, used inside the report content. |
| `getAuditLog` (`api.ts:2949`) | Raw log with no screen, replaced by `GET /api/audit-log`; returning raw entries would skip the privacy-safe labels. |

## Rules to port

Each one is business logic the backend must copy exactly, with its source. Tests port from the mock's test files.

**Identity and people**

| Rule | Source |
|---|---|
| LRN: 12 digits as text; normalize keeps digits only; set on create, never changed | `lib/lrn.ts`, `api.ts:770-773`, ADR-028 |
| Masked LRN and its screen-reader text | `lib/lrn.ts` `maskLrn`, `lrnLabel` |
| LRN unique, including archived students; the error never names the other student | `api.ts:777`, `api.ts:729` |
| Duplicate student: same name and grade on an active record asks once on create | `api.ts:778-783` |
| Live duplicate check: same name in any grade, active only | `api.ts:724` |
| Name correction needs a reason of at least 3 characters | `api.ts:774-776` |
| Birthdate optional, real, not in the future; never on a list | `api.ts:785-787`, `selectors.ts` `toStudentRow` |
| Age in whole years, never stored; usual age for a grade; soft note | `lib/age.ts` |
| Record complete: name, grade, sex, at least one contact with name, relationship and phone | `selectors.ts` `missingRequiredFields` |
| Completing a flagged record resolves its review and credits the saver | `api.ts:815-824` |
| Student search: LRN prefix first, name contains, capped, active only | `selectors.ts` `searchStudents` |
| Staff search: Staff No. or its digits; a query with no digit is a name search | `selectors.ts` `searchPersonnel` |
| Combined patient search | `selectors.ts` `searchPatients` |
| Staff No. never reused, archived included | `api.ts:941` |
| Exactly one patient; staff get no letter, PE referral or Sports Report | `api.ts:437`, `:1205`, ADR-043 |
| Grade and section at the time (ADR-047) | `api.ts:449` |
| Grade order: Kinder first, then numeric | `selectors.ts` `compareGradeLevels` |
| Philippine phone formats | `lib/phone.ts` |
| "None" or "None recorded" stores an empty list | `lib/patients.ts` `isNoneRecorded` |
| Last active Admin cannot be disabled or demoted | `api.ts:537`, `:575`, `:605` |
| Username unique, case-insensitive | `api.ts:571` |
| Lockout, password length 8, last 5 passwords, reset clears history | `api.ts:355-421`, `:546` |
| Audit summary names fields, never values | `api.ts:205-239`, ADR-017 |

**Visits, letters and follow-ups**

| Rule | Source |
|---|---|
| Visit time: format, never future, late entry over 30 minutes | `api.ts:1093` |
| Logbook fields: blank is null; Time out `HH:MM`, not before time in | `api.ts:1107` |
| Disposition rules: letter only on Sent home or Referred; "Referred to" only on Referred; collected-by only on those two; its time not future; nobody named means nothing recorded | `api.ts:1129` |
| Complaint cleaned, capped at 60, stored in a known spelling | `lib/complaints.ts`, `api.ts:1216` |
| Complaint suggestions ranked by use, then recency | `selectors.ts` `complaintSuggestions` |
| Extra complaints: cleaned, no repeats, not the main one, at most 3, counted nowhere | `api.ts:1073` |
| Entered in error: kept, leaves lists and counts, stock back, letter voided, pending follow-ups cancelled | `api.ts:1323`, `:111` |
| Corrected visit time keeps the rules; same minute means unchanged | `api.ts:1269` |
| Excused period: both dates, until not before from; no maximum | `api.ts:1459` |
| Medical-certificate warning: warns, never blocks | `lib/excuseLetter.ts` |
| Letter wording, recipient and id numbering; stored at approval | `lib/excuseLetter.ts`, `api.ts:1480` |
| Approved letter is fixed; replacement supersedes and opens a draft; voided is never valid | `api.ts:1374`, `:1354` |
| Outcome changed since approval flag | `api.ts:1466` |
| Follow-up due state: upcoming, due today, due, overdue after 3 days | `selectors.ts` `followUpDueState` |
| Follow-up closes as Missed 7 days past its date | `selectors.ts` `withAutoClosedFollowUps` |
| Missed and Cancelled need a reason; reschedule rules | `api.ts:1819`, `:1833` |

**Incidents**

| Rule | Source |
|---|---|
| Stage 1 saves with a complaint and any readings | `api.ts:1573` |
| Escalation: same patient, not in error, once; time from the visit; counted once as the incident | `api.ts:1578-1584`, ADR-036, `selectors.ts` `countedVisits` |
| Completion needs one of: treatment notes, a medicine, a notification, a referral, a no-further-action reason | `lib/itemsGiven.ts` `incidentCompletionBlocker` |
| Medicines fixed after Stage 2; notes fixed after approval | `api.ts:1661-1669` |
| Only a completed report is approved; Acknowledge rules | `api.ts:1770`, `:1783` |
| Admin sees no staff incidents | `api.ts:1543` |
| Vitals warnings and fever flag: warn, never block | `lib/vitals.ts` |
| Age group by age, else grade; staff are adult; usual-range notes | `lib/vitals.ts` `ageGroupOf`, `usualRangeNotes` |

**Inventory**

| Rule | Source |
|---|---|
| Stock is held per batch; totals are derived | `selectors.ts` `inventoryStatus` |
| Low stock at or below the threshold; expired and nearing-expiry flags | `selectors.ts` `inventoryStatus` |
| Dispense takes earliest-expiring usable batch first; no-expiry last; expiring today is usable | `api.ts:2099-2126` |
| A shortfall stays negative on the last usable batch; warns, never blocks | `api.ts:2120` |
| Expired stock cannot be given | `api.ts:2108` |
| One line per item; whole quantity of at least 1; instructions at most 120 | `api.ts:2164-2170` |
| Lines keep name and unit snapshots | `api.ts:2212` |
| Visit edit: `visit_edited` adjustments, returned to the original batches, latest first | `api.ts:2135`, `:2155` |
| Restock adds a batch; expiry or explicit none; not in the past | `api.ts:1979` |
| Adjust Stock: reason list, note for `other`, batch not below 0, disposal only from expired | `api.ts:2041` |
| Avoid-if-allergic words: distinct, warn only | `api.ts:1909`, `lib/itemsGiven.ts` `allergyMatches` |
| Medicine named in notes: a hint | `lib/itemsGiven.ts` `itemsNamedInNotes` |

**Reports, Dashboard, backup**

| Rule | Source |
|---|---|
| Complaint groups: case, spacing and end punctuation ignored | `lib/complaints.ts` |
| Monthly report: all sections, computed on each call | `api.ts:2358` |
| Weeks run Sunday to Saturday; columns sum to the month | `lib/dates.ts` `monthWeeks`, ADR-055 |
| Inventory sheet wound back from today's stock | `api.ts:2323` |
| Items given: dispensed minus `visit_edited` returns | `api.ts:2340` |
| Sports Report window and content; nothing medical stored | `api.ts:2697`, `:2844` |
| School year starts June 15 | `api.ts:2683` |
| Dashboard counts, previous-period rule, trend sizing, weekday comparison | `mock-db/dashboard.ts`, `lib/dateRange.ts` |
| Cluster flags: trend rule and the 3 students in 3 days alert | `dashboard.ts` `detectClusters`, `selectors.ts` `clusterAlerts` |
| Frequent visitors, in clinic now, due follow-ups | `selectors.ts` |
| Calendar day counts and tag de-duplication | `dashboard.ts` `buildCalendarDays` |
| Backup alert: never, failed, stale after 48 hours | `api.ts:2479` |
| Backup status and verification need | `selectors.ts` `backupStatus` |
| Audit Log target labels and filters | `selectors.ts` `auditLogList` |
| Starting values | `mock-db.json` `config`, ADR-051 |

## Backend-only needs

None of these exist in the mock. Each is an addition, and none is built before its phase.

| Need | Phase | Note |
|---|---|---|
| Sign-in, sign-out, the signed-in user, CSRF | B2 | Entries above |
| Forced password change gate | B2 | 403 `password_change_required` on every other route |
| Lockout stored on the account | B2 | `failed_login_count`, `locked_until` |
| Fixed 7-day session, Admin idle sign-out, disabled account check | B0, B2 | Q4, Q5 |
| Health route | B0 | D15 |
| Holiday sync job and the stale warning | B9 | ADR-020; fills `GET /api/calendar/holidays` |
| Follow-up auto-close job | B5 | Q7 |
| Backup job: folders, zip, checksum, pruning to 60, drive check | B10 | ADR-052; a browser cannot do this |
| Backup status writer | B10 | The scheduled script writes a status file, Laravel ingests it |
| Audit log writer and reader | B3 | The reader is `GET /api/audit-log`; the writer is the `AuditLogger` of item B0.7 |
| Retention purge, `db:verify` | Later | `ERD.md` sections 7 and 8 |
| Yearly registrar import | Later | ADR-047; waits for the file format and the privacy agreement |
| Email password reset | Later | ADR-048 item 3 |

## Questions

These need an answer from Zean. Each entry follows the stated default until answered.

| # | Question | Default used here |
|---|---|---|
| Q1 | The mock sends the full LRN on every list and masks on screen. ADR-040 and the backend manual want lists masked in the response, but ADR-044 prints the full LRN on the Clinic Overview Report and the Monthly Report. | Lists are masked. Add `fullLrn=1`, honoured for Staff only, on the Dashboard summary, pending letters and the monthly report, for the print path, and audit the print. |
| Q2 | `StudentListRow` carries allergies, conditions and emergency contacts for every student, to the Admin as well. No list column shows them. | Follow the mock now. Recommended: cut it to the columns the list needs. |
| Q3 | Mock line `api.ts:804` writes the free-text name-correction reason into the audit summary. ADR-017 and the B0.7 validator allow field names only. The reason can hold a name. | Write "Name corrected", and keep the reason on the student record. This needs a column (`ERD-Review.md`). |
| Q4 | **D4 proposes `SESSION_LIFETIME=10080`, but Laravel's session lifetime slides: each request renews it.** ADR-015 and ADR-056 say a fixed 7 days from sign-in, and the mock's `session.ts` does that. A used session would never end. | Keep `SESSION_LIFETIME=10080`, store the sign-in time in the session, and add a middleware that ends the session 7 days after it. Part 2 item B0.5 gains one middleware. |
| Q5 | The mock's Admin timer counts pointer, key and scroll activity. D8 counts requests. An Admin reading one long report without a request is active to the frontend and idle to the server. | D8 as written. At integration, either the frontend sends a keep-alive while active, or the wording changes. |
| Q6 | The mock locks unknown usernames too, in memory. `ERD.md` D-10 stores nothing for them. An unknown name that never locks tells an attacker which usernames exist. | Count unknown usernames in the cache, by the normalized name, so both answer alike. Nothing is written to a table. |
| Q7 | The mock computes auto-close on read (`view()`), but writes use raw state. So `rescheduleFollowUp` on a follow-up shown as Missed by auto-close is refused at `api.ts:1836`, with "Only a missed or cancelled follow-up gets a new date." It also drops the stay-home flag. | A daily job writes Missed, so the case disappears. Keep dropping the flag. Confirm both. |
| Q8 | ADR-043 item 9 and ADR-053 item 4 hide staff incidents from the Admin on the Incident Log and the Dashboard. The mock does not filter the monthly report (`api.ts:2358`), calendar counts (`:2561`), `listApprovedIncidentReportIds` (`:1725`) or `getIncidentTrail` (`:1745`). | Filter the last two, because they name records. Leave the report and calendar totals unfiltered, as the mock does, until answered. |
| Q9 | `approveIncidentReport` has no duplicate check and no role check. The draft's `uq_report_approvals_incident` refuses a second approval. | Staff only. A second approval is 409 `incident_stage`. |
| Q10 | `verifyLatestBackup` verifies a failed run. The draft's `chk_backup_verify_ok` refuses it, and the `needsVerification` flag implies only good runs. | 409 `backup_failed`, added to the rule list when confirmed. |
| Q11 | The draft keeps item names unique among active items. The mock allows duplicates. | Follow the mock until `ERD-Review.md` is settled. |
| Q12 | `listIssueReports` has no screen and no route. Who reads issue reports? | Both roles, read-only. |
| Q13 | The mock never updates `lastLogin`, though the User List shows it. | The backend sets it at sign-in. |
| Q14 | The mock's `changeMockPassword` needs no current password, for Force Password Change. A real endpoint must not allow that outside that state. | `currentPassword` is required unless `mustChangePassword` is true. |
| Q15 | The mock accepts an empty complaint, any disposition string and any vitals key. | Required and enumerated at the boundary (422). `vitals` takes the four reading keys plus `treatmentNotes`. |
| Q16 | `dispenseInventoryItem` accepts a `visitId` with no patient. The draft's `chk_txn_link_has_patient` refuses it. The screen always sends a patient. | 422 when `visitId` comes without a patient. |
| Q17 | ADR-048 needs an email on each account. `UserInput` has none and the form has no field. | Add `email?` to the account endpoints with the reset work, not before. |
| Q18 | `recordPrint` stores a client-sent title and summary in the audit log, and B0.7 refuses free text. | Accept a fixed document key plus record type and id; the server builds the title. The key list comes from `usePrinting` callers at B3. |
| Q19 | The mock has no server pagination, and the Audit Log may reach 12,000 rows or more. | Optional `page` and `perPage` on the four long lists; whole lists otherwise. Choose at integration. |
| Q20 | How is the built frontend served, and does the LAN get HTTPS? It sets `SESSION_SECURE_COOKIE`, CORS and the cookie domain. | Separate origin in development (D4, B0.4). Production is open (`Environment-Setup.md`). |
