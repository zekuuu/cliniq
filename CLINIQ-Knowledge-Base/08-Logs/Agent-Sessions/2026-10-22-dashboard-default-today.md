Date/Day/Time: Thursday, October 22, 2026 — 14:25 PHT
Agent: Codex (GPT-5)
Task: Change the Clinic Overview Dashboard's default date range to Today
Status: Completed
Prompt/Request: "Change default date range in dashboard to Today"
Files Modified:
- frontend/src/features/dashboard/DashboardPage.tsx
- frontend/src/features/dashboard/DashboardPage.test.tsx
- .claude/skills/cliniq-date-range-patterns/SKILL.md
- CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-22-dashboard-default-today.md
Changes Made:
- Changed the Dashboard's initial `DateRange` preset from `thisMonth` to `today`.
- Added a focused regression test that asserts the Date range control initially reads Today.
- Updated the shared date-range convention and its skills index: Dashboard exception This month → Today. Other multi-record operational screens still default to All.
Reason:
- The user requested that the Dashboard open on today's activity.
Testing Performed:
- Focused Dashboard test suite passed before the change (5 tests).
- Post-change focused Dashboard test suite passed (6 tests).
- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed.
Known Issues:
- None.
Next Steps:
- None.
