Date/Day/Time: Monday, November 09, 2026 — 20:36 PHT (PowerShell `Get-Date`; Git Bash's `TZ=Asia/Manila date` prints UTC on this machine)
Agent: Claude Code (Opus 5.5)
Task: Bring `Backend-Loop-Engineering.md` up to date before B1 (documents only, on `backend`)
Status: Completed
Prompt/Request: Zean, Monday, November 9, 2026: "Bring `Backend-Loop-Engineering.md` up to date before B1 … verify each [gap] yourself, do not trust this list blindly". The prompt listed five gaps: old numbers in the Prepare notes, no Prepare entries for the counter-check and ADR-076 to 079, the old lockout wording, a one-line B1, and B2 missing the open items. Zean's pop-up answer: fix the contract's mapping of the 7 unmapped mock functions in this run.
Files Modified:
- `CLINIQ-Knowledge-Base/04-Development/Backend-Loop-Engineering.md`
- `CLINIQ-Knowledge-Base/04-Development/API-Contract.md` (the lockout lines; the mapping of the November 8 and 9 mock functions)
- `CLINIQ-Knowledge-Base/08-Logs/Backend-Changelog.md`, `CLINIQ-Knowledge-Base/08-Logs/Backend-Issues-and-TODOs.md`, this log
Changes Made:

**Set-up.** Branch `backend` at `105faca`, the same as `origin/backend`, with a clean tree. The worktree had been removed, and the main folder was on `backend`.

**Corrections to the manual:**

| Where | It said | It says now | Source |
|---|---|---|---|
| Rule 4 | ERD approved (ADR-057) | Approved, and changed since only through ADR-063, 064, 071, 072, 073, 075, 076, 078; 48 tables, 462 columns | `Reference-Schema.sql` loaded into MariaDB; `information_schema` |
| Rule 5 | no count | 132 functions, 20 constants, 20 error classes (126, 15, 19 on November 7); the contract names all 132 | `grep` of `api.ts`; a script over the contract |
| Rule 6 | lockout per ADR-015 (no figures); "B0.3 and B0.5 were built for the Admin only, so B2 reworks them" | 7 days from sign-in; 5 failures across sign-in and recovery lock for 5 minutes (30 before November 8); B0.3 and B0.5 reworked November 9, and B2 adds the table-backed parts | ADR-015 (amended), ADR-057, `api.ts`, the November 9 backend session |
| Rule 8 (new) | none | The ADRs are the authority; a later dated note wins; the contract and the schema follow them | Zean's prompt |
| P2 audit note | 102 entries, 104 of 104 functions | dated update: 126 endpoint entries, 132 of 132 functions named | contract script |
| P3 audit note | 191 of 191 tests, 431 columns | dated update: 48 tables, 462 columns, 260 of 260 tests | scratch MariaDB run |
| Prepare | P1 to P3 | P4 counter-check (2/4/5/8, safe to start B1 after ADR-076, 247 tests), P5 ADR-076 (254 tests), P6 ADR-077 to 079 | `Backend-Counter-Check-Nov7.md`, `Backend-Changelog.md` |
| B0.3 | "5 failed attempts then a 30-minute lock, Admin idle 30 minutes" | "5-minute lock, idle minutes per role"; a dated note states the rule as the code does | `api.ts` `recordFailure`, `lockMessage.ts` (`56cb91b`) |
| B0.9 | "`route:list` shows exactly 2 routes" | dated update: 3 routes (the keep-alive) | `routes/api.php`, `HealthAndRoutesTest` |
| B1 | one line | a gate (before B1, the build, the checks) | `Environment-Setup.md`, `ERD.md` section 13, `Checks/README.md`, `backend/README.md`, `composer.json` |
| B2 | one line | lockout, built so far, still to do, the env key, the secure-cookie finding | the November 9 session log, MDN, Sanctum docs, `config/session.php` |
| B4 | staff patients, birthdate | plus the staff Incomplete Records queue (ADR-067, ADR-076) | ADR-076 |
| B8 | "write-off notes" | the adjustment note optional for every reason (ADR-068); "Commonly used for" required (ADR-071) | ADR-068, ADR-071 as amended |
| B9 | Dashboard, calendar, Reports, Sports Report, holiday sync | plus the school-year reminder (ADR-075) and the Admin's view-only reports with `GET /api/reports/latest-month` (ADR-077) | ADR-075, ADR-077 |
| B10 | ADR-039, ADR-052 | plus: a backup only on the clinic PC's own disk is not enough (ADR-079) | ADR-079 |

Phase 0, 1 and 2 and the definition of done were left alone; nothing in them was factually wrong.

**Counts verified:**
- `api.ts`: 132 exported functions, 20 exported constants, 20 error classes, 3,940 lines.
- Contract: 126 endpoint entries after this run (124 before); 132 of 132 functions named.
- Schema: 48 tables and 462 columns, both from `information_schema` after loading `Reference-Schema.sql`.
- **Constraint tests: 260 of 260** (accepts 38, count 46, rejects 176). They ran on a throwaway MariaDB 10.11.16 instance from XAMPP's binaries (data folder in the session scratchpad, port 3307, `127.0.0.1`, `--skip-grant-tables`), which was stopped afterwards; the scratch database was dropped.
- `composer.lock`: Laravel 13.39.0, Sanctum 4.3.3, Pest 5.3.4. B0.1's note was already right.

**The lockout rule, now in B0.3 and B2:**
- Sign-in and password recovery share one count. A wrong attempt answers 401 `invalid_credentials`, "Unable to sign in with those credentials.", and from 3 left adds "Your account will be locked after N more failed attempt(s)."
- The fifth failure locks for 5 minutes: 423 `account_locked` with `locked_until`, and the message "This account is temporarily locked after repeated failed attempts. Try again at HH:MM."
- The audit entry is "Account locked for 5 minutes after 5 wrong passwords (sign-in)" or "(password recovery)". An expired lock clears the count.
- ADR-015 (as amended November 8) and the code agree.
- The contract said 30 minutes in three places and had no `attempts_left`. Both were fixed from the code: `attempts_left` on 401 and on the recovery 422, beside `locked_until` on 423.

**The B1 gate, as written:**
- **Before B1:**
  - MariaDB hardened (root password; `bind-address="127.0.0.1"` checked with `netstat`; the `cliniq` database).
  - The `cliniq_app` and `cliniq_migrate` accounts.
  - `.env` on `cliniq_app`, with the migration account never stored or run by the application.
- **The build:**
  - Migrations per module in `ERD.md` section 13 order, with models, factories and Pest tests; CHECKs by `DB::statement`.
  - The schema compared with `Reference-Schema.sql` by hand (no script exists: migrate one scratch database, load the reference into another, compare; 48 tables, 462 columns), then `constraint-tests.sql` on the migrated database.
  - `audit_logs` SELECT and INSERT only for `cliniq_app`, with a test.
  - The development seeder from `mock-db.json`.
  - `composer check` and `composer audit`.
- "One migration per table or small group" in the prompt became "one per module (a small group of tables)", as `ERD.md` section 13 says.

**The secure-cookie finding.** MDN's `Set-Cookie` page says a `Secure` cookie is sent over `https:` only "(except on localhost)". It also says "Insecure sites (`http:`) cannot set cookies with the `Secure` attribute. The `https:` requirements are ignored when the `Secure` attribute is set by localhost."

So `SESSION_SECURE_COOKIE=true` would work on `http://localhost` only through that exception. On any other plain-HTTP address, the browser would drop the cookie silently.

`backend/config/session.php` reads `(bool) env('SESSION_SECURE_COOKIE', false)`. The Sanctum documentation needs the port in the stateful domains only when the URL has one, and needs the SPA to send `Referer` or `Origin`.

Keep `false` on `http://localhost`, and `true` with HTTPS. This matches `Environment-Setup.md` (November 8).

**Contract mapping (Zean's answer):**
- `GET` and `PUT /api/settings/idle-signout` now copy `getIdleSignoutSettings` and `saveIdleSignoutSettings` (with `validIdleMinutes`), with the real messages and the audit wording "Updated Staff idle sign-out minutes".
- `GET /api/auth/me` names `getIdleSignoutMinutes`.
- `GET /api/school-years` names `getSchoolYearHistory`.
- The Dashboard's `schoolYearReminder` gains `dueToday`.
- **New:** `GET /api/school-years/reminder` (`getSchoolYearReminder`, the sidebar's own call) and `GET /api/reports/latest-month` (`getLatestRecordedMonth`). Each function had no endpoint of its own.

**Links:** the manual's 6 markdown links, 16 code paths and 25 ADR numbers all resolve. Nothing needed fixing.

Reason: Zean's request. The manual is what an agent keeps open while building, and B1 is next.
Testing Performed: The schema load and constraint tests as above. Scripted counts of the mock, the contract and the schema. A link and path check of the manual. No backend code changed, so Pest was not rerun.
Known Issues:
- **Doesn't match yet:** the development machine's MariaDB listens on `0.0.0.0:3306` (`netstat`, November 9). Hardening step 2 is not done, so the B1 gate is not met yet.
- **`cliniq_migrate`** is named by Zean's prompt and the manual. `Environment-Setup.md` only says "a separate account with schema rights" and gives no SQL for it. Name it and give its grants there when hardening is done.
- **Stale line numbers:** the contract's older `api.ts:NNNN` citations stay stale (the existing `LATER` entry). The new citations in this run use current line numbers.
Next Steps: Harden MariaDB on the development machine, then start B1 from the gate.
