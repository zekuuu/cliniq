# Dashboard Complaint-Trend Table UX Fixes

Date/Day/Time: Thursday, October 01, 2026 — 15:08 PHT
Agent: Codex
Task: Fix the Dashboard complaint-trend table's sticky-column, wide-period, low-signal-row, and default-sort UX behavior on top of the existing `f313bc0` column-width fix.
Status: Completed
Prompt/Request: Fix the three real Dashboard complaint-trend table UX problems: make the Complaint column sticky through the shared DataTable, cap the table-only period view at the newest 12 periods with an overflow note, hide zero-activity complaint rows by default with a Show all complaint types toggle, and ensure the Table view starts sorted by Total descending. Add/update tests, update `cliniq-table-patterns`, live-verify the weekly wide-range case by scrolling the table, run typecheck/full tests/build, and log the work.
Files Modified:
- `.claude/skills/cliniq-table-patterns/SKILL.md`
- `CLINIQ-Knowledge-Base/04-Development/Frontend-Loop-Engineering.md`
- `CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md`
- `frontend/src/components/ui/DataTable.tsx`
- `frontend/src/components/ui/DataTable.test.tsx`
- `frontend/src/features/dashboard/components/ComplaintTrends.tsx`
- `frontend/src/features/dashboard/components/ComplaintTrends.test.tsx`
- `frontend/src/features/dashboard/DashboardPage.test.tsx`
Changes Made:
- Added shared `DataTable` `stickyFirstColumn` support with opaque, layered, bordered first-column cells for both headers and body rows.
- Kept TrendTable capping local to its view model: it shows only the newest 12 buckets, preserves source indexes for counts and cluster markers, and leaves chart data and Common complaints totals unchanged.
- Added the earlier-period note and an accessible `aria-pressed` Show all complaint types toggle; default filtering is based only on visible post-cap periods.
- Preserved and regression-tested the existing Total-descending initial sort.
- Extended `cliniq-table-patterns`, Skills Setup, the Dashboard re-audit checklist, Issues/TODOs, and the session history with the reusable patterns and verification evidence.
Reason: Wide weekly/monthly tables must remain usable on the shared clinic workstation without losing the row label, overwhelming the nurse with empty columns/rows, or changing the meaning of other dashboard summaries.
Testing Performed:
- Focused Vitest: 18 tests passed across DataTable, TrendTable, and DashboardPage tests.
- Full Vitest suite: 49 files / 214 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Focused ESLint on changed frontend files: passed.
- `npm run lint`: existing unrelated `ReportIssueModal.tsx` `react-hooks/set-state-in-effect` error remains, plus two existing Fast Refresh warnings.
- Live isolated headless Edge verification of Table view with the weekly All range: 14 total columns (Complaint + 12 periods + Total), 45 earlier periods noted, and Complaint stayed at the scroller's left edge with readable text/background at scroll positions 0, 602, and 1203. The toggle revealed zero-activity rows while Common complaints remained `10 other complaint types, 57 cases`.
Known Issues: Repository-wide lint is not clean because of the pre-existing ReportIssueModal error described above. The requested Playwright MCP was not exposed in this session, so the equivalent live browser verification used Edge's local CDP debugging interface.
Next Steps: None for this request; the existing lint issue can be handled separately.
