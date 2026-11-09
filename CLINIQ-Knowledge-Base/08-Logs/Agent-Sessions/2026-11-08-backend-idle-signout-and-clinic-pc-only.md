Date/Day/Time: Sunday, November 08, 2026 — 18:41 PHT (system clock; the work ran from about 18:20 PHT)
Agent: Claude Opus 5.5 (Claude Code), worktree `D:\zeank\Desktop\Projects\cliniq-backend`, branch `backend`, starting commit `bdb77bb`
Task: Backend documents for the Staff idle sign-out, the keep-alive call, and "clinic PC only" deployment
Status: Completed (documents only; no commit, no push)

Prompt/Request: "Prompt — Backend documents: Staff idle sign-out, the keep-alive call, and 'clinic PC only' deployment (documents only, on `backend`)". Source: Zean, Sunday, November 8, 2026 (chat): CLINIQ is deployed on the clinic PC only (no LAN access, no fixed hostname, no HTTPS, reached at `http://localhost`); the Principal receives a monthly PDF; the clinic room is shared and unlocked, so Staff get an idle sign-out (default 60 minutes, a setting) alongside the Admin's (default 30), and each covering person has their own Staff account. The coordinating session's preamble: run now, before the main-branch ADRs are merged; cite them as "ADR-078 (on main, pending merge)" (idle sign-out) and "ADR-079 (on main, pending merge)" (clinic PC only); create no ADR, edit no ADR and not `Decisions-Summary.md`; take names, ranges and defaults from the prompt; touch no `frontend/` and no main-owned log; add "Recheck after merge".

Files Modified:
- `02-Architecture/Database/Reference-Schema.sql`
- `02-Architecture/Database/Checks/constraint-tests.sql`
- `02-Architecture/Database/ERD.md`
- `02-Architecture/Database/Data-Dictionary.md`
- `02-Architecture/Database/Module-Linkage-Diagram.md`
- `04-Development/API-Contract.md`
- `04-Development/Environment-Setup.md`
- `04-Development/Backend-Readiness-Checklist.md`
- `04-Development/Backend-Loop-Engineering.md`
- `08-Logs/Backend-Issues-and-TODOs.md`
- `08-Logs/Backend-Changelog.md`
- this file (new)

The tree was clean at the start, so there are no earlier uncommitted files.

Changes Made:
1. **Idle settings.** `system_settings` replaces `admin_idle_minutes` with `idle_signout_minutes_staff` (60) and `idle_signout_minutes_admin` (30). New CHECK `chk_settings_idle_signout`: whole number 10 to 240. Staff edit, the Admin reads, audited by field name only (Data Dictionary). Six new constraint tests: 9 refused, 241 refused, 30.5 refused, 10 and 240 accepted, defaults present, old key gone. ERD and Data Dictionary carry dated update notes; no new table or column.
2. **API contract.** New section "Idle sign-out" under Conventions: per-role limit from the settings; every authenticated call counts as activity; 401 `session_idle` and one audit entry "Signed out (idle)" (user and action only); the 7-day maximum checked first, answering 401 `session_expired` (new row in the error table; `unauthenticated` now means "no session"); settings read once per request with a 60-second cache cleared on save; a changed setting applies to the next idle countdown (each session switches at its next counted request); the warning comes from the server's `idleSecondsLeft`; no automatic polling. Seven frozen-clock tests specified. New entries: `POST /api/session/keepalive` (any signed-in role, no body, 200 `{ "data": { "idleSecondsLeft": n } }`), `GET /api/settings/idle-signout` (S, A) replacing `GET /api/config/admin-idle-minutes`, `PUT /api/settings/idle-signout` (S). `GET /api/auth/me` returns `idleSignoutMinutes` and `idleSecondsLeft` instead of `adminIdleMinutes`. The backend-only needs row and Q5 updated; Q20 gets a dated update.
3. **Clinic PC only.** `Environment-Setup.md`: the Apache block is `127.0.0.1:80`, `ServerName localhost`, `Require local`, `Listen 127.0.0.1:80`; no hosts entry. New section "Clinic PC only": the address, no fixed IP/hostname/router entries/certificate, Windows Firewall blocks inbound, nothing forwarded; the clinic values of `APP_URL`, `CORS_ALLOWED_ORIGINS`, `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`, `SESSION_SECURE_COOKIE`; the secure-cookie finding and the start-up check B2 must add; the shared-room requirements; the backup consequence; a paragraph for a later school-network join. Readiness checklist: "HTTPS on the LAN" closed as decided; two new open items (clinic-PC steps, the shared room); the stale "Phone HTTPS test" in the suggested order replaced.
4. **Other mentions.** Loop manual rule 6 and the B2 line, Module-Linkage row, two open issues given dated updates.
5. **Logs.** Changelog row; issues counts recomputed (Done was 9, the file holds 10).

