Date/Day/Time: Tuesday, November 17, 2026 — 23:58 PHT (PowerShell `Get-Date`)
Agent: Claude Code (Opus 5.5)
Task: Rows per page is not remembered; every list opens at 10
Status: Completed
Prompt/Request: Zean saw the Student List on `feat/connect-frontend` open with 100 rows after the cap fix ([2026-11-17-no-capped-lists](2026-11-17-no-capped-lists.md)). Investigation showed no cap in that branch's code. The 100 came from the remembered "Rows per page" choice. Zean: "go to main again, then remove sessionStorage of pageSize, just change the showing in page … no sessionstorage, no query, just same page".

Files Modified:
- `frontend/src/hooks/usePageSize.ts`: now `useState<PageSize>(10)`, with the same return shape, so the 8 list screens are unchanged. The `sessionStorage` key `cliniq.pageSize` is gone.
- `frontend/src/hooks/usePageSize.test.ts`: opens at 10, a change holds while the hook is mounted, a new mount is 10 again, nothing is stored.
- `frontend/src/features/inventory/BrandAndPaging.test.tsx`: the remount now expects 10 (it was 20, "kept for the session") and no stored value.
- `frontend/src/features/inventory/InventoryListPage.test.tsx`, `InventoryPanelReview.test.tsx`, `StockActions.test.tsx`: these tests reach every item, so they had set `cliniq.pageSize` to 50. They now mock `usePageSize` to start at 50.
- `frontend/src/features/review-round-2-parts-2-3.test.tsx`: the unneeded `cliniq.pageSize` line is removed (the test passes at 10).
- `frontend/src/hooks/README.md`: the `usePageSize` line.
- `.claude/skills/cliniq-pagination-patterns/SKILL.md` and `CLINIQ-Knowledge-Base/04-Development/Skills-Setup.md`: old → new below.
- `CLINIQ-Knowledge-Base/08-Logs/Frontend-Changelog.md`: one row.

Changes Made: Skill change, old → new. Old: "takes the size from `hooks/usePageSize.ts`, which keeps the choice for the browser session and shares it between lists. Default 10." New: every list opens at 10, every time; a change holds only while that screen stays open; nothing in `sessionStorage`, nothing in the URL. Rows per page still offers 10, 20, 50 and 100 and returns to page 1 on a change. That part is Sir Rey's October 25 rule and is kept.

Reason: With the shared, remembered choice, one pick of 100 on any list (or an earlier test in the same tab) opened every list at 100 until the tab closed. That broke Zean's rule that every pager defaults to 10.

Testing Performed:
- `npm run lint`: 0 errors, 1 warning, which is not caused by this change (`ErrorSummary.tsx`).
- `npx tsc -b`: clean.
- `npm run build`: built.
- `npm test`, full run with 4 workers: 136 files, 1187 tests passed. Two runs at the default worker count each failed a different set of 7 and 4 tests in unrelated files (visits, PE referral, follow-ups, back navigation, staff). All of them pass when run alone. Both dev servers and Apache were running at the time.
- Playwright Chromium on `main` (mock): with a leftover `cliniq.pageSize = "100"` in the tab, the Student List opens at "Showing 1–10 of 48 students", 10 rows.
- Prettier: the changed hook and test files are clean, except `StockActions.test.tsx` and `review-round-2-parts-2-3.test.tsx`, which were already unformatted before this change and were left as they were.

Known Issues: A browser tab that already has `cliniq.pageSize` keeps the dead key until the tab closes. Nothing reads it.

Next Steps: Zean decides whether to commit. Merge `main` into `feat/connect-frontend`.
