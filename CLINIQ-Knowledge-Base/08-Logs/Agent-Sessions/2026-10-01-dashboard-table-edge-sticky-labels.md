# Dashboard Trend-Table Edge Stickiness and Weekly Labels

Date/Day/Time: Thursday, October 01, 2026 — 15:18 PHT
Agent: Codex
Task: Keep the Dashboard complaint-trend table's Total column visible, reduce the Complaint column to the longest content, and remove the redundant “Week of” text from weekly Table headers.
Status: Completed
Prompt/Request: Make the Total column sticky so it remains visible during sideways scrolling, reduce the Complaint column based on the maximum complaint content, and in Weekly + Table mode remove “Week of” so headers have more room and do not overlap.
Files Modified:
- `.claude/skills/cliniq-table-patterns/SKILL.md`
- `CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md`
- `frontend/src/components/ui/DataTable.tsx`
- `frontend/src/components/ui/DataTable.test.tsx`
- `frontend/src/features/dashboard/components/ComplaintTrends.tsx`
- `frontend/src/features/dashboard/components/ComplaintTrends.test.tsx`
- `frontend/src/features/dashboard/DashboardPage.test.tsx`
Changes Made:
- Added shared `stickyLastColumn` support to `DataTable`, keeping the opaque rightmost column layered above scrolled cells.
- Applied it to TrendTable's Total column alongside the existing sticky Complaint column.
- Derived the Complaint width from the longest full-range complaint label plus a small buffer; current seeded data renders it at `26ch` instead of `14rem`.
- Added a table-only weekly header formatter that shows dates such as `Jul 12, 2026`; chart tooltips and accessible chart summaries retain “Week of”.
- Extended the shared table skill and regression coverage for both sticky edges, dynamic width, and compact weekly headers.
Reason: Wide weekly tables need both the row label and summary total available while users compare periods, and repeated header wording was wasting horizontal space.
Testing Performed:
- Focused Vitest: 18 tests passed across DataTable, TrendTable, and DashboardPage tests.
- Live isolated headless Edge verification: 14 columns, Complaint width `26ch`, no “Week of” in weekly table headers, both edge cells remained visible at scroll positions 0, 605, and 1209, and both computed as `position: sticky`.
Known Issues: None introduced by this refinement. Repository-wide lint status from the preceding table session remains unchanged.
Next Steps: None for this request.
