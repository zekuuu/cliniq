Date/Day/Time: Saturday, October 03, 2026 — 03:43:39 PHT
Agent: Codex
Task: Fix Dashboard trend windows/granularity, add This year, and investigate the blank Alerts-row widget.
Status: Completed
Prompt/Request: Fix the Dashboard trend chart so bounded ranges keep their real start and render connected zero buckets; adapt granularity by selected range; add a This year selector; investigate the blank FrequentVisitorsAlert widget with live Playwright; verify all requested ranges, typecheck, tests, and build.
Files Modified:
- `frontend/src/lib/dateRange.ts`
- `frontend/src/components/ui/DateRangePicker.tsx`
- `frontend/src/types/dashboard.ts`
- `frontend/src/lib/mock-db/dashboard.ts`
- `frontend/src/lib/mock-db/dashboard.test.ts`
- `frontend/src/features/dashboard/DashboardPage.tsx`
- `frontend/src/features/dashboard/DashboardPage.test.tsx`
- `frontend/src/features/dashboard/components/ComplaintTrends.tsx`
- `frontend/src/features/dashboard/components/ComplaintTrends.test.tsx`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`
- `CLINIQ-Knowledge-Base/08-Logs/Agent-Sessions/2026-10-03-dashboard-trends-and-alerts.md`
Changes Made:
- Restricted the earliest-event trend-window shortcut to the All sentinel range; bounded ranges now keep their selected start and preserve zero-value buckets.
- Added day/year buckets and adaptive range selection: day for up to 31 days, week through 120 days, month through three years, and year beyond that. All defaults to monthly for the current mock history.
- Added the This year preset (January 1 through today), exposed it in the default date-range selector, and reset trend granularity when the range changes.
- Kept the chart visible for empty multi-bucket ranges so totals form a flat zero line; the single-bucket comparison message remains for Today.
- Live Playwright MCP verification at 1280px showed the Frequent-visitor warnings card rendered with its header, count 0, and “No frequent-visitor warnings” empty state with a 309×416 layout box. The reported blank widget was not reproducible in the current code; no speculative Alerts change was made.
Reason: The chart was shrinking bounded ranges to the first event and suppressing empty multi-bucket charts because it treated an empty complaint series as no trend. The Alerts component already renders its empty state correctly.
Testing Performed:
- `npm.cmd run typecheck` — passed.
- `npm.cmd run test` — passed: 51 files, 231 tests.
- `npm.cmd run build` — passed.
- Playwright MCP — live Dashboard loaded after demo Staff login; This month chart and middle Alerts empty state confirmed. The scripted six-range loop lost its browser context before completing, so Today/This week/This month/This year/All/Custom were additionally covered by deterministic range/bucket tests rather than claimed as fully live-verified.
Known Issues: Playwright MCP browser context closed during the scripted all-range loop; the configured service was usable for the live default/widget reproduction but not for the complete automated range pass in this session.
Next Steps: None for the requested code change. Re-run the six-range live pass when the Playwright MCP context is stable.
