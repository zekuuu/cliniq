Date/Day/Time: Monday, October 26, 2026 — 00:21 PHT
Agent: Claude Code (Opus 5.5)
Task: Calendar Table view: narrower Date and count columns
Status: Completed
Prompt/Request: "in calendar, reduce length of visits, total, and incidents also the month to give more space for holidays and events"
Files Modified:
- frontend/src/features/dashboard/components/VisitCalendar.tsx
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
Changes Made:
- Date 9rem → 7rem, Visits 6rem → 4.5rem, Incidents 7rem → 6rem, Total 6rem → 4.5rem (each now exactly fits its header with the sort icon). Holidays and Events share the rest: 312px each at 1366px (was 264px), 372px at 1920px.
Reason: User request, follow-up to [2026-10-26-table-column-width-audit](2026-10-26-table-column-width-audit.md).
Testing Performed: Measured in Chromium at 1366px and 1920px: no header or cell wraps or is cut off; Events wraps on 1 of 17 rows at 1366px (a three-event list) and none at 1920px. Screenshot checked. `vitest run src/features/dashboard` passes.
Known Issues: None.
Next Steps: None.
