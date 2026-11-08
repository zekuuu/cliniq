Date/Day/Time: Saturday, October 3, 2026 — 13:58 PHT (system clock)
Agent: Claude Code (Claude Opus 5.5)
Task: Constrain the Dashboard Visits trend's granularity to the selected date range, finish the trend-window fix, confirm This year, and investigate the blank middle card in the Alerts row.
Status: Completed (the blank Alerts card itself was not reproducible; see Known Issues)
Prompt/Request: Fix the Dashboard's trend chart logic: (1) only All may skip to the earliest event, every bounded range keeps its real start with zero buckets; (2) couple granularity to the page's date range: reset to the range's default when the range changes, and show unsuitable options visibly disabled (not hidden), aiming for roughly 2–20 buckets: Today/This week Daily only; This month Daily (default) + Weekly; This year Monthly (default) + Weekly; All Monthly or Yearly by history length, never Daily/Weekly; Custom applies the same principle to its actual span; (3) add "This year"; (4) empty periods render as a flat zero line, keeping the "nothing to compare" message only for genuine single-bucket cases; (5) reproduce the blank FrequentVisitorsAlert card live with Playwright MCP and fix the confirmed cause, without guessing. Verify live across Today, This week, This month, This year, All, and Custom; run typecheck, tests, and build; log the session.
Files Modified:
- `frontend/src/lib/dateRange.ts`
- `frontend/src/lib/mock-db/dashboard.ts`
- `frontend/src/lib/mock-db/dashboard.test.ts`
- `frontend/src/types/dashboard.ts`
- `frontend/src/components/ui/SegmentedControl.tsx`
- `frontend/src/features/dashboard/DashboardPage.tsx`
- `frontend/src/features/dashboard/components/ComplaintTrends.tsx`
- `frontend/src/features/dashboard/components/ComplaintTrends.test.tsx`
- `frontend/src/features/dashboard/components/AlertLists.tsx`
- `CLINIQ-Knowledge-Base/03-Design/Screen-Inventory.md`
- `CLINIQ-Knowledge-Base/04-Development/Frontend-Loop-Engineering.md`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Issues-and-TODOs.md`
Changes Made:
- Starting state (verified, Step 0): the 03:43 Codex session had already anchored bounded ranges at their start, added This year, made empty multi-bucket ranges chart as zero lines, and reset granularity on range change. It had not constrained the options (Daily was still selectable on All), and an All range with zero events still built monthly buckets from 1900.
- `planTrendGranularity(window, wholeHistory)` in the data layer decides which sizes are offered for the actual trend window and which is the default. Daily ≤ 31 days; Weekly 14–371 days; Monthly 56 days–3 years; Yearly > 1 year. All is sized by its recorded history, never offers Daily/Weekly, and always keeps Monthly (unless history > 3 years). Defaults: Daily ≤ 31 days, Weekly ≤ 120, Monthly ≤ 3 years, else Yearly; All opens Monthly up to 2 years of history, else Yearly.
- `ComplaintTrends` payload now carries `granularityOptions` and the resolved `granularity`. `DashboardQuery.trendGranularity` is optional (omitted = default), and a request for an unoffered size falls back to the default. The future Laravel endpoint should keep this contract, so the UI never decides bucket sizing itself.
- DashboardPage keeps only the user's override; a range change clears it.
- Shared `SegmentedControl` gained an optional per-option `disabled`: native `disabled`, the DatePicker's `cursor-not-allowed` + `opacity-40` treatment, and Arrow/Home/End keys skip disabled options. Existing uses are unaffected.
- All with no events now starts at today (one bucket → empty state) instead of 1900. The `1900-01-01` literal became `ALL_RANGE_FROM` in `dateRange.ts`.
- Alerts row: a confirmed print overflow fixed with `print:auto-rows-auto` on `ALERT_GRID`.
Reason: Granularity was independent state, so nonsensical combinations (Daily on All, Yearly on Today) were still possible; the user decided the constrained-toggle approach in the prompt. "This week" in the prompt maps to the Dashboard's existing "Last 7 days" preset; the Dashboard has no separate This week preset, and none was added.
Testing Performed:
- `npm run typecheck`: passed. `npm run test`: 51 files, 236 tests passed (5 new: granularity plan per range, fallback for an unoffered request, empty All, This year preset, disabled options + keyboard skip). `npm run build`: passed.
- Playwright MCP, live at 1280px (today = Oct 3, 2026):
  - This month: Daily only (3 days, so Weekly would be one bucket), 3 points.
  - Today: Daily only, 1 point plus the single-period message.
  - Last 7 days: Daily only, 7 points with zero days on the line.
  - Last 30 days: Daily* + Weekly, 30 points.
  - This year: Monthly* + Weekly, 10 points.
  - All: Monthly* + Yearly, 14 points.
  - Custom Sep 20–Oct 3: Daily* + Weekly. Custom Jul 1–Oct 3: Weekly* + Monthly.
  - Reset: This year → Weekly, then Last 30 days resets to Daily; Weekly, then All resets to Monthly.
  - Disabled options: forced clicks and dispatched clicks on disabled options changed nothing; ArrowRight skipped disabled options.
  - `?mock=empty`: This month and This year render flat, connected zero lines (3 and 10 points); Today and All show the empty state (single bucket).
  - Print: Alerts cards grow to their content with no overflow; screen heights unchanged (416px).
Known Issues:
- The reported blank middle Alerts card was not reproduced. Checked: 5 widths, every preset (mid-refetch and settled), the `?mock=slow` skeleton, `?mock=empty`, print media, and a generated PDF. The only headerless blank card reproduced was a full-page-screenshot artifact (sticky elements painted at the scroll position, blanking the Visits trend card). Recorded under Frontend-Issues-and-TODOs → Verification notes.
- When This month is only 1–13 days old, Weekly is disabled because it would be a single bucket. This follows the prompt's stated principle over its example table; it becomes selectable from day 14.
- The canonical Frontend Context Brief (#31) still says "common complaints by week/month"; Screen-Inventory was updated, and the canonical copy needs the matching edit by its owner.
Next Steps: If the blank Alerts card reappears, capture the width, range, scroll position, and screenshot method so it can be reproduced.
