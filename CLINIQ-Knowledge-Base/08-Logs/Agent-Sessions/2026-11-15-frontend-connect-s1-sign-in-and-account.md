Date/Day/Time: Sunday, November 15, 2026 — 23:23 PHT (phase finished at 17:58 PHT, real clock)
Agent: Claude Code (Opus 5.5)
Task: Connect the frontend to the API, S1 — sign-in and the account (AUTH, SETTINGS idle limits)
Status: Completed
Prompt/Request: Zean pasted `Prompt-Connect-Frontend-To-API-Nov15.md` (Sunday, November 15, 2026): connect the frontend to the real Laravel API module by module, behind a global and per-module mock/API switch, all phases in order (S0 to S8), the mock layer untouched, nothing committed. Then "make it now" (create the branch).
Files Modified: frontend/src/lib/api/http/auth.ts, auth.test.ts; lib/data/index.ts; App.tsx; main.tsx; hooks/useIdleSignOut.ts; features/auth/LoginPage.tsx
Changes Made: Login, lockout and attempts left, sign-out, start-up `GET /api/auth/me`, forced change, password change, recovery and authenticator, own profile. Idle sign-out follows the server: keep-alive at most once a minute on activity and on "Stay signed in", never on a timer. "Your session has ended. Sign in again." on 401 expired or unauthenticated. API sign-in starts the mock session for the same username while other modules are on the mock.
Reason: ADR-080 (Zean's three answers; the switch, its precedence and dependencies; the mock stays).
Testing Performed: browser on the real API: wrong password, sign-in, reload, settings 422, authenticator set up and turned off, recovery verify, reused password refused, forced change and its 403, session-ended line; 1215 tests.
Known Issues: See `08-Logs/Connect-Frontend-Nov15/NOTES.md` (FOLLOW-UPS) and `REPORT.md`.
Next Steps: Zean commits in the groups listed in `REPORT.md`.
