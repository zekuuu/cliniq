Date/Day/Time: Sunday, November 15, 2026 — 23:23 PHT (phase finished at 17:44 PHT, real clock)
Agent: Claude Code (Opus 5.5)
Task: Connect the frontend to the API, S0 — mode switch and HTTP client
Status: Completed
Prompt/Request: Zean pasted `Prompt-Connect-Frontend-To-API-Nov15.md` (Sunday, November 15, 2026): connect the frontend to the real Laravel API module by module, behind a global and per-module mock/API switch, all phases in order (S0 to S8), the mock layer untouched, nothing committed. Then "make it now" (create the branch).
Files Modified: frontend/src/lib/api/{mode,client,errors,routed}.ts, DevDataMode.tsx, mode.test.ts, client.test.ts; frontend/src/lib/data/index.ts (new); frontend/vite.config.ts; frontend/src/main.tsx; frontend/src/App.tsx; 92 files: import `lib/mock-db` changed to `lib/data` (one line each)
Changes Made: `apiMode(module)` reads `VITE_API_MODE` (global, wins both ways) then `VITE_API_MODE_<MODULE>`, default mock. Dependency table and a dev-only banner, badge and console table. One `fetch` client: credentials, CSRF cookie at the server root, `X-XSRF-TOKEN`, one retry after 419, timeout, no body logging, typed `ApiError`; 409 rules, 401 sign-in and 423 become the mock's error classes; 401 session codes and 403 `password_change_required` raise app events. `lib/data` re-exports the mock and routes connected functions. Tests run on the mock whatever `.env` says.
Reason: ADR-080 (Zean's three answers; the switch, its precedence and dependencies; the mock stays).
Testing Performed: lint 0 errors, `tsc -b`, 1206 of 1206 tests (21 new), build. Vitest must run from `D:` (lowercase `d:` fails on a clean HEAD too).
Known Issues: See `08-Logs/Connect-Frontend-Nov15/NOTES.md` (FOLLOW-UPS) and `REPORT.md`.
Next Steps: Zean commits in the groups listed in `REPORT.md`.