**Secure cookie on `http://localhost` (verified, not guessed).** MDN `Set-Cookie`: `Secure` cookies are sent only over `https:` "except on localhost"; insecure (`http:`) sites cannot set `Secure` cookies; the HTTPS requirement is ignored when localhost sets the cookie. Laravel Sanctum docs: SPA and API share a top-level domain; stateful domains include the port when the URL has one; CORS must send credentials. So a `Secure` cookie would work on `http://localhost` only through the browser's localhost exception, and would be silently dropped on any other plain-HTTP host. Decision in the documents: `SESSION_SECURE_COOKIE=false` on plain `http://localhost`, `true` when HTTPS is added, plus a start-up check (B2) that refuses a mismatched configuration.

**Grep table** (backend-owned documents, the prompt's terms, case-insensitive; read on `HEAD` before editing). 9 hits; 7 reworded, 2 open issues given an Update line, 0 dated logs edited.

| File | Line | What it said | What was done |
|---|---|---|---|
| `Environment-Setup.md` | 67 | Clinic computer "needs HTTPS before real data crosses the LAN (ADR-057)" | Reworded: real data never crosses a network; clinic PC only |
| `Environment-Setup.md` | 87 | vhost "with the real folder and the clinic's LAN range" | Replaced: `http://localhost` only |
| `Environment-Setup.md` | 91 | `ServerName cliniq.local` | Replaced: `ServerName localhost`, `<VirtualHost 127.0.0.1:80>` |
| `Environment-Setup.md` | 97 | `Require ip <clinic LAN range>` | Removed; `Require local` only, plus `Listen 127.0.0.1:80` |
| `Environment-Setup.md` | 102 | hosts entry for `cliniq.local`; "Another device on the LAN" reaches it | Removed; no hosts entry needed |
| `Environment-Setup.md` | 104 | HTTPS on the LAN deferred; real data must not cross the LAN | Reworded: only the frontend serving stays deferred; new "Clinic PC only" section |
| `Backend-Readiness-Checklist.md` | 67 | `[ ]` HTTPS on the LAN, deferred | Closed `[x]` as decided, with why and ADR-079 |
| `API-Contract.md` | 1037 (now later) | Q20: does the LAN get HTTPS? Deferred | Dated update appended: not needed, clinic PC only |
| `Backend-Issues-and-TODOs.md` | 23 | Open `LATER`: versions, HTTPS on the LAN, hardening | Dated Update: HTTPS dropped; versions and hardening remain |

Not a grep hit but the same assumption: `Backend-Readiness-Checklist.md` suggested-order item "4. Phone HTTPS test" (phones were removed, ADR-033) replaced with "Clinic-PC deployment checks".

Testing Performed:
- Baseline before any edit: `Reference-Schema.sql` loaded and `constraint-tests.sql` ran, 254 of 254 (accepts 37, count 44, rejects 173).
- After the edit: 260 of 260 (accepts 38, count 46, rejects 176), no untested CHECK or UNIQUE reported. Scratch database `cliniq_check_scratch` dropped.
- How: XAMPP's MariaDB 10.11 root now has a password this session does not hold, and reading `backend/.env` is denied. So a throwaway MariaDB instance was initialised in the session scratchpad (`mysql_install_db`, port 3307, bound to 127.0.0.1, `--skip-grant-tables`) and stopped afterwards. XAMPP's own instance was started once to check, then stopped, so it is left as found (not running). To repeat on Zean's instance, run the four commands in `Checks/README.md` with `-p`.
- Backend code and Pest tests were not run: no code changed.

Known Issues:
- The backend code still has the Admin-only `AdminIdleSignOut`, `config('cliniq.admin_idle_minutes')` and `CLINIQ_ADMIN_IDLE_MINUTES`, and `FixedSessionLifetime` answers `unauthenticated`, not `session_expired`. Their tests (`MiddlewareTest`, `ErrorEnvelopeTest`, `ConfigurationTest`) still assert the old behaviour. This run was documents only; the work is added to the open B2 entry "finish the session middleware". B0.3 and B0.5 stay checked in the loop manual, with a note that B2 reworks them.
- `backend/.env.example` keeps development values; the clinic values are in `Environment-Setup.md`.
- `ERD-Review.md` (dated review) still names `getAdminIdleMinutes`; left as history.
- Timestamps in the 17:42 and 17:44 PHT entries of the logs are earlier work by another session today; this session's first stamps were written as 10:35 PHT by `TZ=Asia/Manila date` (Git Bash on Windows ignores that zone name and printed UTC) and corrected to 18:35 PHT, the local clock, before hand-back.

Defaults taken (no question pop-up available):
- Keep-alive returns 200 `{ "data": { "idleSecondsLeft": n } }`, not 204.
- "Throttled at most once a minute" is done as a soft limit: a call within 60 seconds of the last counted activity returns the current value and writes nothing; a hard `throttle:60,1` answers 429 beyond that. A hard 1-per-minute 429 would have refused the "Stay signed in" click.
- A changed setting applies at each session's next counted request; a running countdown keeps its limit.
- Settings cache: 60 seconds, cleared on save.
- `idleSecondsLeft` reports the idle countdown only; the 7-day end is not merged into it (the next request answers `session_expired`).
- `GET /api/auth/me` returns `idleSignoutMinutes` and `idleSecondsLeft`.
- Idle settings endpoints: `GET`/`PUT /api/settings/idle-signout`, audit "Updated Staff idle sign-out" style. Their 422 wording waits for `main`'s screen.
- The old key `admin_idle_minutes` is renamed, not kept beside the new ones.
- `SESSION_DOMAIN` empty (host-only cookie) on the clinic PC; `SANCTUM_STATEFUL_DOMAINS=localhost` without a port.
- Apache bound to `127.0.0.1:80` as well as the firewall rule.

Reason: Zean's decisions of November 8, 2026, written on `main` as ADR-078 and ADR-079, need the backend documents to match before B1 and B2.

Next Steps:
- Zean reviews and commits. Then merge `main` (ADR-077 to ADR-079) into `backend`.
- B2: the code changes listed under Known Issues.

## Recheck after merge

Confirm each against the merged ADR-078 (idle sign-out) and ADR-079 (clinic PC only): number, title, the amended ADRs (015, 048, 057; 029), names, defaults, range, error codes and audit wording.

- `Reference-Schema.sql`: `chk_settings_idle_signout` comment (ADR-078); the two seed rows' descriptions (ADR-078; 60, 30, 10 to 240).
- `Checks/constraint-tests.sql`: the idle comment line and six cases (9, 241, 30.5, 10/240, defaults 60 and 30).
- `ERD.md`: the top update note (ADR-078, amends 015/048/057).
- `Data-Dictionary.md`: the top update note; `chk_settings_idle_signout` in the Checks list; "Idle sign-out settings" paragraph (names, defaults, range, API names, audit wording "Updated Staff idle sign-out", `session_expired`).
- `Module-Linkage-Diagram.md`: User Management row (Staff 60, Admin 30, ADR-078).
- `API-Contract.md`: top update note; Sign-in paragraph; section "Idle sign-out" (D8 replaced, `session_idle`, "Signed out (idle)", `session_expired`, 7 days, the cache and change rule, the tests); error table rows `session_expired` and `session_idle`; `GET /api/auth/me`; `POST /api/session/keepalive`; `GET`/`PUT /api/settings/idle-signout`; backend-only needs row; Q5 and Q20 updates (ADR-079).
- `Environment-Setup.md`: the line under MariaDB hardening; the Apache paragraph (ADR-079); section "Clinic PC only" (ADR-079 reinforces ADR-029; `http://localhost`; the env values; secure cookie; the shared room with screen lock 5 to 10 minutes, BitLocker, one Staff account each; backups; the school-network paragraph).
- `Backend-Readiness-Checklist.md`: section 1 auth row (ADR-078; Staff 60, Admin 30); section 4 "HTTPS on the LAN" closed (ADR-079), "Clinic PC only" and "The shared, unlocked room" items.
- `Backend-Loop-Engineering.md`: rule 6 and the B2 line (ADR-078).
- `Backend-Issues-and-TODOs.md`: the Updates on "Before deployment" (ADR-079) and "B2: finish the session middleware" (ADR-078).
- `Backend-Changelog.md`: the row of Sunday, November 08, 2026 — 18:40 PHT.
- If ADR-078 names the settings, the endpoint or the audit text differently, the merged ADR wins: change these places to match and rerun `Checks/`.
