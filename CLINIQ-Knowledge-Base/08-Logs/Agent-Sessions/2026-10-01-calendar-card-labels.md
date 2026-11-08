Date/Day/Time: Thursday, October 01, 2026 — 22:42:14 PHT
Agent: Codex
Task: Clarify Dashboard calendar card labels.
Status: Completed
Prompt/Request: “The calendar is kinda confusing, for each card make each date as ShortMonth {date} at top left then for the counts make it {count} Visits”.
Files Modified:
- frontend/src/features/dashboard/components/VisitCalendar.tsx
- frontend/src/features/dashboard/DashboardPage.test.tsx
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md
- CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-01-calendar-card-labels.md
Changes Made:
- Changed weekly and monthly calendar-card dates from a day number or weekday-prefixed label to short month/day labels such as “Sep 1”.
- Labelled each displayed total “Visit” or “Visits”, while leaving the heatmap, detailed tooltip, and event tags intact.
- Added a Dashboard regression test for compact calendar dates and labelled totals.
Reason: Make the card data immediately scannable without changing the Dashboard calendar’s documented visit-and-incident heatmap behavior.
Testing Performed:
- `npm.cmd run test -- DashboardPage.test.tsx` — passed (15 tests).
- `npm.cmd run typecheck` — passed.
- `git diff --check` — passed.
Known Issues: None.
Next Steps: None.
