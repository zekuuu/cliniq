Date/Day/Time: Sunday, November 15, 2026 — 23:23 PHT (phase finished at 18:07 PHT, real clock)
Agent: Claude Code (Opus 5.5)
Task: Connect the frontend to the API, S2 — students, staff patients, school years, Archive
Status: Completed
Prompt/Request: Zean pasted `Prompt-Connect-Frontend-To-API-Nov15.md` (Sunday, November 15, 2026): connect the frontend to the real Laravel API module by module, behind a global and per-module mock/API switch, all phases in order (S0 to S8), the mock layer untouched, nothing committed. Then "make it now" (create the branch).
Files Modified: frontend/src/lib/api/http/records.ts, records.test.ts, testFetch.ts; lib/data/index.ts; features/student-records/StudentProfilePage.tsx
Changes Made: All student, staff, patient, import, school-year and Archive functions. Adapters: duplicate check sends the full name as `firstName`; the Archive is rebuilt from the year endpoints, paged; history `Infinity` sent as 200; school-year and staff 403/409/422 as the mock classes. The profile shows "Not recorded" for a null sex (G4).
Reason: ADR-080 (Zean's three answers; the switch, its precedence and dependencies; the mock stays).
Testing Performed: browser: list, profile, edit and save, incomplete queue, staff list, Archive; 1222 tests.
Known Issues: See `08-Logs/Connect-Frontend-Nov15/NOTES.md` (FOLLOW-UPS) and `REPORT.md`.
Next Steps: Zean commits in the groups listed in `REPORT.md`.
