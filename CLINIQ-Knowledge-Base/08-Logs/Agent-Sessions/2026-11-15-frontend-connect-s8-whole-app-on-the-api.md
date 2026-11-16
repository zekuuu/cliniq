Date/Day/Time: Sunday, November 15, 2026 — 23:23 PHT (phase finished at 23:21 PHT, real clock)
Agent: Claude Code (Opus 5.5)
Task: Connect the frontend to the API, S8 — the whole app on the real API
Status: Completed
Prompt/Request: Zean pasted `Prompt-Connect-Frontend-To-API-Nov15.md` (Sunday, November 15, 2026): connect the frontend to the real Laravel API module by module, behind a global and per-module mock/API switch, all phases in order (S0 to S8), the mock layer untouched, nothing committed. Then "make it now" (create the branch).
Files Modified: frontend/src/features/dashboard/components/VisitCalendar.tsx; frontend/src/features/student-records/StudentListPage.tsx
Changes Made: With `VITE_API_MODE=api`: 17 Staff screens and 16 Admin routes walked (forbidden screens redirect as in mock mode), the lockout down to the lock message. Two fixes: the calendar crashed on a holiday feed never synced (`lastUpdated` null); the Admin's Student List asked the Staff-only incomplete count (403).
Reason: ADR-080 (Zean's three answers; the switch, its precedence and dependencies; the mock stays).
Testing Performed: 1246 of 1246 (one known flaky timeout on a rerun), lint, `tsc -b`, build.
Known Issues: See `08-Logs/Connect-Frontend-Nov15/NOTES.md` (FOLLOW-UPS) and `REPORT.md`.
Next Steps: Zean commits in the groups listed in `REPORT.md`.
