Date/Day/Time: Saturday, October 3, 2026 — 14:59 PHT (system clock)
Agent: Claude Code (Claude Opus 5.5)
Task: Remove the year from the Dashboard complaint-trend table's period headers to narrow its columns, and show the year elsewhere (the card title).
Status: Completed
Prompt/Request: "In table header remove the 2026 to reduce the width of columns, then just move the year to anywhere else maybe on cart title"
Files Modified:
- `frontend/src/features/dashboard/components/ComplaintTrends.tsx`
- `frontend/src/features/dashboard/components/ComplaintTrends.test.tsx`
- `frontend/src/features/dashboard/DashboardPage.test.tsx`
- `.claude/skills/cliniq-table-patterns/SKILL.md`
- `CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md`, `08-Logs/Frontend-Changelog.md`
Changes Made:
- New `tableBucketHeader` shows period headers without the year: daily/weekly `Oct 1` / `Sep 14`, monthly `Mar`. Yearly periods keep their year (it is the period). The year stays in each header as screen-reader-only text, so the column header's accessible name is still `Sep 14, 2026` / `Mar 2026`. Sort-button labels keep the full date (`tableBucketName`, unchanged).
- `PERIOD_COLUMN_WIDTH` 8rem → 5rem, matching the Total column. The table's explicit min width follows automatically from the column sum.
- New `trendYears` puts the year span in the Visits trend card title, in secondary weight: `Visits trend · 2026`, or `Visits trend · 2025–2026` when the range crosses years. No year is added for Yearly granularity.
- Skill change (`cliniq-table-patterns`, wide time-series tables):
  - Old: keep period headers compact by dropping a repeated prefix (e.g. `Sep 14` instead of `Week of Sep 14`).
  - New: also drop the year from period headers. Show it once in the card title, keep it screen-reader-only in each header, and size period columns to the short header. Yearly keeps its year.
Reason: Requester asked for narrower period columns by moving the repeated year out of the headers.
Testing Performed:
- `npm run typecheck`: passed. `npm run test`: 51 files, 238 tests passed (new test: compact visible headers, the year in the title and in header accessible names, and no visible `2026` in the header row). `npm run build`: passed.
- Playwright MCP at 1280px: no period header overflows its column on any range (widest header content 56px in an 80px column).

| Range | Card title | Headers | Table width |
|---|---|---|---|
| This month | · 2026 | Oct 1–3 | fills the card, no scroll |
| Last 30 days | · 2026 | Sep 22, Sep 23, … | 1828 → 1252px, still scrolls |
| This year | · 2026 | Jan, Feb, … | 1110px |
| All | · 2025–2026 | Nov, Dec, Jan, … | 1270px |

Screenshots confirmed the screen-reader-only year is not visible.
Known Issues: None. The chart's own x-axis labels were not changed (the request was about the table header); its monthly labels still read e.g. `Mar 2026`.
Next Steps: None.
