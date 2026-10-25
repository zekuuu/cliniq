Date/Day/Time: Sunday, October 25, 2026 — 23:58 PHT
Agent: Claude Code (Opus 5.5)
Task: Inventory list column widths
Status: Completed
Prompt/Request: (screenshot of the Inventory table) "now give a bit more space for name column, then move the stock to left since the category has fixed length since it's jst medicine and supply"
Files Modified:
- frontend/src/features/inventory/InventoryListPage.tsx
- CLINIQ-Knowledge-Base/08-Logs/Changelog.md
Changes Made:
- Fixed widths for Category (8rem), Stock (13.5rem; widened from 11rem in a follow-up so "Expired: 25 · Oct 21, 2026" fits on one line) and Next usable expiry (9rem); Status 11.5rem → 10.5rem (fits "Nearing expiration"); Actions keeps 15rem. (Expiry and Status were narrowed in a follow-up so the table stops scrolling sideways on the desktop width in the screenshot.) Item has no width, so it takes the remaining space, and Stock sits closer to Category.
- minTableWidth 62.5rem → 67rem (the fixed widths plus 11rem for Item), so names don't get squeezed before the table scrolls.
Reason: User request; equal leftover widths left Category too wide and Item too narrow.
Testing Performed: `npx tsc -b` clean; `vitest run src/features/inventory` 28/28. No live browser check.
Known Issues: None.
Next Steps: None.
