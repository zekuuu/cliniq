Date/Day/Time: Saturday, October 3, 2026 — 14:52 PHT (system clock)
Agent: Claude Code (Claude Opus 5.5)
Task: Fix the reported loss of horizontal scrolling in the Dashboard complaint-trend table (diagnosed by the requester as `fixedLayout` conflicting with `min-w-max`).
Status: Completed, with a different fix than requested; see Reason.
Prompt/Request: "Fix a CSS conflict in the Dashboard trend table: it's no longer horizontally scrollable, because fixedLayout (table-layout: fixed, added in commit ddb21d8 …) directly conflicts with min-w-max … Remove fixedLayout from the trend table's DataTable usage in ComplaintTrends.tsx specifically … If removing fixedLayout causes columns to reshuffle or resize as the zero-row toggle is used, find a way to keep column stability without table-layout: fixed … rather than reintroducing the scroll bug." The request also said to confirm the diagnosis against the current code first. When the diagnosis didn't reproduce, I asked how to proceed; the answer was "Do the best fix possible".
Files Modified:
- `frontend/src/components/ui/DataTable.tsx` (new optional `minTableWidth` prop)
- `frontend/src/components/ui/DataTable.test.tsx`
- `frontend/src/features/dashboard/components/ComplaintTrends.tsx`
- `frontend/src/features/dashboard/DashboardPage.test.tsx`
- `.claude/skills/cliniq-table-patterns/SKILL.md`
- `CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md`, `08-Logs/Frontend-Changelog.md`, `08-Logs/Frontend-Issues-and-TODOs.md`
Changes Made:
- Confirmed the repo state (HEAD 165a5af, in sync with origin; this session's earlier uncommitted trend changes present) and that commit ddb21d8 exists.
- Read `DataTable.tsx` and `ComplaintTrends.tsx`. The diagnosis did not hold: with `table-layout: fixed`, column widths that add up to more than the container make the table grow past it.
- Live, before any change: the table overflowed and a real wheel scrolled it to its maximum on Last 30 days, This year, and All, and at 390–1440px. Sticky edges were pinned.
- `DataTable` only applies `DataTableColumn.width` (via `<colgroup>`) when `fixedLayout` is on. Removing `fixedLayout` would therefore have dropped the calibrated widths, and columns would resize with the zero-activity toggle: the very problem the request wanted avoided.
- Fix: kept `fixedLayout`. Replaced `className="[&_table]:min-w-max"` with `minTableWidth={calc(<complaint ch> + <visible periods> × 8rem + 5rem)}`, so the table's width is exactly its column sum. A fixed-layout table with an explicit width is fully defined across browsers, unlike `min-width: max-content` on a fixed table. `VisitCalendar` already pairs `table-fixed` with an explicit `min-w-[36rem]` (precedent).
- Extracted `PERIOD_COLUMN_WIDTH` / `TOTAL_COLUMN_WIDTH` constants, so the column widths and the min width can't drift.
- Skill change (`cliniq-table-patterns`):
  - Old: "Combine sticky columns with `fixedLayout` and calibrated widths …" and nothing more on overflow.
  - New: an added bullet. A fixed-layout table that must overflow gets an explicit `minTableWidth` equal to its column sum. Don't use `min-w-max` on a fixed-layout table, and don't drop `fixedLayout` to get overflow.
Reason: The requested removal would have degraded column stability without fixing anything reproducible. The replaced `min-w-max` was the only browser-dependent part of the pairing the request flagged.
Testing Performed:
- `npm run typecheck`: passed. `npm run test`: 51 files, 237 tests passed (new DataTable `minTableWidth` test; the Dashboard table test now asserts the explicit min width instead of the `min-w-max` class). `npm run build`: passed.
- Playwright MCP at 1280px after the fix:
  - Last 30 days: 30 daily buckets capped to 12 periods, note "+ 18 earlier periods". Table 1828px in a 585px scroller; a real horizontal wheel went 0 → 500 → 1243 (max).
  - All: 14 months capped to 12, note "+ 2 earlier periods". 1846px, wheel 0 → 500 → 1261 (max).
  - Complaint and Total were pinned at left, middle, and right positions in both ranges.
  - Zero-activity toggle on Last 30 days: rows 10 → 13 → 10 with identical column widths (212, 12 × 128, 80) and constant table width. Complaint-name column width still derives from the longest name (26ch with the full complaint set).
Known Issues: Only Chromium was available for live testing. If the scroll loss was seen in another browser, the explicit width should cover it, but it hasn't been confirmed there.
Next Steps: If scrolling still fails somewhere, record the browser, width, and range in Frontend-Issues-and-TODOs.
