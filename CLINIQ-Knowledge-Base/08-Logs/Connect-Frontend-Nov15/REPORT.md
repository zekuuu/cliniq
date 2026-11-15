# Connect the frontend to the API — run report

*Updated Sunday, November 15, 2026 — 23:28 PHT.* Branch `feat/connect-frontend` (from `backend` `18ff415`). Nothing committed. Decisions, questions and follow-ups: [NOTES.md](NOTES.md). Decision: [ADR-080](../../06-Decisions/ADR-080-Frontend-Connects-To-The-API-Behind-A-Mode-Switch-Mock-Stays.md).

## Where it stands

All phases are done (S0 to S8). Every module can run on the real Laravel API, one module at a time or all at once with `VITE_API_MODE=api`, and each was checked in a real browser against the running API. With nothing set, the app runs on the mock exactly as before; the mock layer was not touched. Two questions came up and Zean answered both; one backend fix was made with his word. Nothing is waiting on a decision.

## Phases

| Phase | Modules | Built | Checked in a real browser | Tests |
|---|---|---|---|---|
| S0 Switch and client | all | Yes | Dev line, console table, dependency banner | 21 new |
| S1 Sign-in and account | AUTH, SETTINGS | Yes | Wrong password, sign-in, reload restore, settings 422, authenticator set up and off, recovery, reused password refused, forced change and its 403, session-ended line | 9 new |
| S2 Students, staff, school years, Archive | STUDENTS, STAFF_PATIENTS, SCHOOL_YEARS | Yes | Student list, profile and history, edit and save, incomplete queue, staff list, Archive | 7 new |
| S3 Visits | VISITS | Yes | Visit Log, last-4 LRN search, detail, follow-ups, New Visit save, entered in error | 6 new |
| S4 Incidents | INCIDENTS | Yes | Admin: log 23 of 25 (no staff incidents), report, staff incident 404 | 3 new |
| S5 Inventory | INVENTORY | Yes | List with flags, item form tags, save (bug found and fixed), visit with a medicine and stock back | 3 new |
| S6 Dashboard and reports | DASHBOARD, REPORTS, AUDIT | Yes | Dashboard, calendar, Reports, Print with full LRN (one audit entry), Audit Log | 8 new; backend +1 |
| S7 Users, backup, issues, reference | USERS, BACKUP, ISSUE_REPORTS, REFERENCE | Yes | In the S8 walk | 4 new |
| S8 Whole app on the API | all | Yes | Staff 17 screens, Admin 11 screens and the redirects, lockout; 2 bugs fixed | — |

## Numbers

- Frontend tests: **1185 before, 1246 after**, all pass with no env set (one known flaky timeout, see NOTES). Lint 0 errors (1 old warning), `tsc -b` and `npm run build` pass.
- Backend tests: **227 passed, 1 skipped before; 229 passed after** (`composer check`: Pint, Larastan, Pest).
- `npm run docs:check` passes; the Facts sheet and the ADR index are regenerated.

## Differs from the mock (by design)

- Lists carry the masked LRN, so LRN search on the Visit and Incident Logs matches the last 4 digits (Zean's choice).
- Printouts get the full LRN only through the Print button (Zean's choice); Ctrl+P alone prints the masked copy.
- A student with no recorded sex shows "Not recorded" and is incomplete (contract G4); the mock fills in female.
- "Commonly used for" takes only the listed symptoms; the mock also kept typed words.
- "Your session has ended. Sign in again." on Login after the 7-day maximum.
- The holiday feed is the server's; the development API has none until it syncs.

## Not verified live

- One-way writes on the development data: school-year start and end, archiving a record, the imports, excuse letter approval, incident stages and approval, accounts and backup runs. Each is unit-tested on its route, body and error mapping.
- The idle warning's last two minutes on screen (the limit is at least 10 minutes); the idle sign-out itself did happen during a break.

## Suggested commits (run by Zean)

1. `feat(connect): S0 mode switch and HTTP client` — `frontend/src/lib/api/{mode,client,errors,routed}.ts`, `DevDataMode.tsx`, `mode.test.ts`, `client.test.ts`, `frontend/src/lib/data/index.ts`, `frontend/vite.config.ts`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, and the 92 one-line import changes (`lib/mock-db` to `lib/data`).
2. `feat(connect): S1 sign-in and account` — `lib/api/http/auth.ts`, `auth.test.ts`, `hooks/useIdleSignOut.ts`, `features/auth/LoginPage.tsx`.
3. `feat(connect): S2 students, staff, school years and archive` — `lib/api/http/records.ts`, `records.test.ts`, `testFetch.ts`, `features/student-records/StudentProfilePage.tsx`.
4. `feat(connect): S3 clinic visits` — `lib/api/http/visits.ts`, `visits.test.ts`, `lib/lrn.ts`, `lib/lrnSearch.test.ts`, `features/clinic-visits/api/visitLogApi.ts`.
5. `feat(connect): S4 incidents` — `lib/api/http/incidents.ts`, `incidents.test.ts`, `features/emergency-response/api/incidentLogApi.ts`.
6. `feat(connect): S5 inventory` — `lib/api/http/inventory.ts`, `inventory.test.ts`.
7. `feat(connect): S6 dashboard, reports and full-LRN print` — `lib/api/http/dashboard.ts`, `audit.ts`, `dashboard.test.ts`, `hooks/useFullLrnPrint.ts`, `features/reports/ReportsPage.tsx`, `features/reports/api/reportsApi.ts`, `features/audit-log/AuditLogPage.tsx`, `features/audit-log/api/auditLogApi.ts`.
8. `fix(api): audit log answers in the data envelope` — `backend/app/Shared/AuditLog/AuditLogController.php`, `backend/tests/Feature/AuditTrailTest.php`.
9. `feat(connect): S7 users, backup, issue reports and reference lists` — `lib/api/http/admin.ts`, `admin.test.ts`.
10. `fix(connect): S8 calendar without a holiday sync, Admin student list` — `features/dashboard/components/VisitCalendar.tsx`, `features/student-records/StudentListPage.tsx`.
11. `docs(connect): ADR-080, run notes, logs and setup` — `06-Decisions/ADR-080-*.md`, `ADR-Index.md`, `08-Logs/Connect-Frontend-Nov15/`, the ten `Agent-Sessions/2026-11-15-*connect*` and `*backend-audit-log*` files, `Frontend-Changelog.md`, `Backend-Changelog.md`, `Frontend-Issues-and-TODOs.md`, `Development-Phases.md`, `Environment-Setup.md`, `Facts-Sheet.md`, `CLINIQ-Knowledge-Base/README.md`, `Start-Here-For-SRS-And-Project-Plan.md`, `frontend/README.md`, `README.md`.

**Before committing:** `git status` lists about 350 changed files, the mock layer among them. Only about 135 tracked files really changed (`git diff --stat --ignore-cr-at-eol`); the rest are line-ending noise from a `git stash` and `pop` at 17:44 (working copies now LF while `core.autocrlf=true`). `git diff --quiet` shows no content change in them, and `git add` stages nothing for them. The mock layer (`frontend/src/lib/mock-db/`) has no content change.

`lib/data/index.ts` grows in every phase; it is easiest to commit it whole with S0 or with the last code commit.
