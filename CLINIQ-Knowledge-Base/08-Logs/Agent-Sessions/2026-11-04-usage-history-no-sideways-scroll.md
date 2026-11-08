Date/Day/Time: Wednesday, November 04, 2026 — 23:55 PHT (system clock, +08:00)
Agent: Claude Code (Opus 5.5)
Task: Undo S2's vertical scroll on Inventory Usage History; stop the table scrolling sideways
Status: Completed (not committed)
Prompt/Request: Zean, after the hand-back of [2026-11-04-pager-history-scroll-report-link-name-split](2026-11-04-pager-history-scroll-report-link-name-split.md): "undo S2, scrolling history, what I mean scrollable is why is it scrollable horizontally".
Files Modified: `frontend/src/components/ui/DataTable.tsx`, `DataTable.test.tsx` (restored to `471f616f`), `frontend/src/features/inventory/InventoryHistoryPage.tsx`, `InventoryHistoryPage.test.tsx`, `.claude/skills/cliniq-table-patterns/SKILL.md`, `CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md`, `08-Logs/{Changelog,Frontend-Issues-and-TODOs,Issues-Done-Archive}.md`, this log.
Changes Made:
- **Undone:** the `DataTable` `maxHeight` option, its tests, the page's bounded height, pinned first column and the S2 test; the skill section about tall tables.
- **Why it scrolled sideways:** the table had `minTableWidth="72rem"` (1152px), and its fixed columns alone added up to 60rem. The card's scroller is 897px wide at 1280, 983px at 1366 and 1057px at 1440, so it scrolled sideways on every desktop.
- **Fix:** `minTableWidth` 55rem (880px, fits the 897px scroller with the 4px focus-ring room) and narrower columns: Date and time 9rem, Movement 9rem, Change 6rem, Batch 9.5rem, Patient 7.5rem, By 8rem; Item takes the rest. The date, item and movement wrap inside their columns; the time never breaks ("Nov 4, 2026 ·" over "10:05 AM"). Phones (below about 1024px with the sidebar) still scroll sideways inside the card, as every wide table does.
Reason: Zean meant the sideways scroll, not a vertical one.
Testing Performed: Browser (Playwright with Google Chrome): table width against scroller width at 1024, 1280, 1366, 1440 and 1920. No sideways scroll from 1280 up (1280: table 889px in an 897px scroller), and no cell content spills out of its column. axe at 375, 768 and 1280: 0 violations, no page-level sideways scroll. New test "fits the card on a desktop instead of scrolling sideways" (min width 55rem, the column widths, the time on one line). Inventory tests 37/37, `eslint .` clean, `tsc -b` clean.
Known Issues: At 1024 with the sidebar open the scroller is 641px, so the table still scrolls sideways there (the 55rem floor keeps the columns readable).
Next Steps: none.
