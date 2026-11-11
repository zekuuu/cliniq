# Run notes — Tuesday, November 10, 2026

Branch `feat/build-backend` (Zean's choice; it was at the same commit as `backend`, 3d3f764). Nothing committed.

## ANSWERS AND DECISIONS

- **Tuesday, November 10, 2026 — 13:21 PHT. Branch.** `feat/backend-b1-b10` did not exist. Options: create it from `backend`; use `feat/build-backend`; stop. Zean: use `feat/build-backend`. Undo: `git switch -c feat/backend-b1-b10` and carry the working tree over.
- **13:40 PHT. Tests read `.env.testing`.** `tests/TestCase.php` loaded `.env.example`, which has no test-database password. It now loads `.env.testing` when the file exists, else `.env.example` (a fresh clone still runs). Grounds: the kickoff names `.env.testing` as the test database. Undo: revert that one line.
- **13:45 PHT. Symfony patch updates.** `composer audit` found 6 advisories in symfony/http-foundation, http-kernel and routing 8.1.10. Updated to 8.1.11 (and two contracts packages 3.7.1 to 3.8.1). No new package. Undo: `git checkout backend/composer.lock` then `composer install`.
- **13:58 PHT. Product defaults ship as a migration.** Asked: keep the migration or move to seeders. Zean: keep the migration. `Backend-Loop-Engineering.md` B1 wording updated to match.
- **13:58 PHT. Development seeder per module.** Asked: all tables now, or per module. Zean: "anything best", so per module (the recommendation): each module seeds its own tables from `mock-db.json` when it builds them. The B1 box stays open until the last one.
- **14:00 PHT. Append-only grant test skipped.** The test connection is the migration account; it cannot read `cliniq_app`'s grants (`SHOW GRANTS` is denied, 1044). The test is in `AuditTrailTest.php`, skipped with a reason. No route updates or deletes an audit entry (tested).
- **14:00 PHT. Fake users keep an in-memory audit.** The middleware tests sign in a `GenericUser` with no `users` row, so the `audit_logs` foreign key would refuse their entries. Those tests bind `InMemoryAuditLogger` in `beforeEach`. Every other test writes to the database.
- **14:00 PHT. One session never switches user.** Sanctum's `AuthenticateSession` logs out a session whose stored password hash belongs to another user. That is correct; tests use `signIn()` (a fresh session) or one role per dataset.
- **16:30 PHT. Session resumed (second session, same branch).** B2 group 1 built: sign-in, lockout, sign-out, `me`, password change, forced change, disabled-account refusal, idle sign-out settings. Grounds, no question needed: API-Contract entries and mock `api.ts` 355-611.
- **16:30 PHT. Unknown usernames lock in the cache (contract Q6); real accounts keep the count in `users.failed_login_count` and `users.locked_until`.** Undo: `LoginLockout` only.
- **16:30 PHT. Logout `reason` accepts only "Signed out (idle)"**, the one summary the frontend sends (`AppShell.tsx:118`); without it the entry reads "Signed out". Grounds: contract "one of the summaries the frontend sends".
- **16:30 PHT. Idle settings audit entry: target label `settings/idle-signout`, no target type.** `AuditTarget` has no `settings`, and `chk_audit_*` may restrict the type; the label keeps the mock's id. Undo: add `AuditTarget::Settings` if the schema allows it.
- **16:30 PHT. Middleware tests now use the test database**, because the idle limits come from `system_settings`.

## NEEDS YOUR CALL

(none open)

## BLOCKED

(none)

## ONLY YOU CAN DO

1. Prove `audit_logs` is append-only for the app account, in the XAMPP shell as root:
   ```
   C:\xampp\mysql\bin\mysql.exe -u root -p -e "SHOW GRANTS FOR 'cliniq_app'@'localhost'"
   ```
   Expect SELECT and INSERT on `cliniq`.`audit_logs` and no UPDATE or DELETE on it.
2. Edit `backend/.env.example` (the agent's shell edit was denied): replace `CLINIQ_ADMIN_IDLE_MINUTES=30` with two lines, `CLINIQ_IDLE_SIGNOUT_MINUTES_STAFF=60` and `CLINIQ_IDLE_SIGNOUT_MINUTES_ADMIN=30`. `config/cliniq.php` already reads those names; the live limits come from `system_settings`.

## FOLLOW-UPS

- Audit Log paging (`page`, `perPage`, contract Q19) when the log nears 12,000 rows; whole list for now (`ponytail:` comment in `AuditLogController`).
- The print key `symptom-summary` titles "Symptom summary"; the frontend builds it from its `SYMPTOM` constant. Check the word at B3 Phase 2.
- Development seeder from `mock-db.json`, per module as each lands its models.
- `AuditTarget` lacks `school-year`, `report`, `incident-stage-1`, `incident-stage-2`, `parent-notification`; add each when its module writes it.
- A changelog row dated "Tuesday, November 10, 2026 — 18:30 PHT" (docs sync) predates this session's 13:20 start; its time looks wrong. Not edited.
- B2 remaining: recovery check/verify/reset, authenticator status/setup/confirm/turn-off (TOTP, no package), `GET`/`PUT /api/auth/profile`, the start-up configuration check, a per-username recovery limiter.
- A password change does not end the user's other sessions; the contract does not ask for it. Decide at B2 Phase 2.
- Feature tests call `forgetGuards()` after sign-out or disabling, because the test client keeps the resolved user between requests; a real request re-reads it.
