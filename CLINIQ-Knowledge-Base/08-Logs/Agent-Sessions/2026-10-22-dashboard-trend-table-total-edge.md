Date/Day/Time: Thursday, October 22, 2026 — 14:38 PHT
Agent: Codex (GPT-5)
Task: Remove the spare space after Total in the Dashboard Visits trend table
Status: Completed
Prompt/Request: "Then in visits trend table, there's a hole on the right side of total"
Files Modified:
- frontend/src/features/dashboard/components/ComplaintTrends.tsx
- frontend/src/features/dashboard/components/ComplaintTrends.test.tsx
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
- CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-22-dashboard-trend-table-total-edge.md
Changes Made:
- Made the Complaint column consume unused table width on short hourly ranges, which keeps Total at the right edge.
- Retained the content-calibrated minimum width for wide time-series ranges, period-column widths, sticky edge columns, and the existing horizontal scroller.
- Updated the calibrated-column regression assertion.
Reason:
- The user reported an empty band to the right of Total in the Visits trend table.
Testing Performed:
- Focused Complaint Trends test suite passed (19 tests).
- `npm.cmd run typecheck` passed.
- `npm.cmd run build` passed.
Known Issues:
- None.
Next Steps:
- None.
