Date/Day/Time: Saturday, October 3, 2026 — 14:13 PHT (system clock)
Agent: Claude Code (Claude Opus 5.5)
Task: Replace the constrained granularity toggle (from `2026-10-03-dashboard-trend-granularity-constraints.md`, same session, uncommitted) with no toggle at all; granularity is derived purely from the date range.
Status: Completed
Prompt/Request: Correction to the trend-chart task: disregard "keep the toggle but disable nonsensical options". Remove the chart's Daily/Weekly/Monthly/Yearly buttons entirely; keep the separate Chart/Table toggle. Granularity is derived only from the selected range: Today a single bucket; This week daily; This month daily; This year monthly; All monthly, or yearly if the history is long enough that monthly would be too dense; Custom dynamically by its actual span. Everything else from the original prompt stands (trendFrom fix, This year, flat zero line, the blank Alerts widget investigation). When verifying live, confirm the toggle is actually gone, not just disabled-looking.
Files Modified:
- `frontend/src/lib/mock-db/dashboard.ts`
- `frontend/src/lib/mock-db/dashboard.test.ts`
- `frontend/src/lib/mock-db/sync.test.ts`
- `frontend/src/types/dashboard.ts`
- `frontend/src/features/dashboard/DashboardPage.tsx`
- `frontend/src/features/dashboard/components/ComplaintTrends.tsx`
- `frontend/src/features/dashboard/components/ComplaintTrends.test.tsx`
- Reverted to HEAD: `frontend/src/components/ui/SegmentedControl.tsx`, `frontend/src/lib/dateRange.ts`
- `CLINIQ-Knowledge-Base/03-Design/Screen-Inventory.md`, `04-Development/Frontend-Loop-Engineering.md`, `08-Logs/Frontend-Changelog.md`, `08-Logs/Frontend-Issues-and-TODOs.md`
Changes Made:
- Removed the "Group trend by" control and its props (`granularity`, `onGranularityChange`) from `ComplaintTrends`; the card header now holds only Chart/Table. The description and single-period note read `trends.granularity`.
- `trendGranularityFor(preset, window)` replaces the options plan: `today`/`last7`/`last30`/`thisMonth` → day; `thisYear` → month; `all` → month up to two years of recorded history, else year; `custom` → day ≤ 31 days, week ≤ 120 days, month ≤ two years, else year.
- `buildComplaintTrends(events, range, config)` takes the range (preset + dates) instead of from/to + requested size. `DashboardQuery` is back to `{ range }`; `ComplaintTrends.granularityOptions` is gone.
- DashboardPage has no granularity state. Its fetch key now includes the preset, because the bucket size depends on the preset, not only the dates.
- Reverted the per-option `disabled` support in the shared `SegmentedControl`, since nothing uses it now. Reverted the `ALL_RANGE_FROM` constant, which became unused.
- Kept from the earlier pass: bounded ranges anchored at their start with zero buckets, empty All starting at today instead of 1900, and the Alerts grid's `print:auto-rows-auto` fix.
Reason: The user chose to remove the manual override entirely rather than constrain it.
Testing Performed:
- `npm run typecheck`: passed. `npm run test`: 51 files, 236 tests passed. `npm run build`: passed.
- Playwright MCP, live at 1280px (today = Oct 3, 2026). On every range the trend card had only the "Show trend as" radiogroup, and zero Daily/Weekly/Monthly/Yearly buttons existed in the DOM.
  - This month: per day, 3 points.
  - Today: per day, 1 point plus the single-period note.
  - Last 7 days: per day, 7 points (zero days on the line).
  - Last 30 days: per day, 30 points.
  - This year: per month, 10 points.
  - All: per month, 14 points.
  - Custom Sep 20–Oct 3: per day, 14 points. Custom Jul 1–Oct 3: per week, 14 points.
  - The Table view still works.
  - `?mock=empty`: This month and This year draw flat, connected zero lines (3 and 10 points); Today shows the empty state.
  - Alerts row: all three cards render with header and count.
Known Issues:
- This year early in January is a single monthly bucket, so it shows the single-period note. That follows the literal "This year: monthly" rule.
- The blank Alerts middle card remains unreproduced; see Frontend-Issues-and-TODOs → Verification notes.
- The canonical Frontend Context Brief (#31) still says "common complaints by week/month" and needs its owner's edit.
Next Steps: None for this change.
