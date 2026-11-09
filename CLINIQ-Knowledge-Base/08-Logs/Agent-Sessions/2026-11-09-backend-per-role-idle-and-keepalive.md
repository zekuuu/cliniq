Date/Day/Time: Monday, November 09, 2026 — 18:38 PHT (PowerShell `Get-Date`)
Agent: Claude Code (Opus 5.5)
Task: Merge `main` into `backend`, close the "pending merge" markers, and build the per-role idle sign-out, `session_expired` and the keep-alive in the backend (ADR-078)
Status: Completed (the parts that need no table); B2 keeps the database-backed parts
Prompt/Request: Zean, Monday, November 9, 2026: "Do the opens, then merge main to the worktree of backend". Commits were made with Zean's `/komit` (grouped commits, no push). Zean's pop-up answer on the backend code was "Yes, after merge".
Files Modified:
- Merge: `main` into `backend` as `c5aa037`. Three conflicts were resolved:
  - `ERD.md`: backend's text with main's 5-minute lockout.
  - `Backend-Readiness-Checklist.md`: backend's rows with the 5-minute lockout.
  - `Decisions-Summary.md`: both sides, in ADR order 076 to 079.
- Markers: 22 "on main, pending merge" markers removed from `Data-Dictionary.md`, `ERD.md`, `Module-Linkage-Diagram.md`, `Reference-Schema.sql`, `Checks/constraint-tests.sql`, `API-Contract.md`, `Backend-Loop-Engineering.md`, `Backend-Readiness-Checklist.md` and `Environment-Setup.md`.
- Code:
  - `backend/app/Shared/Http/Middleware/IdleSignOut.php` (new; replaces the deleted `AdminIdleSignOut.php`).
  - `backend/app/Shared/Http/KeepAliveController.php` (new).
  - `backend/app/Shared/Http/ApiError.php`: `sessionIdle(int $minutes)` and `sessionExpired()`.
  - `backend/app/Shared/Http/Middleware/FixedSessionLifetime.php`, `backend/bootstrap/app.php` (alias `session.idle`), `backend/routes/api.php`, `backend/config/cliniq.php`.
- Tests: `backend/tests/Feature/MiddlewareTest.php`, `ErrorEnvelopeTest.php`, `ConfigurationTest.php`, `HealthAndRoutesTest.php`.
- Docs: `backend/README.md`, `04-Development/Backend-Loop-Engineering.md`, `04-Development/Backend-Readiness-Checklist.md`, `04-Development/API-Contract.md`, `08-Logs/Backend-Issues-and-TODOs.md`, `08-Logs/Backend-Changelog.md`.
Changes Made:
- **`IdleSignOut` (`session.idle`).** Each role is signed out after its own idle minutes:
  - **Limits:** `config('cliniq.idle_signout_minutes_staff')` 60 and `config('cliniq.idle_signout_minutes_admin')` 30, set by env `CLINIQ_IDLE_SIGNOUT_MINUTES_STAFF` and `CLINIQ_IDLE_SIGNOUT_MINUTES_ADMIN`.
  - **The limit stays with the session.** It is stored at each counted call, so a countdown keeps its limit and a changed setting applies from the next request (API-Contract).
  - **Past the limit:** the session ends, one audit event is recorded (`logout`, label "Signed out (idle)", no target, no fields), and the response is 401 `session_idle` "You were signed out after N minutes of inactivity. Sign in again."
  - **Keep-alive window:** a keep-alive within 60 seconds of the last counted call changes nothing.
  - ponytail: the limits come from config until B1's `system_settings` table and its cached settings service.
- **`FixedSessionLifetime`** answers 401 `session_expired` at 7 days (was `unauthenticated`). It runs before the idle check.
- **`POST /api/session/keepalive`** (named `session.keepalive`) sits behind `auth:sanctum`, `session.fixed`, `session.idle` and `throttle:60,1`. It returns `{ "data": { "idleSecondsLeft": n } }`.
- **`lock_minutes`** is 5, matching the November 8 lockout change on main.
Reason: ADR-078 and the open B2 entry, after Zean merged the decision into `backend` through this session.
Testing Performed:
- `composer install` in the worktree (its `vendor/` was empty).
- Test-first: 17 failed and 68 passed before the code; after it, Pest **85 of 85** passed (374 assertions).
- `phpstan analyse --memory-limit=1G` (the composer script's limit): no errors.
- `pint --test`: passed. Pint fixed CRLF line endings that the editing script had written.
- The tests map to the contract's frozen-clock list:
  - just inside stays: Admin 29, Staff 59;
  - just past is out: Admin 30, Staff 60;
  - the keep-alive resets the clock, and a keep-alive within a minute leaves it alone;
  - the maximum wins (`session_expired`);
  - each role uses its own setting;
  - a running countdown keeps its old limit;
  - the audit entry carries the user and action only;
  - the keep-alive is refused without a sign-in and once idle.
- **Test fix:** the keep-alive tests send the SPA's `Referer`, because Sanctum starts the session only for a stateful origin.
Known Issues:
- `backend/.env.example` could not be read in this session (a deny rule), so it may still list `CLINIQ_ADMIN_IDLE_MINUTES`. Rename it to `CLINIQ_IDLE_SIGNOUT_MINUTES_STAFF=60` and `CLINIQ_IDLE_SIGNOUT_MINUTES_ADMIN=30` by hand.
- Still open in B2, and in the issues entry:
  - the sign-in time written at sign-in;
  - the users-table checks;
  - the idle settings read from `system_settings` with a 60-second cache, and the settings routes;
  - the `SESSION_SECURE_COOKIE` start-up check.
Next Steps: B1 tables, then the rest of B2.
