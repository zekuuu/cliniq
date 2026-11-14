# API Contract

**Status: the agreed contract, not built.** Written Saturday, October 31, 2026 — 22:05 PHT on the `backend` branch, from `frontend/src/lib/mock-db/api.ts` at commit `b0a0fed7`; questions closed Sunday, November 1, 2026 — 01:55 PHT (ADR-057). No endpoint here exists yet except the two in the Foundation list (ADR-056). Line numbers are that commit's. The contract was generated against the file, and every exported function is either an entry or listed in [Not endpoints](#not-endpoints).

The mock API is the executable spec (ADR-056). This file adds the HTTP layer: URLs, roles, status codes. It adds no behaviour of its own: where the mock and a decision disagreed, the answer is under [Questions](#questions), and the entry follows it. "Mock differs" marks a change the frontend fix branch makes.

**Updated Sunday, November 08, 2026 — 18:35 PHT, following ADR-078 (amends ADR-015, ADR-048 and ADR-057):** idle sign-out is per role, read from the settings (Staff 60, Admin 30, each 10 to 240); a keep-alive endpoint; 401 `session_expired` at the 7-day maximum. See [Idle sign-out](#idle-sign-out). Replaces `GET /api/config/admin-idle-minutes`.

**Updated Saturday, November 07, 2026 — 16:12 PHT, following [ADR-076](../06-Decisions/ADR-076-Staff-Record-Reviews-In-Their-Own-Table.md):** staff record reviews live in `staff_record_reviews`; `GET /api/personnel/incomplete` serves from it, and saving or importing staff opens and resolves its rows. The Admin's Audit Log lists staff-record entries by Staff No. Settles counter-check C-1 and C-8.

**Updated Saturday, November 07, 2026 — 13:24 PHT, following the approved design through [ADR-070](../06-Decisions/ADR-070-Consultation-Wording-Dashboard-Print-Moves-To-Reports.md) to [ADR-075](../06-Decisions/ADR-075-School-Year-Started-By-Hand.md), with their dated amendments:** 12 new mock functions and 14 new entries (authenticator and recovery, school years, the Archive), with changes to the archive, inventory, visit, Dashboard, Sports Report, backup-location and audit-log entries. Two entries are removed: the email reset (replaced by ADR-073) and editing a backup location. There is no Clinic Overview printout any more ([ADR-074](../06-Decisions/ADR-074-No-Clinic-Overview-Printout.md)), so `GET /api/dashboard/summary` no longer takes `fullLrn=1`. The counts below are the original ones. **At `main` `cfd4bd84` (counter-check C-16, Saturday, November 07, 2026 — 13:35 PHT):** `api.ts` exports 126 functions, 15 constants and 19 error classes (104 and 10 on October 31); every function has an entry or a "Not endpoints" row. See `Backend-Counter-Check-Nov7.md`.

**Counts:** 104 exported functions: 94 map to endpoints, 10 are not endpoints. 102 entries: 98 from the mock and 4 additions (one entry holds the two email-reset routes). A function can back more than one entry (create and update), and two password functions share one.

## Conventions

### Sign-in

Sanctum SPA cookie mode (ADR-056). The browser first calls `GET /sanctum/csrf-cookie`, then sends `POST /api/auth/login` with its credentials and the `X-XSRF-TOKEN` header. Every later request sends the session cookie, and every write echoes the header. No API tokens are issued. The session ends 7 days after sign-in, however active the user is, for both roles (ADR-015, ADR-056, ADR-057): Laravel's lifetime slides, so the sign-in time is stored in the session and a middleware ends it. Each role is also signed out after its own idle minutes without a request: see [Idle sign-out](#idle-sign-out) (ADR-048, ADR-078, Q5). Disabling an account ends its sessions (ADR-048): every authenticated request re-reads the account and refuses a disabled one, which needs no list of sessions and so works with the `file` driver. While `mustChangePassword` is true, every route except the password change, sign-out and `GET /api/auth/me` answers 403 `password_change_required`.

### Idle sign-out

Added Sunday, November 08, 2026 — 18:35 PHT for ADR-078, which amends ADR-015, ADR-048 and ADR-057. Replaces the single "Admin idle sign-out" middleware (the `D8` default of the preparation prompt).

- **Per role.** The idle middleware reads the signed-in role's limit from `system_settings`: `idle_signout_minutes_staff` (API `idleSignoutMinutesStaff`, default 60) or `idle_signout_minutes_admin` (`idleSignoutMinutesAdmin`, default 30), each 10 to 240.
- **Activity.** Every authenticated API call counts as activity, `POST /api/session/keepalive` included. The session stores the time of the last call and the limit in force at that call.
- **Signed out.** A request that arrives when the stored limit has passed since the last call ends the session and answers 401 `session_idle`. It writes one audit entry, action "Signed out (idle)", with the user and the action only: no target, no values.
- **The fixed maximum still applies.** 7 days after sign-in the session ends however active it is, and the request answers 401 `session_expired` (ADR-057). The 7-day check runs first.
- **Settings reads.** The settings are read once per request through the settings service, with a short cache (60 seconds). Saving the settings clears the cache.
- **A changed setting** takes effect for the next idle countdown: each session switches to the new value at its next counted request. A countdown already running keeps the limit it started with, so shortening the limit never signs out someone who was inside the old one.
- **The two-minute warning comes from the server's clock.** The frontend shows it from `idleSecondsLeft` (keep-alive response and `GET /api/auth/me`), never from the browser's own timer alone.
- **No automatic polling.** The frontend sends no request on a timer while the user is idle; such a call would keep the session alive for ever.

Tests (Pest, frozen clock with `travelTo`):

1. Staff, one second inside 60 minutes: the next request succeeds.
2. Staff, at 60 minutes exactly: 401 `session_idle`, one "Signed out (idle)" audit row.
3. A keep-alive at 59 minutes resets the countdown: a request at 118 minutes succeeds.
4. The maximum wins: a session active every minute is refused with 401 `session_expired` 7 days after sign-in.
5. Each role uses its own setting: at 31 minutes idle the Admin is refused and Staff are not.
6. A changed setting applies at the next counted request, not to a countdown already running.
7. Saving clears the settings cache: a read after `PUT /api/settings/idle-signout` sees the new value.

### Format

- JSON everywhere. A success is `{ "data": ... }`.
- **Keys are camelCase and shapes match `frontend/src/types/` and the mock's return types**, so a feature `api/` file can swap to HTTP without reshaping. The entries below name the type instead of repeating it.
- **Ids are opaque strings** ("internal ids only"). An LRN never goes in a URL, a query string or an audit entry (ADR-028, ADR-040). A lookup that can carry typed LRN digits is therefore a `POST` with the value in its body, even though it reads. Those are `POST /api/students/query`, `POST /api/students/search`, `POST /api/students/check-duplicates` and `POST /api/patients/search`. Request bodies are never logged (D10).
- **Time** (D6): timestamps are ISO 8601 with `+08:00`, calendar dates `YYYY-MM-DD`, months `YYYY-MM`, clock times `HH:MM`. "Now" and "today" come from the server, never the client.
- **Text limits.** Where the mock sets no length, the approved column size is the limit, answered as 422. The same goes for a number the column cannot hold.
- **A missing value is null.** The API never fills one in. A student with no recorded sex returns null, where the mock reads it as `female` (G4).
- **Stored shapes the API bridges:** ids as strings; one merged `vitals` object, latest value of each reading (G13); the Sports Report `lookBack` values (G23); a medicine line's `batchAllocations`, read from its movements (ADR-057).
- **Trimming.** Blank optional text is stored as null, as the mock does.
- **Names (ADR-064, which follows the approved ERD).** Students and staff are written as `firstName` and `lastName` (required) and `middleName` (optional, null when none, never ""), each trimmed with its spaces collapsed; limits 50, 50 and 40 (`NAME_PART_MAX`). `fullName` is never stored or accepted: every response that carried it still does, built as the non-empty parts in the order First, Middle, Last (`formatPersonName`). Lists sort by last name, then first name, then middle name. A name search matches when every word of the query appears somewhere in the full name, ignoring case, accents and extra spaces; the LRN and Staff No. searches are unchanged. All of these live in `frontend/src/lib/personName.ts`.
- **Writes are all-or-nothing.** Each write endpoint runs in one database transaction, audit entries included, like `write()` at `api.ts:144`.

### Filtering and pagination

The mock has no pagination: it returns whole lists and the screens page them. List endpoints do the same, with their filters as query parameters. Long lists also accept `page` and `perPage` and then add `meta: { page, perPage, total }` (Q19). These are visits, incidents, the audit log and inventory history (an item's history and the movements list). `perPage` defaults to 25 and is at most 100; without either parameter the whole list comes back (built Saturday, November 14, 2026 — 19:09 PHT).

### Display privacy

- **A response that lists several people carries the masked LRN and never a birthdate or an age** (ADR-004, ADR-040, ADR-054). The field stays `lrn` and holds `●●●●●●●●1234`. `maskLrn` gives the same text when applied again, so a screen needs no change. The mock sends the full LRN and masks on screen; this is a deliberate difference.
- **`fullLrn=1`, Staff only, for the printouts of ADR-044.** It returns the full LRN on the pending letters, `GET /api/reports/monthly` and `GET /api/audit-log` (its printout; Saturday, November 07, 2026 — 13:24 PHT). It no longer applies to `GET /api/dashboard/summary`, since the Dashboard prints nothing (ADR-074). It and each such request writes a `print` audit entry naming the document, never the LRN (ADR-057). From an Admin it is 403, since the Admin never prints.
- A single-student response carries the full LRN (ADR-040).
- A staff patient appears on lists by Staff No., never by name (ADR-043).
- An internal id is never shown to a person; the printed reference number is an ERD question.

### Admin read-only (ADR-038)

The Admin writes only: accounts (ADR-033), calendar events (ADR-042), Backup (ADR-037), own password, and issue reports. Any other write answers 403. The Admin never prints (ADR-038 item 3). The detail of a staff patient's incident does not exist for the Admin: reading one answers 404, not 403, as the mock does (`visibleTo`, `api.ts:1543`). The Admin's totals leave staff incidents out (ADR-053). Calendar counts, the monthly report, the incident trail and approved-report ids may include them (ADR-057). Most of these role rules are route rules in the mock's frontend, not checks in `api.ts`; the backend enforces all of them.

**Roles** in the entries: `S` Staff, `A` Admin/Principal, `—` no sign-in. They come from the Access Summary in `Module-Overview.md`, checked against `AppRoutes.tsx` and the mock's role checks.

### Audit events

Every write records who, the action, the target type and id, the time, and a summary naming fields, never values (ADR-017). The `Audit` line in each entry gives `action target` and the summary. `changed` means the `changedSummary` text (`api.ts:231`). Reading the Audit Log writes nothing (ADR-016). Lists and searches write nothing (ADR-048).

### Errors

One body for every failure:

```json
{ "code": "rule_violated", "message": "Medicines on a completed incident can't be changed.", "rule": "stock_rule", "errors": { "field": ["..."] }, "request_id": "..." }
```

`rule` appears only on 409 and `errors` only on 422. `message` is the mock's exact text, which the screens show. A 500 carries no trace, query or record.

This is D5 adjusted to the mock. Added by ADR-057: `invalid_credentials`, `account_locked` (423), `password_change_required`.

| Status | `code` | When | Mock equivalent |
|---|---|---|---|
| 401 | `unauthenticated` | No session | `getMockSessionUser` |
| 401 | `session_expired` | 7 days after sign-in (ADR-057), however active | None |
| 401 | `session_idle` | Idle past the signed-in role's limit (ADR-048, ADR-078) | Frontend timer |
| 401 | `invalid_credentials` | Wrong password, unknown user, disabled account; one message for all three; adds `attempts_left` | `MockAuthError('invalid_credentials', undefined, remaining)` |
| 403 | `forbidden` | Wrong role | `AccountPermissionError`, `PersonnelPermissionError`, `SportsReportPermissionError` |
| 403 | `password_change_required` | Must change the password first | Force Password Change route guard |
| 404 | `not_found` | Unknown id, or a record this role may not know of | `NotFoundError` |
| 409 | `rule_violated` | A valid request refused by stored state, with `rule` | Named errors below, and plain `Error` that depends on the record |
| 419 | `csrf_mismatch` | Missing or stale CSRF token | None |
| 422 | `validation_failed` | The request itself is wrong, whatever is stored | `CalendarEventValidationError`, `SportsReportValidationError`, and plain `Error` about a field's own value |
| 423 | `account_locked` | Locked; adds `locked_until` | `MockAuthError('locked', lockedUntil)` |
| 405 | `method_not_allowed` | Wrong method on a real route | None |
| 429 | `too_many_requests` | Throttled | None |
| 410 | `bad_request` | An expired password-recovery reset, "This reset has expired. Start again with a new code." (backend B2, Saturday, November 14, 2026 — 19:09 PHT) | None |
| 4xx | `bad_request` | Any other refusal by the framework, such as a body too large | None |
| 500 | `server_error` | Anything else | None |

**422 or 409.** If the answer can be decided from the request alone, it is 422. If it depends on a stored record, it is 409 with a `rule`.

Values of `rule`, each with its mock error:

| `rule` | Mock error | `rule` | Mock error |
|---|---|---|---|
| `last_admin` | `LastAdminError` | `incident_approved` | `IncidentApprovedError` |
| `duplicate_username` | `DuplicateUsernameError` | `authenticator_setup` | None: a confirm with no pending setup, "Start the setup again." (backend B2, Saturday, November 14, 2026 — 19:09 PHT) |
| `school_year` | Plain `Error`, the school-year steps (backend B4, Saturday, November 14, 2026 — 19:09 PHT) | | |
| `duplicate_lrn` | `DuplicateLrnError` | `stock_rule` | `StockRuleError` |
| `lrn_locked` | `LrnLockedError` | `no_backup_location` | `NoBackupLocationError` |
| `visit_entered_in_error` | Plain `Error`, `api.ts:1265`, `:1329`, `:1482`, `:1582` | `excuse_letter` | Plain `Error`, letter state, `api.ts:1143`, `:1381`, `:1382`, `:1486`, `:1508` |
| `incident_stage` | Plain `Error`, `api.ts:1583`, `:1787`, and the completion blocker | `follow_up_state` | Plain `Error`, `api.ts:1836` |
| `password_reuse` | Plain `Error`, `api.ts:407` | `wrong_patient` | Plain `Error`, `api.ts:1205`, `:1481`, `:1581` |
| `backup_failed` | None: mock differs (Q10) | `duplicate_item_name` | None: mock differs (Q11) |

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
- Errors carry `attempts_left` (Updated Monday, November 09, 2026 — 20:08 PHT, from `api.ts` `recordFailure` and `features/auth/lockMessage.ts`, `main` `56cb91b`): a wrong password answers 401 `invalid_credentials` with `attempts_left` (4 to 1); the fifth failure locks and answers 423 `account_locked` with `locked_until`. The screen adds "Your account will be locked after N more failed attempt(s)." only when 3 or fewer are left; the locked message is "This account is temporarily locked after repeated failed attempts. Try again at HH:MM."
- Audit: `login user`; a lockout writes `login user` with "Account locked for 5 minutes after 5 wrong passwords (sign-in)". A single wrong password writes nothing. No entry for an unknown username.
- Copies: `authenticateMockUser` (`api.ts:355`); tests: `AccessAndBackup`, `ChangePasswordPage`, `accounts`, `auditCoverage` and 1 more. Five failures lock for 5 minutes (`LOCKOUT_ATTEMPTS`, `LOCKOUT_MINUTES`; ADR-015 as amended November 8, 2026) and reset the count; an expired lock clears first; a disabled account counts as a failure. Sets `lastLogin` (Q13). Unknown usernames: Q6.

#### `POST /api/auth/logout`
- Roles: S, A.
- Request: optional `reason`, one of the summaries the frontend sends (idle sign-out).
- Response: 204. After the response, a backup runs to every enabled location (the backup at sign-out, ADR-037, ADR-052); with no enabled location nothing runs and the sign-out is unchanged. Built Saturday, November 14, 2026 — 19:09 PHT.
- Audit: `logout`, target none, optional summary.
- Copies: `logoutMockSession` (`api.ts:249`); tests: `auditCoverage`.

#### `GET /api/auth/me`
- **Addition.** Roles: S, A. Allowed during a forced password change.
- Response: `{ user: SessionUser, mustChangePassword, idleSignoutMinutes, idleSecondsLeft }`. `idleSignoutMinutes` is the signed-in role's limit. The call counts as activity, so `idleSecondsLeft` is the full limit. Replaces the mock's `getAuthenticatedUser` in `session.ts`; `idleSignoutMinutes` copies `getIdleSignoutMinutes` (`api.ts:330`).

#### `POST /api/auth/password`
- Roles: S, A. Allowed during a forced password change.
- Request: `nextPassword`; `currentPassword`, required unless the account must change its password (Q14).
- Response: 204.
- Errors: 422 "Password must be at least 8 characters."; 422 "Your current password is incorrect."; 409 `password_reuse`.
- The session that changed the password stays signed in; any other session of the account ends at its next request (401), as after an Admin's reset (Sanctum's session check; backend B2, Saturday, November 14, 2026 — 19:09 PHT).
- Audit: `update user`, "Changed password".
- Copies: `changeOwnPassword` (`api.ts:418`); tests: `ChangePasswordPage` and `changeMockPassword` (`api.ts:397`); tests: `auditCoverage`, `auth`. The new password is trimmed; the last 5 cannot be reused; the history holds at most 5.

#### Password recovery with an authenticator app (ADR-073, amended)

Replaces the email reset of ADR-048 item 3 (Saturday, November 07, 2026 — 13:24 PHT): no `users.email`, no mail service, no reset-token table. Codes are RFC 6238, SHA-1, 30-second steps, 6 digits, one step either way. A code from an already accepted step is refused (`users.last_totp_step`). The secret is encrypted at rest (`users.totp_secret`, key in the environment) and never returned after setup. Recovery codes are slow-hashed (`recovery_codes`). Never in an audit entry: a code, a secret or a password.

The three recovery routes are unauthenticated. They sit behind the CSRF cookie of Sanctum SPA mode (ADR-056), the `login` throttle and a per-username rate limiter. Every failure of the check or the verify step counts toward the sign-in lockout (5 failures, 5 minutes, ADR-015) and gives the same 423 `account_locked` once locked. Each failure before the lock carries `attempts_left`, as at sign-in. A lockout here is audited like the sign-in one, with "(password recovery)": "Account locked for 5 minutes after 5 wrong passwords (password recovery)".

**Accepted risk (ADR-073 amendment, Zean, November 7, 2026):** the check step tells a person at the clinic computer which usernames exist and which can recover. The lockout and the rate limiter limit guessing. Logged as a `DECIDE` in `Backend-Issues-and-TODOs.md`.

#### `POST /api/auth/recovery/check`
- **New.** Roles: —. Throttle `login`.
- Request: `username`.
- Response: 204 when the account is active and has a confirmed authenticator.
- Errors: 422 with exactly one of "No account with that username.", "This account is disabled. Ask the Administrator.", "This account has no authenticator app set up. Ask the Administrator to reset your password."; 423 `account_locked`; 429.
- Copies: `checkRecoveryAccount`; tests: `Authenticator`.

#### `POST /api/auth/recovery/verify`
- **New.** Roles: —. Throttle `login`.
- Request: `username`, `code` (6 digits, or a recovery code "ABCD-EFGH").
- Response: `{ token }`, one-time and short-lived (10 minutes, kept in the cache).
- Errors: 422 "The code did not work, or the account is not set up for recovery. Ask the Administrator to reset your password." for any failed code; 423; 429.
- Audit: "Used a recovery code" when one is spent.
- Copies: `verifyPasswordRecovery`; tests: `Authenticator`.

#### `POST /api/auth/recovery/reset`
- **New.** Roles: —.
- Request: `token`, `nextPassword`, by the Change Password rules (8 characters, not one of the last 5).
- Response: 204. Clears a pending forced change.
- Errors: 410 "This reset has expired. Start again with a new code."; 422 and 409 as for `POST /api/auth/password`.
- Audit: `update user`, "Reset password with authenticator".
- Copies: `resetPasswordWithRecovery`; tests: `Authenticator`.

#### `GET /api/auth/authenticator`
- **New.** Roles: S, A (the signed-in user only). Response: `{ enabled, recoveryCodesLeft }`.
- Copies: `getAuthenticatorStatus`; tests: `Authenticator`.

#### `POST /api/auth/authenticator/setup`
- **New.** Roles: S, A.
- Request: `proof?`, the current code or a recovery code, required when replacing.
- Response: `{ secret, otpauthUri }`, once. The pending secret is held in the session until confirmed.
- Errors: 422 when the proof fails.
- Copies: `startAuthenticatorSetup`; tests: `Authenticator`.

#### `POST /api/auth/authenticator/confirm`
- **New.** Roles: S, A.
- Request: `code`, the first code from the app.
- Response: `{ recoveryCodes }`, 8 codes, once.
- Errors: 422 "That code did not work. If codes do not work, check that the phone's date and time are set automatically."; 409 when no setup is pending.
- Audit: `update user`, "Set up authenticator" or "Replaced authenticator".
- Copies: `confirmAuthenticatorSetup`; tests: `Authenticator`.

#### `DELETE /api/auth/authenticator`
- **New.** Roles: S, A.
- Request: `proof`, the current code or a recovery code.
- Response: 204. Clears the secret and the recovery codes.
- Errors: 422.
- Audit: `update user`, "Turned off authenticator".
- Copies: `turnOffAuthenticator`; tests: `Authenticator`.

**Administrator account:** nobody can reset the Administrator's password. The Admin sets up the authenticator at handover. Otherwise the offline break-glass command in `Environment-Setup.md` is the way back.

#### `POST /api/session/keepalive`
- **New** (Sunday, November 08, 2026 — 18:35 PHT, ADR-078). Roles: S, A (any signed-in role). No body.
- Response: 200 `{ "data": { "idleSecondsLeft": n } }`. The prompt asked for 204 and a returned value, which conflict: a 204 has no body. 200 with the remaining seconds is chosen, so the client shows the two-minute warning from the server's clock.
- Counts as activity. The frontend sends it at most once a minute while the user is active, and on "Stay signed in". A call within 60 seconds of the last counted activity answers 200 with the current value and writes nothing to the session; the limit is at least 10 minutes, so the warning's button never falls inside that window. A general limit (`throttle:60,1`) answers 429 beyond that.
- Errors: 401 `session_idle`, 401 `session_expired`.
- Audit: none.
- Copies: none in the mock yet; the frontend timer (`main`, ADR-078). **Built on `backend` Monday, November 09, 2026 — 18:38 PHT:** `KeepAliveController` behind `auth:sanctum`, `session.fixed`, `session.idle` and `throttle:60,1`; tests in `MiddlewareTest`.

#### `GET /api/settings/idle-signout`
- **Replaces `GET /api/config/admin-idle-minutes`** (Sunday, November 08, 2026 — 18:35 PHT). Roles: S, A.
- Response: `{ idleSignoutMinutesStaff, idleSignoutMinutesAdmin }`.
- Copies: `getIdleSignoutSettings` (`api.ts:325`); tests: `idle-signout`.

#### `PUT /api/settings/idle-signout`
- **New** (Sunday, November 08, 2026 — 18:35 PHT). Roles: S. The Admin reads only.
- Request: `idleSignoutMinutesStaff`, `idleSignoutMinutesAdmin`, whole numbers 10 to 240.
- Errors: 403 for the Admin; 422 for a value out of range (`chk_settings_idle_signout` backs it). The message text follows the frontend when `main` builds the screen.
- Audit: `update settings` (`settings/idle-signout`), the changed field names only ("Updated Staff idle sign-out minutes"), never the values. Clears the settings cache.
- Messages: 403 "Only the clinic staff can change the sign-out times."; 422 "Enter whole minutes from 10 to 240."
- Copies: `saveIdleSignoutSettings` (`api.ts:335`) and its range check `validIdleMinutes` (`api.ts:321`, a helper, no endpoint of its own); tests: `idle-signout`.

#### `GET /api/auth/profile`
- **Added Saturday, November 07, 2026 — 13:33 PHT (counter-check C-5).** Roles: S, A (the signed-in account only, ADR-066). Response: `OwnAccount` (`name`, `username`, `role`, `profilePicture`, `lastLogin`).
- Errors: 403 for a disabled account.
- Copies: `getOwnAccount`; tests: `ownProfile`.

#### `PUT /api/auth/profile`
- **Added Saturday, November 07, 2026 — 13:33 PHT (counter-check C-5).** Roles: S, A (own account; the username and role stay with the Admin, ADR-066).
- Request: `name` (trimmed, spaces collapsed, 1 to 120 characters), `profilePicture` (a `data:image/` URL, or null to remove).
- Errors: 422 "Enter your full name.", "Keep your name to 120 characters or fewer.", "Choose a JPEG, PNG, or WebP image."
- Audit: `update user`, "Changed own name" and the picture change, each by field only; never the names or the image.
- Copies: `updateOwnProfile`; tests: `ownProfile`.

## User Management (Module 1, ADR-033)

Only the Admin manages accounts. Staff read names only, because visit and letter screens print who logged a record.

#### `GET /api/users`
- Roles: A full `User`; S only `id`, `name`, `role`.
- Response: `User[]`, by name. Never a password hash, a lock count or a token.
- Copies: `listUsers` (`api.ts:491`); tests: none.

#### `POST /api/users`
- Roles: A.
- Request: `name`, `username`, `role`, `profilePicture?`, `temporaryPassword`. No `email`: the email reset is replaced by ADR-073 (Saturday, November 07, 2026 — 13:24 PHT; Q17 closed).
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
- Roles: S. Response: `ComplaintType[]` with first-aid steps, each with its `id`, which `usedFor` sends (ADR-071). The lists ship with the product (migration `insert_complaint_types`, from the mock's lists). Copies: `getVisitComplaintTypes` (`api.ts:457`); tests: none.

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

#### `GET /api/reference/large-write-off-percent`
- **Added Saturday, November 07, 2026 — 13:33 PHT (counter-check C-5).** Roles: S. Response: number (`large_write_off_percent`, 25), for the Adjust Stock form's "Large write-off" mark (ADR-061).
- Copies: `getLargeWriteOffPercent`; tests: none.

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
- Response: `StudentListRow[]`, by last, first and middle name (ADR-064); masked LRN; no birthdate, no health fields, no contacts (Q2).
- Copies: `listStudents` (`api.ts:633`); tests: `AppRoutes`, `AuditLogPage`, `Birthdate`, `ClinicRulesDecisions` and 2 more. Every word of the search in the full name (ADR-064), or an all-digit search matches the LRN prefix.

#### `POST /api/students/search`
- Roles: S.
- Request: `q`, `limit` (default 8).
- Response: `StudentSearchResult[]`, active students, no medical fields, masked LRN.
- Copies: `searchStudents` (`api.ts:653`); tests: `Birthdate`, `search`. LRN matches first, then name matches (every word in the full name, ADR-064); below 1 character, empty.

#### `POST /api/students/check-duplicates`
- Roles: S.
- Request: `lrn`, `firstName`, `lastName`, `middleName`.
- Response: `StudentDuplicateCheck`, `nameMatches` are students whose joined full name equals the typed one after trimming, collapsing spaces, and ignoring accents and case (ADR-064); with no word on who holds a taken LRN; `nameMatches` masked.
- Copies: `checkStudentDuplicates` (`api.ts:724`); tests: none.

#### `POST /api/students`
- Roles: S.
- Request: `StudentInput` (`firstName`, `lastName`, `middleName`, not `fullName`; ADR-064), `confirmDuplicate?`.
- Response: 201 `{ status: "saved", student, action: "create" }`, `student.fullName` built on read, or **200** `{ status: "duplicate", matches }`, which is not an error: the mock returns it as a value and the form asks.
- Errors: 422 "The LRN must be exactly 12 digits.", "Enter the student's first name.", "Enter the student's last name.", "The first name can be at most 50 characters." (middle 40, last 50), "Enter a real birthdate.", "The birthdate can't be in the future.", "Choose the grade level." (an unknown grade, added Saturday, November 14, 2026 — 19:09 PHT); 409 `duplicate_lrn` (never names the other student).
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
- Audit: `update student`, changed. A changed name part is named by field only ("Updated last name", "Updated first name and last name"); a name correction adds ". Name corrected; reason: <reason>", never the old or new name (ADR-058 as amended by ADR-064). The reason is also kept in `name_correction_reason` (ADR-058, which reverses Q3).
- Copies: `saveStudent` (`api.ts:765`); tests: `Birthdate`, `LettersAndVisitsDecisions`, `RecordsDecisions`, `StudentFormPage` and 2 more. Completing a flagged record resolves its review, crediting the saver.

#### `POST /api/students/{id}/archive`
- Roles: S.
- Request: `reason` (required, up to 80 characters; ADR-072, Saturday, November 07, 2026 — 13:24 PHT).
- Response: `Student`. Errors: 404; 422 "Give the reason for archiving." (the mock's text; was "Choose a reason." here, corrected Saturday, November 14, 2026 — 19:09 PHT). Stores `archived_at`, `archive_reason` and `archived_school_year` (the current year's label). Audit: `archive student`.
- Copies: `archiveStudent`; tests: `SportsReport`, `auditCoverage`, `ArchivePage`. A reason is now asked (ADR-072, replacing "no reason" of ADR-047). The yearly import stores "Not on the new list".

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
- Response: `Personnel[]`, by last, first and middle name (ADR-064). A deliberate masterlist, so names show (D7).
- Copies: `listPersonnel` (`api.ts:857`); tests: `personnel`.

#### `GET /api/personnel/search`
- Roles: S. Query: `q`, `limit`. Response: `PersonnelSearchResult[]`.
- Copies: `searchPersonnel` (`api.ts:880`); tests: `personnel`.

#### `POST /api/personnel`
- Roles: S.
- Request: `PersonnelInput`, with `firstName`, `lastName`, `middleName` (ADR-064) and `sex` (`female` or `male`, required, ADR-063).
- Response: 201 `{ personnel, action: "create" }`.
- Errors: 403 "Only the clinic staff can manage staff records."; 422 "Enter the staff member's first name.", "Enter the staff member's last name.", a name part over its limit, "Choose the sex.", "Choose the staff type.", department over 60.
- Audit: `create staff`.
- Review queue ([ADR-076](../06-Decisions/ADR-076-Staff-Record-Reviews-In-Their-Own-Table.md), Saturday, November 07, 2026 — 16:12 PHT): a save that leaves the record incomplete (no emergency contact, or no sex) opens a `staff_record_reviews` row if none is open; a save that completes a record with an open row resolves it with the signed-in user and the time. Never refused for missing fields (ADR-067). The `update staff` entry covers it: no separate audit entry, as in the mock.
- Copies: `savePersonnel` (`api.ts:950`); tests: `personnel`, `staff-counts`. The Staff No. is assigned, never reused.

#### `GET /api/personnel/{id}`
- Roles: S. Errors: 404. Copies: `getPersonnel` (`api.ts:868`); tests: `StaffPages`.

#### `PUT /api/personnel/{id}`
- Roles: S. Request: `PersonnelInput`. Response: `{ personnel, action: "update" }`. Errors: as create, plus 404. Audit: `update staff`, changed; a changed name part is named by field only ("Updated last name", ADR-064).
- Review queue: as `POST /api/personnel`; this is the save that resolves a review (the mock's `resolveIfCompleted`).
- Copies: `savePersonnel` (`api.ts:950`); tests: `personnel`, `staff-counts`.

#### `POST /api/personnel/{id}/archive`
- Roles: S. Request: `reason` (required, up to 80 characters; ADR-072). Errors: 403, 404, 422. Stores the archive details as for students. Audit: `archive staff`.
- Copies: `archivePersonnel`; tests: `personnel`, `ArchivePage`. The staff import archives nobody (ADR-069).

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
- Request: `RecordVisitInput`. Labels only (ADR-070): screens say "Symptom(s)" and "Released to"; the fields stay `complaint`, `extraComplaints` and `collectedBy` (`name`, `relationship`, `time`). For "Other", `collectedBy.relationship` carries who it was (for example "Neighbour"), never "Other". The same holds for `PUT /api/visits/{id}`.
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
- A Missed follow-up that has a new date is left out of the list; the record stays (Zean, Sunday, November 1, 2026 — 11:58 PHT).
- Copies: `listFollowUps` (`api.ts:1805`); tests: `Birthdate`, `ClinicRulesDecisions`, `ExcuseLettersAndFollowUps`, `FollowUpListPage` and 3 more. Past the auto-close limit reads as Missed; a daily job also writes it (Q7).

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
- Errors: 404; 409 `follow_up_state`, unless the follow-up is missed or reads as Missed (a cancelled or completed one is refused; Zean, Sunday, November 1, 2026 — 11:05 PHT), or if it already has a new date (a later follow-up with the same patient, record and reason); 422 date in the past.
- Audit: `create follow-up`.
- Copies: `rescheduleFollowUp` (`api.ts:1833`); tests: `ExcuseLettersAndFollowUps`. Keeps patient, record, reason and notes. A follow-up that reads as Missed can be rescheduled, and it is written Missed at that moment (Q7). The stay-home flag and its note carry over to the new follow-up until the clinician clears them (Q7b).

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
- Errors: 404; 409 `incident_approved`; 409 `stock_rule` "Medicines on a completed incident can't be changed." Every Stage 2 field is optional: there is no completion blocker (ADR-065; corrected Saturday, November 07, 2026 — 13:33 PHT, counter-check C-3).
- Audit: `update incident-stage-2` "Completed Stage 2 details" with named fields; `create parent-notification` per attempt; `submit inventory-dispensation` per line; `create follow-up`.
- Copies: `completeIncidentStageTwo` (`api.ts:1641`); tests: `RecordsDecisions`, `auditCoverage`, `stock`. Medicines dispense only on the first completion.

#### `POST /api/incidents/{id}/parent-notifications`
- Roles: S.
- Request: `outcome`, `calledContact?`.
- Response: 201 `ParentNotificationAttempt`.
- Errors: 404; 422 unknown outcome.
- Audit: `create parent-notification`.
- Copies: `addParentNotification` (`api.ts:1703`); tests: `IncidentSafety`, `auditCoverage`.

#### `GET /api/incidents/approved-ids`
- Roles: S, A. Response: `string[]`. May include staff incidents: ids, no detail (Q8).
- Copies: `listApprovedIncidentReportIds` (`api.ts:1725`); tests: none.

#### `GET /api/incidents/{id}/trail`
- Roles: S, A. Response: `IncidentTrail`, field names only. May cover a staff incident (Q8).
- Copies: `getIncidentTrail` (`api.ts:1745`); tests: none.

#### `POST /api/incidents/{id}/approve`
- Roles: S.
- Response: 204.
- Errors: 404; 409 `incident_stage` for a Stage 1 record or one already approved (Q9). A completed record with nothing recorded can be approved (ADR-065; the screen shows "No treatment recorded. Check this is correct before approving.").
- Audit: `approve incident-report`.
- Copies: `approveIncidentReport` (`api.ts:1783`); tests: `AdminAuditDashboardDecisions`, `IncidentSafety`, `RecordsDecisions`, `auditCoverage`.

## Yearly student list (Module 2, ADR-047)

Added by the frontend clean-up, Part 2. The real import waits for the signed data privacy agreement.

#### `POST /api/students/import/preview`
- Roles: S. Request: mapped rows. Response: `StudentImportPreview`; writes nothing.
- Columns (ADR-064): separate First name, Last name and Middle name columns map directly. A single "Full name (one column)" column is accepted only when no First or Last column is matched. With a comma ("Surname, First Middle") the last name is before the comma, and of the words after it the last is the middle name when there are two or more (one word is the first name, no middle). Without a comma the last word is the last name and the rest is the first name, no middle. The preview lists every split (row, last, first, middle) so the registrar can correct the file.
- Copies: `previewStudentImport`; tests: `StudentImportPage`.

#### `POST /api/students/import`
- Roles: S. Request: mapped rows, file name, `archiveIds`. Response: `StudentImportResult`.
- Audit: `submit student-import`, counts only. A list that changes nothing writes no batch and no audit entry.
- Copies: `applyStudentImport`; tests: `StudentImportPage`.

## Staff list import and incomplete staff records (ADR-067, ADR-069)

Added Saturday, November 07, 2026 — 13:33 PHT (counter-check C-5). Staff only; the Admin gets 403 "Only the clinic staff can manage staff records." (`PersonnelPermissionError`).

#### `POST /api/personnel/import/preview`
- Roles: S. Request: the parsed rows (`StaffImportRow[]`). Reads only.
- Response: `StaffImportPreview` (`newCount`, `continuingCount`, `changedCount`, `problems`).
- Copies: `previewStaffImport`; tests: `StaffImport`.

#### `POST /api/personnel/import`
- Roles: S. Request: the rows and `fileName`.
- Response: `StaffImportResult` (`created`, `updated`, `flagged`). Adds new staff with a new Staff No., updates matched ones, restores a matched archived record; staff missing from the file are left alone (ADR-069). A file that changes nothing writes nothing.
- Audit: `submit staff-import`, "N added, N updated, N flagged" (counts, never names). No batch table exists for staff (the student import has `student_import_batches`): the entry's `target_label` names the run.
- Review queue: each added or updated record is checked as on a save, so an import can open or resolve `staff_record_reviews` rows; a flagged row is left out of the import and opens nothing (ADR-076).
- Copies: `applyStaffImport`; tests: `StaffImport`.

#### `GET /api/personnel/incomplete`
- Roles: S. The Admin gets 403 and nothing about these reviews (ADR-038, ADR-043).
- Response: `StaffIncompleteRecord[]`: active staff with missing fields or a resolved review, sorted by last name, each with `missingFields`, `review` (`resolvedByUserId`, `resolvedAt`), `resolvedByName` and `status` (`open` or `resolved`). Reads only; writes no entry.
- Served from `staff_record_reviews` joined to `personnel` (ADR-076; was "needs a review table", counter-check C-1, settled Saturday, November 07, 2026 — 16:12 PHT). Missing fields are computed on read (`missingStaffFields`), never stored (ERD L-3).
- No flag or resolve endpoint: the frontend has none. Rows open and resolve only through `POST`/`PUT /api/personnel` and `POST /api/personnel/import`.
- Copies: `getStaffIncompleteQueue`, `staffIncompleteQueue`; tests: none.

## Inventory (Module 8)

#### `GET /api/inventory/movements`
- Roles: S. Query: `from`, `to`, `itemId`, `type`. Response: `InventoryMovementRow[]`; the patient is a masked number, never a name.
- Copies: `listInventoryMovements`; tests: `InventoryHistoryPage`.

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
- Errors: 409 `stock_rule` for the expiry rules; 422 for `currentStock` not a whole number of 0 or more (the mock has no such check; a trust-boundary addition); 422 for a `usedFor` value that is not a visit symptom option, or a repeat.
- `usedFor?` (ADR-071): the symptom option ids the item is commonly used for, stored in `inventory_item_symptom_tags` and returned in the option list's order. It only orders the Visit form's picker.
- Audit: `create inventory`.
- Copies: `saveInventoryItem` (`api.ts:1904`); tests: `ClinicRulesDecisions`, `InventoryPanelReview`, `RecordsDecisions`, `auditCoverage` and 1 more. The first batch is an expiry date or an explicit "no expiration".

#### `GET /api/inventory/{id}`
- Roles: S. Errors: 404. Copies: `getInventoryItem` (`api.ts:1865`); tests: `BrandAndPaging`, `InventoryPanelReview`, `ItemsGiven`, `StockActions` and 4 more.

#### `PUT /api/inventory/{id}`
- Roles: S.
- Request: `InventoryInput`; `currentStock` and `expirationDate` are ignored on an edit. A request that leaves `usedFor` out keeps the existing tags (ADR-071).
- Response: `InventoryItem`.
- Errors: 404; 422 for a bad `usedFor`.
- Audit: `update inventory`, changed; "Updated commonly used for" names the field only.
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
- Audit: `submit inventory-adjustment`, the reason's label, plus " · Large write-off" when the removal is `large_write_off_percent` (25%) or more of the item on hand, or empties it (ADR-061).
- Copies: `adjustInventoryStock`; tests: `auditCoverage`, `stock`. Staff cannot choose `visit_edited`. A batch cannot go below 0. The `note` is optional for every reason, Other and a large write-off included (ADR-068; corrected Saturday, November 07, 2026 — 13:33 PHT, counter-check C-4).

## Reports (Module 5)

#### `GET /api/reports/monthly`
- Roles: S, A (view; no printing).
- Query: `month`, `YYYY-MM`; 422 otherwise.
- Response: `MonthlyReportData`, computed on each call, masked; `fullLrn=1` for the Staff print. May include staff incidents (Q8). `visitsBySex` is `{ female: { students, staff }, male: { students, staff }, noSexRecorded }` (ADR-063).
- Copies: `getMonthlyReport` (`api.ts:2358`); tests: `Birthdate`, `ClinicRulesDecisions`, `ReportsDecisions`, `ReportsPage` and 5 more.

#### `GET /api/reports/latest-month`
- **New** (Monday, November 09, 2026 — 20:08 PHT, ADR-077). Roles: S, A.
- Response: `{ month }`, `YYYY-MM`: the newest month with a visit or incident up to today, else this month. The Admin's Reports page opens on it.
- Copies: `getLatestRecordedMonth` (`api.ts:3106`); tests: `AdminReportsPage`.

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

## School years and the Archive (ADR-072, ADR-075)

Added Saturday, November 07, 2026 — 13:24 PHT. A school year is started and ended by hand by Staff; nothing changes by itself. The date settings only give the due days. The Admin reads everything here and changes nothing.

#### `GET /api/school-years`
- **New.** Roles: S, A.
- Response: `{ current, step, settings, years }`. `current` is the latest row: `label`, `from`, `to`, `endedOn`, `startedBy`, `endedBy` (names). `step` is `{ kind: 'end' | 'start', label, dueOn, due, soon }`. `settings` holds the four dates. `years` lists every row.
- Copies: `getArchive` (its school-year part), `getSchoolYearSettings`, and `getSchoolYearHistory` (`api.ts:3802`: the settings with every recorded start, which the Admin's Report month drop-down lists, ADR-077); tests: `ArchivePage`, `schoolYear`, `AdminReportsPage`.

#### `GET /api/school-years/reminder`
- **New** (Monday, November 09, 2026 — 20:08 PHT, ADR-075). Roles: S, A (always null for the Admin).
- Response: `{ kind: 'end' | 'start', label, dueOn, overdue, dueToday }` or null, the same object as `schoolYearReminder` on the Dashboard summary. The sidebar's Archive item reads it on every screen and again after a school year is ended or started or its dates are saved.
- Copies: `getSchoolYearReminder` (`api.ts:3253`); tests: `ArchivePage`, `AppShell`.

#### `PUT /api/school-years/settings`
- **New.** Roles: S.
- Request: `schoolYearStartMonth`, `schoolYearStartDay`, `schoolYearEndMonth`, `schoolYearEndDay`.
- Errors: 403 "Only the clinic staff can change the school year dates."; 422 "Choose a month from January to December.", "The start day is not a date in that month.", "The end day is not a date in that month.", "The last class day must fall before the next school year starts."
- Audit: `update school-year`, the changed field names only ("Updated start month and start day").
- Copies: `saveSchoolYearSettings`; tests: `ArchivePage`.

#### `POST /api/school-years/end`
- **New.** Roles: S.
- Response: the current year, with `endedOn` today. The break begins tomorrow.
- Errors: 403 "Only the clinic staff can end a school year."; 409 "Start a school year before ending one.", "School year YYYY–YYYY has already ended."
- Audit: `update school-year`, "Ended school year YYYY–YYYY".
- Copies: `endSchoolYear`; tests: `ArchivePage`.

#### `POST /api/school-years/start`
- **New.** Roles: S.
- Response: the new current year, starting today. The year before, with its break, ends yesterday.
- Errors: 403 "Only the clinic staff can start a school year."; 409 `school_year` "End school year YYYY–YYYY first.", "A school year was already started today.", "School year YYYY–YYYY ended today. Start the next one from tomorrow."
- First start on a new install (backend B4, Saturday, November 14, 2026 — 19:09 PHT): with no year recorded, the step names the year whose class days have begun and is due on its start day, so the reminder shows as overdue; "already started today" applies only to a recorded start. The mock named the next year and refused a start on June 15 itself.
- Audit: `create school-year`, "Started school year YYYY–YYYY". No undo.
- Copies: `startSchoolYear`; tests: `ArchivePage`.

#### `GET /api/archive/years`
- **New.** Roles: S, A.
- Response: the years for the switcher: every year with archived records, visits, incidents or audit entries, plus the current one, newest first, each with `from` and `to`; `defaultYear`, the newest with an archived record; and for each year its months up to today, for the Reports tab, each opening `GET /api/reports/monthly`.
- Copies: `getArchive`; tests: `ArchivePage`.

#### `GET /api/archive/students`, `GET /api/archive/staff`
- **New.** Roles: S, A for students; S only for staff (ADR-043; the Admin gets 403).
- Query: `year` (required), `search?` (name, the last 4 of the LRN, or Staff No.), `reason?` (all reasons when absent), `sort?` (`name`, `number`, `group`, `date`, `reason`; `-date`, newest archived first, by default), `page`, `perPage`.
- Response: rows of `ArchivedRecordRow` (full name, masked LRN or Staff No., grade or type at the time, `archivedAt`, `archiveReason`, `archivedSchoolYear`) and `meta: { page, perPage, total, totalInYear }`, which gives the "N of M shown" count. The reasons for the filter come from that year's rows.
- Writes nothing. Lists names with no medical or visit detail, as the masterlists do.
- Copies: `getArchive`; tests: `ArchivePage`.

The Archive's **Audit log** tab is `GET /api/audit-log` with `from` and `to` set to the year's dates. Nothing leaves the log (ADR-057).

## Dashboard and Calendar (Module 9)

#### `GET /api/dashboard/summary`
- Roles: S, A.
- Query: `preset`, `from`, `to`, `sex?`, `gradeLevel?`.
- Response: `DashboardSummary`, masked, never with a full LRN (no printout, ADR-074). `schoolYearReminder` (ADR-075), Staff only: `{ kind: 'end' | 'start', label, dueOn, overdue, dueToday }` (`dueToday` on the due day itself, `overdue` only after it; November 8, 2026) from 7 days (`school_year_notice_days`) before the due day, otherwise null; always null for the Admin. The Admin's totals leave staff incidents out (ADR-053 item 4). Each `demographics.sex` row also carries `students` and `staff`, the two parts of its count, plus a `none` row only when a record has no sex (ADR-063). `gradeLevel` stays students only.
- Copies: `getDashboardSummary` (`api.ts:2467`); tests: `AccessAndBackup`, `Birthdate`, `ClinicRulesDecisions`, `DashboardAndReports` and 5 more.

#### `GET /api/dashboard/cluster-alerts`
- Roles: S, A. Response: `ClusterAlert[]`; always empty for the Admin (ADR-050).
- Copies: `listClusterAlerts` (`api.ts:2557`); tests: `AdminAuditDashboardDecisions`.

#### `GET /api/calendar/days`
- Roles: S, A. Query: `from`, `to`. Response: `CalendarDay[]`. Counts may include staff incidents (Q8).
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
- Errors: 404 no backup; 409 `backup_failed` when the latest run failed (Q10).
- Audit: `update backup`, "Verified backup".
- Copies: `verifyLatestBackup` (`api.ts:2426`); tests: `auditCoverage`.

#### `POST /api/backups/run`
- Roles: S, A.
- Response: `BackupStatusView`.
- Errors: 409 `no_backup_location`.
- Audit: `create backup`, "Backup started from the Backup page (N locations)".
- Copies: `recordBackupNow` (`api.ts:2448`); tests: `AccessAndBackup`, `StaffComplaintsBackupDecisions`, `auditCoverage`. The real job replaces the mock's fake result (ADR-052).

#### `GET /api/backups/folders`
- **Added Saturday, November 07, 2026 — 13:33 PHT (counter-check C-5).** Roles: S, A. Query: `path?`. Response: `{ drives, folders }`, the drives and the folders directly inside `path`, for choosing a location (ADR-052). The mock returns a fixed list; the backend reads the clinic computer's drives.
- Copies: `listBackupFolders`; tests: none.

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

*`PUT /api/backups/locations/{id}` is removed (Saturday, November 07, 2026 — 13:24 PHT, Round 3): a location is never edited. To change one, add a new location and disable the old. A run's location names come from `backup_location_results` joined to the unchanged `backup_locations.label`, so history keeps them after a location is disabled (the frontend's `locationNames`).*

#### `PUT /api/backups/locations/{id}/enabled`
- Roles: S, A. Request: `enabled`. Audit: `update backup-location`, "Enabled" or "Disabled"; nothing when unchanged.
- Errors: 422 "Enable another backup location before disabling the last one." when it would leave no location enabled; nothing changes and nothing is logged. Note, Tuesday, November 03, 2026 — 20:16 PHT: frontend review round 2, R32 (Zean: "Block it"; "much better that they cannot both be disabled"; ADR-052 note).
- Copies: `setBackupLocationEnabled` (`api.ts:2542`); tests: `StaffComplaintsBackupDecisions`. Never deleted.

## Audit and shared actions (Module 11)

#### `GET /api/audit-log`
- Roles: S, A.
- Query: `from`, `to`, `userId`, `actionTypes[]`, `targetTypes[]`.
- Response: `AuditLogList`. A student-related target carries the **masked** LRN, never the name; with `fullLrn=1` (Staff only, for the Audit Log printout) the full LRN, and that request writes a `print` entry (Zean, November 7, 2026, `2026-11-07-audit-log-masked-lrn`; notes on ADR-040 and ADR-044; changed Saturday, November 07, 2026 — 13:24 PHT, before it was full on screen too, R33). Writes no entry (ADR-016). No route updates or deletes an entry.
- Staff-record entries (`staff`, `staff-import`) carry the Staff No. as the record label, never the name. The Admin sees them listed but cannot open the record (ADR-043; counter-check C-8, Saturday, November 07, 2026 — 16:12 PHT).
- Copies: `listAuditLog` (`api.ts:2986`); tests: `print-documents`.

#### `POST /api/audit/views`
- Roles: S, A.
- Request: `type` (`student`, `staff`, `incident`), `id`.
- Response: 204.
- Audit: `view <type>`, "Opened student profile", "Opened staff profile" or "Opened incident report". Once per record per sign-in session.
- Copies: `recordView` (`api.ts:279`); tests: none.

#### `POST /api/audit/prints`
- Roles: S. The Admin gets 403 (ADR-038 item 3).
- Request: a fixed document key; `record?` `{ type, id }`. The server builds the title (Q18).
- Response: 204.
- Audit: `print`.
- Copies: `recordPrint` (`api.ts:265`); tests: `AuditLogPage`, `auditCoverage`.

#### `POST /api/issue-reports`
- Roles: S, A.
- Request: `description`, `route`, `pageName`.
- Response: 201 `IssueReport`.
- Errors: 422 "Issue description is required."
- Audit: `create issue-report`.
- Copies: `createIssueReport` (`api.ts:2959`); tests: `auditCoverage`, `issueReportApi`.

#### `GET /api/issue-reports`
- Roles: S, A (Q12).
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
| `listReports` (`api.ts:2399`) | No screen calls it, and reports are computed live (ADR-050). The `reports` table is dropped. |
| `isLargeWriteOff` | A helper the form and the adjustment share; the rule is on `POST /api/inventory/{id}/adjust` (added Saturday, November 07, 2026 — 13:33 PHT, counter-check C-5). |
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
| Student search: LRN prefix first, every word in the full name, capped, active only | `selectors.ts` `searchStudents` |
| Staff search: Staff No. or its digits; a query with no digit is a name search | `selectors.ts` `searchPersonnel` |
| Names: first, last, optional middle; full name built on read; sort by last, first, middle; search by every word (ADR-064) | `lib/personName.ts` |
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
| Missed and Cancelled need a reason; reschedule rules, including a follow-up that reads as Missed (Q7) | `api.ts:1819`, `:1833` |

**Incidents**

| Rule | Source |
|---|---|
| Stage 1 saves with a complaint and any readings | `api.ts:1573` |
| Escalation: same patient, not in error, once; time from the visit; counted once as the incident | `api.ts:1578-1584`, ADR-036, `selectors.ts` `countedVisits` |
| Completion needs one of: treatment notes, a medicine, a notification, a referral, a no-further-action reason | `lib/itemsGiven.ts` `incidentCompletionBlocker` |
| Medicines fixed after Stage 2; notes fixed after approval | `api.ts:1661-1669` |
| Only a completed report is approved | `api.ts:1762` |
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
| School year starts June 15 | `api.ts:2683`. Replaced Saturday, November 07, 2026 — 13:24 PHT: the Sports Report's `school_year` window starts on the current year's recorded `started_on` (ADR-075) |
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
| Fixed 7-day session, per-role idle sign-out and keep-alive, disabled account check | B0.5, B2. B0.5 gains the session middleware; B2 makes it per role (Sunday, November 08, 2026 — 18:35 PHT) | Q4, Q5, [Idle sign-out](#idle-sign-out) |
| Health route | B0 | D15 |
| Holiday sync job and the stale warning | B9 | ADR-020; fills `GET /api/calendar/holidays` |
| Follow-up auto-close job | B5 | Q7 |
| Backup job: folders, zip, checksum, pruning to 60, drive check | B10 | ADR-052; a browser cannot do this |
| Backup status writer | B10 | The scheduled script writes a status file, Laravel ingests it |
| Audit log writer and reader | B3 | The reader is `GET /api/audit-log`; the writer is the `AuditLogger` of item B0.7 |
| Retention purge, `db:verify` | Later | `ERD.md` sections 7 and 8 |
| Yearly registrar import | Later | ADR-047; waits for the file format and the privacy agreement |
| ~~Email password reset~~ | — | Dropped Saturday, November 07, 2026 — 13:24 PHT: replaced by the authenticator recovery of ADR-073 |
| Authenticator recovery: TOTP check, encrypted secret, slow-hashed recovery codes, replay step, recovery rate limiter | B2 | ADR-073; the encryption key is in the environment (`Environment-Setup.md`) |
| Administrator break-glass password reset | B2 | An offline console command on the clinic computer (`Environment-Setup.md`) |
| School-year steps and reminder | B9 | ADR-075: `school_years`, the due days from the settings, `schoolYearReminder` on the Dashboard summary |

## Questions

Answered by Zean, Sunday, November 1, 2026 — 01:23 PHT, or by the best approach he asked for: an ADR first, then the mock, then the safer choice for privacy and data integrity (ADR-057). "Mock differs" marks a change the frontend fix branch makes.

| Question | Answer | Why |
|---|---|---|
| **Q1.** Lists mask the LRN, but ADR-044 prints it in full. | Masked in lists. `fullLrn=1`, Staff only, for the printouts of ADR-044, audited. | Zean; ADR-040, ADR-044. Those printouts list several students; a single-student response already carries the full LRN. |
| **Q2.** `StudentListRow` carries allergies, conditions and emergency contacts for every student, to the Admin as well. | The row is `id`, `lrn` (masked), `fullName`, `gradeLevel`, `archived`, `recordComplete`, also inside `IncompleteRecord.student`. Mock differs. | Zean; privacy: every reader of the row in `frontend/src` was checked, and none reads the health fields or contacts. |
| **Q3.** The mock writes the name-correction reason into the audit log. | Reversed by ADR-058: the summary carries the reason, as the mock does, and `students.name_correction_reason` keeps it too. | Zean, Sunday, November 1, 2026 — 11:46 PHT. |
| **Q4.** Laravel's session lifetime slides. | The session ends 7 days after sign-in. The sign-in time is stored; one middleware in B0.5. | Zean; ADR-015, ADR-056, ADR-057. |
| **Q5.** The mock's Admin timer counts activity; the server counts requests. | The server counts requests. At integration, the frontend sends a keep-alive while the Admin is active. *Update Sunday, November 08, 2026 — 18:35 PHT: both roles, `POST /api/session/keepalive` (ADR-078).* | ADR-048's meaning holds, and the rule still lives on the server. |
| **Q6.** The mock locks unknown usernames too. | Count them in the cache, by normalized name, so both answer alike. Nothing goes in a table. | Mock behaviour, `ERD.md` D-10. An unknown name that never locks reveals which names exist. |
| **Q7.** A follow-up that reads as Missed is refused at `api.ts:1836`. | It must be reschedulable. A daily job also writes Missed. Mock differs. | Zean. |
| **Q7b.** Rescheduling drops the "Stay home until cleared" flag, which a clinician set (ADR-049). | Keep the flag and its note on the new follow-up until the clinician clears them. Mock differs. | Zean; patient safety: a reschedule must not silently lift a stay-home instruction. |
| **Q8.** The Admin and staff incidents. | Totals leave them out. Calendar counts, the monthly report, the trail and approved ids may include them. Detail stays Staff-only. | Zean; ADR-053, ADR-057. Counts and ids are not health detail. The Privacy Policy wording is the frontend prompt's. |
| **Q9.** `approveIncidentReport` has no role or duplicate check. | Staff only. A second approval is 409 `incident_stage`. | ADR-038; `uq_report_approvals_incident`. |
| **Q10.** `verifyLatestBackup` verifies a failed run. | 409 `backup_failed`. The mock follows it (`BackupFailedError`, checked Saturday, November 14, 2026 — 23:00 PHT). | `chk_backup_verify_ok`; the `needsVerification` flag covers good runs only. A failed backup marked verified is false assurance. |
| **Q11.** Item names: unique among active items, or not? | Unique: 409 `duplicate_item_name`. The mock follows it ("An item with this name already exists.", checked Saturday, November 14, 2026 — 23:00 PHT); the seed has no duplicates. | Data integrity: two items of one name split stock and confuse dispensing. |
| **Q12.** Who reads issue reports? | Both roles, read-only. | Both roles file them (ADR-038 lets the Admin write them). |
| **Q13.** The mock never updates `lastLogin`. | The backend sets it at sign-in. | The User List shows it. |
| **Q14.** `changeMockPassword` needs no current password. | `currentPassword` is required unless `mustChangePassword` is true. | Security. |
| **Q15.** The mock accepts an empty complaint, any disposition and any vitals key. | Required and enumerated at the boundary (422). `vitals` takes the four reading keys plus `treatmentNotes`. Reading values still only warn. | Data integrity; ADR-051 for the values. |
| **Q16.** `dispenseInventoryItem` accepts a `visitId` with no patient. | 422. | `chk_txn_link_has_patient`. The screen always sends a patient. |
| **Q17.** ADR-048 needs an email; `UserInput` has none. | Add `email?` with the reset work, not before. | ADR-048 item 3 is not built. `users.email` is ready. Closed Saturday, November 07, 2026 — 13:24 PHT: ADR-073 replaces the email reset, so no `email` is added. |
| **Q18.** `recordPrint` stores a client-sent title. | A fixed document key plus record type and id. The server builds the title, into `target_label`. | ADR-017. The key list comes from `usePrinting` callers at B3. |
| **Q19.** The mock has no server pagination. | Optional `page` and `perPage` on the four long lists; whole lists otherwise. | Keeps the mock's shape, and the Audit Log may reach 12,000 rows. |
| **Q20.** How is the frontend served, and does the LAN get HTTPS? | Deferred to a deployment with real data. Plain HTTP on localhost for development. Origins, the `secure` flag and stateful domains stay in the environment. | Zean; ADR-057. *Update Sunday, November 08, 2026 — 18:35 PHT: CLINIQ runs on the clinic PC only at `http://localhost`, so the LAN needs no HTTPS (ADR-079; `Environment-Setup.md`, "Clinic PC only").* |
